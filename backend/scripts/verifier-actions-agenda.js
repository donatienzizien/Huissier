require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT id, titre, date_echeance, statut, notifie, notifie_le
      FROM cabinet_test2.agenda_actions
      WHERE date_echeance < NOW()
        AND statut != 'TERMINE'
      ORDER BY date_echeance ASC
    `);

    console.log(`📋 Actions échues dans cabinet_test2 : ${result.rows.length}`);

    result.rows.forEach((row) => {
      console.log(`- ${row.titre} | ${row.date_echeance} | ${row.statut} | notifie=${row.notifie} | ${row.notifie_le}`);
    });
  } catch (error) {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();