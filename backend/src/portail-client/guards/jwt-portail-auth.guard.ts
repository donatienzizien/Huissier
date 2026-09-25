import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantContextService } from '../../tenant/tenant-context.service';

@Injectable()
export class JwtPortailAuthGuard extends AuthGuard('jwt-portail') {
  constructor(private readonly tenantContext: TenantContextService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activated = (await super.canActivate(context)) as boolean;
    if (!activated) return false;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!this.tenantContext.isSet()) {
      if (!user?.cabinetId || !user?.schemaName) {
        throw new UnauthorizedException();
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