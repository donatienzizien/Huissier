import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: 'SUPER_ADMIN' | 'HUISSIER' | 'CLERC' | 'COMPTABLE' | 'SECRETAIRE' | 'AGENT_TERRAIN';
  cabinetId?: string;
  schemaName?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser = req.user;
    return data ? user?.[data] : user;
  },
);
