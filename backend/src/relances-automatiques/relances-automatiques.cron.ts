import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RelancesAutomatiquesService } from '../relances-automatiques/relances-automatiques.service';

@Injectable()
export class RelancesAutomatiquesCron {
  private readonly logger = new Logger(RelancesAutomatiquesCron.name);

  constructor(private readonly service: RelancesAutomatiquesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleCron() {
    this.logger.log('⏰ [CRON] Exécution quotidienne des relances automatiques');
    await this.service.scannerEtCreerRelances();
  }
}
