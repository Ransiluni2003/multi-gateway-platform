'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';

interface Order {
  id: string;
  email: string;
  total: number;
  status: string;
  createdAt: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    product: {
      name: string;
    };
  }>;
}

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const paymentId = searchParams.get('paymentId');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('No order found');
      setLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const response = await fetch(`/api/orders?id=${orderId}`);
        if (!response.ok) {
          throw new Error('Failed to load order');
        }
        const data = await response.json();
        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">{error || 'Order not found'}</Alert>
        <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={() => router.push('/products')}>
          Continue Shopping
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Box mb={3}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main' }} />
        </Box>

        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Payment Successful!
        </Typography>

        <Typography variant="body1" color="textSecondary" mb={3}>
          Thank you for your purchase. Your order has been confirmed and will be processed shortly.
        </Typography>

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box mb={2}>
              <Typography variant="subtitle2" color="textSecondary">
                Order Number
              </Typography>
              <Typography variant="h6" fontFamily="monospace" fontWeight="bold">
                {orderId}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box mb={2}>
              <Typography variant="subtitle2" color="textSecondary">
                Amount Paid
              </Typography>
              <Typography variant="h5" color="primary" fontWeight="bold">
                ${order.total.toFixed(2)}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box mb={2}>
              <Typography variant="subtitle2" color="textSecondary">
                Email
              </Typography>
              <Typography variant="body2">{order.email}</Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Items Ordered
              </Typography>
              {order.items.map((item, idx) => (
                <Box key={idx} display="flex" justifyContent="space-between" py={0.5}>
                  <Typography variant="body2">
                    {item.product.name} × {item.quantity}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ${(item.price * item.quantity).toFixed(2)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {paymentId && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" fontFamily="monospace">
              Payment ID: {paymentId}
            </Typography>
          </Alert>
        )}

        <Typography variant="body2" color="textSecondary" mb={3}>
          A confirmation email has been sent to {order.email}
        </Typography>

        <Box display="flex" gap={2} justifyContent="center">
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              // Invoice download functionality
              console.log('Download invoice for order:', orderId);
            }}
          >
            Download Invoice
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push(`/orders/${orderId}`)}
          >
            View Order
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Button
          fullWidth
          variant="text"
          onClick={() => router.push('/products')}
        >
          Continue Shopping
        </Button>
      </Paper>
    </Container>
  );
}
