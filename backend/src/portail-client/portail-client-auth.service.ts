import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TenantDbService } from '../tenant/tenant-db.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { LoginPortailDto } from './dto/login-portail.dto';

@Injectable()
export class PortailClientAuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly tenantDb: TenantDbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async login(dto: LoginPortailDto) {
    if (!this.tenantContext.isSet()) {
      throw new BadRequestException(
        "Impossible de déterminer le cabinet. Connectez-vous depuis l'adresse fournie par votre cabinet.",
      );
    }
    const cabinet = this.tenantContext.get();

    const client = await this.tenantDb.queryOne<{
      id: string;
      nom: string;
      prenom: string | null;
      email: string;
      mot_de_passe: string | null;
      acces_portail: boolean;
    }>(
      `SELECT id, nom, prenom, email, mot_de_passe, acces_portail FROM clients WHERE email = $1`,
      [dto.email],
    );
    if (!client || !client.acces_portail || !client.mot_de_passe) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const valid = await bcrypt.compare(dto.motDePasse, client.mot_de_passe);
    if (!valid) throw new UnauthorizedException('Identifiants invalides.');

    const payload = {
      sub: client.id,
      email: client.email,
      cabinetId: cabinet.id,
      cabinetSlug: cabinet.slug,
      schemaName: cabinet.schemaName,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_PORTAIL_ACCESS_SECRET,
      expiresIn: process.env.JWT_PORTAIL_ACCESS_EXPIRES ?? '4h',
    });

    return {
      accessToken,
      client: { id: client.id, nom: client.nom, prenom: client.prenom, email: client.email },
    };
  }
}