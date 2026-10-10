import { Injectable, Logger } from '@nestjs/common';
import { TenantCronDbService } from '../tenant/tenant-cron-db.service';

@Injectable()
export class AgendaNotificationsService {
  private readonly logger = new Logger(AgendaNotificationsService.name);

  constructor(private readonly tenantCronDb: TenantCronDbService) {}

  async scannerEtNotifierActionsEchues() {
    const schemas = await this.tenantCronDb.getTenantSchemas();

    this.logger.log(
      `Scan des notifications agenda pour ${schemas.length} cabinet(s).`,
    );

    for (const schema of schemas) {
      try {
        await this.tenantCronDb.withTenant(schema, async (query) => {
          await this.processSchema(schema, query);
        });
      } catch (error: any) {
        this.logger.error(
          `Erreur lors du traitement du cabinet ${schema} : ${error?.message ?? error}`,
        );
      }
    }

    this.logger.log('Scan des notifications agenda terminé.');
  }

  private async processSchema(
    schema: string,
    query: (sql: string, params?: any[]) => Promise<any[]>,
  ) {
    this.logger.log(`Traitement du cabinet : ${schema}`);

    const actionsEchues = await query(
      `
      SELECT a.id, a.titre, a.description, a.date_echeance, a.assigne_a,
             u.email, u.nom AS utilisateur_nom
      FROM agenda_actions a
      LEFT JOIN utilisateurs u ON a.assigne_a = u.id
      WHERE a.date_echeance < NOW()
        AND a.statut != 'TERMINE'
        AND (a.notifie IS NULL OR a.notifie = false)
      `,
    );

    this.logger.log(`${actionsEchues.length} action(s) échue(s) trouvée(s).`);

    for (const action of actionsEchues) {
      try {
        await query(
          `UPDATE agenda_actions
           SET notifie = true, notifie_le = NOW()
           WHERE id = $1`,
          [action.id],
        );

        this.logger.log(
          `Action « ${action.titre} » marquée comme notifiée (${action.utilisateur_nom}).`,
        );
      } catch (error: any) {
        this.logger.error(
          `Erreur pour l’action « ${action.titre} » : ${error?.message ?? error}`,
        );
      }
    }
  }
}