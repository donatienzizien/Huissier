import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDbService } from '../tenant/tenant-db.service';
import { CreateModeleActeDto } from './dto/create-modele-acte.dto';
import { UpdateModeleActeDto } from './dto/update-modele-acte.dto';

@Injectable()
export class ModelesActesService {
  constructor(private readonly tenantDb: TenantDbService) {}

  async findAll(actifOnly = false) {
    const where = actifOnly ? 'WHERE actif = TRUE' : '';
    return this.tenantDb.query(
      `SELECT id, nom, type, actif, niveau_validation_requis, created_at FROM modeles_actes ${where} ORDER BY created_at DESC`,
    );
  }

  async findOne(id: string) {
    const modele = await this.tenantDb.queryOne(`SELECT * FROM modeles_actes WHERE id = $1`, [id]);
    if (!modele) throw new NotFoundException("Modele d'acte introuvable.");
    return modele;
  }

  async create(dto: CreateModeleActeDto) {
    return this.tenantDb.queryOne(
      `INSERT INTO modeles_actes (nom, type, template_html, niveau_validation_requis) VALUES ($1,$2,$3,$4) RETURNING *`,
      [dto.nom, dto.type, dto.templateHtml, dto.niveauValidationRequis ?? 'CLERC'],
    );
  }

  async update(id: string, dto: UpdateModeleActeDto) {
    await this.findOne(id);
    const fields: string[] = [];
    const params: any[] = [];
    const columnMap: Record<string, string> = {
      templateHtml: 'template_html',
      niveauValidationRequis: 'niveau_validation_requis',
    };

    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      params.push(value);
      fields.push(`${columnMap[key] ?? key} = $${params.length}`);
    }
    if (fields.length === 0) return this.findOne(id);

    params.push(id);
    return this.tenantDb.queryOne(
      `UPDATE modeles_actes SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
  }
}
