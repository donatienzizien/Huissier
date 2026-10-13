import { Injectable, Logger } from '@nestjs/common';
import { TenantCronDbService } from '../tenant/tenant-cron-db.service';

type QueryFn = <T = any>(sql: string, params?: any[]) => Promise<T[]>;

@Injectable()
export class RelancesAutomatiquesService {
  private readonly logger = new Logger(RelancesAutomatiquesService.name);

  constructor(private readonly tenantCronDb: TenantCronDbService) {}

  async scannerEtCreerRelances() {
    const schemas = await this.tenantCronDb.getTenantSchemas();

    this.logger.log(`Scan des relances pour ${schemas.length} cabinet(s).`);

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

    this.logger.log('Scan des relances terminé.');
  }

  private async processSchema(
    schema: string,
    query: QueryFn,
  ) {
    this.logger.log(`Traitement du cabinet : ${schema}`);

    const creances = await query<{
      id: string;
      numero: string;
      date_exigibilite: string;
      debiteur_nom: string;
    }>(
      `
      SELECT c.id, c.numero, c.date_exigibilite,
             cl.nom AS debiteur_nom
      FROM creances c
      JOIN dossiers d ON d.id = c.dossier_id
      JOIN clients cl ON cl.id = d.debiteur_id
      WHERE c.date_exigibilite IS NOT NULL
        AND c.date_exigibilite < NOW()
        AND c.statut IN ('ACTIVE', 'PARTIELLEMENT_ENCAISSEE')
        AND NOT EXISTS (
          SELECT 1
          FROM relances_creance rc
          WHERE rc.creance_id = c.id
            AND rc.created_at > NOW() - INTERVAL '7 days'
        )
      `,
    );

    this.logger.log(`${creances.length} créance(s) échue(s) trouvée(s).`);

    for (const creance of creances) {
      try {
        const joursRetard = Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(creance.date_exigibilite).getTime()) /
              86_400_000,
          ),
        );

        await query(
          `INSERT INTO relances_creance
             (creance_id, canal, commentaire, prochaine_action, prochaine_action_le, relance_par)
           VALUES ($1, 'AUTRE', $2, 'Vérifier la créance et contacter le débiteur', NOW() + INTERVAL '7 days', NULL)`,
          [
            creance.id,
            `Relance automatique - Créance ${creance.numero} en retard de ${joursRetard} jours`,
          ],
        );

        this.logger.log(
          `Relance créée pour ${creance.numero} (${creance.debiteur_nom}).`,
        );
      } catch (error: any) {
        this.logger.error(
          `Erreur pour la créance ${creance.numero} : ${error?.message ?? error}`,
        );
      }
    }
  }
}