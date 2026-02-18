import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withRateLimit } from '@/lib/withRateLimit';
import { RATE_LIMITS } from '@/lib/rateLimit';

const prisma = new PrismaClient();

// WHY: Prevents abuse - users can't spam coupon codes to find valid ones
async function handlePOST(req: NextRequest) {
  try {
    const { code, subtotal } = await req.json();

    if (!code || !subtotal) {
      return NextResponse.json(
        { error: 'Missing code or subtotal' },
        { status: 400 }
      );
    }

    // Find coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    // Validation checks
    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found', valid: false },
        { status: 404 }
      );
    }

    if (!coupon.isActive) {
      return NextResponse.json(
        { error: 'Coupon is inactive', valid: false },
        { status: 400 }
      );
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return NextResponse.json(
        { error: 'Coupon has expired', valid: false },
        { status: 400 }
      );
    }

    if (
      coupon.maxRedemptions &&
      coupon.redemptionCount >= coupon.maxRedemptions
    ) {
      return NextResponse.json(
        { error: 'Coupon redemption limit reached', valid: false },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percent') {
      discountAmount = (subtotal * coupon.value) / 100;
    } else if (coupon.type === 'amount') {
      discountAmount = coupon.value;
    }

    // Don't let discount exceed subtotal
    discountAmount = Math.min(discountAmount, subtotal);
    const total = Math.max(0, subtotal - discountAmount);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      subtotal,
      discountAmount: Math.round(discountAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting: 10 requests per minute
// WHY: Prevents brute-force attacks trying to guess valid coupon codes
export const POST = withRateLimit(handlePOST, RATE_LIMITS.VALIDATION);
  }
}
