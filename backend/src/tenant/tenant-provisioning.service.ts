import { Injectable, BadRequestException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const SLUG_REGEX = /^[a-z][a-z0-9_]{2,30}$/;

// Exécutée uniquement par le Super Admin lors de la création d'un nouveau
// cabinet (voir CabinetsService.create). Provisionne le schéma PostgreSQL
// dédié à partir du gabarit tenant-schema.sql.
@Injectable()
export class TenantProvisioningService {
  private readonly template: string;

  constructor() {
    this.template = readFileSync(join(__dirname, '../../prisma/tenant-schema.sql'), 'utf-8');
  }

  async provision(slug: string): Promise<string> {
    if (!SLUG_REGEX.test(slug)) {
      throw new BadRequestException(
        'Slug de cabinet invalide (minuscules, chiffres, underscore, 3-30 caractères).',
      );
    }
    const schemaName = `cabinet_${slug}`;
    const sql = this.template.replace(/\{\{SCHEMA\}\}/g, schemaName);

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
      await pool.end();
    }
    return schemaName;
  }
}
