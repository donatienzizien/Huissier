import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantContextService } from '../../tenant/tenant-context.service';

// Le contexte du JWT est prioritaire : il correspond toujours au cabinet
// de l'utilisateur connecte. Le middleware peut resoudre un cabinet via le
// sous-domaine, mais il ne doit pas ecraser le cabinet du token.
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

    if (user?.role !== 'SUPER_ADMIN') {
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
