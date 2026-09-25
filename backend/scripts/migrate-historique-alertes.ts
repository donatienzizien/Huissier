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
      await client.query(`
        CREATE TABLE IF NOT EXISTS alertes_clients_historique (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          facture_id      UUID REFERENCES factures(id) ON DELETE SET NULL,
          type            TEXT NOT NULL,
          montant_restant NUMERIC(14,2),
          envoyee         BOOLEAN NOT NULL DEFAULT TRUE,
          envoyee_le      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_alertes_clients_historique_client ON alertes_clients_historique(client_id)`,
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
main().catch((err) => { console.error(err); process.exit(1); });
