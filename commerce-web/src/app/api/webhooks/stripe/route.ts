import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, handleStripeWebhook } from '@/lib/stripe-utils';

/**
 * Stripe Webhook Handler
 * Handles payment_intent.succeeded, payment_intent.payment_failed, and charge.refunded events
 */
export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  try {
    const body = await request.text();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, sig, webhookSecret);

    // Handle the event
    await handleStripeWebhook(event);

    return NextResponse.json({
      success: true,
      received: true,
      eventId: event.id,
      eventType: event.type,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    
    if (error instanceof Error && error.message.includes('No signatures found')) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
