require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'cabinet_test2'
        AND (
          table_name ILIKE '%agenda%'
          OR table_name ILIKE '%evenement%'
          OR table_name ILIKE '%action%'
        )
      ORDER BY table_name
    `);

    console.log('Tables trouvees dans cabinet_test2 : ' + result.rows.length);

    result.rows.forEach(function (row) {
      console.log('- ' + row.table_schema + '.' + row.table_name);
    });
  } catch (error) {
    console.error('Erreur : ' + error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();