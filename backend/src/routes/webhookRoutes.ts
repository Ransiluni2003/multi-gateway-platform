import express from "express";
import Stripe from "stripe";
import TransactionLog from "../models/TransactionLog.js";
import Subscription from "../models/Subscription.js"; // your model

const router = express.Router();

// Fix Stripe API version type issue
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15" as any,
});

// Extend Stripe.Invoice to include subscription property
interface StripeInvoice extends Stripe.Invoice {
  subscription?: string;
}

router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
    } catch (err: any) {
      console.error("Stripe webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // log raw event
    await TransactionLog.create({
      provider: "stripe",
      eventType: event.type,
      status: "success",
      metadata: event,
    });

    // handle subscription renewal
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as StripeInvoice;

      if (invoice.billing_reason === "subscription_cycle") {
        // 1) mark subscription active / extend period in DB
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: invoice.subscription },
          {
            $set: { lastPaidAt: new Date(), status: "active" },
          },
          { upsert: true }
        );

        // 2) create order or internal booking
        // await createOrderFromInvoice(invoice)  // call internal service or controller

        // 3) chain webhooks: e.g., send email, notify analytics
        // await notifyOrderCreated(...)

        await TransactionLog.create({
          provider: "stripe",
          eventType: "subscription_renewal_processed",
          status: "success",
          referenceId: invoice.subscription as string,
          metadata: invoice,
        });
      }
    }

    res.json({ received: true });
  }
);

export default router;
