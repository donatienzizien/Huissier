import { Injectable, Scope } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { TenantContextService } from './tenant-context.service';

// Prisma ne supporte pas nativement des schémas créés dynamiquement à
// l'exécution (le "multiSchema" preview exige une liste statique connue au
// `generate`). Les tables tenant sont donc provisionnées en SQL brut
// (tenant-schema.sql) et interrogées ici via `pg`, avec `search_path`
// verrouillé sur le schéma du cabinet courant — c'est ce qui garantit
// l'isolation totale entre cabinets.
const poolCache = new Map<string, Pool>();

function getPool(): Pool {
  const key = 'main';
  if (!poolCache.has(key)) {
    poolCache.set(
      key,
      new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
      }),
    );
  }
  return poolCache.get(key)!;
}

@Injectable({ scope: Scope.REQUEST })
export class TenantDbService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const { schemaName } = this.tenantContext.get();
    const pool = getPool();
    const client = await pool.connect();
    try {
      // Identifiant de schéma non paramétrable en SQL -> validé strictement
      // en amont (slug alphanumérique) lors de la création du cabinet.
      await client.query(`SET search_path TO "${schemaName}"`);
      return await fn(client);
    } finally {
      client.release();
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.withClient(async (client) => {
      const result = await client.query(sql, params);
      return result.rows as T[];
    });
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.withClient(async (client) => {
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    });
  }
}
