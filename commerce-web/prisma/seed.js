const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleProducts = [
  {
    name: 'Wireless Bluetooth Headphones',
    price: 79.99,
    description:
      'Premium wireless headphones with noise cancellation, 30-hour battery life, and superior sound quality. Perfect for music lovers and professionals.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500',
    ]),
    stock: 50,
    status: 'active',
  },
  {
    name: 'Smart Fitness Watch',
    price: 199.99,
    description:
      'Track your workouts, monitor heart rate, GPS tracking, waterproof design, and 7-day battery life. Stay connected and healthy.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    ]),
    stock: 35,
    status: 'active',
  },
  {
    name: 'Mechanical Gaming Keyboard',
    price: 129.99,
    description:
      'RGB backlit mechanical keyboard with customizable switches, programmable keys, and ergonomic design for gamers and typists.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=500',
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
    ]),
    stock: 25,
    status: 'active',
  },
  {
    name: 'Portable Power Bank 20000mAh',
    price: 39.99,
    description:
      'High-capacity portable charger with fast charging, dual USB ports, and LED display. Keep your devices powered on the go.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500',
    ]),
    stock: 100,
    status: 'active',
  },
  {
    name: '4K Webcam with Microphone',
    price: 89.99,
    description:
      'Crystal clear 4K video webcam with built-in microphone, auto-focus, and wide-angle lens. Perfect for streaming and video calls.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1624823183493-ed5832f48f18?w=500',
    ]),
    stock: 15,
    status: 'active',
  },
  {
    name: 'Ergonomic Office Chair',
    price: 299.99,
    description:
      'Premium ergonomic chair with lumbar support, adjustable armrests, breathable mesh back, and 360-degree swivel.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=500',
    ]),
    stock: 0,
    status: 'inactive',
  },
  {
    name: 'USB-C Hub 7-in-1',
    price: 49.99,
    description:
      '7-in-1 USB-C hub with HDMI, USB 3.0, SD card reader, and power delivery. Expand your laptop connectivity.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500',
    ]),
    stock: 75,
    status: 'active',
  },
  {
    name: 'Wireless Mouse',
    price: 29.99,
    description:
      'Comfortable wireless mouse with precision tracking, rechargeable battery, and silent clicks for quiet work environments.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500',
    ]),
    stock: 60,
    status: 'active',
  },
];

async function main() {
  console.log('Seeding database...');

  for (const product of sampleProducts) {
    await prisma.product.create({
      data: product,
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
