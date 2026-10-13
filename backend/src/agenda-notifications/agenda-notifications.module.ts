import { Module } from '@nestjs/common';
import { AgendaNotificationsService } from './agenda-notifications.service';
import { AgendaNotificationsCron } from './agenda-notifications.cron';
import { TenantCronDbService } from '../tenant/tenant-cron-db.service';

@Module({
  providers: [
    AgendaNotificationsService,
    TenantCronDbService,
    AgendaNotificationsCron,
  ],
  exports: [AgendaNotificationsService],
})
export class AgendaNotificationsModule {}