import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@loginet-lab.com';
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMoiImmediatement2026!';

  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super Admin ${email} existe déjà, aucune action.`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.superAdmin.create({
    data: { nom: 'LOGINET LAB', email, motDePasse: hashed },
  });

  console.log(`Super Admin créé : ${email} / mot de passe : ${password}`);
  console.log('⚠️  Changez ce mot de passe immédiatement après la première connexion.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
