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
    const host = req.hostname;
    const subdomain = host.split('.')[0];

    const reserved = ['app', 'api', 'www', 'admin', 'localhost'];

    const headerSlug = req.headers['x-cabinet-slug'] as string | undefined;
    const slug = headerSlug || subdomain;

    if (slug && !reserved.includes(slug)) {
      const cabinet = await this.prisma.cabinet.findUnique({
        where: { slug },
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
