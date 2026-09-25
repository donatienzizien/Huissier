import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO cabinet_test2`);

    // Cree un dossier + client de test si besoin, puis une facture avec
    // echeance hier (declenche l'alerte "retard") pour verifier le cron.
    const { rows: clients } = await client.query(`SELECT id FROM clients WHERE email IS NOT NULL LIMIT 1`);
    if (clients.length === 0) {
      console.log('Aucun client avec email en base - ajoute un email a un client existant avant de tester.');
      return;
    }
    const { rows: dossiers } = await client.query(
      `SELECT id FROM dossiers WHERE client_id = $1 LIMIT 1`,
      [clients[0].id],
    );
    if (dossiers.length === 0) {
      console.log('Ce client n a pas de dossier - choisis-en un autre ou cree un dossier de test.');
      return;
    }
    const facture = await client.query(
      `INSERT INTO factures (numero, dossier_id, montant_total, montant_paye, statut, date_echeance)
       VALUES ($1, $2, 50000, 0, 'ENVOYEE', now() - interval '2 days')
       RETURNING id, numero`,
      [`TEST-${Date.now()}`, dossiers[0].id],
    );
    console.log('Facture de test creee (echeance hier, en retard) :', facture.rows[0]);
    console.log('Redemarre le backend puis force le cron avec la commande suivante.');
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
