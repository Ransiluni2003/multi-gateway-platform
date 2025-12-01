import express from "express";
import Stripe from "stripe";
import TransactionLog from "../models/TransactionLog";
import { protect, authorizeRoles } from "../middleware/authMiddleware"; // if you want admin-only

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2022-11-15" as any });

// STRIPE: POST /api/payments/refund/stripe
router.post("/refund/stripe", protect, authorizeRoles("admin"), async (req, res) => {
  const { paymentIntentId, amount, reason } = req.body;
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount, // optional full or partial (in cents)
      reason,
    }, {
      idempotencyKey: `refund-${paymentIntentId}-${Date.now()}`
    });

    await TransactionLog.create({
      provider: "stripe",
      eventType: "refund_initiated",
      status: "success",
      amount: refund.amount,
      currency: refund.currency,
      referenceId: refund.id,
      orderId: req.body.orderId,
      metadata: refund,
    });

    res.json({ success: true, refund });
  } catch (err: any) {
    await TransactionLog.create({
      provider: "stripe",
      eventType: "refund_failed",
      status: "failed",
      amount,
      currency: "unknown",
      referenceId: paymentIntentId,
      error: err.message,
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PAYPAL: POST /api/payments/refund/paypal
// Note: PayPal refunds work against captures. You need to find capture id.
import paypal from "@paypal/checkout-server-sdk";
const environment = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID!, process.env.PAYPAL_CLIENT_SECRET!);
const client = new paypal.core.PayPalHttpClient(environment);

router.post("/refund/paypal", protect, authorizeRoles("admin"), async (req, res) => {
  const { captureId, amount, currency } = req.body;
  try {
    const request = new paypal.payments.CapturesRefundRequest(captureId);
    request.requestBody({
      amount: {
        value: (amount / 100).toFixed(2), // convert cents to units
        currency_code: currency || "USD"
      }
    });
    const response = await client.execute(request);
    await TransactionLog.create({
      provider: "paypal",
      eventType: "refund_initiated",
      status: "success",
      amount,
      currency,
      referenceId: response.result.id,
      metadata: response.result,
    });
    res.json({ success: true, refund: response.result });
  } catch (err: any) {
    await TransactionLog.create({
      provider: "paypal",
      eventType: "refund_failed",
      status: "failed",
      amount,
      currency,
      referenceId: captureId,
      error: err.message,
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
