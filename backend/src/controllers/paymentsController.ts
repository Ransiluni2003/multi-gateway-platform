import { Request, Response } from "express";
import Stripe from "stripe";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
});

// === Stripe Payment ===
export const createStripePayment = async (req: Request, res: Response) => {
  try {
    const { amount, currency } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      description: "Multi-Gateway Payment",
      automatic_payment_methods: { enabled: true },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      message: "Stripe payment intent created successfully",
    });
  } catch (error: any) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// === Stripe Webhook ===
export const stripeWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );

    switch (event.type) {
      case "payment_intent.succeeded":
        console.log("✅ Stripe payment succeeded:", event.data.object);
        break;
      case "payment_intent.payment_failed":
        console.log("❌ Stripe payment failed:", event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).send("Webhook received");
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

// === PayPal Payment ===
export const createPayPalPayment = async (req: Request, res: Response) => {
  try {
    const { amount, currency } = req.body;

    const response = await axios.post(
      "https://api-m.sandbox.paypal.com/v2/checkout/orders",
      {
        intent: "CAPTURE",
        purchase_units: [{ amount: { currency_code: currency, value: amount } }],
      },
      {
        auth: {
          username: process.env.PAYPAL_CLIENT_ID as string,
          password: process.env.PAYPAL_CLIENT_SECRET as string,
        },
      }
    );

    res.status(200).json({
      id: response.data.id,
      message: "PayPal order created successfully",
    });
  } catch (error: any) {
    console.error("PayPal Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// === PayPal Webhook ===
export const paypalWebhook = async (req: Request, res: Response) => {
  try {
    console.log("📬 PayPal webhook event:", req.body);
    // handle order capture or completed payment event here
    res.status(200).send("PayPal webhook received");
  } catch (error: any) {
    console.error("PayPal Webhook Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
