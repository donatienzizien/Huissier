import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class TenantCronDbService {
  private readonly logger = new Logger(TenantCronDbService.name);
  private pool: Pool | null = null;

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
      });
    }
    return this.pool;
  }

  async getTenantSchemas(): Promise<string[]> {
    const client = await this.getPool().connect();

    try {
      const result = await client.query<{ table_schema: string }>(
        `SELECT DISTINCT table_schema
         FROM information_schema.tables
         WHERE table_schema LIKE 'cabinet_%'
         ORDER BY table_schema`,
      );

      return result.rows.map((row) => row.table_schema);
    } finally {
      client.release();
    }
  }

  async withTenant<T>(
    schemaName: string,
    handler: (query: (sql: string, params?: any[]) => Promise<any[]>) => Promise<T>,
  ): Promise<T> {
    if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
      throw new Error(`Nom de schéma invalide : ${schemaName}`);
    }

    const client = await this.getPool().connect();

    try {
      await client.query(`SET search_path TO "${schemaName}"`);

      const query = async (sql: string, params: any[] = []) => {
        const result = await client.query(sql, params);
        return result.rows;
      };

      return await handler(query);
    } finally {
      client.release();
    }
  }
}