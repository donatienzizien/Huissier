import { Injectable, Scope } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { TenantContextService } from './tenant-context.service';

// Prisma ne supporte pas nativement des schÃ©mas crÃ©Ã©s dynamiquement Ã 
// l'exÃ©cution (le "multiSchema" preview exige une liste statique connue au
// `generate`). Les tables tenant sont donc provisionnÃ©es en SQL brut
// (tenant-schema.sql) et interrogÃ©es ici via `pg`, avec `search_path`
// verrouillÃ© sur le schÃ©ma du cabinet courant â€” c'est ce qui garantit
// l'isolation totale entre cabinets.
const poolCache = new Map<string, Pool>();

function getPool(): Pool {
  const key = 'main';
  if (!poolCache.has(key)) {
    poolCache.set(
      key,
      new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
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
      // Identifiant de schÃ©ma non paramÃ©trable en SQL -> validÃ© strictement
      // en amont (slug alphanumÃ©rique) lors de la crÃ©ation du cabinet.
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

