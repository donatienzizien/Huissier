import 'dotenv/config';
import { Pool } from 'pg';

async function executer(client: import('pg').PoolClient, sql: string, label: string) {
  try {
    await client.query(sql);
    console.log(`  OK ${label}`);
  } catch (err: any) {
    if (err.code === '42710' || err.code === '42701' || /already exists/i.test(err.message)) {
      console.log(`  DEJA PRESENT ${label}`);
    } else {
      console.error(`  ECHEC ${label} : ${err.message}`);
    }
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows: schemas } = await pool.query<{ schema_name: string }>(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'cabinet_%'`,
  );

  for (const { schema_name } of schemas) {
    console.log(`\n${schema_name} :`);
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schema_name}"`);

      // ALTER TYPE ... ADD VALUE : hors transaction explicite.
      await executer(client, `ALTER TYPE type_acte ADD VALUE IF NOT EXISTS 'NANTISSEMENT'`, "type_acte NANTISSEMENT");
      await executer(client, `ALTER TYPE type_acte ADD VALUE IF NOT EXISTS 'LEGALISATION'`, "type_acte LEGALISATION");

      await executer(client, `CREATE TYPE niveau_validation AS ENUM ('CLERC', 'HUISSIER')`, "type niveau_validation");
      await executer(
        client,
        `CREATE TYPE statut_validation_acte AS ENUM ('BROUILLON', 'EN_ATTENTE_VALIDATION', 'VALIDE')`,
        "type statut_validation_acte",
      );

      await executer(
        client,
        `ALTER TABLE modeles_actes ADD COLUMN niveau_validation_requis niveau_validation NOT NULL DEFAULT 'CLERC'`,
        'colonne modeles_actes.niveau_validation_requis',
      );

      // DEFAULT 'VALIDE' pour retro-compatibilite : tous les actes deja
      // generes avant cette evolution ont deja un PDF officiel, donc sont
      // consideres valides d'office. Le code applicatif fixera explicitement
      // 'BROUILLON' pour chaque nouvel acte cree a partir de maintenant.
      await executer(
        client,
        `ALTER TABLE actes ADD COLUMN statut_validation statut_validation_acte NOT NULL DEFAULT 'VALIDE'`,
        'colonne actes.statut_validation',
      );
      await executer(client, `ALTER TABLE actes ADD COLUMN corps_html TEXT`, 'colonne actes.corps_html');
      await executer(client, `ALTER TABLE actes ADD COLUMN soumis_par UUID REFERENCES utilisateurs(id)`, 'colonne actes.soumis_par');
      await executer(client, `ALTER TABLE actes ADD COLUMN soumis_le TIMESTAMPTZ`, 'colonne actes.soumis_le');
      await executer(client, `ALTER TABLE actes ADD COLUMN valide_par UUID REFERENCES utilisateurs(id)`, 'colonne actes.valide_par');
      await executer(client, `ALTER TABLE actes ADD COLUMN valide_le TIMESTAMPTZ`, 'colonne actes.valide_le');
      await executer(client, `ALTER TABLE actes ADD COLUMN rejete_par UUID REFERENCES utilisateurs(id)`, 'colonne actes.rejete_par');
      await executer(client, `ALTER TABLE actes ADD COLUMN rejete_le TIMESTAMPTZ`, 'colonne actes.rejete_le');
      await executer(client, `ALTER TABLE actes ADD COLUMN motif_rejet TEXT`, 'colonne actes.motif_rejet');

      // Niveau HUISSIER obligatoire pour les modeles deja existants de type
      // sensible (si jamais deja crees) - sans effet si aucun modele de ce
      // type n'existe encore.
      await client.query(
        `UPDATE modeles_actes SET niveau_validation_requis = 'HUISSIER' WHERE type IN ('NANTISSEMENT', 'LEGALISATION')`,
      );
      console.log('  OK mise a jour niveau HUISSIER pour NANTISSEMENT/LEGALISATION existants');
    } finally {
      client.release();
    }
  }
  await pool.end();
}
main().catch((err) => { console.error(err); process.exit(1); });
