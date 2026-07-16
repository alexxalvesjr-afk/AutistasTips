import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const GLOBAL_SPORTS = [
  { name: "Futebol", icon: "goal" },
  { name: "Basquete", icon: "dribbble" },
  { name: "Tênis", icon: "circle-dot" },
  { name: "Vôlei", icon: "volleyball" },
  { name: "MMA", icon: "swords" },
  { name: "E-Sports", icon: "gamepad-2" },
  { name: "Beisebol", icon: "circle" },
  { name: "Futebol Americano", icon: "shield" },
  { name: "Hóquei", icon: "snowflake" },
  { name: "Outro", icon: "sparkles" },
];

const GLOBAL_BOOKMAKERS = [
  "Bet365",
  "Betano",
  "Pinnacle",
  "Betfair",
  "KTO",
  "Sportingbet",
  "Superbet",
  "Estrela Bet",
  "Outra",
];

const PLANS = [
  {
    slug: "free",
    name: "Free",
    price: 0,
    maxEntries: 200,
    features: ["Até 200 entradas", "Dashboard completo", "Exportação CSV"],
  },
  {
    slug: "pro",
    name: "Pro",
    price: 29.9,
    maxEntries: null,
    features: [
      "Entradas ilimitadas",
      "Relatórios avançados",
      "Exportação CSV, Excel e PDF",
      "Importação de planilhas",
    ],
  },
];

async function main() {
  for (const sport of GLOBAL_SPORTS) {
    const existing = await prisma.sport.findFirst({
      where: { userId: null, name: sport.name },
    });
    if (!existing) {
      await prisma.sport.create({ data: sport });
    }
  }

  for (const name of GLOBAL_BOOKMAKERS) {
    const existing = await prisma.bookmaker.findFirst({
      where: { userId: null, name },
    });
    if (!existing) {
      await prisma.bookmaker.create({ data: { name } });
    }
  }

  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: { name: plan.name, price: plan.price, maxEntries: plan.maxEntries, features: plan.features },
      create: plan,
    });
  }

  // Admin inicial: apenas quando explicitamente configurado via env.
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 10) {
      throw new Error("SEED_ADMIN_PASSWORD deve ter no mínimo 10 caracteres");
    }
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN" },
      create: {
        email: adminEmail,
        name: "Administrador",
        passwordHash,
        role: "ADMIN",
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Admin garantido: ${adminEmail}`);
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
