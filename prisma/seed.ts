import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/engine/seed";

const prisma = new PrismaClient();

seedDatabase(prisma)
  .then((stats) => {
    console.log("Seeded", stats);
  })
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
