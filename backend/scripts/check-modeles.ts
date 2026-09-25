import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO cabinet_test2`);
    const { rows } = await client.query(`SELECT nom, type, actif FROM modeles_actes ORDER BY type`);
    console.table(rows);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
