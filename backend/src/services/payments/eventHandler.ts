// Define type for payload
interface PaymentPayload {
  userId: string;
  amount: number;
  currency: string;
  orderId: string;
  [key: string]: any;
}

export async function publishPaymentCompleted(payload: PaymentPayload) {
  // Your logic for processing payment
  console.log("Payment completed:", payload);
}
