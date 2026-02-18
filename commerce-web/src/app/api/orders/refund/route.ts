import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

interface RefundInput {
  orderId: string;
  amount?: number; // Optional - if not provided, refund full amount
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RefundInput = await request.json();
    const { orderId, amount, reason } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order and payment info
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!order.payment) {
      return NextResponse.json(
        { error: 'No payment found for this order' },
        { status: 400 }
      );
    }

    if (!order.payment.stripeChargeId) {
      return NextResponse.json(
        { error: 'No Stripe charge found for refund' },
        { status: 400 }
      );
    }

    // Determine refund amount
    const refundAmount = amount || order.total;

    // Validate refund amount
    if (refundAmount <= 0 || refundAmount > (order.total - order.payment.refundAmount)) {
      return NextResponse.json(
        { error: 'Invalid refund amount' },
        { status: 400 }
      );
    }

    // Create refund via Stripe
    const stripeRefund = await stripe.refunds.create({
      charge: order.payment.stripeChargeId,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: (reason || 'requested_by_customer') as any,
      metadata: {
        orderId: order.id,
      },
    });

    if (stripeRefund.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Refund failed in Stripe' },
        { status: 400 }
      );
    }

    // Update payment record
    const newRefundAmount = order.payment.refundAmount + refundAmount;
    const newRefundStatus = newRefundAmount >= order.total ? 'refunded' : 'partial_refunded';

    const updatedPayment = await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        refundAmount: newRefundAmount,
        refundReason: reason || 'requested_by_customer',
        refundedAt: new Date(),
        status: newRefundStatus,
        lastWebhookEvent: 'charge.refunded',
        lastWebhookTime: new Date(),
      },
    });

    // Update order status if fully refunded
    let updatedOrderStatus = order.status;
    if (newRefundStatus === 'refunded') {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'refunded' },
      });
      updatedOrderStatus = updated.status;
    }

    return NextResponse.json({
      success: true,
      message: `${amount ? 'Partial' : 'Full'} refund processed successfully`,
      refund: {
        id: stripeRefund.id,
        amount: refundAmount,
        status: stripeRefund.status,
        reason: stripeRefund.reason,
      },
      payment: {
        status: updatedPayment.status,
        refundedAmount: newRefundAmount,
        refundedAt: updatedPayment.refundedAt,
      },
      order: {
        id: order.id,
        status: updatedOrderStatus,
      },
    });
  } catch (error) {
    console.error('Refund error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: error.statusCode || 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process refund' },
      { status: 500 }
    );
  }
}

// GET - Retrieve refund info
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      refundInfo: {
        totalAmount: payment.amount,
        refundedAmount: payment.refundAmount,
        remainingAmount: payment.amount - payment.refundAmount,
        refundReason: payment.refundReason,
        refundedAt: payment.refundedAt,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error('Refund retrieval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve refund info' },
      { status: 500 }
    );
  }
}
