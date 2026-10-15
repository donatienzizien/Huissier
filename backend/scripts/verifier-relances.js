require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT rc.id, rc.canal, rc.commentaire, rc.created_at,
             rc.prochaine_action_le, c.numero AS creance_numero
      FROM cabinet_test2.relances_creance rc
      JOIN cabinet_test2.creances c ON c.id = rc.creance_id
      ORDER BY rc.created_at DESC
      LIMIT 10
    `);

    console.log(`📋 Dernières relances dans cabinet_test2 : ${result.rows.length}`);

    result.rows.forEach((row) => {
      console.log(`- ${row.creance_numero} | ${row.canal} | ${row.commentaire} | ${row.created_at}`);
    });
  } catch (error) {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();