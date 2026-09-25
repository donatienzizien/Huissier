require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const p = new PrismaClient();

p.cabinet.findMany({
  select: {
    id: true,
    nom: true,
    slug: true,
    email: true,
    schemaName: true,
    statut: true
  },
  orderBy: {
    createdAt: "desc"
  }
})
.then(x => console.log(JSON.stringify(x, null, 2)))
.catch(e => console.error(e))
.finally(() => p.$disconnect());
