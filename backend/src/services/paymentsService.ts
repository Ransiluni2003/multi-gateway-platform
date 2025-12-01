import axiosInstance from "../utils/axiosRetryClient";
import logger from "../utils/logger";

export async function getPaymentDetails() {
  try {
    const res = await axiosInstance.get("http://payments:4001/api/payments");
    return res.data;
  } catch (err: any) {
    const msg = err?.message || String(err);
    logger.error("❌ Payment service failed after retries", { error: msg });
    // Optionally: send to a dead-letter queue or log for monitoring
    return null;
  }
}
