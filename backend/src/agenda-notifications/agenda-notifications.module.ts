import { Module } from '@nestjs/common';
import { AgendaNotificationsService } from './agenda-notifications.service';
import { TenantDbService } from '../tenant/tenant-db.service';

@Module({
  providers: [AgendaNotificationsService, TenantDbService],
  exports: [AgendaNotificationsService],
})
export class AgendaNotificationsModule {}
