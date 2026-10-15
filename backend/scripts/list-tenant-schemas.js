require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query(
      'SELECT slug, schema_name FROM public.cabinets ORDER BY slug'
    );
    console.table(rows);
  } finally {
    await pool.end();
  }
})().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
