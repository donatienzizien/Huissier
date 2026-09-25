// Applique un fichier de migration à TOUS les schémas cabinet existants.
// Nécessaire car chaque cabinet a son propre schéma (pas de migration
// Prisma classique possible sur des schémas créés dynamiquement).
//
// Usage: node scripts/apply-tenant-migration.js prisma/migrations-tenant/sprint2-add-compteurs.sql
const { Pool } = require('pg');
const { readFileSync } = require('fs');
require('dotenv').config();

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/apply-tenant-migration.js <fichier.sql>');
    process.exit(1);
  }
  const template = readFileSync(filePath, 'utf-8');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: cabinets } = await pool.query('SELECT slug, schema_name FROM public.cabinets');
  console.log(`${cabinets.length} cabinet(s) trouvé(s).`);

  for (const cabinet of cabinets) {
    const sql = template.replace(/\{\{SCHEMA\}\}/g, cabinet.schema_name);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`✓ ${cabinet.slug} (${cabinet.schema_name}) migré.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`✗ Échec pour ${cabinet.slug} :`, err.message);
    } finally {
      client.release();
    }
  }
  await pool.end();
}

main();
