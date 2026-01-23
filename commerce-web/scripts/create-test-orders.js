const { PrismaClient } = require('@prisma/client');

// Initialize Prisma with proper config
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function createTestOrders() {
  try {
    console.log('🚀 Creating test orders with multiple statuses...\n');

    // 1. Create a test product
    const product = await prisma.product.upsert({
      where: { id: 'test-product-demo' },
      update: {},
      create: {
        id: 'test-product-demo',
        name: 'Demo Test Product',
        description: 'For orders demo - showcasing different order statuses',
        price: 2999, // $29.99
        images: JSON.stringify([]),
        stock: 100,
        status: 'active',
      },
    });

    console.log('✅ Test product created:', product.name);

    // 2. Create PENDING order
    const order1 = await prisma.order.create({
      data: {
        email: 'demo@test.com',
        firstName: 'Demo',
        lastName: 'User',
        address: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
        total: 2999,
        status: 'pending',
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            price: 2999,
          },
        },
      },
      include: { items: true },
    });

    await prisma.payment.create({
      data: {
        orderId: order1.id,
        stripePaymentIntentId: `pi_pending_${order1.id}`,
        amount: 29.99,
        currency: 'usd',
        status: 'pending',
      },
    });

    console.log('✅ PENDING order created:', order1.id);

    // 3. Create COMPLETED order
    const order2 = await prisma.order.create({
      data: {
        email: 'demo@test.com',
        firstName: 'Demo',
        lastName: 'User',
        address: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
        total: 2999,
        status: 'completed',
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            price: 2999,
          },
        },
      },
      include: { items: true },
    });

    await prisma.payment.create({
      data: {
        orderId: order2.id,
        stripePaymentIntentId: `pi_success_${order2.id}`,
        stripeChargeId: `ch_success_${order2.id}`,
        amount: 29.99,
        currency: 'usd',
        status: 'succeeded',
        lastWebhookEvent: 'payment_intent.succeeded',
        lastWebhookTime: new Date(),
      },
    });

    console.log('✅ COMPLETED order created:', order2.id);

    // 4. Create FAILED order
    const order3 = await prisma.order.create({
      data: {
        email: 'demo@test.com',
        firstName: 'Demo',
        lastName: 'User',
        address: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
        total: 2999,
        status: 'failed',
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            price: 2999,
          },
        },
      },
      include: { items: true },
    });

    await prisma.payment.create({
      data: {
        orderId: order3.id,
        stripePaymentIntentId: `pi_failed_${order3.id}`,
        amount: 29.99,
        currency: 'usd',
        status: 'failed',
        lastWebhookEvent: 'payment_intent.payment_failed',
        lastWebhookTime: new Date(),
      },
    });

    console.log('✅ FAILED order created:', order3.id);

    // 5. Create REFUNDED order
    const order4 = await prisma.order.create({
      data: {
        email: 'demo@test.com',
        firstName: 'Demo',
        lastName: 'User',
        address: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
        total: 2999,
        status: 'refunded',
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            price: 2999,
          },
        },
      },
      include: { items: true },
    });

    await prisma.payment.create({
      data: {
        orderId: order4.id,
        stripePaymentIntentId: `pi_refunded_${order4.id}`,
        stripeChargeId: `ch_refunded_${order4.id}`,
        amount: 29.99,
        currency: 'usd',
        status: 'refunded',
        refundAmount: 29.99,
        refundedAt: new Date(),
        lastWebhookEvent: 'charge.refunded',
        lastWebhookTime: new Date(),
      },
    });

    console.log('✅ REFUNDED order created:', order4.id);

    console.log('\n📊 Summary:');
    console.log('═══════════════════════════════════════════════');
    console.log('4 orders created with different statuses:');
    console.log(`  - PENDING:   ${order1.id}`);
    console.log(`  - COMPLETED: ${order2.id}`);
    console.log(`  - FAILED:    ${order3.id}`);
    console.log(`  - REFUNDED:  ${order4.id}`);
    console.log('═══════════════════════════════════════════════');
    console.log('\n👉 Next Steps:');
    console.log('   1. Visit http://localhost:3000/orders');
    console.log('   2. Verify all 4 orders display with correct status colors');
    console.log('   3. Expand each order to see details and payment info');
    console.log('   4. Test webhook updates using TASK_3_ORDERS_HARDENING_DEMO.md');
    console.log('\n✨ Demo data ready!');
  } catch (error) {
    console.error('❌ Error creating test orders:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestOrders();
