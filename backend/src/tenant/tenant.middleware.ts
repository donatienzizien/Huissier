import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';

// Résout le cabinet à partir du sous-domaine (ex: cabinet1.app.loginet-huissiers.com)
// et l'attache à req['resolvedCabinet'] ainsi qu'au TenantContextService (portée REQUEST),
// pour que les routes publiques (ex: /auth/login, non protégées par JwtAuthGuard)
// puissent aussi lire le cabinet résolu. Si aucun sous-domaine ne correspond
// (ex: appel API direct), le JwtAuthGuard prendra le relais en lisant le
// cabinetId contenu dans le JWT.
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const host = req.hostname; // ex: cabinet1.app.loginet-huissiers.com
    const subdomain = host.split('.')[0];

    const reserved = ['app', 'api', 'www', 'admin', 'localhost'];
    if (subdomain && !reserved.includes(subdomain)) {
      const cabinet = await this.prisma.cabinet.findUnique({
        where: { slug: subdomain },
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