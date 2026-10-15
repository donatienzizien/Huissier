require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT c.id, c.numero, c.statut, c.date_exigibilite,
             cl.nom AS debiteur_nom
      FROM cabinet_test2.creances c
      JOIN cabinet_test2.dossiers d ON d.id = c.dossier_id
      JOIN cabinet_test2.clients cl ON cl.id = d.debiteur_id
      WHERE c.date_exigibilite IS NOT NULL
        AND c.date_exigibilite < NOW()
        AND c.statut IN ('ACTIVE', 'PARTIELLEMENT_ENCAISSEE')
      ORDER BY c.date_exigibilite ASC
    `);

    console.log(`📋 Créances échues dans cabinet_test2 : ${result.rows.length}`);

    result.rows.forEach((row) => {
      console.log(`- ${row.numero} | ${row.statut} | ${row.date_exigibilite} | ${row.debiteur_nom}`);
    });
  } catch (error) {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();