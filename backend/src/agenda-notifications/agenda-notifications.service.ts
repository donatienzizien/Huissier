import { Injectable, Logger } from '@nestjs/common';
import { TenantCronDbService } from '../tenant/tenant-cron-db.service';

@Injectable()
export class AgendaNotificationsService {
  private readonly logger = new Logger(AgendaNotificationsService.name);

  constructor(private readonly tenantCronDb: TenantCronDbService) {}

  async scannerEtNotifierActionsEchues() {
    const schemas = await this.tenantCronDb.getTenantSchemas();

    this.logger.log(
      'Scan des notifications agenda pour ' + schemas.length + ' cabinet(s).',
    );

    for (const schema of schemas) {
      try {
        await this.tenantCronDb.withTenant(schema, async (query) => {
          await this.processSchema(schema, query);
        });
      } catch (error: any) {
        this.logger.error(
          'Erreur lors du traitement du cabinet ' +
            schema +
            ' : ' +
            (error?.message ?? error),
        );
      }
    }

    this.logger.log('Scan des notifications agenda terminé.');
  }

  private async processSchema(
    schema: string,
    query: (sql: string, params?: any[]) => Promise<any[]>,
  ) {
    this.logger.log('Traitement du cabinet : ' + schema);

    const evenements = await query(`
      SELECT id, titre, date_debut, rappel_j1, rappel_j7,
             rappel_j1_envoye, rappel_j7_envoye
      FROM evenements
      WHERE date_debut < NOW()
    `);

    this.logger.log(
      evenements.length + ' evenement(s) passe(s) trouve(s).',
    );

    for (const evenement of evenements) {
      try {
        if (evenement.rappel_j1 && !evenement.rappel_j1_envoye) {
          await query(
            `UPDATE evenements
             SET rappel_j1_envoye = true
             WHERE id = $1`,
            [evenement.id],
          );

          this.logger.log(
            'Rappel J-1 marque comme envoye pour : ' + evenement.titre,
          );
        }

        if (evenement.rappel_j7 && !evenement.rappel_j7_envoye) {
          await query(
            `UPDATE evenements
             SET rappel_j7_envoye = true
             WHERE id = $1`,
            [evenement.id],
          );

          this.logger.log(
            'Rappel J-7 marque comme envoye pour : ' + evenement.titre,
          );
        }
      } catch (error: any) {
        this.logger.error(
          'Erreur pour l’evenement « ' +
            evenement.titre +
            ' » : ' +
            (error?.message ?? error),
        );
      }
    }
  }
}