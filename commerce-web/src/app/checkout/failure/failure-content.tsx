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
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Order {
  id: string;
  email: string;
  total: number;
  status: string;
  createdAt: string;
}

export default function FailureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const errorMessage = searchParams.get('error') || 'Payment processing failed';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
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
        console.error('Failed to load order:', err);
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

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Box mb={3}>
          <ErrorIcon sx={{ fontSize: 80, color: 'error.main' }} />
        </Box>

        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Payment Failed
        </Typography>

        <Typography variant="body1" color="textSecondary" mb={3}>
          Unfortunately, your payment could not be processed. Please try again or use a different payment method.
        </Typography>

        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">{errorMessage}</Typography>
        </Alert>

        {order && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary">
                  Order Number
                </Typography>
                <Typography variant="h6" fontFamily="monospace">
                  {orderId}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary">
                  Amount
                </Typography>
                <Typography variant="h5" color="primary" fontWeight="bold">
                  ${order.total.toFixed(2)}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Order Status
                </Typography>
                <Typography variant="body2">{order.status}</Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        <Typography variant="body2" color="textSecondary" mb={3}>
          Possible reasons for failure:
        </Typography>

        <Box component="ul" sx={{ textAlign: 'left', mb: 3 }}>
          <li>
            <Typography variant="body2">Insufficient funds on the card</Typography>
          </li>
          <li>
            <Typography variant="body2">Card expired or invalid</Typography>
          </li>
          <li>
            <Typography variant="body2">Incorrect billing information</Typography>
          </li>
          <li>
            <Typography variant="body2">Security verification failed</Typography>
          </li>
        </Box>

        <Box display="flex" gap={2} justifyContent="center" sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={() => {
              if (orderId) {
                router.push(`/checkout?orderId=${orderId}`);
              } else {
                router.push('/cart');
              }
            }}
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/cart')}
          >
            Back to Cart
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="textSecondary" mb={2}>
          Need help? Contact our support team
        </Typography>
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
