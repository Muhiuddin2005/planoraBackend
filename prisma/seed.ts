import { Role, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import prisma from "../src/app/utils/prisma";


async function main() {
  console.log("🌱 Starting the database seeding process...");

  const adminEmail = "admin@planora.com";
  const adminPassword = "adminpassword123";

  // Check if an admin with this email already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("⚠️ Admin user already exists. Skipping seed.");
    return;
  }

  // Hash the password using the same cost factor (12) as your AuthService
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // Create the admin user
  const admin = await prisma.user.create({
    data: {
      name: "Planora System Admin",
      email: adminEmail,
      passwordHash: hashedPassword,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`✅ Admin account created successfully!`);
  console.log(`📧 Email: ${admin.email}`);
  console.log(`🔑 Password: ${adminPassword}`);
  console.log(`🔒 Please remember to change this password in production!`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
