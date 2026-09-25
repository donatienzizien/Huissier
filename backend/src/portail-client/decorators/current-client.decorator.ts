import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedClient {
  sub: string;
  email: string;
  cabinetId: string;
}

export const CurrentClient = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedClient => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);