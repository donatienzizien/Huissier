import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantContextService } from '../../tenant/tenant-context.service';

// Étend le guard Passport standard : une fois le token validé, si le
// TenantMiddleware n'a pas déjà résolu le cabinet via le sous-domaine,
// on le déduit du JWT (cabinetId/schemaName) — conforme au §4.1 du CDC.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
  constructor(private readonly tenantContext: TenantContextService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activated = (await super.canActivate(context)) as boolean;
    if (!activated) return false;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (user?.role !== 'SUPER_ADMIN' && !this.tenantContext.isSet()) {
      if (!user?.cabinetId || !user?.schemaName) {
        return false;
      }
      this.tenantContext.set({
        id: user.cabinetId,
        slug: user.cabinetSlug,
        schemaName: user.schemaName,
      });
    }
    return true;
  }
}
