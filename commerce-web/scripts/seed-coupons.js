#!/usr/bin/env node

/**
 * SEED DEMO COUPONS SCRIPT
 * Creates demo coupon codes for testing
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

async function seedCoupons() {
  console.log('🎯 Seeding demo coupons...');

  const coupons = [
    {
      code: 'SAVE10',
      type: 'percent',
      value: 10,
      description: '10% off your purchase',
      maxRedemptions: 100,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      code: 'SUMMER20',
      type: 'amount',
      value: 20,
      description: '$20 off orders over $50',
      maxRedemptions: 50,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      code: 'WELCOME5',
      type: 'percent',
      value: 5,
      description: '5% welcome discount (new customers)',
      maxRedemptions: null,
      expiresAt: null,
    },
    {
      code: 'BULK15',
      type: 'percent',
      value: 15,
      description: '15% off bulk orders',
      maxRedemptions: 25,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      code: 'EXPIRED',
      type: 'percent',
      value: 30,
      description: 'This coupon is expired (demo)',
      maxRedemptions: null,
      expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      code: 'INACTIVE',
      type: 'amount',
      value: 50,
      description: 'This coupon is inactive (demo)',
      maxRedemptions: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: false,
    },
  ];

  console.log(`\n✅ Creating ${coupons.length} demo coupons...\n`);

  for (const coupon of coupons) {
    try {
      const response = await fetch(`${BASE_URL}/api/admin/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coupon),
      });

      if (response.ok) {
        const created = await response.json();
        const type = created.type === 'percent' ? '%' : '$';
        const maxRedemptions = created.maxRedemptions ? ` (max: ${created.maxRedemptions})` : '';
        const expiry = created.expiresAt
          ? ` - Expires: ${new Date(created.expiresAt).toLocaleDateString()}`
          : ' - No expiry';
        const status = created.isActive ? '✓' : '✗';
        console.log(
          `  ${status} ${created.code}: ${created.value}${type} off - ${created.description}${maxRedemptions}${expiry}`
        );
      } else {
        const error = await response.json();
        // If coupon already exists, skip silently
        if (error.error?.includes('already exists')) {
          console.log(`  ⊙ ${coupon.code}: Already exists (skipped)`);
        } else {
          console.error(`  ✗ ${coupon.code}: ${error.error || 'Failed to create'}`);
        }
      }
    } catch (error) {
      console.error(`  ✗ ${coupon.code}: ${error.message}`);
    }
  }

  console.log('\n✅ Coupon seeding complete!\n');
}

seedCoupons().catch((e) => {
  console.error('\n❌ Error seeding coupons:', e.message);
  process.exit(1);
});
