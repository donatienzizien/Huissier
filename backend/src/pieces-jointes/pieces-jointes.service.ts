import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import * as FileType from 'file-type';
import { TenantDbService } from '../tenant/tenant-db.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CreatePieceJointeDto } from './dto/create-piece-jointe.dto';

const STORAGE_ROOT = process.env.ACTES_STORAGE_PATH ?? join(process.cwd(), 'storage');

const MIME_AUTORISES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX_OCTETS = 15 * 1024 * 1024; // 15 Mo

@Injectable()
export class PiecesJointesService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private storageDir(): string {
    const { schemaName } = this.tenantContext.get();
    return join(STORAGE_ROOT, schemaName, 'pieces-jointes');
  }

  async findByDossier(dossierId: string) {
    return this.tenantDb.query(
      `SELECT pj.id, pj.categorie, pj.nom_original, pj.type_mime, pj.taille_octets, pj.created_at,
              u.nom AS televerse_par_nom, u.prenom AS televerse_par_prenom
       FROM pieces_jointes pj
       LEFT JOIN utilisateurs u ON u.id = pj.televerse_par
       WHERE pj.dossier_id = $1
       ORDER BY pj.created_at DESC`,
      [dossierId],
    );
  }

  async upload(fichier: Express.Multer.File | undefined, dto: CreatePieceJointeDto, utilisateurId: string) {
    if (!fichier) throw new BadRequestException('Aucun fichier recu.');
    if (fichier.size > TAILLE_MAX_OCTETS) {
      throw new BadRequestException('Fichier trop volumineux (15 Mo maximum).');
    }
    if (!MIME_AUTORISES.includes(fichier.mimetype)) {
      throw new BadRequestException('Format non autorise. Formats acceptes : PDF, JPG, PNG, WEBP.');
    }

    // Le Content-Type declare par le navigateur (fichier.mimetype) est
    // falsifiable cote client. On verifie donc la signature binaire reelle
    // du fichier (magic bytes) avant d'accepter l'upload — un .exe renomme
    // en .jpg avec un Content-Type usurpe sera rejete ici, meme s'il a
    // passe la premiere verification ci-dessus.
    const typeReel = await FileType.fromBuffer(fichier.buffer);
    if (!typeReel || !MIME_AUTORISES.includes(typeReel.mime)) {
      throw new BadRequestException(
        'Le contenu du fichier ne correspond pas a un format autorise (PDF, JPG, PNG, WEBP). ' +
          'Verifiez que le fichier n\'est pas corrompu ou renomme.',
      );
    }

    const dossier = await this.tenantDb.queryOne<{ id: string }>(`SELECT id FROM dossiers WHERE id = $1`, [
      dto.dossierId,
    ]);
    if (!dossier) throw new NotFoundException('Dossier introuvable.');

    const dir = this.storageDir();
    await mkdir(dir, { recursive: true });
    const nomFichier = `${randomUUID()}${extname(fichier.originalname) || ''}`;
    const chemin = join(dir, nomFichier);
    await writeFile(chemin, fichier.buffer);

    return this.tenantDb.queryOne(
      `INSERT INTO pieces_jointes (dossier_id, categorie, nom_original, chemin_fichier, type_mime, taille_octets, televerse_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, categorie, nom_original, type_mime, taille_octets, created_at`,
      [
        dto.dossierId,
        dto.categorie ?? 'AUTRE',
        fichier.originalname,
        chemin,
        fichier.mimetype,
        fichier.size,
        utilisateurId,
      ],
    );
  }

  async getBuffer(id: string) {
    const pj = await this.tenantDb.queryOne<{ chemin_fichier: string; nom_original: string; type_mime: string }>(
      `SELECT chemin_fichier, nom_original, type_mime FROM pieces_jointes WHERE id = $1`,
      [id],
    );
    if (!pj) throw new NotFoundException('Piece jointe introuvable.');
    const buffer = await readFile(pj.chemin_fichier);
    return { buffer, nomOriginal: pj.nom_original, typeMime: pj.type_mime };
  }

  async remove(id: string) {
    const pj = await this.tenantDb.queryOne<{ chemin_fichier: string }>(
      `SELECT chemin_fichier FROM pieces_jointes WHERE id = $1`,
      [id],
    );
    if (!pj) throw new NotFoundException('Piece jointe introuvable.');

    await this.tenantDb.query(`DELETE FROM pieces_jointes WHERE id = $1`, [id]);
    await unlink(pj.chemin_fichier).catch(() => undefined);

    return { id, supprime: true };
  }
}
