import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { join } from 'path';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { TenantDbService } from '../tenant/tenant-db.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { MailService } from '../notifications/mail.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { CreateRelanceDto } from './dto/create-relance.dto';

const STORAGE_ROOT = process.env.ACTES_STORAGE_PATH ?? join(process.cwd(), 'storage');
const EXTENSIONS_LOGO_AUTORISEES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class ClientsService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly tenantContext: TenantContextService,
    private readonly mailService: MailService,
  ) {}

    async create(dto: CreateClientDto) {
    return this.tenantDb.queryOne(
      `INSERT INTO clients (
         nom, prenom, categorie, nin, ifu, rccm, telephone, whatsapp, email, adresse,
         type_piece, date_naissance, lieu_naissance, nationalite,
         date_delivrance_piece, date_expiration_piece, lieu_delivrance_piece, profession,
         representant_nom, representant_prenom, representant_fonction, role_tiers
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *`,
      [
        dto.nom,
        dto.prenom ?? null,
        dto.categorie ?? 'PARTICULIER',
        dto.nin ?? null,
        dto.ifu ?? null,
        dto.rccm ?? null,
        dto.telephone ?? null,
        dto.whatsapp ?? null,
        dto.email ?? null,
        dto.adresse ?? null,
        dto.type_piece ?? null,
        dto.date_naissance ?? null,
        dto.lieu_naissance ?? null,
        dto.nationalite ?? null,
        dto.date_delivrance_piece ?? null,
        dto.date_expiration_piece ?? null,
        dto.lieu_delivrance_piece ?? null,
        dto.profession ?? null,
        dto.representant_nom ?? null,
        dto.representant_prenom ?? null,
        dto.representant_fonction ?? null,
        dto.role_tiers ?? 'CLIENT',
      ],
    );
  }
  async findAll(query: QueryClientsDto) {
    const { page, limit, search, statut, categorie, roleTiers } = query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (statut) {
      params.push(statut);
      conditions.push(`statut = $${params.length}`);
    }
    if (categorie) {
      params.push(categorie);
      conditions.push(`categorie = $${params.length}`);
    }
    if (roleTiers) {
      params.push(roleTiers);
      conditions.push(`role_tiers = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(
        `(nom ILIKE $${idx} OR prenom ILIKE $${idx} OR nin ILIKE $${idx} OR ifu ILIKE $${idx} OR rccm ILIKE $${idx} OR telephone ILIKE $${idx})`,
      );
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const rows = await this.tenantDb.query(
      `SELECT * FROM clients ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    const countRow = await this.tenantDb.queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM clients ${whereClause}`,
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

  async findOne(id: string) {
    const client = await this.tenantDb.queryOne(`SELECT * FROM clients WHERE id = $1`, [id]);
    if (!client) throw new NotFoundException('Client/debiteur introuvable.');

    const [dossiers, solde, relances, alertesClients] = await Promise.all([
      this.tenantDb.query(
        `SELECT d.id, d.numero, d.type, d.statut, d.date_ouverture,
                CASE WHEN d.client_id = $1 THEN 'CLIENT' ELSE 'DEBITEUR' END AS role_dans_dossier,
                autre.id AS autre_partie_id, autre.nom AS autre_partie_nom, autre.prenom AS autre_partie_prenom,
                CASE WHEN d.client_id = $1 THEN 'DEBITEUR' ELSE 'CLIENT' END AS role_autre_partie
         FROM dossiers d
         LEFT JOIN clients autre ON autre.id = (CASE WHEN d.client_id = $1 THEN d.debiteur_id ELSE d.client_id END)
         WHERE d.client_id = $1 OR d.debiteur_id = $1
         ORDER BY d.created_at DESC`,
        [id],
      ),
      this.tenantDb.queryOne<{ total_du: string; total_encaisse: string }>(
        `SELECT
           COALESCE(SUM(f.montant_total), 0) AS total_du,
           COALESCE(SUM(f.montant_paye), 0) AS total_encaisse
         FROM factures f
         JOIN dossiers d ON d.id = f.dossier_id
         WHERE d.client_id = $1`,
        [id],
      ),
      this.tenantDb.query(
        `SELECT r.*, u.nom AS envoyee_par_nom FROM relances r
         LEFT JOIN utilisateurs u ON u.id = r.envoyee_par
         WHERE r.client_id = $1 ORDER BY r.envoyee_le DESC LIMIT 20`,
        [id],
      ),
      this.tenantDb.query(
        `SELECT h.*, f.numero AS facture_numero
         FROM alertes_clients_historique h
         LEFT JOIN factures f ON f.id = h.facture_id
         WHERE h.client_id = $1 ORDER BY h.envoyee_le DESC LIMIT 20`,
        [id],
      ),
    ]);

    return {
      ...client,
      dossiers,
      montantDu: Number(solde?.total_du ?? 0),
      montantEncaisse: Number(solde?.total_encaisse ?? 0),
      montantRestant: Number(solde?.total_du ?? 0) - Number(solde?.total_encaisse ?? 0),
      relances,
      alertesClients,
    };
  }

  async update(id: string, dto: UpdateClientDto) {
    const existing = await this.tenantDb.queryOne(`SELECT id FROM clients WHERE id = $1`, [id]);
    if (!existing) throw new NotFoundException('Client/debiteur introuvable.');

    const fields: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      params.push(value);
      fields.push(`${key} = $${params.length}`);
    }
    if (fields.length === 0) return this.tenantDb.queryOne(`SELECT * FROM clients WHERE id = $1`, [id]);

    params.push(id);
    return this.tenantDb.queryOne(
      `UPDATE clients SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params,
    );
  }

  async ajouterRelance(clientId: string, dto: CreateRelanceDto, utilisateurId: string) {
    const client = await this.tenantDb.queryOne<{ id: string; nom: string; email: string | null }>(
      `SELECT id, nom, email FROM clients WHERE id = $1`,
      [clientId],
    );
    if (!client) throw new NotFoundException('Client/debiteur introuvable.');

    const relance = await this.tenantDb.queryOne(
      `INSERT INTO relances (client_id, envoyee_par, message) VALUES ($1,$2,$3) RETURNING *`,
      [clientId, utilisateurId, dto.message ?? null],
    );

    if (client.email) {
      const message = dto.message
        ? `<p>${escapeHtml(dto.message)}</p>`
        : `<p>Nous vous invitons a regulariser votre situation dans les meilleurs delais.</p>`;
      await this.mailService.envoyer(
        client.email,
        "Relance — Cabinet d'huissier",
        `<p>Bonjour ${escapeHtml(client.nom)},</p>${message}<p>Cordialement.</p>`,
      );
    }

    return relance;
  }

  async donnerAccesPortail(id: string) {
    const client = await this.tenantDb.queryOne<{ id: string; nom: string; email: string | null }>(
      `SELECT id, nom, email FROM clients WHERE id = $1`,
      [id],
    );
    if (!client) throw new NotFoundException('Client/debiteur introuvable.');
    if (!client.email) {
      throw new BadRequestException("Ce client n'a pas d'adresse email renseignee.");
    }

    const tempPassword = crypto.randomBytes(9).toString('base64url');
    const hashed = await bcrypt.hash(tempPassword, Number(process.env.BCRYPT_COST ?? 12));
    await this.tenantDb.query(`UPDATE clients SET mot_de_passe = $1, acces_portail = TRUE WHERE id = $2`, [
      hashed,
      id,
    ]);

    await this.mailService.envoyer(
      client.email,
      'Acces a votre espace client',
      `<p>Bonjour ${escapeHtml(client.nom)},</p>
       <p>Vous pouvez desormais suivre vos dossiers et factures en ligne.</p>
       <p>Identifiant : ${client.email}<br>Mot de passe temporaire : <strong>${tempPassword}</strong></p>
       <p>Merci de le changer des votre premiere connexion.</p>`,
    );

    return { email: client.email, motDePasseTemporaire: tempPassword };
  }
  private logoDir(): string {
    const { schemaName } = this.tenantContext.get();
    return join(STORAGE_ROOT, schemaName, 'logos');
  }

  async uploadLogo(id: string, file: Express.Multer.File) {
    const extension = EXTENSIONS_LOGO_AUTORISEES[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Format non supporté. Utilisez une image JPG, PNG ou WEBP.');
    }

    const existant = await this.tenantDb.queryOne<{ logo_path: string | null }>(
      `SELECT logo_path FROM clients WHERE id = $1`,
      [id],
    );
    if (!existant) throw new NotFoundException('Client/débiteur introuvable.');

    const dir = this.logoDir();
    await mkdir(dir, { recursive: true });
    const cheminFichier = join(dir, `${id}${extension}`);
    await writeFile(cheminFichier, file.buffer);

    if (existant.logo_path && existant.logo_path !== cheminFichier) {
      await unlink(existant.logo_path).catch(() => undefined);
    }

    await this.tenantDb.query(`UPDATE clients SET logo_path = $1 WHERE id = $2`, [cheminFichier, id]);
    return { success: true };
  }

  async removeLogo(id: string) {
    const existant = await this.tenantDb.queryOne<{ logo_path: string | null }>(
      `SELECT logo_path FROM clients WHERE id = $1`,
      [id],
    );
    if (!existant) throw new NotFoundException('Client/débiteur introuvable.');

    if (existant.logo_path) {
      await unlink(existant.logo_path).catch(() => undefined);
    }
    await this.tenantDb.query(`UPDATE clients SET logo_path = NULL WHERE id = $1`, [id]);
    return { success: true };
  }

  async getLogoPath(id: string): Promise<string | null> {
    const row = await this.tenantDb.queryOne<{ logo_path: string | null }>(
      `SELECT logo_path FROM clients WHERE id = $1`,
      [id],
    );
    return row?.logo_path ?? null;
  }

  async remove(id: string) {
    const client = await this.tenantDb.queryOne<{ id: string; nom: string }>(
      `SELECT id, nom FROM clients WHERE id = $1`,
      [id],
    );
    if (!client) throw new NotFoundException('Client/debiteur introuvable.');

    const dossiersCount = await this.tenantDb.queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM dossiers WHERE client_id = $1 OR debiteur_id = $1`,
      [id],
    );
    if (Number(dossiersCount?.total ?? 0) > 0) {
      throw new ConflictException(
        "Cette fiche a des dossiers rattaches (comme client ou comme debiteur) — supprimez-les d'abord (ou changez leur client/debiteur) avant de supprimer cette fiche.",
      );
    }

    await this.tenantDb.query(`DELETE FROM relances WHERE client_id = $1`, [id]);
    await this.tenantDb.query(`DELETE FROM alertes_clients_historique WHERE client_id = $1`, [id]);
    await this.tenantDb.query(`DELETE FROM clients WHERE id = $1`, [id]);

    return { id, nom: client.nom, supprime: true };
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

