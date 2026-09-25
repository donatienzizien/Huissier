import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Client Prisma pour le schéma PUBLIC uniquement (registre des cabinets,
// super admins, audit log). Les données par cabinet passent par
// TenantPrismaFactory (src/tenant), jamais par ce client.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
