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
import { PdfService } from '../pdf/pdf.service';
import { CreateEncaissementDto } from './dto/create-encaissement.dto';
import { CreateRelanceCreanceDto } from './dto/create-relance-creance.dto';

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
  constructor(private readonly tenantDb: TenantDbService, private readonly pdfService: PdfService) {}

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
          dto.reference?.trim() || numero,
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
      enRetard,
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

    if (enRetard === 'true') {
      conditions.push(
        `cr.date_exigibilite IS NOT NULL
         AND cr.date_exigibilite < CURRENT_DATE
         AND cr.statut NOT IN ('SOLDEE', 'ABANDONNEE')`,
      );
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

  async getTableauDeBord(user: AuthenticatedUser) {
    const params: unknown[] = [];
    const agentCondition =
      user.role === 'AGENT_TERRAIN'
        ? (() => {
            params.push(user.sub);
            return `AND d.assigne_agent_id = $${params.length}`;
          })()
        : '';

    const baseCreances = `
      FROM creances cr
      JOIN dossiers d ON d.id = cr.dossier_id
      LEFT JOIN clients deb ON deb.id = d.debiteur_id
      LEFT JOIN (
        SELECT creance_id, COALESCE(SUM(montant), 0) AS total_encaisse
        FROM encaissements_creance
        GROUP BY creance_id
      ) enc ON enc.creance_id = cr.id
      WHERE cr.statut IN (
        'ACTIVE',
        'PARTIELLEMENT_ENCAISSEE',
        'EN_NEGOCIATION',
        'SUSPENDUE'
      )
      ${agentCondition}
    `;

    const syntheseRow = await this.tenantDb.queryOne<{
      montant_initial_total: string;
      montant_encaisse_total: string;
      solde_restant_total: string;
      montant_echu: string;
      nombre_creances_en_cours: string;
      nombre_creances_echues: string;
      a_echoir: string;
      retard_1_30: string;
      retard_31_60: string;
      retard_61_90: string;
      retard_90_plus: string;
    }>(
      `SELECT
         COALESCE(SUM(cr.montant_initial), 0) AS montant_initial_total,
         COALESCE(SUM(enc.total_encaisse), 0) AS montant_encaisse_total,
         COALESCE(SUM(
           GREATEST(cr.montant_initial - enc.total_encaisse, 0)
         ), 0) AS solde_restant_total,
         COALESCE(SUM(
           CASE
             WHEN cr.date_exigibilite < CURRENT_DATE
             THEN GREATEST(cr.montant_initial - enc.total_encaisse, 0)
             ELSE 0
           END
         ), 0) AS montant_echu,
         COUNT(*) AS nombre_creances_en_cours,
         COUNT(*) FILTER (
           WHERE cr.date_exigibilite < CURRENT_DATE
         ) AS nombre_creances_echues,
         COALESCE(SUM(
           CASE
             WHEN cr.date_exigibilite IS NULL
               OR cr.date_exigibilite >= CURRENT_DATE
             THEN GREATEST(cr.montant_initial - enc.total_encaisse, 0)
             ELSE 0
           END
         ), 0) AS a_echoir,
         COALESCE(SUM(
           CASE
             WHEN CURRENT_DATE - cr.date_exigibilite::date BETWEEN 1 AND 30
             THEN GREATEST(cr.montant_initial - enc.total_encaisse, 0)
             ELSE 0
           END
         ), 0) AS retard_1_30,
         COALESCE(SUM(
           CASE
             WHEN CURRENT_DATE - cr.date_exigibilite::date BETWEEN 31 AND 60
             THEN GREATEST(cr.montant_initial - enc.total_encaisse, 0)
             ELSE 0
           END
         ), 0) AS retard_31_60,
         COALESCE(SUM(
           CASE
             WHEN CURRENT_DATE - cr.date_exigibilite::date BETWEEN 61 AND 90
             THEN GREATEST(cr.montant_initial - enc.total_encaisse, 0)
             ELSE 0
           END
         ), 0) AS retard_61_90,
         COALESCE(SUM(
           CASE
             WHEN CURRENT_DATE - cr.date_exigibilite::date > 90
             THEN GREATEST(cr.montant_initial - enc.total_encaisse, 0)
             ELSE 0
           END
         ), 0) AS retard_90_plus
       ${baseCreances}`,
      params as any[],
    );

    const prochainesActions = await this.tenantDb.query<{
      creance_id: string;
      creance_numero: string;
      creance_libelle: string;
      dossier_id: string;
      dossier_numero: string;
      debiteur_nom: string | null;
      debiteur_prenom: string | null;
      solde_restant: string;
      jours_retard: number;
      prochaine_action: string;
      prochaine_action_le: string;
    }>(
      `WITH prochaines_relances AS (
         SELECT DISTINCT ON (r.creance_id)
           r.creance_id,
           r.prochaine_action,
           r.prochaine_action_le
         FROM relances_creance r
         WHERE r.prochaine_action_le IS NOT NULL
           AND r.prochaine_action IS NOT NULL
         ORDER BY r.creance_id, r.prochaine_action_le ASC, r.created_at DESC
       )
       SELECT
         cr.id AS creance_id,
         cr.numero AS creance_numero,
         cr.libelle AS creance_libelle,
         d.id AS dossier_id,
         d.numero AS dossier_numero,
         deb.nom AS debiteur_nom,
         deb.prenom AS debiteur_prenom,
         GREATEST(cr.montant_initial - COALESCE(enc.total_encaisse, 0), 0)
           AS solde_restant,
         GREATEST(CURRENT_DATE - cr.date_exigibilite::date, 0)
           AS jours_retard,
         pr.prochaine_action,
         pr.prochaine_action_le
       FROM prochaines_relances pr
       JOIN creances cr ON cr.id = pr.creance_id
       JOIN dossiers d ON d.id = cr.dossier_id
       LEFT JOIN clients deb ON deb.id = d.debiteur_id
       LEFT JOIN (
         SELECT creance_id, COALESCE(SUM(montant), 0) AS total_encaisse
         FROM encaissements_creance
         GROUP BY creance_id
       ) enc ON enc.creance_id = cr.id
       WHERE cr.statut IN (
         'ACTIVE',
         'PARTIELLEMENT_ENCAISSEE',
         'EN_NEGOCIATION',
         'SUSPENDUE'
       )
       ${agentCondition}
       ORDER BY pr.prochaine_action_le ASC, solde_restant DESC
       LIMIT 5`,
      params as any[],
    );

    const debiteursPrioritaires = await this.tenantDb.query<{
      debiteur_id: string;
      debiteur_nom: string | null;
      debiteur_prenom: string | null;
      nombre_creances: string;
      solde_restant: string;
      montant_echu: string;
    }>(
      `SELECT
         deb.id AS debiteur_id,
         deb.nom AS debiteur_nom,
         deb.prenom AS debiteur_prenom,
         COUNT(*) AS nombre_creances,
         COALESCE(SUM(
           GREATEST(cr.montant_initial - enc.total_encaisse, 0)
         ), 0) AS solde_restant,
         COALESCE(SUM(
           CASE
             WHEN cr.date_exigibilite < CURRENT_DATE
             THEN GREATEST(cr.montant_initial - enc.total_encaisse, 0)
             ELSE 0
           END
         ), 0) AS montant_echu
       ${baseCreances}
         AND d.debiteur_id IS NOT NULL
       GROUP BY deb.id, deb.nom, deb.prenom
       ORDER BY montant_echu DESC, solde_restant DESC
       LIMIT 5`,
      params as any[],
    );

    const actionsEchuesRow = await this.tenantDb.queryOne<{ total: string }>(
      `WITH prochaines_relances AS (
         SELECT DISTINCT ON (r.creance_id)
           r.creance_id,
           r.prochaine_action_le
         FROM relances_creance r
         WHERE r.prochaine_action_le IS NOT NULL
         ORDER BY r.creance_id, r.prochaine_action_le ASC, r.created_at DESC
       )
       SELECT COUNT(*) AS total
       FROM prochaines_relances pr
       JOIN creances cr ON cr.id = pr.creance_id
       JOIN dossiers d ON d.id = cr.dossier_id
       WHERE cr.statut IN (
         'ACTIVE',
         'PARTIELLEMENT_ENCAISSEE',
         'EN_NEGOCIATION',
         'SUSPENDUE'
       )
         AND pr.prochaine_action_le <= now()
       ${agentCondition}`,
      params as any[],
    );

    return {
      synthese: {
        montantInitialTotal: Number(syntheseRow?.montant_initial_total ?? 0),
        montantEncaisseTotal: Number(syntheseRow?.montant_encaisse_total ?? 0),
        soldeRestantTotal: Number(syntheseRow?.solde_restant_total ?? 0),
        montantEchu: Number(syntheseRow?.montant_echu ?? 0),
        nombreCreancesEnCours: Number(syntheseRow?.nombre_creances_en_cours ?? 0),
        nombreCreancesEchues: Number(syntheseRow?.nombre_creances_echues ?? 0),
        nombreActionsEchues: Number(actionsEchuesRow?.total ?? 0),
      },
      balanceAgee: {
        aEchoir: Number(syntheseRow?.a_echoir ?? 0),
        retard1a30: Number(syntheseRow?.retard_1_30 ?? 0),
        retard31a60: Number(syntheseRow?.retard_31_60 ?? 0),
        retard61a90: Number(syntheseRow?.retard_61_90 ?? 0),
        retard90Plus: Number(syntheseRow?.retard_90_plus ?? 0),
      },
      prochainesActions: prochainesActions.map((action) => ({
        creanceId: action.creance_id,
        creanceNumero: action.creance_numero,
        creanceLibelle: action.creance_libelle,
        dossierId: action.dossier_id,
        dossierNumero: action.dossier_numero,
        debiteurNom: action.debiteur_nom,
        debiteurPrenom: action.debiteur_prenom,
        soldeRestant: Number(action.solde_restant),
        joursRetard: Number(action.jours_retard),
        prochaineAction: action.prochaine_action,
        prochaineActionLe: action.prochaine_action_le,
      })),
      debiteursPrioritaires: debiteursPrioritaires.map((debiteur) => ({
        debiteurId: debiteur.debiteur_id,
        debiteurNom: debiteur.debiteur_nom,
        debiteurPrenom: debiteur.debiteur_prenom,
        nombreCreances: Number(debiteur.nombre_creances),
        soldeRestant: Number(debiteur.solde_restant),
        montantEchu: Number(debiteur.montant_echu),
      })),
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

    if (dto.montantInitial !== undefined) {
      const montantInitialDemande = dto.montantInitial;

      return this.tenantDb.transaction(async (client) => {
        const locked = await client.query<{
          id: string;
          montant_initial: string;
          statut: string;
        }>(
          `SELECT id, montant_initial, statut
           FROM creances
           WHERE id = $1
           FOR UPDATE`,
          [id],
        );

        const creanceVerrouillee = locked.rows[0];

        if (!creanceVerrouillee) {
          throw new NotFoundException('Créance introuvable.');
        }

        if (
          creanceVerrouillee.statut === 'SOLDEE' ||
          creanceVerrouillee.statut === 'ABANDONNEE'
        ) {
          throw new BadRequestException(
            "Une créance soldée ou abandonnée ne peut plus être modifiée.",
          );
        }

        const totalEncaisseResult = await client.query<{ total: string }>(
          `SELECT COALESCE(SUM(montant), 0) AS total
           FROM encaissements_creance
           WHERE creance_id = $1`,
          [id],
        );

        const totalEncaisse = Number(totalEncaisseResult.rows[0]?.total ?? 0);
        const montantInitialCentimes = Math.round(montantInitialDemande * 100);
        const totalEncaisseCentimes = Math.round(totalEncaisse * 100);

        if (montantInitialCentimes < totalEncaisseCentimes) {
          throw new BadRequestException(
            `Le montant initial ne peut pas être inférieur au total déjà encaissé (${totalEncaisse.toLocaleString('fr-FR')} FCFA).`,
          );
        }

        const fields: string[] = [];
        const params: unknown[] = [];
        const soldeeParAjustement =
          montantInitialCentimes === totalEncaisseCentimes;

        if (dto.libelle !== undefined) {
          params.push(dto.libelle.trim());
          fields.push(`libelle = $${params.length}`);
        }

        params.push(montantInitialDemande);
        fields.push(`montant_initial = $${params.length}`);

        if (soldeeParAjustement) {
          params.push(user.sub);
          fields.push(`statut = 'SOLDEE'`);
          fields.push(`cloturee_par = $${params.length}`);
          fields.push(`cloturee_le = now()`);
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

        params.push(id);

        const updated = await client.query(
          `UPDATE creances
           SET ${fields.join(', ')}, updated_at = now()
           WHERE id = $${params.length}
           RETURNING *`,
          params,
        );

        await client.query(
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

        if (soldeeParAjustement) {
          await client.query(
            `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
             VALUES ($1, $2, 'CREANCE_SOLDEE_PAR_AJUSTEMENT_MONTANT', $3)`,
            [
              creance.dossier_id,
              user.sub,
              JSON.stringify({
                creanceId: id,
                numero: creance.numero,
                montantInitial: montantInitialDemande,
                totalEncaisse,
              }),
            ],
          );
        }

        return updated.rows[0];
      });
    }

    const fields: string[] = [];
    const params: unknown[] = [];

    if (dto.libelle !== undefined) {
      params.push(dto.libelle.trim());
      fields.push(`libelle = $${params.length}`);
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

  async findEncaissements(id: string, user: AuthenticatedUser) {
    const creance = await this.findOne(id, user);

    return this.tenantDb.query(
      `SELECT
         e.*,
         u.nom AS encaisse_par_nom,
         u.prenom AS encaisse_par_prenom
       FROM encaissements_creance e
       LEFT JOIN utilisateurs u ON u.id = e.encaisse_par
       WHERE e.creance_id = $1
       ORDER BY e.date_paiement DESC, e.created_at DESC`,
      [creance.id],
    );
  }

  async findRelances(id: string, user: AuthenticatedUser) {
    const creance = await this.findOne(id, user);

    return this.tenantDb.query(
      `SELECT
         r.*,
         u.nom AS relance_par_nom,
         u.prenom AS relance_par_prenom
       FROM relances_creance r
       LEFT JOIN utilisateurs u ON u.id = r.relance_par
       WHERE r.creance_id = $1
       ORDER BY r.created_at DESC`,
      [creance.id],
    );
  }

  async ajouterEncaissement(
    id: string,
    dto: CreateEncaissementDto,
    user: AuthenticatedUser,
  ) {
    const creanceLecture = await this.findOne(id, user);
    this.verifierModificationDossier(creanceLecture, user);

    return this.tenantDb.transaction(async (client) => {
      const locked = await client.query<{
        id: string;
        numero: string;
        dossier_id: string;
        montant_initial: string;
        statut: string;
      }>(
        `SELECT id, numero, dossier_id, montant_initial, statut
         FROM creances
         WHERE id = $1
         FOR UPDATE`,
        [id],
      );

      const creance = locked.rows[0];
      if (!creance) {
        throw new NotFoundException('Créance introuvable.');
      }

      if (creance.statut === 'ABANDONNEE') {
        throw new BadRequestException(
          "Impossible d'enregistrer un encaissement sur une créance abandonnée.",
        );
      }

      if (creance.statut === 'SOLDEE') {
        throw new BadRequestException(
          'Cette créance est déjà soldée.',
        );
      }

      const totalRow = await client.query<{ total: string }>(
        `SELECT COALESCE(SUM(montant), 0) AS total
         FROM encaissements_creance
         WHERE creance_id = $1`,
        [id],
      );

      const totalAvant = Number(totalRow.rows[0]?.total ?? 0);
      const montantInitial = Number(creance.montant_initial);
      const totalAvantCentimes = Math.round(totalAvant * 100);
      const montantInitialCentimes = Math.round(montantInitial * 100);
      const montantCentimes = Math.round(dto.montant * 100);
      const restantCentimes = montantInitialCentimes - totalAvantCentimes;
      const restant = restantCentimes / 100;

      if (montantCentimes > restantCentimes) {
        throw new BadRequestException(
          `Le montant dépasse le solde restant (${restant.toLocaleString('fr-FR')} FCFA).`,
        );
      }

      const insertion = await client.query(
        `INSERT INTO encaissements_creance (
           creance_id,
           montant,
           mode,
           reference,
           note,
           encaisse_par
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          id,
          dto.montant,
          dto.mode,
          dto.reference?.trim() || null,
          dto.note?.trim() || null,
          user.sub,
        ],
      );

      const encaissement = insertion.rows[0];
      const totalEncaisseCentimes = totalAvantCentimes + montantCentimes;
      const totalEncaisse = totalEncaisseCentimes / 100;
      const estSoldee = totalEncaisseCentimes === montantInitialCentimes;

      const updated = await client.query(
        `UPDATE creances
         SET statut = CASE
               WHEN $1 THEN 'SOLDEE'
               WHEN $4::numeric > 0 THEN 'PARTIELLEMENT_ENCAISSEE'
               ELSE statut
             END,
             cloturee_par = CASE WHEN $1 THEN $2 ELSE cloturee_par END,
             cloturee_le = CASE WHEN $1 THEN now() ELSE cloturee_le END,
             updated_at = now()
         WHERE id = $3
         RETURNING *`,
        [estSoldee, user.sub, id, totalEncaisse],
      );

      await client.query(
        `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
         VALUES ($1, $2, 'ENCAISSEMENT_ENREGISTRE', $3)`,
        [
          creance.dossier_id,
          user.sub,
          JSON.stringify({
            creanceId: id,
            encaissementId: encaissement.id,
            montant: encaissement.montant,
            mode: encaissement.mode,
            totalEncaisse,
            soldeRestant: montantInitial - totalEncaisse,
          }),
        ],
      );

      if (estSoldee) {
        await client.query(
          `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
           VALUES ($1, $2, 'CREANCE_SOLDEE_PAR_ENCAISSEMENT', $3)`,
          [
            creance.dossier_id,
            user.sub,
            JSON.stringify({
              creanceId: id,
              numero: creance.numero,
              montantInitial,
              totalEncaisse,
            }),
          ],
        );
      }

      return {
        creance: updated.rows[0],
        encaissement,
      };
    });
  }

  async ajouterRelance(
    id: string,
    dto: CreateRelanceCreanceDto,
    user: AuthenticatedUser,
  ) {
    const creanceLecture = await this.findOne(id, user);
    this.verifierModificationDossier(creanceLecture, user);

    if (
      creanceLecture.dossier_statut === 'CLOTURE' ||
      creanceLecture.dossier_statut === 'ARCHIVE'
    ) {
      throw new BadRequestException(
        'Impossible d ajouter une relance dans un dossier cloture ou archive.',
      );
    }

    const prochaineAction = dto.prochaineAction?.trim() || null;
    const prochaineActionLe = dto.prochaineActionLe ?? null;

    if (prochaineActionLe && !prochaineAction) {
      throw new BadRequestException(
        'Une prochaine action est requise lorsque sa date est renseignee.',
      );
    }

    return this.tenantDb.transaction(async (client) => {
      const locked = await client.query<{
        id: string;
        numero: string;
        dossier_id: string;
        statut: string;
      }>(
        `SELECT id, numero, dossier_id, statut
         FROM creances
         WHERE id = $1
         FOR UPDATE`,
        [id],
      );

      const creance = locked.rows[0];

      if (!creance) {
        throw new NotFoundException('Créance introuvable.');
      }

      if (creance.statut === 'SOLDEE' || creance.statut === 'ABANDONNEE') {
        throw new BadRequestException(
          'Impossible d ajouter une relance sur une créance soldée ou abandonnée.',
        );
      }

      const insertion = await client.query(
        `INSERT INTO relances_creance (
           creance_id,
           canal,
           commentaire,
           prochaine_action,
           prochaine_action_le,
           relance_par
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          id,
          dto.canal,
          dto.commentaire?.trim() || null,
          prochaineAction,
          prochaineActionLe,
          user.sub,
        ],
      );

      const relance = insertion.rows[0];

      await client.query(
        `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
         VALUES ($1, $2, 'RELANCE_CREANCE_AJOUTEE', $3)`,
        [
          creance.dossier_id,
          user.sub,
          JSON.stringify({
            creanceId: id,
            relanceId: relance.id,
            canal: relance.canal,
            prochaineAction: relance.prochaine_action,
            prochaineActionLe: relance.prochaine_action_le,
          }),
        ],
      );

      return relance;
    });
  }

  async updateStatut(id: string, dto: UpdateStatutCreanceDto, user: AuthenticatedUser) {
    const creance = await this.findOne(id, user);
    this.verifierModificationDossier(creance, user);

    if (
      dto.statut === 'SOLDEE' ||
      dto.statut === 'PARTIELLEMENT_ENCAISSEE'
    ) {
      throw new BadRequestException(
        'Les statuts de paiement sont calcules automatiquement a partir des encaissements.',
      );
    }

    if (dto.statut === 'ABANDONNEE') {
      this.verifierFinalisation(user);
    }

    if (creance.statut === 'SOLDEE' || creance.statut === 'ABANDONNEE') {
      throw new BadRequestException(
        "Une créance soldée ou abandonnée ne peut plus changer de statut.",
      );
    }

    const finalisee = dto.statut === 'ABANDONNEE';

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

  async generateCreancePdf(id: string, user: AuthenticatedUser): Promise<{ buffer: Buffer; filename: string }> {
    const creance = await this.findOne(id, user);
    let encaissements: any[] = [];

    try {
      encaissements = await this.tenantDb.query(
        `SELECT * FROM encaissements_creance WHERE creance_id = $1 ORDER BY date_paiement DESC`,
        [id],
      );
    } catch (error: any) {
      if (error?.code !== '42P01') {
        throw error;
      }
    }

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #14213D; font-size: 24px; margin-bottom: 10px; }
            .info { margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .label { font-weight: bold; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background: #14213D; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
            .parties { display: flex; gap: 20px; margin: 25px 0; }
            .partie { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 15px; }
            .partie h2 { font-size: 15px; margin: 0 0 8px; color: #14213D; }
            .partie .nom { font-size: 16px; font-weight: bold; margin: 0 0 4px; }
            .partie p { margin: 0; color: #555; }
            .creancier { border-color: #14213D; }
            .debiteur { border-color: #9D2C2C; }
          </style>
        </head>
        <body>
          <h1>Fiche Créance - ${creance.numero}</h1>

          <div class="parties">
            <div class="partie creancier">
              <h2>Créancier</h2>
              <p class="nom">${[creance.client_nom, creance.client_prenom].filter(Boolean).join(' ') || '-'}</p>
              <p>Client mandant</p>
            </div>

            <div class="partie debiteur">
              <h2>Débiteur poursuivi</h2>
              <p class="nom">${[creance.debiteur_nom, creance.debiteur_prenom].filter(Boolean).join(' ') || '-'}</p>
              <p>${creance.debiteur_telephone ?? ''}</p>
            </div>
          </div>

          <div class="info">
            <div class="info-row"><span class="label">Libellé :</span> <span>${creance.libelle}</span></div>
            <div class="info-row"><span class="label">Référence :</span> <span>${creance.reference ?? '-'}</span></div>
            <div class="info-row"><span class="label">Dossier :</span> <span>${creance.dossier_numero ?? '-'}</span></div>
            <div class="info-row"><span class="label">Date d’exigibilité :</span> <span>${creance.date_exigibilite ? new Date(creance.date_exigibilite).toLocaleDateString('fr-FR') : '-'}</span></div>
            <div class="info-row"><span class="label">Statut :</span> <span>${creance.statut}</span></div>
          </div>

          <div class="info">
            <div class="info-row"><span class="label">Montant initial :</span> <span>${Number(creance.montant_initial).toLocaleString('fr-FR')} FCFA</span></div>
            <div class="info-row"><span class="label">Total encaissé :</span> <span>${encaissements.reduce((sum, e) => sum + Number(e.montant), 0).toLocaleString('fr-FR')} FCFA</span></div>
            <div class="total">Solde restant : ${Math.max(0, Number(creance.montant_initial) - encaissements.reduce((sum, e) => sum + Number(e.montant), 0)).toLocaleString('fr-FR')} FCFA</div>
          </div>

          ${encaissements.length > 0 ? `
          <h2>Historique des paiements</h2>
          <table>
            <thead>
              <tr><th>Date</th><th>Montant</th><th>Mode</th><th>Référence</th></tr>
            </thead>
            <tbody>
              ${encaissements.map(e => `
              <tr>
                <td>${new Date(e.date_paiement).toLocaleDateString('fr-FR')}</td>
                <td>${Number(e.montant).toLocaleString('fr-FR')} FCFA</td>
                <td>${e.mode}</td>
                <td>${e.reference ?? '-'}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
          ` : '<p>Aucun paiement enregistré.</p>'}
        </body>
      </html>
    `;

    const buffer = await this.pdfService.genererPdf(html, {});
    return {
      buffer,
      filename: `creance-${creance.numero}.pdf`,
    };
  }
}
