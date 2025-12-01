import fs from "fs";
import path from "path";
import logger from "./logger";

const dlqDir = path.join(process.cwd(), "dlq");
const paymentsDlqFile = path.join(dlqDir, "payments-dlq.jsonl");

function ensureDlqDir() {
  if (!fs.existsSync(dlqDir)) {
    fs.mkdirSync(dlqDir, { recursive: true });
  }
}

export async function writeToPaymentsDLQ(payload: any) {
  try {
    ensureDlqDir();
    const line = JSON.stringify({ timestamp: new Date().toISOString(), payload }) + "\n";
    await fs.promises.appendFile(paymentsDlqFile, line, { encoding: "utf8" });
    logger.warn("Wrote message to payments DLQ", { id: payload?.id });
  } catch (err) {
    logger.error("Failed to write DLQ file", { error: (err as any)?.message || err });
  }
}

export default { writeToPaymentsDLQ };
