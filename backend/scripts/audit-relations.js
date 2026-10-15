require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    console.log('📊 AUDIT DES RELATIONS ENTRE TABLES\n');

    // Trouver tous les schemas de cabinet
    const schemasResult = await client.query(`
      SELECT DISTINCT table_schema
      FROM information_schema.tables
      WHERE table_schema LIKE 'cabinet_%'
      ORDER BY table_schema
    `);

    const schemas = schemasResult.rows.map(r => r.table_schema);
    console.log(`Schemas de cabinet : ${schemas.join(', ')}\n`);

    // Pour chaque schema, auditer les relations
    for (const schema of schemas) {
      console.log(`\n🔍 SCHEMA: ${schema}`);
      console.log('='.repeat(50));

      // 1. Dossiers sans débiteur
      const dossiersSansDebiteur = await client.query(`
        SELECT COUNT(*) AS total
        FROM ${schema}.dossiers d
        WHERE d.debiteur_id IS NULL
      `);
      console.log(`  Dossiers sans débiteur : ${dossiersSansDebiteur.rows[0].total}`);

      // 2. Créances sans dossier
      const creancesSansDossier = await client.query(`
        SELECT COUNT(*) AS total
        FROM ${schema}.creances c
        WHERE c.dossier_id IS NULL
      `);
      console.log(`  Créances sans dossier : ${creancesSansDossier.rows[0].total}`);

      // 3. Actes sans dossier
      const actesSansDossier = await client.query(`
        SELECT COUNT(*) AS total
        FROM ${schema}.actes a
        WHERE a.dossier_id IS NULL
      `);
      console.log(`  Actes sans dossier : ${actesSansDossier.rows[0].total}`);

      // 4. Factures sans dossier
      const facturesSansDossier = await client.query(`
        SELECT COUNT(*) AS total
        FROM ${schema}.factures f
        WHERE f.dossier_id IS NULL
      `);
      console.log(`  Factures sans dossier : ${facturesSansDossier.rows[0].total}`);

      // 5. Clients sans role défini
      const clientsSansRole = await client.query(`
        SELECT COUNT(*) AS total
        FROM ${schema}.clients c
        WHERE c.role IS NULL OR c.role NOT IN ('CLIENT', 'DEBITEUR', 'TIERS')
      `);
      console.log(`  Clients sans role valide : ${clientsSansRole.rows[0].total}`);

      // 6. Utilisateurs sans cabinet
      const usersSansCabinet = await client.query(`
        SELECT COUNT(*) AS total
        FROM ${schema}.utilisateurs u
        WHERE u.cabinet_id IS NULL
      `);
      console.log(`  Utilisateurs sans cabinet : ${usersSansCabinet.rows[0].total}`);

      // 7. Total par table
      const tables = ['dossiers', 'creances', 'actes', 'factures', 'clients', 'utilisateurs', 'enacements_creance', 'relances_creance'];
      console.log('\n  📈 Volumes:');
      for (const table of tables) {
        try {
          const result = await client.query(`SELECT COUNT(*) FROM ${schema}.${table}`);
          console.log(`    - ${table}: ${result.rows[0].count}`);
        } catch {
          // Table n'existe pas
        }
      }
    }

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
