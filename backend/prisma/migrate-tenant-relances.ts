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
  'migrations-tenant/recouvrement-sprint3-relances.sql',
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
        'Pour appliquer : npm --prefix ./backend run migrate:tenant:relances -- --apply',
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

        const table = await client.query<{ exists: boolean }>(
          `SELECT to_regclass(format('%I.relances_creance', $1)) IS NOT NULL AS exists`,
          [cabinet.schema_name],
        );

        if (!table.rows[0]?.exists) {
          throw new Error(
            `La table relances_creance est absente du schema ${cabinet.schema_name}.`,
          );
        }

        const constraint = await client.query<{ definition: string }>(
          `SELECT pg_get_constraintdef(c.oid) AS definition
           FROM pg_constraint c
           JOIN pg_namespace n ON n.oid = c.connamespace
           JOIN pg_class t ON t.oid = c.conrelid
           WHERE n.nspname = $1
             AND t.relname = 'relances_creance'
             AND c.conname = 'relances_creance_prochaine_action_check'`,
          [cabinet.schema_name],
        );

        const definition = constraint.rows[0]?.definition ?? '';

        if (
          !definition.includes('prochaine_action_le') ||
          !definition.includes('prochaine_action')
        ) {
          throw new Error(
            `La contrainte de prochaine action est absente ou invalide dans ${cabinet.schema_name}.`,
          );
        }

        const canalConstraint = await client.query<{ definition: string }>(
          `SELECT pg_get_constraintdef(c.oid) AS definition
           FROM pg_constraint c
           JOIN pg_namespace n ON n.oid = c.connamespace
           JOIN pg_class t ON t.oid = c.conrelid
           WHERE n.nspname = $1
             AND t.relname = 'relances_creance'
             AND c.conname = 'relances_creance_canal_check'`,
          [cabinet.schema_name],
        );

        const canalDefinition = canalConstraint.rows[0]?.definition ?? '';

        if (
          !canalDefinition.includes('EMAIL') ||
          !canalDefinition.includes('TELEPHONE') ||
          !canalDefinition.includes('SMS') ||
          !canalDefinition.includes('COURRIER') ||
          !canalDefinition.includes('WHATSAPP') ||
          !canalDefinition.includes('AUTRE')
        ) {
          throw new Error(
            `La contrainte canal est absente ou invalide dans ${cabinet.schema_name}.`,
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
