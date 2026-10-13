import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Pool, PoolClient, escapeIdentifier } from 'pg';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../notifications/mail.service';

interface EvenementDu {
  id: string;
  titre: string;
  date_debut: string;
  assigne_email: string | null;
  assigne_nom: string | null;
}

const remindersPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async envoyerRappelsQuotidiens() {
    const cabinets = await this.prisma.cabinet.findMany({
      where: { statut: 'ACTIF' },
    });

    this.logger.log(
      `Vérification des rappels d'agenda pour ${cabinets.length} cabinet(s).`,
    );

    for (const cabinet of cabinets) {
      try {
        await this.traiterCabinet(cabinet.schemaName, cabinet.nom);
      } catch (err) {
        this.logger.error(
          `Échec des rappels pour ${cabinet.slug} : ${(err as Error).message}`,
        );
      }
    }
  }

  private async traiterCabinet(schemaName: string, cabinetNom: string) {
    if (!/^cabinet_[a-z][a-z0-9_]{2,30}$/.test(schemaName)) {
      throw new Error(`Schéma tenant invalide : ${schemaName}`);
    }

    const client = await remindersPool.connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `SET LOCAL search_path TO ${escapeIdentifier(schemaName)}`,
      );

      await this.envoyerPour(
        client,
        'rappel_j1',
        'rappel_j1_envoye',
        1,
        cabinetNom,
      );

      await this.envoyerPour(
        client,
        'rappel_j7',
        'rappel_j7_envoye',
        7,
        cabinetNom,
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async envoyerPour(
    client: PoolClient,
    colonneActive: 'rappel_j1' | 'rappel_j7',
    colonneEnvoyee: 'rappel_j1_envoye' | 'rappel_j7_envoye',
    joursAvant: number,
    cabinetNom: string,
  ) {
    const { rows } = await client.query<EvenementDu>(
      `SELECT e.id, e.titre, e.date_debut,
              u.email AS assigne_email, u.nom AS assigne_nom
       FROM evenements e
       LEFT JOIN utilisateurs u ON u.id = e.assigne_a
       WHERE e.${colonneActive} = TRUE
         AND e.${colonneEnvoyee} = FALSE
         AND e.date_debut::date = (CURRENT_DATE + $1::int)`,
      [joursAvant],
    );

    for (const evenement of rows) {
      if (!evenement.assigne_email) {
        this.logger.warn(
          `Rappel ignoré pour "${evenement.titre}" : aucun email assigné.`,
        );
        continue;
      }

      const envoye = await this.mailService.envoyer(
        evenement.assigne_email,
        `Rappel — ${evenement.titre}`,
        `<p>Bonjour ${evenement.assigne_nom ?? ''},</p>
         <p>Rappel : <strong>${evenement.titre}</strong> est prévu le
         ${new Date(evenement.date_debut).toLocaleDateString('fr-FR')}.</p>
         <p>${cabinetNom}</p>`,
      );

      if (!envoye) {
        this.logger.warn(
          `Rappel non marqué comme envoyé pour "${evenement.titre}" : échec SMTP.`,
        );
        continue;
      }

      await client.query(
        `UPDATE evenements
         SET ${colonneEnvoyee} = TRUE
         WHERE id = $1`,
        [evenement.id],
      );
    }
  }
}
