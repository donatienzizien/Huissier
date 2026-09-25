import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDbService } from '../tenant/tenant-db.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateFactureDto } from './dto/create-facture.dto';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { QueryFacturesDto } from './dto/query-factures.dto';

const FACTURE_TEMPLATE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #1b2c4a; }
  h1 { font-size: 18pt; margin-bottom: 0; }
  .meta { text-align: right; font-size: 10pt; color: #555; margin-top: -20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 30px; }
  th, td { border-bottom: 1px solid #d7e0ee; padding: 8px; text-align: left; }
  .total { text-align: right; font-weight: bold; font-size: 13pt; margin-top: 20px; }
  .statut { display: inline-block; padding: 4px 10px; border-radius: 4px; background: #eef2f8; }
</style></head><body>
  <h1>{{cabinetNom}}</h1>
  <p class="meta">Facture {{numero}} — emise le {{dateEmission}}</p>
  <p>Client : <strong>{{clientNom}}</strong></p>
  <p>Dossier : {{dossierNumero}}</p>
  <table>
    <tr><th>Description</th><th style="text-align:right">Montant</th></tr>
    <tr><td>Prestation — dossier {{dossierNumero}}</td><td style="text-align:right">{{montantTotal}} FCFA</td></tr>
  </table>
  <p class="total">Total : {{montantTotal}} FCFA</p>
  <p>Montant regle : {{montantPaye}} FCFA — Solde : {{montantRestant}} FCFA</p>
  <p class="statut">{{statut}}</p>
</body></html>`;

@Injectable()
export class FacturationService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  private async prochainNumero(): Promise<string> {
    const annee = new Date().getFullYear();
    const cle = `facture_${annee}`;
    const row = await this.tenantDb.queryOne<{ valeur: number }>(
      `INSERT INTO compteurs (cle, valeur) VALUES ($1, 1)
       ON CONFLICT (cle) DO UPDATE SET valeur = compteurs.valeur + 1
       RETURNING valeur`,
      [cle],
    );
    const sequence = String(row!.valeur).padStart(4, '0');
    return `FAC-${annee}-${sequence}`;
  }

  async create(dto: CreateFactureDto) {
    const dossier = await this.tenantDb.queryOne(`SELECT id FROM dossiers WHERE id = $1`, [
      dto.dossierId,
    ]);
    if (!dossier) throw new NotFoundException('Dossier introuvable.');

    const numero = await this.prochainNumero();
    return this.tenantDb.queryOne(
      `INSERT INTO factures (numero, dossier_id, montant_total, statut, date_echeance)
       VALUES ($1,$2,$3,'ENVOYEE',$4) RETURNING *`,
      [numero, dto.dossierId, dto.montantTotal, dto.dateEcheance ?? null],
    );
  }

  async findAll(query: QueryFacturesDto) {
    const { page, limit, statut, dossierId } = query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (statut) {
      params.push(statut);
      conditions.push(`f.statut = $${params.length}`);
    }
    if (dossierId) {
      params.push(dossierId);
      conditions.push(`f.dossier_id = $${params.length}`);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const rows = await this.tenantDb.query(
      `SELECT f.*, d.numero AS dossier_numero, c.nom AS client_nom, c.prenom AS client_prenom
       FROM factures f
       JOIN dossiers d ON d.id = f.dossier_id
       JOIN clients c ON c.id = d.client_id
       ${whereClause}
       ORDER BY f.date_emission DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    const countRow = await this.tenantDb.queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM factures f ${whereClause}`,
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
    const facture = await this.tenantDb.queryOne(
      `SELECT f.*, d.numero AS dossier_numero, c.nom AS client_nom, c.prenom AS client_prenom
       FROM factures f
       JOIN dossiers d ON d.id = f.dossier_id
       JOIN clients c ON c.id = d.client_id
       WHERE f.id = $1`,
      [id],
    );
    if (!facture) throw new NotFoundException('Facture introuvable.');

    const paiements = await this.tenantDb.query(
      `SELECT * FROM paiements WHERE facture_id = $1 ORDER BY date_paiement DESC`,
      [id],
    );
    return { ...facture, paiements };
  }

  async ajouterPaiement(factureId: string, dto: CreatePaiementDto) {
    const facture = await this.tenantDb.queryOne<{
      id: string;
      montant_total: string;
      montant_paye: string;
      statut: string;
    }>(`SELECT * FROM factures WHERE id = $1`, [factureId]);
    if (!facture) throw new NotFoundException('Facture introuvable.');
    if (facture.statut === 'ANNULEE') {
      throw new BadRequestException("Impossible d'encaisser un paiement sur une facture annulee.");
    }
    if (facture.statut === 'PAYEE') {
      throw new BadRequestException('Cette facture est deja entierement payee.');
    }

    const restant = Number(facture.montant_total) - Number(facture.montant_paye);
    if (dto.montant > restant) {
      throw new BadRequestException(
        `Le montant depasse le solde restant (${restant.toLocaleString('fr-FR')} FCFA). ` +
          'Verifiez le montant ou cloturez la facture separement.',
      );
    }

    return this.tenantDb.transaction(async (client) => {
      await client.query(
        `INSERT INTO paiements (facture_id, montant, mode, reference) VALUES ($1,$2,$3,$4)`,
        [factureId, dto.montant, dto.mode, dto.reference ?? null],
      );

      const totalPayeRow = await client.query(
        `SELECT COALESCE(SUM(montant),0) AS total FROM paiements WHERE facture_id = $1`,
        [factureId],
      );
      const totalPaye = Number(totalPayeRow.rows[0].total);
      const montantTotal = Number(facture.montant_total);
      const nouveauStatut = totalPaye >= montantTotal ? 'PAYEE' : totalPaye > 0 ? 'PARTIELLE' : facture.statut;

      const updated = await client.query(
        `UPDATE factures SET montant_paye = $1, statut = $2, updated_at = now() WHERE id = $3 RETURNING *`,
        [totalPaye, nouveauStatut, factureId],
      );
      return updated.rows[0];
    });
  }

  // Bloquee si des paiements ont deja ete encaisses : annuler ferait
  // disparaitre une facture "PAYEE" ou "PARTIELLE" en laissant les lignes
  // de paiements orphelines en base, ce qui fausserait durablement les
  // rapports de recouvrement. Le comptable doit d'abord regulariser
  // (remboursement, avoir) avant de pouvoir annuler.
  async annuler(id: string) {
    const facture = await this.tenantDb.queryOne<{ id: string; montant_paye: string }>(
      `SELECT id, montant_paye FROM factures WHERE id = $1`,
      [id],
    );
    if (!facture) throw new NotFoundException('Facture introuvable.');
    if (Number(facture.montant_paye) > 0) {
      throw new BadRequestException(
        'Cette facture a deja des paiements encaisses — impossible de l\'annuler directement. ' +
          'Contactez un administrateur pour regulariser la situation.',
      );
    }
    return this.tenantDb.queryOne(
      `UPDATE factures SET statut = 'ANNULEE', updated_at = now() WHERE id = $1 RETURNING *`,
      [id],
    );
  }

  async getPdfBuffer(id: string): Promise<{ buffer: Buffer; numero: string }> {
    const facture = await this.findOne(id);
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id: this.tenantContext.get().id },
    });

    const montantTotal = Number(facture.montant_total);
    const montantPaye = Number(facture.montant_paye);

    const buffer = await this.pdfService.genererPdf(FACTURE_TEMPLATE, {
      cabinetNom: cabinet?.nom ?? "Cabinet d'huissier",
      numero: facture.numero,
      dateEmission: new Date(facture.date_emission).toLocaleDateString('fr-FR'),
      clientNom: `${facture.client_nom} ${facture.client_prenom ?? ''}`.trim(),
      dossierNumero: facture.dossier_numero,
      montantTotal: montantTotal.toLocaleString('fr-FR'),
      montantPaye: montantPaye.toLocaleString('fr-FR'),
      montantRestant: (montantTotal - montantPaye).toLocaleString('fr-FR'),
      statut: facture.statut,
    });

    return { buffer, numero: facture.numero as string };
  }
}
