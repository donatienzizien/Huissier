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
      await client.query(
        `ALTER TABLE factures ADD COLUMN IF NOT EXISTS alerte_echeance_envoyee BOOLEAN NOT NULL DEFAULT FALSE`,
      );
      await client.query(
        `ALTER TABLE factures ADD COLUMN IF NOT EXISTS alerte_retard_derniere_le TIMESTAMPTZ`,
      );
      console.log(`OK ${schema_name}`);
    } catch (err) {
      console.error(`ECHEC ${schema_name} : ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
