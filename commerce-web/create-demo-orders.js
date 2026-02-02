#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const orders = [
      { id: 'ord_1', customerId: 'cust_1', totalAmount: 99.99, status: 'PENDING' },
      { id: 'ord_2', customerId: 'cust_2', totalAmount: 199.99, status: 'COMPLETED' },
      { id: 'ord_3', customerId: 'cust_3', totalAmount: 149.99, status: 'FAILED' },
      { id: 'ord_4', customerId: 'cust_4', totalAmount: 249.99, status: 'REFUNDED' }
    ];
    
    for (const order of orders) {
      await prisma.order.create({ data: order });
      console.log(`✅ Created ${order.status} order`);
    }
    
    const all = await prisma.order.findMany();
    console.log(`\n✅ Total orders in database: ${all.length}`);
    all.forEach(o => console.log(`  - ${o.id}: ${o.status}`));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
