import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;
const apply = process.argv.includes('--apply');

if (!databaseUrl) {
  throw new Error('DATABASE_URL est absent de backend/.env.');
}

const migrationPath = path.resolve(
  __dirname,
  'migrations-tenant/recouvrement-sprint2-statut-partiel.sql',
);

const migrationSql = fs.readFileSync(migrationPath, 'utf8');

function quoteIdentifier(identifier: string): string {
  return '"' + identifier.replace(/"/g, '""') + '"';
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const cabinets = await client.query<{
      nom: string;
      schema_name: string;
    }>(
      `SELECT nom, schema_name
       FROM cabinets
       WHERE schema_name IS NOT NULL
       ORDER BY nom`,
    );

    console.log(`Cabinets cibles : ${cabinets.rowCount ?? 0}`);

    for (const cabinet of cabinets.rows) {
      console.log(`- ${cabinet.nom} -> ${cabinet.schema_name}`);
    }

    if (!apply) {
      console.log('');
      console.log('Dry-run : aucune migration n a ete executee.');
      console.log(
        'Pour appliquer : npm --prefix ./backend run migrate:tenant:statut-partiel -- --apply',
      );
      return;
    }

    let migrated = 0;

    for (const cabinet of cabinets.rows) {
      try {
        await client.query('BEGIN');
        await client.query(
          `SET LOCAL search_path TO ${quoteIdentifier(cabinet.schema_name)}, public`,
        );
        await client.query(migrationSql);

        const constraint = await client.query<{ definition: string }>(
          `SELECT pg_get_constraintdef(c.oid) AS definition
           FROM pg_constraint c
           JOIN pg_namespace n ON n.oid = c.connamespace
           JOIN pg_class t ON t.oid = c.conrelid
           WHERE n.nspname = $1
             AND t.relname = 'creances'
             AND c.conname = 'creances_statut_check'`,
          [cabinet.schema_name],
        );

        const definition = constraint.rows[0]?.definition ?? '';

        if (!definition.includes('PARTIELLEMENT_ENCAISSEE')) {
          throw new Error(
            `La contrainte creances_statut_check de ${cabinet.schema_name} n'autorise pas PARTIELLEMENT_ENCAISSEE.`,
          );
        }

        await client.query('COMMIT');

        migrated += 1;
        console.log(`[OK] ${cabinet.nom} -> ${cabinet.schema_name}`);
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        console.error(`[ERREUR] ${cabinet.nom} -> ${cabinet.schema_name}`);
        throw error;
      }
    }

    console.log(`Migration terminee pour ${migrated} cabinet(s).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
