import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO cabinet_test2`);
    const { rows } = await client.query(
      `SELECT template_html FROM modeles_actes WHERE type = 'PV_CONSTAT' AND nom = 'Constat'`,
    );
    console.log(rows[0]?.template_html ?? 'AUCUN MODELE TROUVE');
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
