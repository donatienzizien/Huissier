import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantDbService } from './tenant-db.service';
import { TenantProvisioningService } from './tenant-provisioning.service';

@Global()
@Module({
  providers: [TenantContextService, TenantDbService, TenantProvisioningService],
  exports: [TenantContextService, TenantDbService, TenantProvisioningService],
})
export class TenantModule {}
