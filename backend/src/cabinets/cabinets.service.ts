import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { PrismaService } from '../prisma/prisma.service';
import { TenantProvisioningService } from '../tenant/tenant-provisioning.service';
import { MailService } from '../notifications/mail.service';
import { CreateCabinetDto } from './dto/create-cabinet.dto';
import { UpdateCabinetDto } from './dto/update-cabinet.dto';

@Injectable()
export class CabinetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: TenantProvisioningService,
    private readonly mailService: MailService,
  ) {}

  async list() {
    return this.prisma.cabinet.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // Création d'un cabinet : provisionne le schéma PostgreSQL dédié,
  // l'enregistre dans le registre public, puis crée le premier compte
  // Huissier (admin du cabinet) avec un mot de passe temporaire.
  async create(dto: CreateCabinetDto) {
    const existing = await this.prisma.cabinet.findFirst({
      where: { OR: [{ slug: dto.slug }, { email: dto.email }] },
    });
    if (existing) throw new ConflictException('Ce slug ou cet email de cabinet existe déjà.');
    const schemaName = await this.provisioning.provision(dto.slug);
    const cabinet = await this.prisma.cabinet.create({
      data: {
        nom: dto.nom,
        slug: dto.slug,
        email: dto.email,
        telephone: dto.telephone,
        adresse: dto.adresse,
        schemaName,
      },
    });
    const tempPassword = crypto.randomBytes(9).toString('base64url');
    const hashed = await bcrypt.hash(tempPassword, Number(process.env.BCRYPT_COST ?? 12));
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schemaName}"`);
      await client.query(
        `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,'HUISSIER')`,
        [dto.huissierNom, dto.huissierPrenom, dto.huissierEmail, hashed],
      );
    } finally {
      client.release();
      await pool.end();
    }
    await this.mailService.envoyer(
      dto.huissierEmail,
      `Accès à votre espace — ${dto.nom}`,
      `<p>Bonjour ${dto.huissierNom},</p>
       <p>Votre cabinet <strong>${dto.nom}</strong> est prêt sur la plateforme LOGINET Huissiers.</p>
       <p>Identifiant : ${dto.huissierEmail}<br>Mot de passe temporaire : <strong>${tempPassword}</strong></p>
       <p>Merci de le changer dès votre première connexion.</p>`,
    );
    return { cabinet, huissierEmail: dto.huissierEmail, motDePasseTemporaire: tempPassword };
  }

  async suspendre(id: string) {
    return this.prisma.cabinet.update({ where: { id }, data: { statut: 'SUSPENDU' } });
  }

  async reactiver(id: string) {
    return this.prisma.cabinet.update({ where: { id }, data: { statut: 'ACTIF' } });
  }

  // --- Auto-gestion par le Huissier de son propre cabinet -----------------
  // Contrairement aux méthodes ci-dessus (réservées au Super Admin, qui
  // gère TOUS les cabinets), celles-ci sont scopées à un seul cabinet —
  // le sien — via l'id résolu par le middleware tenant.

  async monCabinet(cabinetId: string) {
    return this.prisma.cabinet.findUnique({
      where: { id: cabinetId },
      select: { id: true, nom: true, email: true, telephone: true, adresse: true },
    });
  }

  async modifierMonCabinet(cabinetId: string, dto: UpdateCabinetDto) {
    return this.prisma.cabinet.update({
      where: { id: cabinetId },
      data: dto,
      select: { id: true, nom: true, email: true, telephone: true, adresse: true },
    });
  }
}