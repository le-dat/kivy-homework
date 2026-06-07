import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log('Seeding database...');

  const sellerEmail = 'seller@kivy.com';
  const adminEmail = 'admin@kivy.com';

  const sellerPasswordHash = await bcrypt.hash('sellerpassword', 10);
  const adminPasswordHash = await bcrypt.hash('adminpassword', 10);

  // Upsert Seller
  const seller = await prisma.user.upsert({
    where: { email: sellerEmail },
    update: { passwordHash: sellerPasswordHash },
    create: {
      email: sellerEmail,
      passwordHash: sellerPasswordHash,
      role: Role.SELLER,
    },
  });
  console.log(`Seeded Seller: ${seller.email} (id: ${seller.id})`);

  // Upsert Admin
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`Seeded Admin: ${admin.email} (id: ${admin.id})`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
