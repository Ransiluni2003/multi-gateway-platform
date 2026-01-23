import getStripeClient from './stripe';
import type Stripe from 'stripe';
import { prisma } from './prisma';

export interface CreatePaymentIntentInput {
  orderId: string;
  amount: number;
  email: string;
  currency?: string;
  metadata?: Record<string, string>;
}

/**
 * STATUS TRANSITION RULES
 * ========================
 * Pending → Completed: On payment_intent.succeeded
 * Pending → Failed: On payment_intent.payment_failed
 * Completed → Refunded: On charge.refunded
 * 
 * Invalid transitions are rejected to ensure data consistency.
 */
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  'pending': ['completed', 'failed'],
  'completed': ['refunded'],
  'failed': [],
  'refunded': [],
};

/**
 * Validate order status transition
 * Returns true if transition is allowed
 */
export function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

/**
 * Check if a webhook event has already been processed (idempotency)
 * Returns the existing record if found, null otherwise
 */
export async function getProcessedWebhookEvent(stripeEventId: string) {
  try {
    return await prisma.webhookEvent.findUnique({
      where: { stripeEventId },
    });
  } catch (error) {
    console.error('Error checking webhook event:', error);
    return null;
  }
}

/**
 * Record a webhook event as processed (idempotency key)
 */
export async function recordProcessedWebhookEvent(
  stripeEventId: string,
  eventType: string,
  payload: any,
  errorMessage?: string
) {
  try {
    return await prisma.webhookEvent.create({
      data: {
        stripeEventId,
        eventType,
        status: errorMessage ? 'failed' : 'processed',
        payload: JSON.stringify(payload),
        errorMessage,
      },
    });
  } catch (error) {
    console.error('Error recording webhook event:', error);
    throw error;
  }
}

/**
 * Create a Stripe Payment Intent
 */
export async function createPaymentIntent(input: CreatePaymentIntentInput) {
  try {
    const { orderId, amount, email, currency = 'usd', metadata = {} } = input;

    // Create payment intent
    const paymentIntent = await getStripeClient().paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      receipt_email: email,
      metadata: {
        orderId,
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update or create payment record
    await prisma.payment.upsert({
      where: { stripePaymentIntentId: paymentIntent.id },
      update: {
        status: paymentIntent.status as any,
      },
      create: {
        orderId,
        stripePaymentIntentId: paymentIntent.id,
        amount,
        currency,
        status: 'pending',
      },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    };
  }
}

/**
 * Retrieve a payment intent
 */
export async function getPaymentIntent(paymentIntentId: string) {
  try {
    return await getStripeClient().paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw error;
  }
}

/**
 * Cancel a payment intent
 */
export async function cancelPaymentIntent(paymentIntentId: string) {
  try {
    return await getStripeClient().paymentIntents.cancel(paymentIntentId);
  } catch (error) {
    console.error('Error canceling payment intent:', error);
    throw error;
  }
}

/**
 * Process a webhook event WITH IDEMPOTENCY
 * Prevents double-processing of the same event (replayed or retried events)
 */
export async function handleStripeWebhook(event: Stripe.Event) {
  try {
    // ✅ IDEMPOTENCY CHECK: Check if event already processed
    const existingEvent = await getProcessedWebhookEvent(event.id);
    if (existingEvent) {
      console.log(`⏭️  Webhook event ${event.id} already processed at ${existingEvent.processedAt}. Skipping.`);
      return; // Event already processed, don't process again
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        if (!orderId) {
          throw new Error('Missing orderId in payment intent metadata');
        }

        // Get current order to validate transition
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
          throw new Error(`Order ${orderId} not found`);
        }

        // Validate status transition: pending → completed
        if (!isValidStatusTransition(order.status, 'completed')) {
          const message = `Invalid status transition: ${order.status} → completed`;
          console.warn(`⚠️  ${message}`);
          await recordProcessedWebhookEvent(event.id, event.type, event.data, message);
          return; // Don't update if transition is invalid
        }

        // Update payment status
        await prisma.payment.update({
          where: { stripePaymentIntentId: paymentIntent.id },
          data: {
            status: 'succeeded',
            stripeChargeId: paymentIntent.latest_charge as string,
            lastWebhookEvent: 'payment_intent.succeeded',
            lastWebhookTime: new Date(),
          },
        });

        // Update order status
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'completed' },
        });

        // ✅ Record as processed (idempotency key)
        await recordProcessedWebhookEvent(event.id, event.type, event.data);

        console.log(`✅ Payment succeeded for order ${orderId}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        if (!orderId) {
          throw new Error('Missing orderId in payment intent metadata');
        }

        // Get current order to validate transition
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
          throw new Error(`Order ${orderId} not found`);
        }

        // Validate status transition: pending → failed
        if (!isValidStatusTransition(order.status, 'failed')) {
          const message = `Invalid status transition: ${order.status} → failed`;
          console.warn(`⚠️  ${message}`);
          await recordProcessedWebhookEvent(event.id, event.type, event.data, message);
          return; // Don't update if transition is invalid
        }

        // Update payment status
        await prisma.payment.update({
          where: { stripePaymentIntentId: paymentIntent.id },
          data: {
            status: 'failed',
            lastWebhookEvent: 'payment_intent.payment_failed',
            lastWebhookTime: new Date(),
          },
        });

        // Update order status
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'failed' },
        });

        // ✅ Record as processed (idempotency key)
        await recordProcessedWebhookEvent(event.id, event.type, event.data);

        console.log(`❌ Payment failed for order ${orderId}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const orderId = charge.metadata?.orderId;

        if (!orderId) {
          throw new Error('Missing orderId in charge metadata');
        }

        // Get current order to validate transition
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
          throw new Error(`Order ${orderId} not found`);
        }

        // Validate status transition: completed → refunded
        if (!isValidStatusTransition(order.status, 'refunded')) {
          const message = `Invalid status transition: ${order.status} → refunded`;
          console.warn(`⚠️  ${message}`);
          await recordProcessedWebhookEvent(event.id, event.type, event.data, message);
          return; // Don't update if transition is invalid
        }

        // Update payment with refund info
        await prisma.payment.updateMany({
          where: {
            stripeChargeId: charge.id,
          },
          data: {
            status: 'refunded',
            refundAmount: charge.amount_refunded ? charge.amount_refunded / 100 : 0,
            refundReason: (charge as any).refund_reason || 'refunded',
            refundedAt: new Date(),
            lastWebhookEvent: 'charge.refunded',
            lastWebhookTime: new Date(),
          },
        });

        // Update order status
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'refunded' },
        });

        // ✅ Record as processed (idempotency key)
        await recordProcessedWebhookEvent(event.id, event.type, event.data);

        console.log(`🔄 Refund processed for order ${orderId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        // Still record unhandled event to prevent reprocessing
        await recordProcessedWebhookEvent(event.id, event.type, event.data);
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    
    // Record failed processing attempt
    try {
      await recordProcessedWebhookEvent(
        event.id,
        event.type,
        event.data,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch (recordError) {
      console.error('Failed to record webhook error:', recordError);
    }
    
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  body: Buffer | string,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return getStripeClient().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    throw error;
  }
}
