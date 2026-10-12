import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const cabinetSlug =
      (req.headers['x-cabinet'] as string) ||
      req.hostname.split('.')[0];

    const reserved = ['app', 'api', 'www', 'admin', 'localhost'];

    if (cabinetSlug && !reserved.includes(cabinetSlug)) {
      const cabinet = await this.prisma.cabinet.findUnique({
        where: { slug: cabinetSlug },
      });

      if (cabinet && cabinet.statut === 'ACTIF') {
        const resolved = {
          id: cabinet.id,
          slug: cabinet.slug,
          schemaName: cabinet.schemaName,
        };

        (req as any).resolvedCabinet = resolved;
        this.tenantContext.set(resolved);
      }
    }

    next();
  }
}
