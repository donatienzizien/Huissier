import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { TenantDbService } from '../tenant/tenant-db.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';

const LABELS_STATUT: Record<string, string> = {
  OUVERT: 'Ouvert',
  EN_COURS: 'En cours',
  CLOTURE: 'Cloture',
  ARCHIVE: 'Archive',
};

const LABELS_TYPE: Record<string, string> = {
  RECOUVREMENT: 'Recouvrement',
  EXPULSION: 'Expulsion',
  SIGNIFICATION: 'Signification',
  SAISIE: 'Saisie',
  AUTRE: 'Autre',
};

const RAPPORT_TEMPLATE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { font-family: Georgia, serif; font-size: 11pt; color: #1b2c4a; line-height: 1.5; }
  h1 { font-size: 18pt; margin-bottom: 2px; }
  .sous-titre { color: #6B6252; font-size: 10pt; margin-top: 0; margin-bottom: 24px; }
  h2 { font-size: 13pt; color: #14213D; border-bottom: 1px solid #E7E2D6; padding-bottom: 4px; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border-bottom: 1px solid #E7E2D6; padding: 6px 8px; text-align: left; font-size: 10pt; }
  th { color: #6B6252; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.4px; }
  .droite { text-align: right; }
  .kpis { display: flex; gap: 16px; margin-top: 10px; }
  .kpi { flex: 1; border: 1px solid #E7E2D6; border-radius: 6px; padding: 12px; }
  .kpi .label { font-size: 8.5pt; color: #6B6252; text-transform: uppercase; }
  .kpi .valeur { font-size: 15pt; font-weight: bold; color: #14213D; margin-top: 4px; }
  .pied { margin-top: 40px; font-size: 8.5pt; color: #999; text-align: right; }
</style></head><body>
  <h1>{{cabinetNom}}</h1>
  <p class="sous-titre">Rapport d'activite — periode : {{periodeLibelle}}</p>

  <div class="kpis">
    <div class="kpi"><div class="label">Total facture</div><div class="valeur">{{totalFacture}} FCFA</div></div>
    <div class="kpi"><div class="label">Total encaisse</div><div class="valeur">{{totalEncaisse}} FCFA</div></div>
    <div class="kpi"><div class="label">Taux de recouvrement</div><div class="valeur">{{tauxPourcentage}}%</div></div>
  </div>

  <h2>Chiffre d'affaires encaisse par mois</h2>
  <table>
    <tr><th>Mois</th><th class="droite">Montant encaisse (FCFA)</th></tr>
    {{#each ca}}
    <tr><td>{{this.mois}}</td><td class="droite">{{this.total}}</td></tr>
    {{/each}}
  </table>

  <h2>Dossiers par statut</h2>
  <table>
    <tr><th>Statut</th><th class="droite">Nombre</th></tr>
    {{#each statuts}}
    <tr><td>{{this.label}}</td><td class="droite">{{this.total}}</td></tr>
    {{/each}}
  </table>

  <h2>Dossiers par type</h2>
  <table>
    <tr><th>Type</th><th class="droite">Nombre</th></tr>
    {{#each types}}
    <tr><td>{{this.label}}</td><td class="droite">{{this.total}}</td></tr>
    {{/each}}
  </table>

  <p class="pied">Genere le {{dateGeneration}}</p>
</body></html>`;

@Injectable()
export class RapportsService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  async dashboard() {
    const [dossiersActifs, caMois, actesMois, rdvJour] = await Promise.all([
      this.tenantDb.queryOne<{ total: string }>(
        `SELECT COUNT(*) AS total FROM dossiers WHERE statut IN ('OUVERT','EN_COURS')`,
      ),
      this.tenantDb.queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(montant),0) AS total FROM paiements
         WHERE date_paiement >= date_trunc('month', CURRENT_DATE)`,
      ),
      this.tenantDb.queryOne<{ total: string }>(
        `SELECT COUNT(*) AS total FROM actes WHERE date_acte >= date_trunc('month', CURRENT_DATE)`,
      ),
      this.tenantDb.queryOne<{ total: string }>(
        `SELECT COUNT(*) AS total FROM evenements WHERE date_debut::date = CURRENT_DATE`,
      ),
    ]);

    return {
      dossiersActifs: Number(dossiersActifs?.total ?? 0),
      chiffreAffairesMois: Number(caMois?.total ?? 0),
      actesGeneresMois: Number(actesMois?.total ?? 0),
      rendezVousAujourdhui: Number(rdvJour?.total ?? 0),
    };
  }

  async dossiersParStatut() {
    return this.tenantDb.query<{ statut: string; total: string }>(
      `SELECT statut, COUNT(*) AS total FROM dossiers GROUP BY statut ORDER BY statut`,
    );
  }

  async dossiersParType() {
    return this.tenantDb.query<{ type: string; total: string }>(
      `SELECT type, COUNT(*) AS total FROM dossiers GROUP BY type ORDER BY type`,
    );
  }

  // Chiffre d'affaires encaisse par mois. Sans parametres : comportement
  // d'origine (6 derniers mois glissants, utilise par le dashboard).
  // Avec dateDebut/dateFin : plage arbitraire (utilise par la page
  // Rapports et les exports).
  async chiffreAffairesMensuel(dateDebut?: string, dateFin?: string) {
    const fin = dateFin ? new Date(dateFin) : new Date();
    const debut = dateDebut ? new Date(dateDebut) : new Date(fin.getFullYear(), fin.getMonth() - 5, 1);

    return this.tenantDb.query<{ mois: string; total: string }>(
      `SELECT to_char(date_trunc('month', gs), 'YYYY-MM') AS mois,
              COALESCE(SUM(p.montant), 0) AS total
       FROM generate_series(
              date_trunc('month', $1::date),
              date_trunc('month', $2::date),
              interval '1 month'
            ) AS gs
       LEFT JOIN paiements p
         ON date_trunc('month', p.date_paiement) = date_trunc('month', gs)
       GROUP BY 1 ORDER BY 1`,
      [debut.toISOString().slice(0, 10), fin.toISOString().slice(0, 10)],
    );
  }

  async tauxRecouvrement() {
    const row = await this.tenantDb.queryOne<{ total_facture: string; total_encaisse: string }>(
      `SELECT
         COALESCE(SUM(montant_total), 0) AS total_facture,
         COALESCE(SUM(montant_paye), 0) AS total_encaisse
       FROM factures WHERE statut != 'ANNULEE'`,
    );
    const totalFacture = Number(row?.total_facture ?? 0);
    const totalEncaisse = Number(row?.total_encaisse ?? 0);
    return {
      totalFacture,
      totalEncaisse,
      tauxPourcentage: totalFacture > 0 ? Math.round((totalEncaisse / totalFacture) * 1000) / 10 : 0,
    };
  }

  private formatMoisLisible(moisIso: string): string {
    const [annee, m] = moisIso.split('-');
    const date = new Date(Number(annee), Number(m) - 1, 1);
    const libelle = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return libelle.charAt(0).toUpperCase() + libelle.slice(1);
  }

  private async donneesRapport(dateDebut?: string, dateFin?: string) {
    const [ca, statuts, types, taux, cabinet] = await Promise.all([
      this.chiffreAffairesMensuel(dateDebut, dateFin),
      this.dossiersParStatut(),
      this.dossiersParType(),
      this.tauxRecouvrement(),
      this.prisma.cabinet.findUnique({ where: { id: this.tenantContext.get().id }, select: { nom: true } }),
    ]);

    const fin = dateFin ? new Date(dateFin) : new Date();
    const debut = dateDebut ? new Date(dateDebut) : new Date(fin.getFullYear(), fin.getMonth() - 5, 1);
    const periodeLibelle = `${debut.toLocaleDateString('fr-FR')} au ${fin.toLocaleDateString('fr-FR')}`;

    return {
      cabinetNom: cabinet?.nom ?? 'Cabinet',
      periodeLibelle,
      dateGeneration: new Date().toLocaleString('fr-FR'),
      ca: ca.map((c) => ({ mois: this.formatMoisLisible(c.mois), total: Number(c.total).toLocaleString('fr-FR') })),
      statuts: statuts.map((s) => ({ label: LABELS_STATUT[s.statut] ?? s.statut, total: s.total })),
      types: types.map((t) => ({ label: LABELS_TYPE[t.type] ?? t.type, total: t.total })),
      totalFacture: taux.totalFacture.toLocaleString('fr-FR'),
      totalEncaisse: taux.totalEncaisse.toLocaleString('fr-FR'),
      tauxPourcentage: taux.tauxPourcentage,
    };
  }

  async genererRapportPdf(dateDebut?: string, dateFin?: string): Promise<Buffer> {
    const donnees = await this.donneesRapport(dateDebut, dateFin);
    return this.pdfService.genererPdf(RAPPORT_TEMPLATE, donnees);
  }

  async genererRapportExcel(dateDebut?: string, dateFin?: string): Promise<Buffer> {
    const donnees = await this.donneesRapport(dateDebut, dateFin);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = donnees.cabinetNom;
    workbook.created = new Date();

    const styleEntete = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF14213D' } } };

    const feuilleResume = workbook.addWorksheet('Resume');
    feuilleResume.columns = [{ width: 30 }, { width: 20 }];
    feuilleResume.addRow(['Cabinet', donnees.cabinetNom]);
    feuilleResume.addRow(['Periode', donnees.periodeLibelle]);
    feuilleResume.addRow(['Genere le', donnees.dateGeneration]);
    feuilleResume.addRow([]);
    feuilleResume.addRow(['Total facture (FCFA)', donnees.totalFacture]);
    feuilleResume.addRow(['Total encaisse (FCFA)', donnees.totalEncaisse]);
    feuilleResume.addRow(['Taux de recouvrement (%)', donnees.tauxPourcentage]);

    const feuilleCa = workbook.addWorksheet("Chiffre d'affaires");
    feuilleCa.columns = [{ header: 'Mois', width: 22 }, { header: 'Montant encaisse (FCFA)', width: 26 }];
    feuilleCa.getRow(1).eachCell((cell) => Object.assign(cell, styleEntete));
    donnees.ca.forEach((c) => feuilleCa.addRow([c.mois, c.total]));

    const feuilleStatut = workbook.addWorksheet('Dossiers par statut');
    feuilleStatut.columns = [{ header: 'Statut', width: 22 }, { header: 'Nombre', width: 14 }];
    feuilleStatut.getRow(1).eachCell((cell) => Object.assign(cell, styleEntete));
    donnees.statuts.forEach((s) => feuilleStatut.addRow([s.label, s.total]));

    const feuilleType = workbook.addWorksheet('Dossiers par type');
    feuilleType.columns = [{ header: 'Type', width: 22 }, { header: 'Nombre', width: 14 }];
    feuilleType.getRow(1).eachCell((cell) => Object.assign(cell, styleEntete));
    donnees.types.forEach((t) => feuilleType.addRow([t.label, t.total]));

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer as ArrayBuffer);
  }
}
