import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET all coupons (admin)
export async function GET(req: NextRequest) {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    return NextResponse.json(coupons);
  } catch (error) {
    console.error('Fetch coupons error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new coupon (admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      type,
      value,
      maxRedemptions,
      expiresAt,
      description,
    } = body;

    // Validation
    if (!code || !type || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: code, type, value' },
        { status: 400 }
      );
    }

    if (!['percent', 'amount'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "percent" or "amount"' },
        { status: 400 }
      );
    }

    if (type === 'percent' && (value < 0 || value > 100)) {
      return NextResponse.json(
        { error: 'Percent discount must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (value < 0) {
      return NextResponse.json(
        { error: 'Value cannot be negative' },
        { status: 400 }
      );
    }

    // Check if coupon already exists
    const existing = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Coupon code already exists' },
        { status: 409 }
      );
    }

    // Create coupon
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        type,
        value,
        maxRedemptions: maxRedemptions || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        description,
        isActive: true,
      },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error('Create coupon error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
