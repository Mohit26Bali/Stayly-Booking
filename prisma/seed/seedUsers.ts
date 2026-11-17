import { prisma, faker, log, addDays } from "./lib";
import { avatarImage } from "./localImages";
import { hashPassword } from "../../src/server/auth/password";
import type { User } from "../../src/generated/prisma/client";

const OWNER_BIOS = [
  "Hospitality has been the family business for two generations — I still walk the property every morning before guests wake up.",
  "I left a corporate career to run this place full-time, and I still answer most guest messages myself.",
  "Ten years in hotel management taught me that the small details are what guests remember most.",
  "I started with one small guesthouse and grew it into what it is today, one good review at a time.",
  "My goal is simple: every guest should leave feeling like they stayed somewhere that actually cared.",
];

export interface SeedUsersResult {
  admin: User;
  owners: User[];
  customers: User[];
}

export interface SeedUsersOptions {
  ownerCount: number;
  customerCount: number;
  emailDomain: string;
}

async function createPerson(params: {
  email: string;
  password: string;
  role: "ADMIN" | "HOTEL_OWNER" | "CUSTOMER";
  emailVerified?: boolean;
  createdAt?: Date;
  avatarSeed: number;
}) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const passwordHash = await hashPassword(params.password);

  return prisma.user.upsert({
    where: { email: params.email },
    update: {},
    create: {
      email: params.email,
      passwordHash,
      role: params.role,
      emailVerified: params.emailVerified ?? true,
      createdAt: params.createdAt,
      profile: {
        create: {
          firstName,
          lastName,
          phone: faker.phone.number({ style: "international" }),
          avatarUrl: avatarImage(params.avatarSeed),
          country: faker.location.country(),
          city: faker.location.city(),
          address: faker.location.streetAddress(),
          bio: params.role === "HOTEL_OWNER" ? faker.helpers.arrayElement(OWNER_BIOS) : undefined,
        },
      },
    },
  });
}

export async function seedUsers(options: SeedUsersOptions): Promise<SeedUsersResult> {
  log("Seeding admin");
  const adminPasswordHash = await hashPassword("Admin@123");
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      emailVerified: true,
      profile: {
        create: { firstName: "Site", lastName: "Admin" },
      },
    },
  });

  const now = new Date();

  log(`Seeding ${options.ownerCount} hotel owners`);
  const owners: User[] = [];
  for (let i = 0; i < options.ownerCount; i++) {
    const owner = await createPerson({
      email: `owner${i + 1}@${options.emailDomain}`,
      password: "Owner@123",
      role: "HOTEL_OWNER",
      createdAt: addDays(now, -faker.number.int({ min: 30, max: 300 })),
      avatarSeed: i,
    });
    owners.push(owner);
  }

  log(`Seeding ${options.customerCount} customers`);
  const customers: User[] = [];
  for (let i = 0; i < options.customerCount; i++) {
    const customer = await createPerson({
      email: `customer${i + 1}@${options.emailDomain}`,
      password: "Customer@123",
      role: "CUSTOMER",
      emailVerified: faker.datatype.boolean({ probability: 0.85 }),
      createdAt: addDays(now, -faker.number.int({ min: 0, max: 240 })),
      avatarSeed: options.ownerCount + i,
    });
    customers.push(customer);
  }

  return { admin, owners, customers };
}
