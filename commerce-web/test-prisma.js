const { PrismaClient } = require('@prisma/client');

async function test() {
  const p = new PrismaClient();
  try {
    const count = await p.product.count();
    console.log('Product count:', count);
  } catch (e) {
    console.error('Error:', e.message);
    process.exitCode = 1;
  } finally {
    await p.$disconnect();
  }
}

test();
