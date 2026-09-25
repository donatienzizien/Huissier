import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows: schemas } = await pool.query<{ schema_name: string }>(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'cabinet_%'`,
  );

  for (const { schema_name } of schemas) {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schema_name}"`);
      // ALTER TYPE ... ADD VALUE doit s'executer hors transaction explicite
      await client.query(`ALTER TYPE role_utilisateur ADD VALUE IF NOT EXISTS 'SECRETAIRE'`);
      console.log(`OK ${schema_name}`);
    } catch (err) {
      console.error(`ECHEC ${schema_name} : ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }
  await pool.end();
}
main().catch((err) => { console.error(err); process.exit(1); });
