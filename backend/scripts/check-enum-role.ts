import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO cabinet_test2`);
    const { rows } = await client.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'role_utilisateur'
      ORDER BY e.enumsortorder
    `);
    console.log('Valeurs actuelles de l\'enum role_utilisateur :', rows.map(r => r.enumlabel));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
