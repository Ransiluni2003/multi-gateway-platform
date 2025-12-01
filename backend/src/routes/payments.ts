import express from "express";
import {
  createStripePayment,
  stripeWebhook,
  createPayPalPayment,
  paypalWebhook,
} from "../controllers/paymentsController";

const router = express.Router();

// Stripe routes
router.post("/stripe/create", createStripePayment);
router.post("/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// PayPal routes
router.post("/paypal/create", createPayPalPayment);
router.post("/paypal/webhook", paypalWebhook);

export default router;
