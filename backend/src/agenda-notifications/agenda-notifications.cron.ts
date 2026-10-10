import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgendaNotificationsService } from './agenda-notifications.service';

@Injectable()
export class AgendaNotificationsCron {
  private readonly logger = new Logger(AgendaNotificationsCron.name);

  constructor(private readonly service: AgendaNotificationsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('⏰ [CRON] Exécution horaire des notifications agenda');
    await this.service.scannerEtNotifierActionsEchues();
  }
}
