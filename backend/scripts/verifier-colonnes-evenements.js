require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'cabinet_test2'
        AND table_name = 'evenements'
      ORDER BY ordinal_position
    `);

    console.log('Colonnes de cabinet_test2.evenements : ' + result.rows.length);

    result.rows.forEach(function (row) {
      console.log('- ' + row.column_name + ' (' + row.data_type + ')');
    });
  } catch (error) {
    console.error('Erreur : ' + error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();