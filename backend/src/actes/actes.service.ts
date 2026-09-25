import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import * as Handlebars from 'handlebars';
import HTMLtoDOCX = require('html-to-docx');
import JSZip = require('jszip');
import { TenantDbService } from '../tenant/tenant-db.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { ModelesActesService } from '../modeles-actes/modeles-actes.service';
import { MailService } from '../notifications/mail.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateActeDto, TYPES_LETTRE_CLIENT } from './dto/create-acte.dto';
import { UpdateBrouillonDto } from './dto/update-brouillon.dto';
import { RejeterActeDto } from './dto/rejeter-acte.dto';
import { MarquerNotifieDto } from './dto/marquer-notifie.dto';

const STORAGE_ROOT = process.env.ACTES_STORAGE_PATH ?? join(process.cwd(), 'storage');

function peutValider(role: string): boolean {
  return role === 'HUISSIER';
}

@Injectable()
export class ActesService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
    private readonly modelesActesService: ModelesActesService,
    private readonly pdfService: PdfService,
    private readonly mailService: MailService,
  ) {}

  private async prochainNumero(type: string): Promise<string> {
    const annee = new Date().getFullYear();
    const prefixes: Record<string, string> = {
      SIGNIFICATION: 'SIG',
      COMMANDEMENT_PAYER: 'COM',
      PV_CONSTAT: 'PVC',
      PV_SAISIE: 'PVS',
      SOMMATION: 'SOM',
      MISE_EN_DEMEURE: 'MED',
      ASSIGNATION: 'ASS',
      CONGE_BAIL: 'CBL',
      SAISIE_ATTRIBUTION: 'SAT',
      SAISIE_VENTE: 'SVE',
      SIGNIFICATION_JUGEMENT: 'SJU',
      LETTRE_MISSION: 'LMI',
      PROCURATION: 'PRO',
      CONVENTION_HONORAIRES: 'CVH',
      ACCUSE_RECEPTION_DOSSIER: 'ARD',
      NANTISSEMENT: 'NAN',
      LEGALISATION: 'LEG',
      AUTRE: 'ACT',
    };
    const prefixe = prefixes[type] ?? 'ACT';
    const cle = `acte_${type}_${annee}`;
    const row = await this.tenantDb.queryOne<{ valeur: number }>(
      `INSERT INTO compteurs (cle, valeur) VALUES ($1, 1)
       ON CONFLICT (cle) DO UPDATE SET valeur = compteurs.valeur + 1
       RETURNING valeur`,
      [cle],
    );
    const sequence = String(row!.valeur).padStart(4, '0');
    return `${prefixe}-${annee}-${sequence}`;
  }

  private storageDir(): string {
    const { schemaName } = this.tenantContext.get();
    return join(STORAGE_ROOT, schemaName, 'actes');
  }

  private async corrigerPositionSectPr(buffer: Buffer): Promise<Buffer> {
    const zip = await JSZip.loadAsync(buffer);
    const docPath = 'word/document.xml';
    const fichier = zip.file(docPath);
    if (!fichier) return buffer;

    const xml = await fichier.async('string');
    const sectPrMatch = xml.match(/<w:sectPr\b[^>]*>[\s\S]*?<\/w:sectPr>|<w:sectPr\b[^>]*\/>/);
    if (!sectPrMatch) return buffer;

    const sectPr = sectPrMatch[0];
    const sansSectPr = xml.replace(sectPr, '');
    const corrige = sansSectPr.replace('</w:body>', `${sectPr}</w:body>`);

    zip.file(docPath, corrige);
    return zip.generateAsync({ type: 'nodebuffer' });
  }

  // Genere un .docx a partir d'un HTML DEJA RENDU (pas de fusion
  // Handlebars supplementaire - le corps_html d'un acte valide est deja
  // final, edite ou non par l'utilisateur).
  private async genererDocxDepuisHtml(htmlRendu: string, titre: string): Promise<Buffer> {
    const brut = await HTMLtoDOCX(htmlRendu, null, {
      title: titre,
      footer: false,
      pageNumber: false,
      margins: { top: 1000, right: 1000, bottom: 1000, left: 1000, header: 720, footer: 720, gutter: 0 },
    });
    return this.corrigerPositionSectPr(brut);
  }

  // Construit les donnees de fusion Handlebars communes (client, debiteur,
  // cabinet, signataire, montants) pour un dossier + utilisateur donnes -
  // reutilise par l'apercu et la creation de brouillon.
  private async construireDonneesFusion(
    dossierId: string,
    modeleId: string,
    utilisateurId: string,
    contenuLibre: Record<string, unknown>,
    numeroActe: string,
  ) {
    const dossier = await this.tenantDb.queryOne<{
      id: string;
      numero: string;
      type: string;
      client_id: string;
      debiteur_id: string | null;
      description: string | null;
    }>(`SELECT * FROM dossiers WHERE id = $1`, [dossierId]);
    if (!dossier) throw new NotFoundException('Dossier introuvable.');

    const client = await this.tenantDb.queryOne<{
      nom: string;
      prenom: string | null;
      adresse: string | null;
      telephone: string | null;
    }>(`SELECT nom, prenom, adresse, telephone FROM clients WHERE id = $1`, [dossier.client_id]);

    const debiteur = dossier.debiteur_id
      ? await this.tenantDb.queryOne<{
          nom: string;
          prenom: string | null;
          adresse: string | null;
          telephone: string | null;
        }>(`SELECT nom, prenom, adresse, telephone FROM clients WHERE id = $1`, [dossier.debiteur_id])
      : null;

    const signataire = await this.tenantDb.queryOne<{ nom: string; prenom: string; role: string }>(
      `SELECT nom, prenom, role FROM utilisateurs WHERE id = $1`,
      [utilisateurId],
    );

    const solde = await this.tenantDb.queryOne<{ total_du: string; total_paye: string }>(
      `SELECT
         COALESCE(SUM(montant_total), 0) AS total_du,
         COALESCE(SUM(montant_paye), 0) AS total_paye
       FROM factures WHERE dossier_id = $1`,
      [dossierId],
    );

    const { id: cabinetId } = this.tenantContext.get();
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id: cabinetId },
      select: { nom: true, adresse: true, telephone: true, email: true },
    });

    const montantDu = Number(solde?.total_du ?? 0);
    const montantPaye = Number(solde?.total_paye ?? 0);
    const { delaiJours, ...reste } = contenuLibre;

    return {
      numeroActe,
      dateActe: new Date().toLocaleDateString('fr-FR'),
      delaiJours: delaiJours ?? 8,
      dossier: { numero: dossier.numero, type: dossier.type, description: dossier.description },
      client: { nom: client?.nom, prenom: client?.prenom, adresse: client?.adresse, telephone: client?.telephone },
      debiteur: {
        nom: debiteur?.nom,
        prenom: debiteur?.prenom,
        adresse: debiteur?.adresse,
        telephone: debiteur?.telephone,
      },
      cabinet: { nom: cabinet?.nom, adresse: cabinet?.adresse, telephone: cabinet?.telephone, email: cabinet?.email },
      signataire: { nom: signataire?.nom, prenom: signataire?.prenom, role: signataire?.role },
      montantDu,
      montantPaye,
      montantRestant: montantDu - montantPaye,
      ...reste,
    };
  }

  // Apercu : rend le HTML fusionne pour affichage/edition dans le client,
  // SANS consommer de numero ni rien persister en base. Le numero reel
  // n'est attribue qu'a la creation effective du brouillon.
  async apercu(dto: CreateActeDto, utilisateurId: string): Promise<{ html: string }> {
    const modele = (await this.modelesActesService.findOne(dto.modeleId)) as { template_html: string };
    const donneesFusion = await this.construireDonneesFusion(
      dto.dossierId,
      dto.modeleId,
      utilisateurId,
      (dto.contenu ?? {}) as Record<string, unknown>,
      '(numero attribue a l\'enregistrement)',
    );
    const compiled = Handlebars.compile(modele.template_html, { noEscape: false });
    return { html: compiled(donneesFusion) };
  }

  // Cree un acte en BROUILLON : aucun PDF/DOCX officiel n'est genere a ce
  // stade. Le corps (corps_html) est soit celui fourni par l'utilisateur
  // (deja edite depuis l'apercu), soit calcule automatiquement par fusion
  // du gabarit (chemin retro-compatible sans apercu prealable).
  async create(dto: CreateActeDto, utilisateurId: string) {
    const modele = (await this.modelesActesService.findOne(dto.modeleId)) as {
      id: string;
      type: string;
      template_html: string;
    };

    const numero = await this.prochainNumero(modele.type);
    const donneesFusion = await this.construireDonneesFusion(
      dto.dossierId,
      dto.modeleId,
      utilisateurId,
      (dto.contenu ?? {}) as Record<string, unknown>,
      numero,
    );

    const corpsHtml =
      dto.corpsHtml ?? Handlebars.compile(modele.template_html, { noEscape: false })(donneesFusion);

    return this.tenantDb.transaction(async (client_) => {
      const acteResult = await client_.query(
        `INSERT INTO actes (numero, type, dossier_id, contenu, corps_html, statut_validation, signe_par, date_acte)
         VALUES ($1,$2,$3,$4,$5,'BROUILLON',$6,now()) RETURNING *`,
        [numero, modele.type, dto.dossierId, JSON.stringify(donneesFusion), corpsHtml, utilisateurId],
      );
      await client_.query(
        `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
         VALUES ($1,$2,'ACTE_BROUILLON_CREE',$3)`,
        [dto.dossierId, utilisateurId, JSON.stringify({ numeroActe: numero, type: modele.type })],
      );
      return acteResult.rows[0];
    });
  }

  // Met a jour le corps HTML d'un brouillon existant (edition libre
  // continue). Refuse si l'acte n'est plus au stade BROUILLON.
  async modifierBrouillon(id: string, dto: UpdateBrouillonDto, utilisateurId: string) {
    const acte = await this.tenantDb.queryOne<{ id: string; statut_validation: string; dossier_id: string; numero: string }>(
      `SELECT id, statut_validation, dossier_id, numero FROM actes WHERE id = $1`,
      [id],
    );
    if (!acte) throw new NotFoundException('Acte introuvable.');
    if (acte.statut_validation !== 'BROUILLON') {
      throw new BadRequestException("Cet acte n'est plus modifiable (deja soumis ou valide).");
    }

    const updated = await this.tenantDb.queryOne(
      `UPDATE actes SET corps_html = $1 WHERE id = $2 RETURNING *`,
      [dto.corpsHtml, id],
    );
    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1,$2,'ACTE_BROUILLON_MODIFIE',$3)`,
      [acte.dossier_id, utilisateurId, JSON.stringify({ numeroActe: acte.numero })],
    );
    return updated;
  }

  // Corrige le contenu d'un acte EN ATTENTE DE VALIDATION - reserve au
  // Huissier/Clerc habilite a valider ce type (meme regle que valider()).
  // Permet a l'Huissier de rectifier une erreur de saisie faite par un
  // Clerc ou une Secretaire sans avoir a rejeter puis attendre une
  // resoumission.
  async corrigerEnAttente(id: string, dto: UpdateBrouillonDto, currentUser: AuthenticatedUser) {
    const acte = await this.tenantDb.queryOne<{ id: string; type: string; statut_validation: string; dossier_id: string; numero: string }>(
      `SELECT id, type, statut_validation, dossier_id, numero FROM actes WHERE id = $1`,
      [id],
    );
    if (!acte) throw new NotFoundException('Acte introuvable.');
    if (acte.statut_validation !== 'EN_ATTENTE_VALIDATION') {
      throw new BadRequestException("Cet acte n'est pas en attente de validation.");
    }
    if (!peutValider(currentUser.role)) {
      throw new ForbiddenException("Seul l'Huissier peut corriger un acte soumis.");
    }

    const updated = await this.tenantDb.queryOne(
      `UPDATE actes SET corps_html = $1 WHERE id = $2 RETURNING *`,
      [dto.corpsHtml, id],
    );
    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1,$2,'ACTE_CORRIGE_PAR_VALIDATEUR',$3)`,
      [acte.dossier_id, currentUser.sub, JSON.stringify({ numeroActe: acte.numero })],
    );
    return updated;
  }
  // Soumet un brouillon pour validation - passe en EN_ATTENTE_VALIDATION.
  async soumettre(id: string, utilisateurId: string) {
    const acte = await this.tenantDb.queryOne<{ id: string; statut_validation: string; dossier_id: string; numero: string }>(
      `SELECT id, statut_validation, dossier_id, numero FROM actes WHERE id = $1`,
      [id],
    );
    if (!acte) throw new NotFoundException('Acte introuvable.');
    if (acte.statut_validation !== 'BROUILLON') {
      throw new BadRequestException('Seul un brouillon peut etre soumis a validation.');
    }

    const updated = await this.tenantDb.queryOne(
      `UPDATE actes SET statut_validation = 'EN_ATTENTE_VALIDATION', soumis_par = $1, soumis_le = now() WHERE id = $2 RETURNING *`,
      [utilisateurId, id],
    );
    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1,$2,'ACTE_SOUMIS_VALIDATION',$3)`,
      [acte.dossier_id, utilisateurId, JSON.stringify({ numeroActe: acte.numero })],
    );
    return updated;
  }

  // Valide l'acte : verifie le niveau requis par le modele, genere le
  // PDF/DOCX officiels a partir du corps_html final, et fige le document.
  async valider(id: string, currentUser: AuthenticatedUser) {
    const acte = await this.tenantDb.queryOne<{
      id: string;
      numero: string;
      type: string;
      statut_validation: string;
      corps_html: string | null;
      dossier_id: string;
    }>(`SELECT id, numero, type, statut_validation, corps_html, dossier_id FROM actes WHERE id = $1`, [id]);
    if (!acte) throw new NotFoundException('Acte introuvable.');
    if (acte.statut_validation !== 'EN_ATTENTE_VALIDATION') {
      throw new BadRequestException("Cet acte n'est pas en attente de validation.");
    }
    if (!acte.corps_html) {
      throw new BadRequestException('Contenu de l\'acte manquant.');
    }
    if (!peutValider(currentUser.role)) {
      throw new ForbiddenException("Seul l'Huissier peut valider un acte.");
    }

    const pdfBuffer = await this.pdfService.genererPdfDepuisHtml(acte.corps_html);

    let docxBuffer: Buffer | null = null;
    try {
      docxBuffer = await this.genererDocxDepuisHtml(acte.corps_html, acte.numero);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Generation Word echouee pour l'acte ${acte.numero} (PDF genere normalement) :`, err);
    }

    const dir = this.storageDir();
    await mkdir(dir, { recursive: true });
    const baseName = acte.numero.replace(/\//g, '-');
    const pdfPath = join(dir, `${baseName}.pdf`);
    await writeFile(pdfPath, pdfBuffer);

    let docxPath: string | null = null;
    if (docxBuffer) {
      docxPath = join(dir, `${baseName}.docx`);
      await writeFile(docxPath, docxBuffer);
    }

    const updated = await this.tenantDb.queryOne(
      `UPDATE actes
       SET statut_validation = 'VALIDE', valide_par = $1, valide_le = now(),
           pdf_path = $2, docx_path = $3
       WHERE id = $4 RETURNING *`,
      [currentUser.sub, pdfPath, docxPath, id],
    );
    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1,$2,'ACTE_VALIDE',$3)`,
      [acte.dossier_id, currentUser.sub, JSON.stringify({ numeroActe: acte.numero })],
    );
    return updated;
  }

  // Rejette un acte en attente de validation : retour en BROUILLON avec
  // motif conserve, pour que le createur puisse corriger et resoumettre.
  async rejeter(id: string, dto: RejeterActeDto, currentUser: AuthenticatedUser) {
    const acte = await this.tenantDb.queryOne<{ id: string; numero: string; statut_validation: string; type: string; dossier_id: string }>(
      `SELECT id, numero, statut_validation, type, dossier_id FROM actes WHERE id = $1`,
      [id],
    );
    if (!acte) throw new NotFoundException('Acte introuvable.');
    if (acte.statut_validation !== 'EN_ATTENTE_VALIDATION') {
      throw new BadRequestException("Cet acte n'est pas en attente de validation.");
    }
    if (!peutValider(currentUser.role)) {
      throw new ForbiddenException("Seul l'Huissier peut rejeter ou demander la correction d'un acte.");
    }

    const updated = await this.tenantDb.queryOne(
      `UPDATE actes
       SET statut_validation = 'BROUILLON', rejete_par = $1, rejete_le = now(), motif_rejet = $2
       WHERE id = $3 RETURNING *`,
      [currentUser.sub, dto.motif ?? null, id],
    );
    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1,$2,'ACTE_REJETE',$3)`,
      [acte.dossier_id, currentUser.sub, JSON.stringify({ numeroActe: acte.numero, motif: dto.motif ?? null })],
    );
    return updated;
  }

  async findAll(query: import('./dto/query-actes.dto').QueryActesDto) {
    const { page, limit, search, type, dateDebut, dateFin } = query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (type) {
      params.push(type);
      conditions.push(`a.type = $${params.length}`);
    }
    if (dateDebut) {
      params.push(dateDebut);
      conditions.push(`a.date_acte >= $${params.length}`);
    }
    if (dateFin) {
      params.push(dateFin);
      conditions.push(`a.date_acte <= $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(a.numero ILIKE $${params.length} OR d.numero ILIKE $${params.length} OR c.nom ILIKE $${params.length} OR c.prenom ILIKE $${params.length})`,
      );
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const rows = await this.tenantDb.query(
      `SELECT a.id, a.numero, a.type, a.date_acte, a.dossier_id, a.envoye_client_le, a.signe_client_le,
              a.notifie_par, a.notifie_le, a.statut_validation,
              d.numero AS dossier_numero,
              c.nom AS client_nom, c.prenom AS client_prenom,
              u.nom AS signataire_nom, u.prenom AS signataire_prenom,
              n.nom AS notifie_par_nom, n.prenom AS notifie_par_prenom
       FROM actes a
       JOIN dossiers d ON d.id = a.dossier_id
       JOIN clients c ON c.id = d.client_id
       LEFT JOIN utilisateurs u ON u.id = a.signe_par
       LEFT JOIN utilisateurs n ON n.id = a.notifie_par
       ${whereClause}
       ORDER BY a.date_acte DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    const countRow = await this.tenantDb.queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM actes a
       JOIN dossiers d ON d.id = a.dossier_id
       JOIN clients c ON c.id = d.client_id
       ${whereClause}`,
      params,
    );

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(countRow?.total ?? 0),
        totalPages: Math.ceil(Number(countRow?.total ?? 0) / limit),
      },
    };
  }

  // Liste des actes en attente de validation, filtrable par le niveau
  // accessible au role courant (un Clerc ne voit que ceux qu'il peut
  // effectivement valider ; un Huissier voit tout).
  async findEnAttenteValidation(currentUser: AuthenticatedUser) {
    if (!peutValider(currentUser.role)) {
      throw new ForbiddenException("Seul l'Huissier peut consulter la file de validation.");
    }

    return this.tenantDb.query<{
      id: string;
      numero: string;
      type: string;
      soumis_le: string;
      dossier_id: string;
      dossier_numero: string;
      soumis_par_nom: string | null;
      soumis_par_prenom: string | null;
    }>(
      `SELECT a.id, a.numero, a.type, a.soumis_le, a.dossier_id,
              d.numero AS dossier_numero,
              u.nom AS soumis_par_nom, u.prenom AS soumis_par_prenom
       FROM actes a
       JOIN dossiers d ON d.id = a.dossier_id
       LEFT JOIN utilisateurs u ON u.id = a.soumis_par
       WHERE a.statut_validation = 'EN_ATTENTE_VALIDATION'
       ORDER BY a.soumis_le ASC`,
    );
  }
  async findByDossier(dossierId: string) {
    return this.tenantDb.query(
      `SELECT id, numero, type, date_acte, signe_par, envoye_client_le, signe_client_le, notifie_par, notifie_le,
              statut_validation, soumis_le, valide_le, motif_rejet
       FROM actes WHERE dossier_id = $1 ORDER BY date_acte DESC`,
      [dossierId],
    );
  }

  async findOne(id: string) {
    const acte = await this.tenantDb.queryOne(`SELECT * FROM actes WHERE id = $1`, [id]);
    if (!acte) throw new NotFoundException('Acte introuvable.');
    return acte;
  }

  async getPdfBuffer(id: string): Promise<{ buffer: Buffer; numero: string }> {
    const acte = await this.tenantDb.queryOne<{ numero: string; pdf_path: string | null; statut_validation: string }>(
      `SELECT numero, pdf_path, statut_validation FROM actes WHERE id = $1`,
      [id],
    );
    if (!acte) throw new NotFoundException('Acte introuvable.');
    if (!acte.pdf_path) {
      throw new BadRequestException(
        acte.statut_validation === 'VALIDE'
          ? 'PDF indisponible pour cet acte.'
          : "Cet acte est encore en brouillon ou en attente de validation — pas de PDF officiel disponible.",
      );
    }
    const buffer = await readFile(acte.pdf_path);
    return { buffer, numero: acte.numero };
  }

  async getDocxBuffer(id: string): Promise<{ buffer: Buffer; numero: string }> {
    const acte = await this.tenantDb.queryOne<{ numero: string; docx_path: string | null; statut_validation: string }>(
      `SELECT numero, docx_path, statut_validation FROM actes WHERE id = $1`,
      [id],
    );
    if (!acte) throw new NotFoundException('Acte introuvable.');
    if (acte.statut_validation !== 'VALIDE') {
      throw new BadRequestException("Cet acte est encore en brouillon ou en attente de validation.");
    }
    if (!acte.docx_path) {
      throw new BadRequestException(
        "Version Word indisponible pour cet acte (generation echouee ou genere avant l'ajout de cette fonctionnalite). Le PDF reste disponible.",
      );
    }
    const buffer = await readFile(acte.docx_path);
    return { buffer, numero: acte.numero };
  }

  async envoyerAuClient(id: string, utilisateurId: string) {
    const acte = await this.tenantDb.queryOne<{
      id: string;
      numero: string;
      type: string;
      dossier_id: string;
      pdf_path: string | null;
      statut_validation: string;
    }>(`SELECT id, numero, type, dossier_id, pdf_path, statut_validation FROM actes WHERE id = $1`, [id]);
    if (!acte) throw new NotFoundException('Acte introuvable.');
    if (acte.statut_validation !== 'VALIDE' || !acte.pdf_path) {
      throw new BadRequestException("Cet acte doit d'abord etre valide avant de pouvoir etre envoye.");
    }

    const dossier = await this.tenantDb.queryOne<{ client_id: string; numero: string }>(
      `SELECT client_id, numero FROM dossiers WHERE id = $1`,
      [acte.dossier_id],
    );
    if (!dossier) throw new NotFoundException('Dossier introuvable.');

    const client = await this.tenantDb.queryOne<{ nom: string; prenom: string | null; email: string | null }>(
      `SELECT nom, prenom, email FROM clients WHERE id = $1`,
      [dossier.client_id],
    );
    if (!client?.email) {
      throw new BadRequestException("Ce client n'a pas d'adresse email renseignee — impossible d'envoyer le document.");
    }

    const { id: cabinetId } = this.tenantContext.get();
    const cabinet = await this.prisma.cabinet.findUnique({ where: { id: cabinetId }, select: { nom: true } });

    const pdfBuffer = await readFile(acte.pdf_path);
    const necessiteSignature = (TYPES_LETTRE_CLIENT as readonly string[]).includes(acte.type);

    const corps = necessiteSignature
      ? `<p>Bonjour ${escapeHtml(client.nom)},</p>
         <p>Veuillez trouver ci-joint le document « ${escapeHtml(acte.numero)} » relatif au dossier
         ${escapeHtml(dossier.numero)}, a nous retourner signe dans les meilleurs delais.</p>
         <p>Cordialement.</p>`
      : `<p>Bonjour ${escapeHtml(client.nom)},</p>
         <p>Veuillez trouver ci-joint le document « ${escapeHtml(acte.numero)} » relatif au dossier
         ${escapeHtml(dossier.numero)}.</p>
         <p>Cordialement.</p>`;

    const envoye = await this.mailService.envoyer(
      client.email,
      `${cabinet?.nom ?? 'Cabinet'} — Document ${acte.numero}${necessiteSignature ? ' a signer' : ''}`,
      corps,
      [{ filename: `${acte.numero.replace(/\//g, '-')}.pdf`, content: pdfBuffer }],
    );
    if (!envoye) {
      throw new BadRequestException("L'envoi a echoue (SMTP non configure ou indisponible) — voir les journaux du serveur.");
    }

    const updated = await this.tenantDb.queryOne(
      `UPDATE actes SET envoye_client_le = now() WHERE id = $1 RETURNING *`,
      [id],
    );
    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1,$2,'ACTE_ENVOYE_CLIENT',$3)`,
      [acte.dossier_id, utilisateurId, JSON.stringify({ numeroActe: acte.numero, email: client.email })],
    );
    return updated;
  }

  async marquerSigne(id: string, utilisateurId: string) {
    const acte = await this.tenantDb.queryOne<{ id: string; numero: string; dossier_id: string; statut_validation: string }>(
      `SELECT id, numero, dossier_id, statut_validation FROM actes WHERE id = $1`,
      [id],
    );
    if (!acte) throw new NotFoundException('Acte introuvable.');
    if (acte.statut_validation !== 'VALIDE') {
      throw new BadRequestException("Cet acte doit d'abord etre valide.");
    }

    const updated = await this.tenantDb.queryOne(
      `UPDATE actes SET signe_client_le = now() WHERE id = $1 RETURNING *`,
      [id],
    );
    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1,$2,'ACTE_SIGNE_CLIENT',$3)`,
      [acte.dossier_id, utilisateurId, JSON.stringify({ numeroActe: acte.numero })],
    );
    return updated;
  }

  async marquerNotifie(id: string, dto: MarquerNotifieDto, utilisateurId: string) {
    const acte = await this.tenantDb.queryOne<{ id: string; numero: string; dossier_id: string; statut_validation: string }>(
      `SELECT id, numero, dossier_id, statut_validation FROM actes WHERE id = $1`,
      [id],
    );
    if (!acte) throw new NotFoundException('Acte introuvable.');
    if (acte.statut_validation !== 'VALIDE') {
      throw new BadRequestException("Cet acte doit d'abord etre valide.");
    }

    const agent = await this.tenantDb.queryOne<{ id: string; nom: string; prenom: string; role: string; actif: boolean }>(
      `SELECT id, nom, prenom, role, actif FROM utilisateurs WHERE id = $1`,
      [dto.agentId],
    );
    if (!agent) throw new NotFoundException('Agent introuvable.');
    if (!agent.actif) throw new BadRequestException('Cet agent est desactive.');
    if (!['HUISSIER', 'CLERC', 'AGENT_TERRAIN'].includes(agent.role)) {
      throw new BadRequestException('Seuls les Huissiers, Clercs et agents terrain peuvent etre designes comme agent notificateur.');
    }

    const updated = await this.tenantDb.queryOne(
      `UPDATE actes SET notifie_par = $1, notifie_le = now() WHERE id = $2 RETURNING *`,
      [dto.agentId, id],
    );
    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1,$2,'ACTE_NOTIFIE',$3)`,
      [acte.dossier_id, utilisateurId, JSON.stringify({ numeroActe: acte.numero, agent: `${agent.nom} ${agent.prenom}` })],
    );
    return updated;
  }

  async remove(id: string) {
    const acte = await this.tenantDb.queryOne<{ id: string; numero: string; pdf_path: string | null; docx_path: string | null }>(
      `SELECT id, numero, pdf_path, docx_path FROM actes WHERE id = $1`,
      [id],
    );
    if (!acte) throw new NotFoundException('Acte introuvable.');

    await this.tenantDb.query(`DELETE FROM actes WHERE id = $1`, [id]);
    if (acte.pdf_path) await unlink(acte.pdf_path).catch(() => undefined);
    if (acte.docx_path) await unlink(acte.docx_path).catch(() => undefined);

    return { id, numero: acte.numero, supprime: true };
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


