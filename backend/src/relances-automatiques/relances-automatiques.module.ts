import { Module } from '@nestjs/common';
import { RelancesAutomatiquesService } from './relances-automatiques.service';
import { RelancesAutomatiquesCron } from './relances-automatiques.cron';
import { TenantCronDbService } from '../tenant/tenant-cron-db.service';

@Module({
  controllers: [],
  providers: [
    RelancesAutomatiquesService,
    TenantCronDbService,
    RelancesAutomatiquesCron,
  ],
  exports: [RelancesAutomatiquesService],
})
export class RelancesAutomatiquesModule {}