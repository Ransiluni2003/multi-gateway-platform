import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, handleStripeWebhook } from '@/lib/stripe-utils';
import { logger } from '@/lib/logger';
import { getRequestId, withRequestId, logError } from '@/lib/request-logger';

/**
 * Stripe Webhook Handler
 * Handles payment_intent.succeeded, payment_intent.payment_failed, and charge.refunded events
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const startTime = Date.now();

  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    logger.warn('Missing stripe-signature header', { requestId, route: '/api/webhooks/stripe' });
    return withRequestId(
      NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      ),
      requestId
    );
  }

  try {
    const body = await request.text();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('Missing STRIPE_WEBHOOK_SECRET environment variable', undefined, { requestId });
      return withRequestId(
        NextResponse.json(
          { error: 'Webhook secret not configured' },
          { status: 500 }
        ),
        requestId
      );
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, sig, webhookSecret);

    // Log webhook received with event details
    logger.logWebhook(event.type, {
      requestId,
      eventId: event.id,
      idempotencyKey: event.request?.idempotency_key || undefined,
      route: '/api/webhooks/stripe',
    });

    // Handle the event
    await handleStripeWebhook(event);

    const latency = Date.now() - startTime;
    logger.info('Webhook processed successfully', {
      requestId,
      eventType: event.type,
      eventId: event.id,
      latency,
      statusCode: 200,
    });

    return withRequestId(
      NextResponse.json({
        success: true,
        received: true,
        eventId: event.id,
        eventType: event.type,
      }),
      requestId
    );
  } catch (error) {
    logError(request, requestId, error, 'Webhook processing error');
    
    if (error instanceof Error && error.message.includes('No signatures found')) {
      return withRequestId(
        NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        ),
        requestId
      );
    }

    return withRequestId(
      NextResponse.json(
        { error: error instanceof Error ? error.message : 'Webhook processing failed' },
        { status: 500 }
      ),
      requestId
    );
  }
}
