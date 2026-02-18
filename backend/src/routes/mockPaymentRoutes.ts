import { Router } from "express";
import { MockPaymentController } from "../controllers/mockPaymentController";

const router = Router();

// Mock payment operations
router.post("/payments/mock/authorize", MockPaymentController.authorizePayment);
router.post("/payments/mock/capture", MockPaymentController.capturePayment);
router.post("/payments/mock/refund", MockPaymentController.refundPayment);

// Transaction management
router.get("/payments/mock/transactions", MockPaymentController.listTransactions);
router.get("/payments/mock/transactions/export/csv", MockPaymentController.exportTransactionsCSV);
router.get("/payments/mock/transactions/:id", MockPaymentController.getTransactionById);

export default router;
