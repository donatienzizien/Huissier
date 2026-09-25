import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDbService } from '../tenant/tenant-db.service';
import { CreateEvenementDto } from './dto/create-evenement.dto';
import { UpdateEvenementDto } from './dto/update-evenement.dto';
import { QueryEvenementsDto } from './dto/query-evenements.dto';

const COLUMN_MAP: Record<string, string> = {
  dossierId: 'dossier_id',
  assigneA: 'assigne_a',
  dateDebut: 'date_debut',
  dateFin: 'date_fin',
  rappelJ1: 'rappel_j1',
  rappelJ7: 'rappel_j7',
};

@Injectable()
export class AgendaService {
  constructor(private readonly tenantDb: TenantDbService) {}

  async findAll(query: QueryEvenementsDto) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.dateDebut) {
      params.push(query.dateDebut);
      conditions.push(`e.date_debut >= $${params.length}`);
    }
    if (query.dateFin) {
      params.push(query.dateFin);
      conditions.push(`e.date_debut <= $${params.length}`);
    }
    if (query.assigneA) {
      params.push(query.assigneA);
      conditions.push(`e.assigne_a = $${params.length}`);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.tenantDb.query(
      `SELECT e.*, d.numero AS dossier_numero, u.nom AS assigne_nom, u.prenom AS assigne_prenom
       FROM evenements e
       LEFT JOIN dossiers d ON d.id = e.dossier_id
       LEFT JOIN utilisateurs u ON u.id = e.assigne_a
       ${whereClause}
       ORDER BY e.date_debut ASC`,
      params,
    );
  }

  async findOne(id: string) {
    const evenement = await this.tenantDb.queryOne(
      `SELECT e.*, d.numero AS dossier_numero FROM evenements e
       LEFT JOIN dossiers d ON d.id = e.dossier_id WHERE e.id = $1`,
      [id],
    );
    if (!evenement) throw new NotFoundException('Événement introuvable.');
    return evenement;
  }

  async create(dto: CreateEvenementDto) {
    return this.tenantDb.queryOne(
      `INSERT INTO evenements (titre, description, dossier_id, assigne_a, date_debut, date_fin, rappel_j1, rappel_j7)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        dto.titre,
        dto.description ?? null,
        dto.dossierId ?? null,
        dto.assigneA ?? null,
        dto.dateDebut,
        dto.dateFin ?? null,
        dto.rappelJ1 ?? true,
        dto.rappelJ7 ?? false,
      ],
    );
  }

  async update(id: string, dto: UpdateEvenementDto) {
    await this.findOne(id);
    const fields: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      params.push(value);
      fields.push(`${COLUMN_MAP[key] ?? key} = $${params.length}`);
    }
    if (fields.length === 0) return this.findOne(id);

    params.push(id);
    return this.tenantDb.queryOne(
      `UPDATE evenements SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.tenantDb.query(`DELETE FROM evenements WHERE id = $1`, [id]);
    return { success: true };
  }
}
