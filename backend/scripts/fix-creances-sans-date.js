require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    // Trouver tous les schemas de cabinet
    const schemasResult = await client.query(`
      SELECT DISTINCT table_schema
      FROM information_schema.tables
      WHERE table_name = 'creances'
        AND table_schema LIKE 'cabinet_%'
      ORDER BY table_schema
    `);

    const schemas = schemasResult.rows.map(r => r.table_schema);
    console.log(`📋 Schemas de cabinet trouves : ${schemas.join(', ')}`);

    let totalUpdated = 0;

    // Mettre a jour chaque schema
    for (const schema of schemas) {
      const updateResult = await client.query(`
        UPDATE ${schema}.creances
        SET date_exigibilite = DATE_TRUNC('day', NOW())
        WHERE date_exigibilite IS NULL
      `);

      const count = updateResult.rowCount || 0;
      console.log(`✅ ${schema}.creances : ${count} creance(s) mise(s) a jour`);
      totalUpdated += count;
    }

    console.log(`\n🎯 Total: ${totalUpdated} creance(s) mise(s) a jour tous schemas confondus.`);

    // Verification finale
    let totalSansDate = 0;
    for (const schema of schemas) {
      const checkResult = await client.query(`
        SELECT COUNT(*) AS creances_sans_date
        FROM ${schema}.creances
        WHERE date_exigibilite IS NULL
      `);

      const count = parseInt(checkResult.rows[0].creances_sans_date);
      if (count > 0) {
        console.log(`⚠️  ${schema}: ${count} creance(s) toujours sans date`);
      }
      totalSansDate += count;
    }

    if (totalSansDate === 0) {
      console.log(`\n✨ Succes: Aucune creance sans date dans aucun schema.`);
    } else {
      console.log(`\n⚠️  Attention: ${totalSansDate} creance(s) restent sans date.`);
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
