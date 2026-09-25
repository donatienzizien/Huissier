import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { join } from 'path';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { TenantDbService } from '../tenant/tenant-db.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { MailService } from '../notifications/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangerMotDePasseDto } from './dto/changer-mot-de-passe.dto';

const STORAGE_ROOT = process.env.ACTES_STORAGE_PATH ?? join(process.cwd(), 'storage');
const EXTENSIONS_AUTORISEES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

@Injectable()
export class UsersService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly mailService: MailService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async list() {
    return this.tenantDb.query(
      `SELECT id, nom, prenom, email, role, actif, created_at, (photo_path IS NOT NULL) AS a_une_photo
       FROM utilisateurs ORDER BY created_at DESC`,
    );
  }

  async create(dto: CreateUserDto) {
    const existant = await this.tenantDb.queryOne<{ id: string }>(
      `SELECT id FROM utilisateurs WHERE email = $1`,
      [dto.email],
    );
    if (existant) {
      throw new ConflictException('Un compte existe deja avec cet email dans ce cabinet.');
    }

    const tempPassword = crypto.randomBytes(9).toString('base64url');
    const hashed = await bcrypt.hash(tempPassword, Number(process.env.BCRYPT_COST ?? 12));

    let user: { id: string; nom: string; prenom: string; email: string; role: string } | null;
    try {
      user = await this.tenantDb.queryOne(
        `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, nom, prenom, email, role`,
        [dto.nom, dto.prenom, dto.email, hashed, dto.role],
      );
    } catch (err: any) {
      // Filet de securite si deux requetes concurrentes passent la
      // verification ci-dessus en meme temps (race condition rare).
      if (err?.code === '23505') {
        throw new ConflictException('Un compte existe deja avec cet email dans ce cabinet.');
      }
      throw err;
    }

    await this.mailService.envoyer(
      dto.email,
      'Votre acces a la plateforme du cabinet',
      `<p>Bonjour ${dto.nom},</p>
       <p>Un compte (${dto.role}) vient d'etre cree pour vous.</p>
       <p>Identifiant : ${dto.email}<br>Mot de passe temporaire : <strong>${tempPassword}</strong></p>
       <p>Merci de le changer des votre premiere connexion.</p>`,
    );
    return { user, motDePasseTemporaire: tempPassword };
  }

  async desactiver(id: string) {
    await this.tenantDb.query(`UPDATE utilisateurs SET actif = FALSE WHERE id = $1`, [id]);
    return { success: true };
  }

  async reactiver(id: string) {
    const existant = await this.tenantDb.queryOne<{ id: string }>(
      `SELECT id FROM utilisateurs WHERE id = $1`,
      [id],
    );
    if (!existant) throw new NotFoundException('Utilisateur introuvable.');
    await this.tenantDb.query(`UPDATE utilisateurs SET actif = TRUE WHERE id = $1`, [id]);
    return { success: true };
  }

  async supprimer(id: string, demandeurId: string) {
    if (id === demandeurId) {
      throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte.');
    }

    const cible = await this.tenantDb.queryOne<{ role: string; photo_path: string | null }>(
      `SELECT role, photo_path FROM utilisateurs WHERE id = $1`,
      [id],
    );
    if (!cible) throw new NotFoundException('Utilisateur introuvable.');
    if (cible.role === 'HUISSIER') {
      throw new BadRequestException('Un compte Huissier ne peut pas etre supprime depuis cette page.');
    }

    const activite = await this.tenantDb.queryOne<{ total: string }>(
      `SELECT
         (SELECT COUNT(*) FROM actes WHERE signe_par = $1) +
         (SELECT COUNT(*) FROM dossier_historique WHERE utilisateur_id = $1) AS total`,
      [id],
    );
    if (Number(activite?.total ?? 0) > 0) {
      throw new BadRequestException(
        "Cet utilisateur a deja signe des actes ou laisse une trace dans l'historique des dossiers " +
          '- impossible de le supprimer sans casser la tracabilite legale. Desactivez-le a la place.',
      );
    }

    await this.tenantDb.query(`DELETE FROM utilisateurs WHERE id = $1`, [id]);
    if (cible.photo_path) {
      await unlink(cible.photo_path).catch(() => undefined);
    }
    return { success: true };
  }

  async changerMotDePasse(userId: string, dto: ChangerMotDePasseDto) {
    const user = await this.tenantDb.queryOne<{ mot_de_passe: string }>(
      `SELECT mot_de_passe FROM utilisateurs WHERE id = $1`,
      [userId],
    );
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const correspond = await bcrypt.compare(dto.ancienMotDePasse, user.mot_de_passe);
    if (!correspond) {
      throw new BadRequestException('Ancien mot de passe incorrect.');
    }

    const hashed = await bcrypt.hash(dto.nouveauMotDePasse, Number(process.env.BCRYPT_COST ?? 12));
    await this.tenantDb.query(`UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2`, [hashed, userId]);
    return { success: true };
  }

  private avatarDir(): string {
    const { schemaName } = this.tenantContext.get();
    return join(STORAGE_ROOT, schemaName, 'avatars');
  }

  async uploadPhoto(userId: string, file: Express.Multer.File) {
    const extension = EXTENSIONS_AUTORISEES[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Format non supporte. Utilisez une image JPG ou PNG.');
    }

    const existant = await this.tenantDb.queryOne<{ photo_path: string | null }>(
      `SELECT photo_path FROM utilisateurs WHERE id = $1`,
      [userId],
    );
    if (!existant) throw new NotFoundException('Utilisateur introuvable.');

    const dir = this.avatarDir();
    await mkdir(dir, { recursive: true });
    const cheminFichier = join(dir, `${userId}${extension}`);
    await writeFile(cheminFichier, file.buffer);

    if (existant.photo_path && existant.photo_path !== cheminFichier) {
      await unlink(existant.photo_path).catch(() => undefined);
    }

    await this.tenantDb.query(`UPDATE utilisateurs SET photo_path = $1 WHERE id = $2`, [cheminFichier, userId]);
    return { success: true };
  }

  async removePhoto(userId: string) {
    const existant = await this.tenantDb.queryOne<{ photo_path: string | null }>(
      `SELECT photo_path FROM utilisateurs WHERE id = $1`,
      [userId],
    );
    if (!existant) throw new NotFoundException('Utilisateur introuvable.');

    if (existant.photo_path) {
      await unlink(existant.photo_path).catch(() => undefined);
    }
    await this.tenantDb.query(`UPDATE utilisateurs SET photo_path = NULL WHERE id = $1`, [userId]);
    return { success: true };
  }

  async getPhotoPath(userId: string): Promise<string | null> {
    const row = await this.tenantDb.queryOne<{ photo_path: string | null }>(
      `SELECT photo_path FROM utilisateurs WHERE id = $1`,
      [userId],
    );
    return row?.photo_path ?? null;
  }
}
