import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TenantDbService } from '../tenant/tenant-db.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { LoginDto } from './dto/login.dto';

interface TenantUserRow {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  mot_de_passe: string;
  role: 'HUISSIER' | 'CLERC' | 'COMPTABLE' | 'SECRETAIRE';
  actif: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly tenantDb: TenantDbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async signTokens(payload: Record<string, any>) {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
    });
    return { accessToken, refreshToken };
  }

  // Connexion d'un utilisateur de cabinet (Huissier / Clerc / Comptable / Secretaire).
  // Suppose que le TenantContext est déjà résolu (sous-domaine du cabinet).
  async login(dto: LoginDto) {
    if (!this.tenantContext.isSet()) {
      throw new BadRequestException(
        "Impossible de déterminer le cabinet. Connectez-vous depuis le sous-domaine de votre cabinet.",
      );
    }
    const cabinet = this.tenantContext.get();

    const user = await this.tenantDb.queryOne<TenantUserRow>(
      `SELECT * FROM utilisateurs WHERE email = $1 AND actif = TRUE`,
      [dto.email],
    );
    if (!user) throw new UnauthorizedException('Identifiants invalides.');

    const valid = await bcrypt.compare(dto.motDePasse, user.mot_de_passe);
    if (!valid) throw new UnauthorizedException('Identifiants invalides.');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      cabinetId: cabinet.id,
      cabinetSlug: cabinet.slug,
      schemaName: cabinet.schemaName,
    };
    const tokens = await this.signTokens(payload);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
      cabinet: { id: cabinet.id, slug: cabinet.slug },
    };
  }

  // Connexion Super Admin (schéma public, hors tenant).
  async loginSuperAdmin(dto: LoginDto) {
    const admin = await this.prisma.superAdmin.findUnique({ where: { email: dto.email } });
    if (!admin) throw new UnauthorizedException('Identifiants invalides.');

    const valid = await bcrypt.compare(dto.motDePasse, admin.motDePasse);
    if (!valid) throw new UnauthorizedException('Identifiants invalides.');

    const payload = { sub: admin.id, email: admin.email, role: 'SUPER_ADMIN' as const };
    const tokens = await this.signTokens(payload);

    await this.prisma.superAdmin.update({
      where: { id: admin.id },
      data: { refreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    return { ...tokens, user: { id: admin.id, nom: admin.nom, email: admin.email, role: 'SUPER_ADMIN' } };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.tenantDb.query(`UPDATE utilisateurs SET refresh_token = $1 WHERE id = $2`, [
      hashed,
      userId,
    ]);
  }

  async refresh(userPayload: any) {
    const { sub, role, refreshToken } = userPayload;

    if (role === 'SUPER_ADMIN') {
      const admin = await this.prisma.superAdmin.findUnique({ where: { id: sub } });
      if (!admin?.refreshToken) throw new UnauthorizedException();
      const matches = await bcrypt.compare(refreshToken, admin.refreshToken);
      if (!matches) throw new UnauthorizedException();
      return this.signTokens({ sub: admin.id, email: admin.email, role: 'SUPER_ADMIN' });
    }

    if (!this.tenantContext.isSet()) throw new UnauthorizedException();
    const user = await this.tenantDb.queryOne<TenantUserRow & { refresh_token: string }>(
      `SELECT * FROM utilisateurs WHERE id = $1 AND actif = TRUE`,
      [sub],
    );
    if (!user?.refresh_token) throw new UnauthorizedException();
    const matches = await bcrypt.compare(refreshToken, user.refresh_token);
    if (!matches) throw new UnauthorizedException();

    const cabinet = this.tenantContext.get();
    const tokens = await this.signTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      cabinetId: cabinet.id,
      cabinetSlug: cabinet.slug,
      schemaName: cabinet.schemaName,
    });
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string, role: string) {
    if (role === 'SUPER_ADMIN') {
      await this.prisma.superAdmin.update({ where: { id: userId }, data: { refreshToken: null } });
      return;
    }
    await this.tenantDb.query(`UPDATE utilisateurs SET refresh_token = NULL WHERE id = $1`, [userId]);
  }
}