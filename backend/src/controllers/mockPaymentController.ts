import { Request, Response } from "express";
import { MockPaymentService } from "../services/mockPaymentService";
import { Parser } from "json2csv";

export class MockPaymentController {
  /**
   * POST /api/payments/mock/authorize - Authorize payment
   */
  static async authorizePayment(req: Request, res: Response) {
    try {
      const result = await MockPaymentService.authorizePayment(req.body);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error authorizing payment:", error);
      res.status(400).json({
        success: false,
        error: "Failed to authorize payment",
        message: error.message,
      });
    }
  }

  /**
   * POST /api/payments/mock/capture - Capture payment
   */
  static async capturePayment(req: Request, res: Response) {
    try {
      const result = await MockPaymentService.capturePayment(req.body);
      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error capturing payment:", error);
      res.status(400).json({
        success: false,
        error: "Failed to capture payment",
        message: error.message,
      });
    }
  }

  /**
   * POST /api/payments/mock/refund - Refund payment
   */
  static async refundPayment(req: Request, res: Response) {
    try {
      const result = await MockPaymentService.refundPayment(req.body);
      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error refunding payment:", error);
      res.status(400).json({
        success: false,
        error: "Failed to refund payment",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/payments/mock/transactions - List transactions
   */
  static async listTransactions(req: Request, res: Response) {
    try {
      const {
        status,
        type,
        order_id,
        from_date,
        to_date,
        limit,
        skip,
      } = req.query;

      const result = await MockPaymentService.listTransactions({
        status: status as string,
        type: type as string,
        orderId: order_id as string,
        from_date: from_date as string,
        to_date: to_date as string,
        limit: limit ? parseInt(limit as string) : undefined,
        skip: skip ? parseInt(skip as string) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error listing transactions:", error);
      res.status(500).json({
        error: "Failed to list transactions",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/payments/mock/transactions/:id - Get transaction by ID
   */
  static async getTransactionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await MockPaymentService.getTransactionById(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error getting transaction:", error);
      const status = error.message === "Transaction not found" ? 404 : 500;
      res.status(status).json({
        error: "Failed to get transaction",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/payments/mock/transactions/export/csv - Export transactions to CSV
   */
  static async exportTransactionsCSV(req: Request, res: Response) {
    try {
      const {
        status,
        type,
        order_id,
        from_date,
        to_date,
      } = req.query;

      const result = await MockPaymentService.listTransactions({
        status: status as string,
        type: type as string,
        orderId: order_id as string,
        from_date: from_date as string,
        to_date: to_date as string,
        limit: 10000, // Max for CSV export
      });

      // Convert to CSV
      const fields = [
        "transaction_id",
        "order_id",
        "type",
        "status",
        "amount",
        "currency",
        "error_code",
        "error_message",
        "created_at",
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(result.transactions);

      // Set headers for CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="transactions-${Date.now()}.csv"`
      );

      res.send(csv);
    } catch (error: any) {
      console.error("Error exporting transactions:", error);
      res.status(500).json({
        error: "Failed to export transactions",
        message: error.message,
      });
    }
  }
}
