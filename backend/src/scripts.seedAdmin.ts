import { Role } from '@prisma/client';
import { prisma } from './config/prisma.js';
import { hashPassword } from './utils/auth.js';

async function main() {
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD ?? 'admin12345';

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, role: Role.ADMIN },
    create: { username, passwordHash, role: Role.ADMIN }
  });

  console.log(`Admin ready: ${username}`);
}

void main().finally(async () => {
  await prisma.$disconnect();
});
