import 'dotenv/config';
import { Pool } from 'pg';

async function executer(client: import('pg').PoolClient, sql: string, label: string) {
  try {
    await client.query(sql);
    console.log(`  OK ${label}`);
  } catch (err: any) {
    if (err.code === '42710' || err.code === '42701' || /already exists/i.test(err.message)) {
      console.log(`  DEJA PRESENT ${label}`);
    } else {
      console.error(`  ECHEC ${label} : ${err.message}`);
    }
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows: schemas } = await pool.query<{ schema_name: string }>(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'cabinet_%'`,
  );

  for (const { schema_name } of schemas) {
    console.log(`\n${schema_name} :`);
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schema_name}"`);
      await executer(
        client,
        `ALTER TABLE actes ADD COLUMN notifie_par UUID REFERENCES utilisateurs(id)`,
        'colonne actes.notifie_par',
      );
      await executer(
        client,
        `ALTER TABLE actes ADD COLUMN notifie_le TIMESTAMPTZ`,
        'colonne actes.notifie_le',
      );
    } finally {
      client.release();
    }
  }
  await pool.end();
}
main().catch((err) => { console.error(err); process.exit(1); });
