import MockTransaction from "../models/MockTransaction";
import TransactionEvent from "../models/TransactionEvent";
import { v4 as uuidv4 } from "uuid";

export interface AuthorizePaymentInput {
  amount: number;
  currency?: string;
  payment_method: {
    card_number: string;
    exp_month?: string;
    exp_year?: string;
    cvv?: string;
  };
  orderId?: string;
  metadata?: Record<string, any>;
}

export interface CapturePaymentInput {
  transactionId: string;
  amount?: number;
}

export interface RefundPaymentInput {
  transactionId: string;
  amount?: number;
  reason?: string;
}

export class MockPaymentService {
  /**
   * Deterministic card number patterns for testing
   */
  private static readonly CARD_PATTERNS = {
    SUCCESS: "4242424242424242",
    CARD_DECLINED: "4000000000000002",
    INSUFFICIENT_FUNDS: "4000000000009995",
    EXPIRED_CARD: "4000000000000069",
    INCORRECT_CVC: "4000000000000127",
    PROCESSING_ERROR: "4000000000000119",
  };

  /**
   * Determine outcome based on card number
   */
  private static determineOutcome(cardNumber: string): {
    status: "success" | "failure";
    errorCode?: string;
    errorMessage?: string;
  } {
    const cleanCard = cardNumber.replace(/\s/g, "");

    switch (cleanCard) {
      case this.CARD_PATTERNS.SUCCESS:
        return { status: "success" };

      case this.CARD_PATTERNS.CARD_DECLINED:
        return {
          status: "failure",
          errorCode: "card_declined",
          errorMessage: "Your card was declined",
        };

      case this.CARD_PATTERNS.INSUFFICIENT_FUNDS:
        return {
          status: "failure",
          errorCode: "insufficient_funds",
          errorMessage: "Your card has insufficient funds",
        };

      case this.CARD_PATTERNS.EXPIRED_CARD:
        return {
          status: "failure",
          errorCode: "expired_card",
          errorMessage: "Your card has expired",
        };

      case this.CARD_PATTERNS.INCORRECT_CVC:
        return {
          status: "failure",
          errorCode: "incorrect_cvc",
          errorMessage: "Your card's security code is incorrect",
        };

      case this.CARD_PATTERNS.PROCESSING_ERROR:
        return {
          status: "failure",
          errorCode: "processing_error",
          errorMessage: "An error occurred while processing your card",
        };

      default:
        // Default to success for other cards
        return { status: "success" };
    }
  }

  /**
   * Emit transaction event
   */
  private static async emitEvent(
    transactionId: any,
    eventType: string,
    payload: Record<string, any>
  ) {
    try {
      await TransactionEvent.create({
        transactionId,
        eventType,
        payload,
      });
    } catch (error) {
      console.error("Error emitting event:", error);
    }
  }

  /**
   * Authorize a payment (hold funds)
   */
  static async authorizePayment(input: AuthorizePaymentInput) {
    const {
      amount,
      currency = "USD",
      payment_method,
      orderId,
      metadata = {},
    } = input;

    // Validate amount
    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Determine outcome based on card number
    const outcome = this.determineOutcome(payment_method.card_number);

    // Generate transaction ID
    const transactionId = `txn_${uuidv4().replace(/-/g, "")}`;

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create transaction
    const transaction = await MockTransaction.create({
      transactionId,
      orderId,
      type: "authorize",
      status: outcome.status,
      amount,
      currency: currency.toUpperCase(),
      paymentMethod: {
        card_number: `****${payment_method.card_number.slice(-4)}`,
        exp_month: payment_method.exp_month,
        exp_year: payment_method.exp_year,
        type: "card",
      },
      deterministicOutcome: outcome.errorCode || "success",
      metadata,
      errorCode: outcome.errorCode,
      errorMessage: outcome.errorMessage,
      authorizedAt: outcome.status === "success" ? new Date() : undefined,
      expiresAt: outcome.status === "success" ? expiresAt : undefined,
    });

    // Emit event
    const eventType =
      outcome.status === "success" ? "payment.authorized" : "payment.failed";
    await this.emitEvent(transaction._id, eventType, {
      transaction_id: transactionId,
      order_id: orderId,
      amount,
      currency,
      payment_method: "card",
      status: outcome.status,
      error_code: outcome.errorCode,
      timestamp: new Date().toISOString(),
    });

    if (outcome.status === "failure") {
      return {
        success: false,
        transaction_id: transactionId,
        status: "failure",
        error_code: outcome.errorCode,
        error_message: outcome.errorMessage,
      };
    }

    return {
      success: true,
      transaction_id: transactionId,
      status: "success",
      amount,
      currency,
      authorized_at: transaction.authorizedAt,
      expires_at: expiresAt,
    };
  }

  /**
   * Capture an authorized payment
   */
  static async capturePayment(input: CapturePaymentInput) {
    const { transactionId, amount } = input;

    // Find authorization transaction
    const authTransaction = await MockTransaction.findOne({
      transactionId,
      type: "authorize",
    });

    if (!authTransaction) {
      throw new Error("Authorization transaction not found");
    }

    if (authTransaction.status !== "success") {
      throw new Error("Cannot capture a failed authorization");
    }

    // Check if already captured
    const existingCapture = await MockTransaction.findOne({
      parentTransactionId: transactionId,
      type: "capture",
    });

    if (existingCapture) {
      throw new Error("Transaction already captured");
    }

    // Check expiration
    if (authTransaction.expiresAt && authTransaction.expiresAt < new Date()) {
      throw new Error("Authorization has expired");
    }

    // Validate capture amount
    const captureAmount = amount ?? authTransaction.amount;
    if (captureAmount > authTransaction.amount) {
      throw new Error("Capture amount cannot exceed authorized amount");
    }

    // Generate capture transaction ID
    const captureTransactionId = `txn_${uuidv4().replace(/-/g, "")}`;

    // Create capture transaction
    const captureTransaction = await MockTransaction.create({
      transactionId: captureTransactionId,
      orderId: authTransaction.orderId,
      type: "capture",
      status: "success",
      amount: captureAmount,
      currency: authTransaction.currency,
      metadata: authTransaction.metadata,
      parentTransactionId: transactionId,
      capturedAt: new Date(),
    });

    // Emit event
    await this.emitEvent(captureTransaction._id, "payment.captured", {
      transaction_id: captureTransactionId,
      authorization_id: transactionId,
      order_id: authTransaction.orderId,
      amount: captureAmount,
      currency: authTransaction.currency,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      transaction_id: captureTransactionId,
      authorization_id: transactionId,
      status: "captured",
      amount: captureAmount,
      currency: authTransaction.currency,
      captured_at: captureTransaction.capturedAt,
    };
  }

  /**
   * Refund a captured payment
   */
  static async refundPayment(input: RefundPaymentInput) {
    const { transactionId, amount, reason = "customer_request" } = input;

    // Find the transaction (could be authorize or capture)
    let transaction = await MockTransaction.findOne({
      transactionId,
    });

    // If not found, try to find as parent
    if (!transaction) {
      transaction = await MockTransaction.findOne({
        parentTransactionId: transactionId,
        type: "capture",
      });
    }

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status !== "success") {
      throw new Error("Cannot refund a failed transaction");
    }

    // Check if already refunded
    const existingRefund = await MockTransaction.findOne({
      parentTransactionId: transactionId,
      type: "refund",
    });

    if (existingRefund) {
      throw new Error("Transaction already refunded");
    }

    // Validate refund amount
    const refundAmount = amount ?? transaction.amount;
    if (refundAmount > transaction.amount) {
      throw new Error("Refund amount cannot exceed transaction amount");
    }

    // Generate refund ID
    const refundId = `rfnd_${uuidv4().replace(/-/g, "")}`;

    // Create refund transaction
    const refundTransaction = await MockTransaction.create({
      transactionId: refundId,
      orderId: transaction.orderId,
      type: "refund",
      status: "success",
      amount: refundAmount,
      currency: transaction.currency,
      metadata: {
        ...transaction.metadata,
        reason,
      },
      parentTransactionId: transactionId,
      refundedAt: new Date(),
    });

    // Update original transaction status
    await MockTransaction.findOneAndUpdate(
      { transactionId },
      { $set: { status: "refunded" } }
    );

    // Emit event
    await this.emitEvent(refundTransaction._id, "payment.refunded", {
      refund_id: refundId,
      transaction_id: transactionId,
      order_id: transaction.orderId,
      amount: refundAmount,
      currency: transaction.currency,
      reason,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      refund_id: refundId,
      transaction_id: transactionId,
      status: "refunded",
      amount: refundAmount,
      currency: transaction.currency,
      reason,
      refunded_at: refundTransaction.refundedAt,
    };
  }

  /**
   * List transactions with filters
   */
  static async listTransactions(filters: {
    status?: string;
    type?: string;
    orderId?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    skip?: number;
  }) {
    const {
      status,
      type,
      orderId,
      from_date,
      to_date,
      limit = 50,
      skip = 0,
    } = filters;

    const query: any = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (orderId) query.orderId = orderId;

    if (from_date || to_date) {
      query.createdAt = {};
      if (from_date) query.createdAt.$gte = new Date(from_date);
      if (to_date) query.createdAt.$lte = new Date(to_date);
    }

    const transactions = await MockTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await MockTransaction.countDocuments(query);

    return {
      transactions: transactions.map((txn) => ({
        id: txn._id,
        transaction_id: txn.transactionId,
        order_id: txn.orderId,
        type: txn.type,
        status: txn.status,
        amount: txn.amount,
        currency: txn.currency,
        payment_method: txn.paymentMethod,
        error_code: txn.errorCode,
        error_message: txn.errorMessage,
        authorized_at: txn.authorizedAt,
        captured_at: txn.capturedAt,
        refunded_at: txn.refundedAt,
        expires_at: txn.expiresAt,
        parent_transaction_id: txn.parentTransactionId,
        created_at: txn.createdAt,
        updated_at: txn.updatedAt,
      })),
      total,
      limit,
      skip,
    };
  }

  /**
   * Get transaction by ID with events
   */
  static async getTransactionById(transactionId: string) {
    const transaction = await MockTransaction.findOne({ transactionId });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const events = await TransactionEvent.find({
      transactionId: transaction._id,
    }).sort({ createdAt: 1 });

    return {
      id: transaction._id,
      transaction_id: transaction.transactionId,
      order_id: transaction.orderId,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      payment_method: transaction.paymentMethod,
      metadata: transaction.metadata,
      error_code: transaction.errorCode,
      error_message: transaction.errorMessage,
      authorized_at: transaction.authorizedAt,
      captured_at: transaction.capturedAt,
      refunded_at: transaction.refundedAt,
      expires_at: transaction.expiresAt,
      parent_transaction_id: transaction.parentTransactionId,
      created_at: transaction.createdAt,
      updated_at: transaction.updatedAt,
      events: events.map((event) => ({
        id: event._id,
        event_type: event.eventType,
        payload: event.payload,
        created_at: event.createdAt,
      })),
    };
  }
}
