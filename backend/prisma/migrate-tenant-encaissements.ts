import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const SCHEMA_REGEX = /^cabinet_[a-z][a-z0-9_]{2,30}$/;
const apply = process.argv.includes('--apply');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL est requis.');
  }

  const prisma = new PrismaClient();

  try {
    const cabinets = await prisma.cabinet.findMany({
      select: {
        id: true,
        nom: true,
        schemaName: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (cabinets.length === 0) {
      console.log('Aucun cabinet à migrer.');
      return;
    }

    const invalidCabinets = cabinets.filter(
      (cabinet) => !SCHEMA_REGEX.test(cabinet.schemaName),
    );

    if (invalidCabinets.length > 0) {
      for (const cabinet of invalidCabinets) {
        console.error(
          `[ERREUR] ${cabinet.nom} (${cabinet.id}) : schéma invalide "${cabinet.schemaName}".`,
        );
      }
      throw new Error('Migration annulée : un ou plusieurs schémas sont invalides.');
    }

    console.log(`Cabinets ciblés : ${cabinets.length}`);
    for (const cabinet of cabinets) {
      console.log(`- ${cabinet.nom} → ${cabinet.schemaName}`);
    }

    if (!apply) {
      console.log('');
      console.log('Dry-run : aucune migration n’a été exécutée.');
      console.log(
        'Pour appliquer : npm run migrate:tenant:encaissements -- --apply',
      );
      return;
    }

    const migrationPath = join(
      __dirname,
      'migrations-tenant',
      'encaissements-creance.sql',
    );

    const template = readFileSync(migrationPath, 'utf-8');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let failures = 0;

    try {
      for (const cabinet of cabinets) {
        const sql = template.replace(/\{\{SCHEMA\}\}/g, cabinet.schemaName);
        const client = await pool.connect();

        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('COMMIT');
          console.log(`[OK] ${cabinet.nom} → ${cabinet.schemaName}`);
        } catch (error) {
          await client.query('ROLLBACK');
          failures += 1;
          console.error(`[ERREUR] ${cabinet.nom} → ${cabinet.schemaName}`);
          console.error(error);
        } finally {
          client.release();
        }
      }
    } finally {
      await pool.end();
    }

    if (failures > 0) {
      throw new Error(`${failures} migration(s) tenant ont échoué.`);
    }

    console.log(`Migration terminée pour ${cabinets.length} cabinet(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
