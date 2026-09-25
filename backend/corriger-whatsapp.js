require("dotenv").config();
const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();

  const schemas = [
    "cabinet_test2",
    "cabinet_test"
  ];

  for (const schema of schemas) {
    await client.query(`
      ALTER TABLE "${schema}".clients
      ADD COLUMN IF NOT EXISTS whatsapp TEXT;
    `);

    console.log(schema + " -> colonne whatsapp ajoutée/vérifiée");
  }

  await client.end();
  console.log("MIGRATION TERMINEE");
}

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
