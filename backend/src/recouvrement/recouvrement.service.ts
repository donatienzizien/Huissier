import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantDbService } from '../tenant/tenant-db.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateCreanceDto } from './dto/create-creance.dto';
import { UpdateCreanceDto } from './dto/update-creance.dto';
import { UpdateStatutCreanceDto } from './dto/update-statut-creance.dto';
import { QueryCreancesDto } from './dto/query-creances.dto';

type DossierAcces = {
  id: string;
  numero: string;
  type: string;
  statut: string;
  assigne_clerc_id: string | null;
  assigne_agent_id: string | null;
};

@Injectable()
export class RecouvrementService {
  constructor(private readonly tenantDb: TenantDbService) {}

  private async prochainNumero(client?: { query: Function }): Promise<string> {
    const annee = new Date().getFullYear();
    const cle = `creance_${annee}`;

    const execute = client
      ? (sql: string, params: unknown[]) => client.query(sql, params)
      : async (sql: string, params: unknown[]) => {
          const row = await this.tenantDb.queryOne<{ valeur: number }>(sql, params as any[]);
          return { rows: row ? [row] : [] };
        };

    const result = await execute(
      `INSERT INTO compteurs (cle, valeur) VALUES ($1, 1)
       ON CONFLICT (cle) DO UPDATE SET valeur = compteurs.valeur + 1
       RETURNING valeur`,
      [cle],
    );

    const valeur = result.rows[0]?.valeur;
    if (!valeur) {
      throw new BadRequestException('Impossible de générer le numéro de créance.');
    }

    return `CRE-${annee}-${String(valeur).padStart(4, '0')}`;
  }

  private async getDossierPourAcces(dossierId: string): Promise<DossierAcces> {
    const dossier = await this.tenantDb.queryOne<DossierAcces>(
      `SELECT id, numero, type, statut, assigne_clerc_id, assigne_agent_id
       FROM dossiers
       WHERE id = $1`,
      [dossierId],
    );

    if (!dossier) {
      throw new NotFoundException('Dossier introuvable.');
    }

    return dossier;
  }

  private verifierLectureDossier(dossier: DossierAcces, user: AuthenticatedUser) {
    if (user.role === 'AGENT_TERRAIN' && dossier.assigne_agent_id !== user.sub) {
      throw new ForbiddenException("Ce dossier ne vous est pas assigné.");
    }
  }

  private verifierModificationDossier(dossier: DossierAcces, user: AuthenticatedUser) {
    const autorise =
      user.role === 'HUISSIER' ||
      (user.role === 'CLERC' && dossier.assigne_clerc_id === user.sub);

    if (!autorise) {
      throw new ForbiddenException(
        "Seul l'Huissier ou le Clerc responsable du dossier peut modifier ses créances.",
      );
    }
  }

  private verifierFinalisation(user: AuthenticatedUser) {
    if (user.role !== 'HUISSIER') {
      throw new ForbiddenException(
        "Seul l'Huissier peut solder ou abandonner une créance.",
      );
    }
  }

  async create(dto: CreateCreanceDto, user: AuthenticatedUser) {
    const dossier = await this.getDossierPourAcces(dto.dossierId);
    this.verifierModificationDossier(dossier, user);

    if (dossier.type !== 'RECOUVREMENT') {
      throw new BadRequestException(
        "Une créance ne peut être créée que dans un dossier de type RECOUVREMENT.",
      );
    }

    if (dossier.statut === 'CLOTURE' || dossier.statut === 'ARCHIVE') {
      throw new BadRequestException(
        "Impossible de créer une créance dans un dossier clôturé ou archivé.",
      );
    }

    return this.tenantDb.transaction(async (client) => {
      const numero = await this.prochainNumero(client);

      const result = await client.query(
        `INSERT INTO creances (
           numero,
           dossier_id,
           libelle,
           reference,
           montant_initial,
           statut,
           date_exigibilite,
           observations,
           cree_par
         )
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, $7, $8)
         RETURNING *`,
        [
          numero,
          dto.dossierId,
          dto.libelle.trim(),
          dto.reference?.trim() || null,
          dto.montantInitial,
          dto.dateExigibilite ?? null,
          dto.observations?.trim() || null,
          user.sub,
        ],
      );

      const creance = result.rows[0];

      await client.query(
        `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
         VALUES ($1, $2, 'CREANCE_CREEE', $3)`,
        [
          dto.dossierId,
          user.sub,
          JSON.stringify({
            creanceId: creance.id,
            numero: creance.numero,
            libelle: creance.libelle,
            montantInitial: creance.montant_initial,
          }),
        ],
      );

      return creance;
    });
  }

  async findAll(query: QueryCreancesDto, user: AuthenticatedUser) {
    const {
      page,
      limit,
      search,
      statut,
      dossierId,
      debiteurId,
      dateExigibiliteAvant,
      dateExigibiliteApres,
    } = query;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (statut) {
      params.push(statut);
      conditions.push(`cr.statut = $${params.length}`);
    }

    if (dossierId) {
      params.push(dossierId);
      conditions.push(`cr.dossier_id = $${params.length}`);
    }

    if (debiteurId) {
      params.push(debiteurId);
      conditions.push(`d.debiteur_id = $${params.length}`);
    }

    if (dateExigibiliteAvant) {
      params.push(dateExigibiliteAvant);
      conditions.push(`cr.date_exigibilite <= $${params.length}`);
    }

    if (dateExigibiliteApres) {
      params.push(dateExigibiliteApres);
      conditions.push(`cr.date_exigibilite >= $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(cr.numero ILIKE $${params.length}
          OR cr.libelle ILIKE $${params.length}
          OR d.numero ILIKE $${params.length}
          OR deb.nom ILIKE $${params.length}
          OR deb.prenom ILIKE $${params.length})`,
      );
    }

    if (user.role === 'AGENT_TERRAIN') {
      params.push(user.sub);
      conditions.push(`d.assigne_agent_id = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const rows = await this.tenantDb.query(
      `SELECT
         cr.*,
         d.numero AS dossier_numero,
         d.type AS dossier_type,
         deb.id AS debiteur_id,
         deb.nom AS debiteur_nom,
         deb.prenom AS debiteur_prenom,
         c.nom AS client_nom,
         c.prenom AS client_prenom
       FROM creances cr
       JOIN dossiers d ON d.id = cr.dossier_id
       JOIN clients c ON c.id = d.client_id
       LEFT JOIN clients deb ON deb.id = d.debiteur_id
       ${whereClause}
       ORDER BY
         CASE WHEN cr.statut = 'ACTIVE' THEN 0 ELSE 1 END,
         cr.date_exigibilite NULLS LAST,
         cr.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params as any[],
    );

    const countRow = await this.tenantDb.queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM creances cr
       JOIN dossiers d ON d.id = cr.dossier_id
       LEFT JOIN clients deb ON deb.id = d.debiteur_id
       ${whereClause}`,
      params as any[],
    );

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(countRow?.total ?? 0),
        totalPages: Math.ceil(Number(countRow?.total ?? 0) / limit),
      },
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const creance = await this.tenantDb.queryOne<any>(
      `SELECT
         cr.*,
         d.numero AS dossier_numero,
         d.type AS dossier_type,
         d.statut AS dossier_statut,
         d.assigne_clerc_id,
         d.assigne_agent_id,
         deb.id AS debiteur_id,
         deb.nom AS debiteur_nom,
         deb.prenom AS debiteur_prenom,
         deb.telephone AS debiteur_telephone,
         deb.adresse AS debiteur_adresse,
         c.nom AS client_nom,
         c.prenom AS client_prenom
       FROM creances cr
       JOIN dossiers d ON d.id = cr.dossier_id
       JOIN clients c ON c.id = d.client_id
       LEFT JOIN clients deb ON deb.id = d.debiteur_id
       WHERE cr.id = $1`,
      [id],
    );

    if (!creance) {
      throw new NotFoundException('Créance introuvable.');
    }

    this.verifierLectureDossier(creance, user);
    return creance;
  }

  async update(id: string, dto: UpdateCreanceDto, user: AuthenticatedUser) {
    const creance = await this.findOne(id, user);
    this.verifierModificationDossier(creance, user);

    if (creance.statut === 'SOLDEE' || creance.statut === 'ABANDONNEE') {
      throw new BadRequestException(
        "Une créance soldée ou abandonnée ne peut plus être modifiée.",
      );
    }

    const fields: string[] = [];
    const params: unknown[] = [];

    if (dto.libelle !== undefined) {
      params.push(dto.libelle.trim());
      fields.push(`libelle = $${params.length}`);
    }

    if (dto.montantInitial !== undefined) {
      params.push(dto.montantInitial);
      fields.push(`montant_initial = $${params.length}`);
    }

    if (dto.reference !== undefined) {
      params.push(dto.reference?.trim() || null);
      fields.push(`reference = $${params.length}`);
    }

    if (dto.dateExigibilite !== undefined) {
      params.push(dto.dateExigibilite || null);
      fields.push(`date_exigibilite = $${params.length}`);
    }

    if (dto.observations !== undefined) {
      params.push(dto.observations?.trim() || null);
      fields.push(`observations = $${params.length}`);
    }

    if (fields.length === 0) {
      throw new BadRequestException('Aucune modification fournie.');
    }

    params.push(id);

    const updated = await this.tenantDb.queryOne(
      `UPDATE creances
       SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $${params.length}
       RETURNING *`,
      params as any[],
    );

    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1, $2, 'CREANCE_MODIFIEE', $3)`,
      [
        creance.dossier_id,
        user.sub,
        JSON.stringify({
          creanceId: id,
          champs: fields.map((field) => field.split(' = ')[0]),
        }),
      ],
    );

    return updated;
  }

  async updateStatut(id: string, dto: UpdateStatutCreanceDto, user: AuthenticatedUser) {
    const creance = await this.findOne(id, user);
    this.verifierModificationDossier(creance, user);

    if (dto.statut === 'SOLDEE' || dto.statut === 'ABANDONNEE') {
      this.verifierFinalisation(user);
    }

    if (creance.statut === 'SOLDEE' || creance.statut === 'ABANDONNEE') {
      throw new BadRequestException(
        "Une créance soldée ou abandonnée ne peut plus changer de statut.",
      );
    }

    const finalisee = dto.statut === 'SOLDEE' || dto.statut === 'ABANDONNEE';

    const updated = await this.tenantDb.queryOne(
      `UPDATE creances
       SET statut = $1,
           cloturee_par = $2,
           cloturee_le = CASE WHEN $3 THEN now() ELSE NULL END,
           updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [dto.statut, finalisee ? user.sub : null, finalisee, id],
    );

    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1, $2, 'CREANCE_STATUT_MODIFIE', $3)`,
      [
        creance.dossier_id,
        user.sub,
        JSON.stringify({
          creanceId: id,
          numero: creance.numero,
          ancien: creance.statut,
          nouveau: dto.statut,
        }),
      ],
    );

    return updated;
  }
}
