import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH update coupon (admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const body = await req.json();
    const { isActive, maxRedemptions, expiresAt, description } = body;

    // Check coupon exists
    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Update coupon
    const updated = await prisma.coupon.update({
      where: { code },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(maxRedemptions !== undefined && { maxRedemptions }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update coupon error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE disable coupon (admin) - soft delete via isActive
export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Soft delete - just mark as inactive
    const updated = await prisma.coupon.update({
      where: { code },
      data: { isActive: false },
    });

    return NextResponse.json({
      message: 'Coupon disabled',
      code: updated.code,
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
