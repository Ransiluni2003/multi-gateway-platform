'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import {
  Container,
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LockIcon from '@mui/icons-material/Lock';
import { useCart } from '@/context/CartContext';

export default function CheckoutContent() {
  const { cart, products, total, itemCount, loading: cartLoading, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });

  // Validate cart on mount and whenever it changes
  useEffect(() => {
    validateCart();
  }, [cart, products]);

  const validateCart = () => {
    const errors: string[] = [];

    // Check if cart is empty
    if (cart.length === 0) {
      errors.push('Your cart is empty. Please add items before checking out.');
    }

    // Check if all products exist and have valid data
    cart.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        errors.push(`Product ${item.productId} not found`);
      } else if (!product.name || product.price <= 0) {
        errors.push(`Product ${product.name || item.productId} has invalid data`);
      } else if ((product.stock || 0) < item.quantity) {
        errors.push(`${product.name}: Only ${product.stock || 0} in stock (you have ${item.quantity} in cart)`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const isFormValid = () => {
    return (
      formData.email.trim() !== '' &&
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.address.trim() !== '' &&
      formData.city.trim() !== '' &&
      formData.state.trim() !== '' &&
      formData.zipCode.trim() !== '' &&
      formData.country.trim() !== ''
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Revalidate cart before submission
    if (!validateCart()) {
      setError('Please fix cart issues before proceeding');
      return;
    }

    if (!isFormValid()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create order with items from cart
      const orderItems = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: orderItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Clear cart after successful order
      await clearCart();

      // Redirect to payment or success page
      window.location.href = `/checkout/success?orderId=${data.orderId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading state while cart is loading
  if (cartLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Show cart validation errors - block checkout if present
  const hasErrors = validationErrors.length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Checkout
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Review your order and complete your purchase
        </Typography>
      </Box>

      {/* Validation Errors Alert */}
      {hasErrors && (
        <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Cannot proceed with checkout:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
          <Button
            variant="outlined"
            size="small"
            href="/cart"
            sx={{ mt: 2 }}
          >
            Go to Cart
          </Button>
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }} gap={3}>
          {/* Billing Information */}
          <Box>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Billing Information
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2} mb={3}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing || hasErrors}
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing || hasErrors}
                />
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isProcessing || hasErrors}
                  />
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <TextField
                    fullWidth
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    disabled={isProcessing || hasErrors}
                  />
                </Box>
                <TextField
                  fullWidth
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing || hasErrors}
                />
                <TextField
                  fullWidth
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing || hasErrors}
                />
                <TextField
                  fullWidth
                  label="ZIP Code"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing || hasErrors}
                />
                <TextField
                  fullWidth
                  label="Country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing || hasErrors}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isProcessing || hasErrors || !isFormValid()}
                size="large"
              >
                {isProcessing ? <CircularProgress size={24} /> : 'Place Order'}
              </Button>

              {hasErrors && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  Please fix the errors above to continue
                </Typography>
              )}
            </Paper>
          </Box>

          {/* Order Summary */}
          <Box>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <ShoppingCartIcon />
                  <Typography variant="h6">Order Summary</Typography>
                </Box>
                
                <List dense>
                  {cart.map((item) => {
                    const product = products.find((p) => p.id === item.productId);
                    return (
                      <ListItem key={item.productId} disableGutters>
                        <ListItemText
                          primary={product?.name || item.productId}
                          secondary={`Qty: ${item.quantity} × $${((product?.price || 0) / 100).toFixed(2)}`}
                        />
                        <Typography variant="body2">
                          ${(((product?.price || 0) * item.quantity) / 100).toFixed(2)}
                        </Typography>
                      </ListItem>
                    );
                  })}
                </List>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="textSecondary">
                    Subtotal ({itemCount} items)
                  </Typography>
                  <Typography variant="body2">
                    ${(total / 100).toFixed(2)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Shipping
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Calculated at next step
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6" fontWeight="bold">
                    Total
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    ${(total / 100).toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface OrderData {
  id: string;
  total: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}

function CheckoutForm({ orderData }: { orderData: OrderData }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePaymentIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      setError('Stripe not loaded');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create payment intent
      const response = await fetch('/api/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.id,
          amount: orderData.total,
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create payment intent');
        setIsProcessing(false);
        return;
      }

      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsProcessing(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setError('Payment setup incomplete');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setIsProcessing(false);
      return;
    }

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            address: {
              line1: formData.address,
              city: formData.city,
              state: formData.state,
              postal_code: formData.zipCode,
              country: formData.country,
            },
          },
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        // Payment successful
        router.push(`/checkout/success?orderId=${orderData.id}&paymentId=${paymentIntent.id}`);
      } else {
        setError('Payment processing unexpected');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box component="form" onSubmit={clientSecret ? handlePaymentSubmit : handlePaymentIntent} noValidate>
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 2fr' }} gap={3}>
        {/* Order Summary */}
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <ShoppingCartIcon />
                <Typography variant="h6">Order Summary</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" mb={2}>
                Items: {orderData.items.length}
              </Typography>
              <Typography variant="h5" color="primary" fontWeight="bold">
                ${orderData.total.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Billing & Card Info */}
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Billing Information
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2} mb={3}>
              <Box>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing}
                />
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing}
                />
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="ZIP Code"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="Country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                  disabled={isProcessing}
                />
              </Box>
            </Box>

            {!clientSecret && (
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isProcessing}
              >
                {isProcessing ? <CircularProgress size={24} /> : 'Continue to Payment'}
              </Button>
            )}

            {clientSecret && (
              <>
                <Box mb={3} p={2} bgcolor="background.default" borderRadius={1}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <LockIcon color="success" />
                    <Typography variant="subtitle2" fontWeight="bold">
                      Secure Payment
                    </Typography>
                  </Box>
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#424242',
                          '::placeholder': {
                            color: '#aab7c4',
                          },
                        },
                        invalid: {
                          color: '#fa755a',
                        },
                      },
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  color="success"
                  fullWidth
                  disabled={isProcessing}
                  size="large"
                >
                  {isProcessing ? <CircularProgress size={24} /> : `Pay $${orderData.total.toFixed(2)}`}
                </Button>
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

