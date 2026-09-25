require("dotenv").config();
const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();

  const schemas = [
    "cabinet_cabinetlawson",
    "cabinet_test2",
    "cabinet_test"
  ];

  for (const schema of schemas) {
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = 'clients'
        AND column_name = 'whatsapp'
    `, [schema]);

    console.log(
      schema + " -> " +
      (result.rows.length > 0 ? "WHATSAPP PRESENT" : "WHATSAPP MANQUANT")
    );
  }

  await client.end();
}

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
