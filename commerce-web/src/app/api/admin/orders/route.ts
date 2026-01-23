import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let where = {};
    if (status) {
      where = { status };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error('Orders retrieval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve orders' },
      { status: 500 }
    );
  }
}
