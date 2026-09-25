// Crée un compte Super Admin s'il n'existe pas encore, ou réinitialise
// simplement son mot de passe s'il existe déjà — un seul script pour les
// deux cas, sans risque d'en créer un doublon.
//
// Usage (depuis le dossier backend/) :
//   npx ts-node scripts/creer-super-admin.ts <email> <mot-de-passe> [nom]
//
// Exemple :
//   npx ts-node scripts/creer-super-admin.ts donatien@loginet-huissiers.com "MotDePasseSolide123" "Donatien Zizien"
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
async function main() {
  const [, , email, motDePasse, nom] = process.argv;
  if (!email || !motDePasse) {
    console.error('Usage: npx ts-node scripts/creer-super-admin.ts <email> <mot-de-passe> [nom]');
    process.exit(1);
  }
  if (motDePasse.length < 8) {
    console.error('Le mot de passe doit faire au moins 8 caractères.');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const hashed = await bcrypt.hash(motDePasse, Number(process.env.BCRYPT_COST ?? 12));
    const admin = await prisma.superAdmin.upsert({
      where: { email },
      update: { motDePasse: hashed },
      create: { email, motDePasse: hashed, nom: nom ?? 'Super Admin' },
    });
        console.log(`✓ Compte Super Admin prêt : ${admin.email} (${admin.nom})`);
    console.log(`  Connecte-toi sur /super-admin/login avec ce mot de passe.`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((err) => {
  console.error('Erreur :', err.message ?? err);
  process.exit(1);
});