import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/guards/roles.guard';

function makeContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('autorise l\'accès quand aucun rôle n\'est requis', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext({ role: 'CLERC' }))).toBe(true);
  });

  it("autorise l'accès quand le rôle de l'utilisateur est requis", () => {
    const reflector = { getAllAndOverride: () => ['HUISSIER', 'COMPTABLE'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext({ role: 'COMPTABLE' }))).toBe(true);
  });

  it("refuse l'accès quand le rôle ne correspond pas", () => {
    const reflector = { getAllAndOverride: () => ['HUISSIER'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(makeContext({ role: 'CLERC' }))).toThrow(ForbiddenException);
  });

  it("refuse l'accès quand aucun utilisateur n'est authentifié", () => {
    const reflector = { getAllAndOverride: () => ['HUISSIER'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });
});
