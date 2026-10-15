require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    // Trouver toutes les tables contenant "creance"
    const result = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name ILIKE '%creance%'
      ORDER BY table_schema, table_name
    `);

    console.log('📋 Tables trouvees contenant "creance" :');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_schema}.${row.table_name}`);
    });

    // Afficher les colonnes de chaque table
    for (const row of result.rows) {
      const cols = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [row.table_schema, row.table_name]);

      console.log(`\n📊 Colonnes de ${row.table_schema}.${row.table_name} :`);
      cols.rows.forEach(c => {
        console.log(`  - ${c.column_name} (${c.data_type})`);
      });
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
