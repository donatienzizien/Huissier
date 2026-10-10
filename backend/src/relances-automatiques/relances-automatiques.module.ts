import { Module } from '@nestjs/common';
import { RelancesAutomatiquesService } from './relances-automatiques.service';
import { TenantCronDbService } from '../tenant/tenant-cron-db.service';

@Module({
  controllers: [],
  providers: [
    RelancesAutomatiquesService,
    TenantCronDbService,
  ],
  exports: [RelancesAutomatiquesService],
})
export class RelancesAutomatiquesModule {}