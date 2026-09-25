import 'dotenv/config';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const EMAIL_A_REINITIALISER = 'donatien.zizien@igs-conseils.com';
const NOUVEAU_MOT_DE_PASSE = 'Test1234!';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO cabinet_test2`);
    const hashed = await bcrypt.hash(NOUVEAU_MOT_DE_PASSE, 12);
    const { rowCount } = await client.query(
      `UPDATE utilisateurs SET mot_de_passe = $1 WHERE email = $2`,
      [hashed, EMAIL_A_REINITIALISER],
    );
    if (rowCount === 0) {
      console.log(`Aucun utilisateur trouve avec l'email ${EMAIL_A_REINITIALISER}`);
    } else {
      console.log(`Mot de passe reinitialise pour ${EMAIL_A_REINITIALISER}`);
      console.log(`Nouveau mot de passe : ${NOUVEAU_MOT_DE_PASSE}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
