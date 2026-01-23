'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    price: number;
  };
}

interface Order {
  id: string;
  email: string;
  total: number;
  status: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  payment?: {
    id: string;
    status: string;
    stripePaymentIntentId: string;
    stripeChargeId?: string;
    refundAmount?: number;
    refundedAt?: string;
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 4, display: 'flex', justifyContent: 'center', minHeight: '60vh', alignItems: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={fetchOrders} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Container>
    );
  }

  if (orders.length === 0) {
    return (
      <Container sx={{ py: 4 }}>
        <Box textAlign="center" py={6}>
          <ShoppingBagIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            No Orders Yet
          </Typography>
          <Typography variant="body1" color="textSecondary" mb={3}>
            You haven't placed any orders. Start shopping to see your orders here!
          </Typography>
          <Button variant="contained" href="/products">
            Browse Products
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
        <Box display="flex" alignItems="center" gap={2}>
          <ShoppingBagIcon fontSize="large" />
          <Box>
            <Typography variant="h4" component="h1">
              My Orders
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'} found
            </Typography>
          </Box>
        </Box>
        <Button variant="outlined" onClick={fetchOrders} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {orders.map((order) => (
        <Accordion key={order.id} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" width="100%" pr={2} gap={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Order #{order.id.slice(0, 8)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>
              <Box display="flex" gap={1} alignItems="center">
                <Chip
                  label={order.status.toUpperCase()}
                  color={getStatusColor(order.status) as any}
                  size="small"
                />
                <Typography variant="h6" fontWeight="bold">
                  ${(order.total / 100).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              {/* Order Items */}
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Order Items
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell align="right">${(item.price / 100).toFixed(2)}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          ${((item.price * item.quantity) / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <strong>Total</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>${(order.total / 100).toFixed(2)}</strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Payment Status */}
              {order.payment && (
                <>
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                    Payment Information
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.default', mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" color="textSecondary">
                        Payment Status:
                      </Typography>
                      <Chip
                        label={order.payment.status.toUpperCase()}
                        color={getStatusColor(order.payment.status) as any}
                        size="small"
                      />
                    </Box>
                    {order.payment.stripeChargeId && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        Charge ID: {order.payment.stripeChargeId}
                      </Typography>
                    )}
                    {order.payment.refundAmount && order.payment.refundAmount > 0 && (
                      <Box mt={1} p={1} bgcolor="info.lighter" borderRadius={1}>
                        <Typography variant="body2" color="info.main">
                          Refunded: ${order.payment.refundAmount.toFixed(2)}
                        </Typography>
                        {order.payment.refundedAt && (
                          <Typography variant="caption" color="textSecondary">
                            on {new Date(order.payment.refundedAt).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Card>
                </>
              )}

              {/* Shipping Address */}
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Shipping Address
              </Typography>
              <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="body2">
                  {order.firstName} {order.lastName}
                </Typography>
                <Typography variant="body2">{order.address}</Typography>
                <Typography variant="body2">
                  {order.city}, {order.state} {order.zipCode}
                </Typography>
                <Typography variant="body2">{order.country}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  {order.email}
                </Typography>
              </Card>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Container>
  );
}
