import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../notifications/mail.service';

interface FactureAlerte {
  id: string;
  numero: string;
  montant_total: string;
  montant_paye: string;
  date_echeance: string;
  client_nom: string;
  client_prenom: string | null;
  client_email: string | null;
  dossier_numero: string;
}

const JOURS_AVANT_RAPPEL_ECHEANCE = 3;
const JOURS_ENTRE_RELANCES_RETARD = 7;

// Alertes automatiques envoyees AUX CLIENTS (par opposition a
// reminders.service.ts qui alerte le personnel interne sur l'agenda).
// Parcourt chaque cabinet actif, sans TenantContext (job hors requete).
@Injectable()
export class AlertesClientsService {
  private readonly logger = new Logger(AlertesClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // Decale a 8h (les rappels internes tournent a 7h) pour repartir la
  // charge et faciliter le diagnostic si l'un des deux jobs echoue.
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async envoyerAlertesQuotidiennes() {
    const cabinets = await this.prisma.cabinet.findMany({ where: { statut: 'ACTIF' } });
    this.logger.log(`Verification des alertes clients pour ${cabinets.length} cabinet(s).`);

    for (const cabinet of cabinets) {
      try {
        await this.traiterCabinet(cabinet.schemaName, cabinet.nom);
      } catch (err) {
        this.logger.error(`Echec des alertes clients pour ${cabinet.slug} : ${(err as Error).message}`);
      }
    }
  }

  private async traiterCabinet(schemaName: string, cabinetNom: string) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schemaName}"`);
      await this.envoyerEcheancesProches(client, cabinetNom);
      await this.envoyerRetards(client, cabinetNom);
    } finally {
      client.release();
      await pool.end();
    }
  }

  // Echeance proche (J-3) : envoyee UNE SEULE FOIS par facture, jamais
  // repetee ensuite meme si la facture reste impayee (le cas "retard"
  // prend le relais des que la date est depassee).
  private async envoyerEcheancesProches(client: import('pg').PoolClient, cabinetNom: string) {
    const { rows } = await client.query<FactureAlerte>(
      `SELECT f.id, f.numero, f.montant_total, f.montant_paye, f.date_echeance,
              c.nom AS client_nom, c.prenom AS client_prenom, c.email AS client_email,
              d.numero AS dossier_numero
       FROM factures f
       JOIN dossiers d ON d.id = f.dossier_id
       JOIN clients c ON c.id = d.client_id
       WHERE f.statut IN ('ENVOYEE', 'PARTIELLE')
         AND f.date_echeance IS NOT NULL
         AND f.date_echeance::date = (CURRENT_DATE + $1::int)
         AND f.alerte_echeance_envoyee = FALSE`,
      [JOURS_AVANT_RAPPEL_ECHEANCE],
    );

    for (const f of rows) {
      if (f.client_email) {
        const restant = Number(f.montant_total) - Number(f.montant_paye);
        await this.mailService.envoyer(
          f.client_email,
          `${cabinetNom} — Echeance a venir (facture ${f.numero})`,
          `<p>Bonjour ${escapeHtml(f.client_nom)},</p>
           <p>Nous vous rappelons que la facture <strong>${escapeHtml(f.numero)}</strong>
           (dossier ${escapeHtml(f.dossier_numero)}) arrive a echeance le
           ${new Date(f.date_echeance).toLocaleDateString('fr-FR')}, pour un solde restant de
           ${new Intl.NumberFormat('fr-FR').format(restant)} FCFA.</p>
           <p>Merci de bien vouloir proceder au reglement dans les delais.</p>
           <p>Cordialement,<br>${escapeHtml(cabinetNom)}</p>`,
        );
      }
      await client.query(`UPDATE factures SET alerte_echeance_envoyee = TRUE WHERE id = $1`, [f.id]);
    }
  }

  // Facture en retard : premiere alerte des le lendemain de l'echeance,
  // puis relance automatique tous les JOURS_ENTRE_RELANCES_RETARD jours
  // tant que la facture reste impayee.
  private async envoyerRetards(client: import('pg').PoolClient, cabinetNom: string) {
    const { rows } = await client.query<FactureAlerte>(
      `SELECT f.id, f.numero, f.montant_total, f.montant_paye, f.date_echeance,
              c.nom AS client_nom, c.prenom AS client_prenom, c.email AS client_email,
              d.numero AS dossier_numero
       FROM factures f
       JOIN dossiers d ON d.id = f.dossier_id
       JOIN clients c ON c.id = d.client_id
       WHERE f.statut IN ('ENVOYEE', 'PARTIELLE')
         AND f.date_echeance IS NOT NULL
         AND f.date_echeance::date < CURRENT_DATE
         AND (
           f.alerte_retard_derniere_le IS NULL
           OR f.alerte_retard_derniere_le < now() - ($1::int * INTERVAL '1 day')
         )`,
      [JOURS_ENTRE_RELANCES_RETARD],
    );

    for (const f of rows) {
      if (f.client_email) {
        const restant = Number(f.montant_total) - Number(f.montant_paye);
        const joursRetard = Math.floor(
          (Date.now() - new Date(f.date_echeance).getTime()) / (24 * 3600 * 1000),
        );
        await this.mailService.envoyer(
          f.client_email,
          `${cabinetNom} — Facture en retard (${f.numero})`,
          `<p>Bonjour ${escapeHtml(f.client_nom)},</p>
           <p>La facture <strong>${escapeHtml(f.numero)}</strong> (dossier
           ${escapeHtml(f.dossier_numero)}) est en retard de paiement depuis ${joursRetard}
           jour${joursRetard > 1 ? 's' : ''}, pour un solde restant de
           ${new Intl.NumberFormat('fr-FR').format(restant)} FCFA.</p>
           <p>Nous vous invitons a regulariser votre situation dans les meilleurs delais.</p>
           <p>Cordialement,<br>${escapeHtml(cabinetNom)}</p>`,
        );
      }
      await client.query(`UPDATE factures SET alerte_retard_derniere_le = now() WHERE id = $1`, [f.id]);
    }
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
