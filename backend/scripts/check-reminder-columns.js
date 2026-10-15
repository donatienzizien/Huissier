require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query(`
      SELECT table_schema, column_name
      FROM information_schema.columns
      WHERE table_name = 'evenements'
        AND column_name IN ('rappel_j1_envoye', 'rappel_j7_envoye')
        AND table_schema IN (
          SELECT schema_name FROM public.cabinets
        )
      ORDER BY table_schema, column_name
    `);
    console.table(rows);
  } finally {
    await pool.end();
  }
})().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
