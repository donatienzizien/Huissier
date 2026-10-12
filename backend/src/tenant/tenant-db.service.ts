import { Injectable, Scope } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { TenantContextService } from './tenant-context.service';

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

  private async withClient<T>(
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const { schemaName } = this.tenantContext.get();
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO "${schemaName}"`);

      const result = await fn(client);

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
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
    return this.withClient(fn);
  }
}
