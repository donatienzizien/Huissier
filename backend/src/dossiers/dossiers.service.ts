import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { TenantDbService } from '../tenant/tenant-db.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateStatutDossierDto } from './dto/update-statut-dossier.dto';
import { UpdateTiersDossierDto } from './dto/update-tiers-dossier.dto';
import { AssignerClercDto } from './dto/assigner-clerc.dto';
import { AssignerAgentDto } from './dto/assigner-agent.dto';
import { QueryDossiersDto } from './dto/query-dossiers.dto';

@Injectable()
export class DossiersService {
  constructor(private readonly tenantDb: TenantDbService) {}

  private async prochainNumero(): Promise<string> {
    const annee = new Date().getFullYear();
    const cle = `dossier_${annee}`;
    const row = await this.tenantDb.queryOne<{ valeur: number }>(
      `INSERT INTO compteurs (cle, valeur) VALUES ($1, 1)
       ON CONFLICT (cle) DO UPDATE SET valeur = compteurs.valeur + 1
       RETURNING valeur`,
      [cle],
    );
    const sequence = String(row!.valeur).padStart(4, '0');
    return `DOS-${annee}-${sequence}`;
  }

  async create(dto: CreateDossierDto, utilisateurId: string) {
    const client = await this.tenantDb.queryOne<{ id: string }>(
      `SELECT id FROM clients WHERE id = $1 AND role_tiers = 'CLIENT'`,
      [dto.clientId],
    );
    if (!client) {
      throw new NotFoundException('Client mandant introuvable ou fiche non classee comme CLIENT.');
    }

    const debiteur = await this.tenantDb.queryOne<{ id: string }>(
      `SELECT id FROM clients WHERE id = $1 AND role_tiers = 'DEBITEUR'`,
      [dto.debiteurId],
    );
    if (!debiteur) {
      throw new NotFoundException('Debiteur introuvable ou fiche non classee comme DEBITEUR.');
    }

    if (dto.clientId === dto.debiteurId) {
      throw new BadRequestException('Le client mandant et le debiteur doivent etre deux fiches distinctes.');
    }

    return this.tenantDb.transaction(async (txClient) => {
      const annee = new Date().getFullYear();
      const cle = `dossier_${annee}`;
      const compteur = await txClient.query(
        `INSERT INTO compteurs (cle, valeur) VALUES ($1, 1)
         ON CONFLICT (cle) DO UPDATE SET valeur = compteurs.valeur + 1
         RETURNING valeur`,
        [cle],
      );
      const sequence = String(compteur.rows[0].valeur).padStart(4, '0');
      const numero = `DOS-${annee}-${sequence}`;

      const dossierResult = await txClient.query(
        `INSERT INTO dossiers (numero, type, client_id, debiteur_id, cree_par, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [numero, dto.type, dto.clientId, dto.debiteurId, utilisateurId, dto.description],
      );
      const dossier = dossierResult.rows[0];

      await txClient.query(
        `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
         VALUES ($1, $2, 'CREATION', $3)`,
        [
          dossier.id,
          utilisateurId,
          JSON.stringify({
            type: dto.type,
            clientId: dto.clientId,
            debiteurId: dto.debiteurId,
          }),
        ],
      );

      return dossier;
    });
  }
  // Restriction d'acces AGENT_TERRAIN : ne voit que les dossiers ou il
  // est designe comme agent (assigne_agent_id). Les autres roles voient
  // tout, sans restriction supplementaire ici (le controle par module
  // reste gere par @Roles sur les routes).
  private restrictionAgent(user: AuthenticatedUser, params: any[], conditions: string[]) {
    if (user.role === 'AGENT_TERRAIN') {
      params.push(user.sub);
      conditions.push(`d.assigne_agent_id = $${params.length}`);
    }
  }

  async findAll(query: QueryDossiersDto, user: AuthenticatedUser) {
    const { page, limit, search, statut, type, clientId, debiteurId, dateDebut, dateFin } = query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (statut) {
      params.push(statut);
      conditions.push(`d.statut = $${params.length}`);
    }
    if (type) {
      params.push(type);
      conditions.push(`d.type = $${params.length}`);
    }
    if (clientId) {
      params.push(clientId);
      conditions.push(`d.client_id = $${params.length}`);
    }
    if (debiteurId) {
      params.push(debiteurId);
      conditions.push(`d.debiteur_id = $${params.length}`);
    }
    if (dateDebut) {
      params.push(dateDebut);
      conditions.push(`d.date_ouverture >= $${params.length}`);
    }
    if (dateFin) {
      params.push(dateFin);
      conditions.push(`d.date_ouverture <= $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(d.numero ILIKE $${params.length} OR c.nom ILIKE $${params.length} OR c.prenom ILIKE $${params.length} OR deb.nom ILIKE $${params.length})`,
      );
    }
    this.restrictionAgent(user, params, conditions);

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const rows = await this.tenantDb.query(
      `SELECT d.*, c.nom AS client_nom, c.prenom AS client_prenom,
              deb.nom AS debiteur_nom, deb.prenom AS debiteur_prenom,
              cl.nom AS assigne_clerc_nom, cl.prenom AS assigne_clerc_prenom,
              ag.nom AS assigne_agent_nom, ag.prenom AS assigne_agent_prenom
       FROM dossiers d
       JOIN clients c ON c.id = d.client_id
       LEFT JOIN clients deb ON deb.id = d.debiteur_id
       LEFT JOIN utilisateurs cl ON cl.id = d.assigne_clerc_id
       LEFT JOIN utilisateurs ag ON ag.id = d.assigne_agent_id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    const countRow = await this.tenantDb.queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM dossiers d
       JOIN clients c ON c.id = d.client_id
       LEFT JOIN clients deb ON deb.id = d.debiteur_id
       ${whereClause}`,
      params,
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
    const dossier = await this.tenantDb.queryOne(
      `SELECT d.*,
              c.nom AS client_nom, c.prenom AS client_prenom, c.telephone AS client_telephone,
              deb.nom AS debiteur_nom, deb.prenom AS debiteur_prenom, deb.telephone AS debiteur_telephone,
              deb.adresse AS debiteur_adresse,
              cl.nom AS assigne_clerc_nom, cl.prenom AS assigne_clerc_prenom,
              ag.nom AS assigne_agent_nom, ag.prenom AS assigne_agent_prenom
       FROM dossiers d
       JOIN clients c ON c.id = d.client_id
       LEFT JOIN clients deb ON deb.id = d.debiteur_id
       LEFT JOIN utilisateurs cl ON cl.id = d.assigne_clerc_id
       LEFT JOIN utilisateurs ag ON ag.id = d.assigne_agent_id
       WHERE d.id = $1`,
      [id],
    ) as any;
    if (!dossier) throw new NotFoundException('Dossier introuvable.');

    if (user.role === 'AGENT_TERRAIN' && dossier.assigne_agent_id !== user.sub) {
      throw new ForbiddenException("Ce dossier ne vous est pas assigne.");
    }

    const [historique, actes, factures] = await Promise.all([
      this.tenantDb.query(
        `SELECT h.*, u.nom AS utilisateur_nom, u.prenom AS utilisateur_prenom
         FROM dossier_historique h
         LEFT JOIN utilisateurs u ON u.id = h.utilisateur_id
         WHERE h.dossier_id = $1 ORDER BY h.created_at DESC`,
        [id],
      ),
      this.tenantDb.query(
        `SELECT a.id, a.numero, a.type, a.date_acte, a.envoye_client_le, a.signe_client_le,
                a.notifie_par, a.notifie_le,
                u.nom AS notifie_par_nom, u.prenom AS notifie_par_prenom
         FROM actes a
         LEFT JOIN utilisateurs u ON u.id = a.notifie_par
         WHERE a.dossier_id = $1`,
        [id],
      ),
      this.tenantDb.query(
        `SELECT id, numero, montant_total, montant_paye, statut FROM factures WHERE dossier_id = $1`,
        [id],
      ),
    ]);

    return { ...dossier, historique, actes, factures };
  }

  async updateStatut(id: string, dto: UpdateStatutDossierDto, utilisateurId: string) {
    const dossier = await this.tenantDb.queryOne<{ id: string; statut: string }>(
      `SELECT id, statut FROM dossiers WHERE id = $1`,
      [id],
    );
    if (!dossier) throw new NotFoundException('Dossier introuvable.');

    const dateCloture = dto.statut === 'CLOTURE' ? 'now()' : 'NULL';
    const updated = await this.tenantDb.queryOne(
      `UPDATE dossiers SET statut = $1, date_cloture = ${dateCloture}, updated_at = now()
       WHERE id = $2 RETURNING *`,
      [dto.statut, id],
    );

    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1, $2, 'CHANGEMENT_STATUT', $3)`,
      [id, utilisateurId, JSON.stringify({ ancien: dossier.statut, nouveau: dto.statut })],
    );

    return updated;
  }

  async updateTiers(id: string, dto: UpdateTiersDossierDto, utilisateurId: string) {
    const dossier = await this.tenantDb.queryOne<{ id: string; client_id: string; debiteur_id: string | null }>(
      `SELECT id, client_id, debiteur_id FROM dossiers WHERE id = $1`,
      [id],
    );
    if (!dossier) throw new NotFoundException('Dossier introuvable.');

    if (dto.clientId) {
      const client = await this.tenantDb.queryOne(`SELECT id FROM clients WHERE id = $1 AND role_tiers = 'CLIENT'`, [dto.clientId]);
      if (!client) throw new NotFoundException('Client introuvable.');
    }
    if (dto.debiteurId) {
      const debiteur = await this.tenantDb.queryOne(`SELECT id FROM clients WHERE id = $1 AND role_tiers = 'DEBITEUR'`, [dto.debiteurId]);
      if (!debiteur) throw new NotFoundException('Debiteur introuvable.');
    }
    if (dto.clientId === undefined && dto.debiteurId === undefined) {
      throw new BadRequestException('Aucune modification fournie.');
    }

    const fields: string[] = [];
    const params: any[] = [];
    if (dto.clientId !== undefined) {
      params.push(dto.clientId);
      fields.push(`client_id = $${params.length}`);
    }
    if (dto.debiteurId !== undefined) {
      params.push(dto.debiteurId);
      fields.push(`debiteur_id = $${params.length}`);
    }
    params.push(id);

    const updated = await this.tenantDb.queryOne(
      `UPDATE dossiers SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params,
    );

    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1, $2, 'CHANGEMENT_TIERS', $3)`,
      [
        id,
        utilisateurId,
        JSON.stringify({
          ancienClientId: dossier.client_id,
          nouveauClientId: dto.clientId ?? dossier.client_id,
          ancienDebiteurId: dossier.debiteur_id,
          nouveauDebiteurId: dto.debiteurId !== undefined ? dto.debiteurId : dossier.debiteur_id,
        }),
      ],
    );

    return updated;
  }

  // Attribution d'un CLERC responsable - reservee au HUISSIER (haut de la
  // chaine). Reassigner a un autre clerc, ou retirer (clercId: null), sont
  // les memes droits. Si un agent terrain etait deja assigne, il est
  // conserve tel quel (le changement de clerc responsable ne le retire pas
  // automatiquement).
  async assignerClerc(id: string, dto: AssignerClercDto, currentUser: AuthenticatedUser) {
    if (currentUser.role !== 'HUISSIER') {
      throw new ForbiddenException("Seul l'Huissier peut attribuer un dossier a un Clerc.");
    }
    const dossier = await this.tenantDb.queryOne<{ id: string }>(`SELECT id FROM dossiers WHERE id = $1`, [id]);
    if (!dossier) throw new NotFoundException('Dossier introuvable.');

    if (dto.clercId) {
      const clerc = await this.tenantDb.queryOne<{ role: string; actif: boolean }>(
        `SELECT role, actif FROM utilisateurs WHERE id = $1`,
        [dto.clercId],
      );
      if (!clerc) throw new NotFoundException('Utilisateur introuvable.');
      if (clerc.role !== 'CLERC') throw new BadRequestException('Cet utilisateur n\'est pas un Clerc.');
      if (!clerc.actif) throw new BadRequestException('Ce Clerc est desactive.');
    }

    const updated = await this.tenantDb.queryOne(
      `UPDATE dossiers SET assigne_clerc_id = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [dto.clercId ?? null, id],
    );
    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1,$2,'DOSSIER_ASSIGNE_CLERC',$3)`,
      [id, currentUser.sub, JSON.stringify({ clercId: dto.clercId ?? null })],
    );
    return updated;
  }

  // Attribution d'un AGENT_TERRAIN executant - reservee au HUISSIER ou au
  // Clerc actuellement responsable du dossier (chaine hierarchique).
  async assignerAgent(id: string, dto: AssignerAgentDto, currentUser: AuthenticatedUser) {
    const dossier = await this.tenantDb.queryOne<{ id: string; assigne_clerc_id: string | null }>(
      `SELECT id, assigne_clerc_id FROM dossiers WHERE id = $1`,
      [id],
    );
    if (!dossier) throw new NotFoundException('Dossier introuvable.');

    const autorise =
      currentUser.role === 'HUISSIER' ||
      (currentUser.role === 'CLERC' && dossier.assigne_clerc_id === currentUser.sub);
    if (!autorise) {
      throw new ForbiddenException(
        "Seul l'Huissier, ou le Clerc responsable de ce dossier, peut l'assigner a un agent terrain.",
      );
    }

    if (dto.agentId) {
      const agent = await this.tenantDb.queryOne<{ role: string; actif: boolean }>(
        `SELECT role, actif FROM utilisateurs WHERE id = $1`,
        [dto.agentId],
      );
      if (!agent) throw new NotFoundException('Utilisateur introuvable.');
      if (agent.role !== 'AGENT_TERRAIN') throw new BadRequestException("Cet utilisateur n'est pas un agent terrain.");
      if (!agent.actif) throw new BadRequestException('Cet agent est desactive.');
    }

    const updated = await this.tenantDb.queryOne(
      `UPDATE dossiers SET assigne_agent_id = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [dto.agentId ?? null, id],
    );
    await this.tenantDb.query(
      `INSERT INTO dossier_historique (dossier_id, utilisateur_id, action, details)
       VALUES ($1,$2,'DOSSIER_ASSIGNE_AGENT',$3)`,
      [id, currentUser.sub, JSON.stringify({ agentId: dto.agentId ?? null })],
    );
    return updated;
  }

  async remove(id: string) {
    const dossier = await this.tenantDb.queryOne<{ id: string; numero: string }>(
      `SELECT id, numero FROM dossiers WHERE id = $1`,
      [id],
    );
    if (!dossier) throw new NotFoundException('Dossier introuvable.');

    const actes = await this.tenantDb.query<{ pdf_path: string }>(
      `SELECT pdf_path FROM actes WHERE dossier_id = $1`,
      [id],
    );

    await this.tenantDb.transaction(async (txClient) => {
      await txClient.query(
        `DELETE FROM paiements WHERE facture_id IN (SELECT id FROM factures WHERE dossier_id = $1)`,
        [id],
      );
      await txClient.query(`DELETE FROM factures WHERE dossier_id = $1`, [id]);
      await txClient.query(`DELETE FROM actes WHERE dossier_id = $1`, [id]);
      await txClient.query(`DELETE FROM evenements WHERE dossier_id = $1`, [id]);
      await txClient.query(`DELETE FROM dossier_historique WHERE dossier_id = $1`, [id]);
      await txClient.query(`DELETE FROM dossiers WHERE id = $1`, [id]);
    });

    await Promise.all(actes.map((a) => unlink(a.pdf_path).catch(() => undefined)));

    return { id, numero: dossier.numero, supprime: true };
  }
}



