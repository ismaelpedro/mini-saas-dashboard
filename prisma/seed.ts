import "dotenv/config";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { PrismaClient, type ProjectStatus } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const STATUSES: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED"];

const DEMO_USER = {
  email: "demo@dimovtax.com",
  name: "Demo User",
  password: "password123",
};

type SeedMember = { name: string; email: string };

async function getTeamMembers(): Promise<SeedMember[]> {
  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const users = (await res.json()) as Array<{ name: string; email: string }>;
    return users.map((u) => ({ name: u.name, email: u.email.toLowerCase() }));
  } catch (err) {
    console.warn("JSONPlaceholder unavailable, generating team members with faker:", err);
    return Array.from({ length: 10 }, () => {
      const name = faker.person.fullName();
      return { name, email: faker.internet.email({ firstName: name }).toLowerCase() };
    });
  }
}

async function main() {
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.teamMember.deleteMany();

  const members = await getTeamMembers();
  const teamMembers = await Promise.all(
    members.map((m) =>
      prisma.teamMember.create({ data: { name: m.name, email: m.email } }),
    ),
  );
  console.log(`Seeded ${teamMembers.length} team members`);

  const demo = await prisma.user.create({
    data: {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      password: await bcrypt.hash(DEMO_USER.password, 10),
    },
  });
  console.log(`Seeded demo user ${demo.email} (password: ${DEMO_USER.password})`);

  const projects = Array.from({ length: 25 }, () => ({
    name: faker.company.catchPhrase(),
    status: faker.helpers.arrayElement(STATUSES),
    deadline: faker.date.between({ from: "2026-01-01", to: "2027-06-30" }),
    budget: faker.number.float({ min: 5_000, max: 250_000, fractionDigits: 2 }).toFixed(2),
    teamMemberId: faker.helpers.arrayElement(teamMembers).id,
    ownerId: demo.id,
  }));
  await prisma.project.createMany({ data: projects });
  console.log(`Seeded ${projects.length} projects`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
