const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const hash = await bcrypt.hash('Kewalew2026!', 12);

  const r = await pool.query(
    "UPDATE super_admins SET mot_de_passe = $1 WHERE email = $2 RETURNING email",
    [hash, 'admin@loginet-lab.com']
  );

  if (r.rows.length === 0) {
    console.log('ADMIN_INTROUVABLE');
  } else {
    console.log('MOT_DE_PASSE_MIS_A_JOUR_POUR:', r.rows[0].email);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => pool.end());
