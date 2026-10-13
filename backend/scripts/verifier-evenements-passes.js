require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT id, titre, date_debut, rappel_j1, rappel_j7,
             rappel_j1_envoye, rappel_j7_envoye
      FROM cabinet_test2.evenements
      WHERE date_debut < NOW()
      ORDER BY date_debut DESC
    `);

    console.log('Evenements passes dans cabinet_test2 : ' + result.rows.length);

    result.rows.forEach(function (row) {
      console.log(
        '- ' + row.titre +
        ' | ' + row.date_debut +
        ' | J1=' + row.rappel_j1 + '/' + row.rappel_j1_envoye +
        ' | J7=' + row.rappel_j7 + '/' + row.rappel_j7_envoye
      );
    });
  } catch (error) {
    console.error('Erreur : ' + error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();