'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { Order, Payment } from '@prisma/client';

interface OrderWithPayment extends Order {
  payment?: Payment;
  items?: any[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithPayment | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('requested_by_customer');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState('');

  // Fetch all orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/orders');
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to fetch orders');

        setOrders(data.orders || []);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Filter orders by status
  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  // Handle refund submission
  const handleRefund = async () => {
    if (!selectedOrder) return;

    try {
      setRefundLoading(true);
      const payload = {
        orderId: selectedOrder.id,
        reason: refundReason,
      };

      if (refundAmount) {
        (payload as any).amount = parseFloat(refundAmount);
      }

      const response = await fetch('/api/orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Refund failed');

      setRefundSuccess(data.message);
      setShowRefundDialog(false);
      setRefundAmount('');

      // Refresh orders
      const updatedOrders = orders.map(o =>
        o.id === selectedOrder.id
          ? { ...o, status: data.order.status }
          : o
      );
      setOrders(updatedOrders);
      setSelectedOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setRefundLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      pending: 'warning',
      completed: 'success',
      failed: 'error',
      refunded: 'error',
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Container sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Order Management
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {refundSuccess && <Alert severity="success" sx={{ mb: 2 }}>{refundSuccess}</Alert>}

      {/* Status Filter */}
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            label="Filter by Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Orders</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="refunded">Refunded</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>Order ID</strong></TableCell>
              <TableCell><strong>Customer</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell align="right"><strong>Total</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {order.id.substring(0, 8)}...
                </TableCell>
                <TableCell>{order.firstName} {order.lastName}</TableCell>
                <TableCell>{order.email}</TableCell>
                <TableCell align="right">${order.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={order.status}
                    color={getStatusColor(order.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setSelectedOrder(order);
                      setRefundSuccess('');
                    }}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredOrders.length === 0 && (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">No orders found</Typography>
        </Box>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Order Details</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedOrder && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Order ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {selectedOrder.id}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Customer</Typography>
                <Typography variant="body2">
                  {selectedOrder.firstName} {selectedOrder.lastName}
                </Typography>
                <Typography variant="body2">{selectedOrder.email}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Shipping Address</Typography>
                <Typography variant="body2">
                  {selectedOrder.address}<br />
                  {selectedOrder.city}, {selectedOrder.state} {selectedOrder.zipCode}<br />
                  {selectedOrder.country}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Order Amount</Typography>
                <Typography variant="h6" color="primary">
                  ${selectedOrder.total.toFixed(2)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                <Chip
                  label={selectedOrder.status}
                  color={getStatusColor(selectedOrder.status) as any}
                  size="small"
                />
              </Box>

              {selectedOrder.payment && selectedOrder.payment.refundAmount > 0 && (
                <Alert severity="info">
                  Refunded: ${selectedOrder.payment.refundAmount.toFixed(2)}
                </Alert>
              )}

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                    Items ({selectedOrder.items.length})
                  </Typography>
                  {selectedOrder.items.map((item: any) => (
                    <Typography key={item.id} variant="body2" sx={{ mb: 0.5 }}>
                      • {item.product?.name} x{item.quantity} @ ${item.price.toFixed(2)}
                    </Typography>
                  ))}
                </Box>
              )}

              {selectedOrder.status !== 'refunded' && selectedOrder.payment?.status !== 'failed' && (
                <Button
                  fullWidth
                  variant="contained"
                  color="warning"
                  onClick={() => setShowRefundDialog(true)}
                >
                  Initiate Refund
                </Button>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedOrder(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onClose={() => setShowRefundDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Process Refund</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedOrder && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2">
                  Order: {selectedOrder.id.substring(0, 8)}...
                </Typography>
                <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                  Total Amount: ${selectedOrder.total.toFixed(2)}
                </Typography>
                {selectedOrder.payment && selectedOrder.payment.refundAmount > 0 && (
                  <Typography variant="body2" color="textSecondary">
                    Already Refunded: ${selectedOrder.payment.refundAmount.toFixed(2)}
                  </Typography>
                )}
              </Box>

              <TextField
                fullWidth
                label="Refund Amount (leave empty for full refund)"
                type="number"
                inputProps={{ step: '0.01', min: '0' }}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                disabled={refundLoading}
              />

              <FormControl fullWidth>
                <InputLabel>Reason</InputLabel>
                <Select
                  value={refundReason}
                  label="Reason"
                  onChange={(e) => setRefundReason(e.target.value)}
                  disabled={refundLoading}
                >
                  <MenuItem value="requested_by_customer">Requested by Customer</MenuItem>
                  <MenuItem value="duplicate">Duplicate</MenuItem>
                  <MenuItem value="fraudulent">Fraudulent</MenuItem>
                  <MenuItem value="product_unacceptable">Product Unacceptable</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRefundDialog(false)} disabled={refundLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleRefund}
            variant="contained"
            color="warning"
            disabled={refundLoading}
          >
            {refundLoading ? <CircularProgress size={24} /> : 'Process Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
