import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO cabinet_test2`);
    const { rows } = await client.query(`
      SELECT d.numero, d.type, c.nom AS client_actuel, c.categorie, c.role_tiers, d.debiteur_id
      FROM dossiers d
      JOIN clients c ON c.id = d.client_id
      ORDER BY d.created_at DESC
    `);
    console.table(rows);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
