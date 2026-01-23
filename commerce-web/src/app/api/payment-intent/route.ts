import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/stripe-utils';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, amount, email } = body;

    if (!orderId || !amount || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, amount, email' },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Create payment intent
    const result = await createPaymentIntent({
      orderId,
      amount,
      email,
      currency: 'usd',
      metadata: {
        email,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
