"use client";

import { useState, useEffect } from "react";
import styles from "./transactions.module.css";

interface Transaction {
  id: string;
  transaction_id: string;
  order_id?: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  payment_method?: any;
  error_code?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface TransactionEvent {
  id: string;
  event_type: string;
  payload: any;
  created_at: string;
}

interface TransactionDetails extends Transaction {
  events: TransactionEvent[];
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetails | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    order_id: "",
    from_date: "",
    to_date: "",
  });

  const [pagination, setPagination] = useState({
    limit: 20,
    skip: 0,
  });

  // Fetch transactions
  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      if (filters.status) queryParams.append("status", filters.status);
      if (filters.type) queryParams.append("type", filters.type);
      if (filters.order_id) queryParams.append("order_id", filters.order_id);
      if (filters.from_date) queryParams.append("from_date", filters.from_date);
      if (filters.to_date) queryParams.append("to_date", filters.to_date);

      queryParams.append("limit", pagination.limit.toString());
      queryParams.append("skip", pagination.skip.toString());

      const response = await fetch(
        `/api/payments/mock/transactions?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      setTransactions(data.transactions);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch transaction details
  const fetchTransactionDetails = async (transactionId: string) {
    try {
      const response = await fetch(
        `/api/payments/mock/transactions/${transactionId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transaction details");
      }

      const data = await response.json();
      setSelectedTransaction(data);
      setShowModal(true);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const queryParams = new URLSearchParams();

    if (filters.status) queryParams.append("status", filters.status);
    if (filters.type) queryParams.append("type", filters.type);
    if (filters.order_id) queryParams.append("order_id", filters.order_id);
    if (filters.from_date) queryParams.append("from_date", filters.from_date);
    if (filters.to_date) queryParams.append("to_date", filters.to_date);

    window.open(
      `/api/payments/mock/transactions/export/csv?${queryParams.toString()}`,
      "_blank"
    );
  };

  // Refund transaction
  const handleRefund = async (transactionId: string, amount: number) => {
    if (!confirm(`Are you sure you want to refund $${amount.toFixed(2)}?`)) {
      return;
    }

    try {
      const response = await fetch("/api/payments/mock/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId,
          amount,
          reason: "admin_initiated",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      alert("Refund processed successfully!");
      setShowModal(false);
      fetchTransactions();
    } catch (err: any) {
      alert(`Refund failed: ${err.message}`);
    }
  };

  // Apply filters
  const applyFilters = () => {
    setPagination({ ...pagination, skip: 0 });
    fetchTransactions();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: "",
      type: "",
      order_id: "",
      from_date: "",
      to_date: "",
    });
    setPagination({ limit: 20, skip: 0 });
  };

  // Pagination handlers
  const nextPage = () => {
    setPagination({ ...pagination, skip: pagination.skip + pagination.limit });
  };

  const prevPage = () => {
    setPagination({
      ...pagination,
      skip: Math.max(0, pagination.skip - pagination.limit),
    });
  };

  useEffect(() => {
    fetchTransactions();
  }, [pagination]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Transaction Management</h1>
        <button onClick={exportToCSV} className={styles.exportBtn}>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className={styles.select}
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className={styles.select}
        >
          <option value="">All Types</option>
          <option value="authorize">Authorize</option>
          <option value="capture">Capture</option>
          <option value="refund">Refund</option>
        </select>

        <input
          type="text"
          placeholder="Order ID"
          value={filters.order_id}
          onChange={(e) => setFilters({ ...filters, order_id: e.target.value })}
          className={styles.input}
        />

        <input
          type="date"
          placeholder="From Date"
          value={filters.from_date}
          onChange={(e) =>
            setFilters({ ...filters, from_date: e.target.value })
          }
          className={styles.input}
        />

        <input
          type="date"
          placeholder="To Date"
          value={filters.to_date}
          onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
          className={styles.input}
        />

        <button onClick={applyFilters} className={styles.applyBtn}>
          Apply Filters
        </button>
        <button onClick={resetFilters} className={styles.resetBtn}>
          Reset
        </button>
      </div>

      {/* Loading/Error States */}
      {loading && <div className={styles.loading}>Loading...</div>}
      {error && <div className={styles.error}>Error: {error}</div>}

      {/* Transactions Table */}
      {!loading && !error && (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Order ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>
                      <code>{txn.transaction_id}</code>
                    </td>
                    <td>
                      {txn.order_id ? (
                        <a
                          href={`/admin/orders/${txn.order_id}`}
                          className={styles.orderLink}
                        >
                          {txn.order_id}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[txn.type]}`}>
                        {txn.type}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${styles[txn.status]}`}
                      >
                        {txn.status}
                      </span>
                    </td>
                    <td>${txn.amount.toFixed(2)}</td>
                    <td>{txn.currency}</td>
                    <td>{new Date(txn.created_at).toLocaleString()}</td>
                    <td>
                      <button
                        onClick={() =>
                          fetchTransactionDetails(txn.transaction_id)
                        }
                        className={styles.viewBtn}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button
              onClick={prevPage}
              disabled={pagination.skip === 0}
              className={styles.paginationBtn}
            >
              Previous
            </button>
            <span className={styles.paginationInfo}>
              Showing {pagination.skip + 1} -{" "}
              {Math.min(pagination.skip + pagination.limit, total)} of {total}
            </span>
            <button
              onClick={nextPage}
              disabled={pagination.skip + pagination.limit >= total}
              className={styles.paginationBtn}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Transaction Details Modal */}
      {showModal && selectedTransaction && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Transaction Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className={styles.closeBtn}
              >
                ×
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.detailRow}>
                <strong>Transaction ID:</strong>
                <code>{selectedTransaction.transaction_id}</code>
              </div>
              <div className={styles.detailRow}>
                <strong>Type:</strong>
                <span
                  className={`${styles.badge} ${
                    styles[selectedTransaction.type]
                  }`}
                >
                  {selectedTransaction.type}
                </span>
              </div>
              <div className={styles.detailRow}>
                <strong>Status:</strong>
                <span
                  className={`${styles.statusBadge} ${
                    styles[selectedTransaction.status]
                  }`}
                >
                  {selectedTransaction.status}
                </span>
              </div>
              <div className={styles.detailRow}>
                <strong>Amount:</strong>
                <span>
                  ${selectedTransaction.amount.toFixed(2)}{" "}
                  {selectedTransaction.currency}
                </span>
              </div>
              {selectedTransaction.order_id && (
                <div className={styles.detailRow}>
                  <strong>Order ID:</strong>
                  <a
                    href={`/admin/orders/${selectedTransaction.order_id}`}
                    className={styles.orderLink}
                  >
                    {selectedTransaction.order_id}
                  </a>
                </div>
              )}
              {selectedTransaction.error_code && (
                <div className={styles.detailRow}>
                  <strong>Error:</strong>
                  <span className={styles.error}>
                    {selectedTransaction.error_code}:{" "}
                    {selectedTransaction.error_message}
                  </span>
                </div>
              )}

              {/* Event Timeline */}
              <div className={styles.timeline}>
                <h3>Event Timeline</h3>
                {selectedTransaction.events.map((event) => (
                  <div key={event.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot}></div>
                    <div className={styles.timelineContent}>
                      <strong>{event.event_type}</strong>
                      <span className={styles.timelineDate}>
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Refund Button */}
              {selectedTransaction.type === "capture" &&
                selectedTransaction.status === "success" && (
                  <button
                    onClick={() =>
                      handleRefund(
                        selectedTransaction.transaction_id,
                        selectedTransaction.amount
                      )
                    }
                    className={styles.refundBtn}
                  >
                    Process Refund
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
