'use client';

import React, { useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useCart } from '@/context/CartContext';

export default function CartView() {
  const {
    cart,
    products,
    loading,
    error,
    total,
    removeFromCart,
    updateQuantity,
    clearCart,
    loadCart,
  } = useCart();

  // Reload cart on component mount to ensure latest data
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  if (loading) {
    return (
      <Container sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (cart.length === 0) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="info">Your cart is empty. Start shopping!</Alert>
        <Button variant="contained" href="/products" sx={{ mt: 2 }}>
          Browse Products
        </Button>
      </Container>
    );
  }

  const handleRemove = async (productId: string) => {
    try {
      await removeFromCart(productId);
    } catch (err) {
      console.error('Remove error:', err);
    }
  };

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await handleRemove(productId);
    } else {
      try {
        await updateQuantity(productId, newQuantity);
      } catch (err) {
        console.error('Update error:', err);
      }
    }
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      try {
        await clearCart();
      } catch (err) {
        console.error('Clear error:', err);
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Shopping Cart
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="center">Quantity</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cart.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              const subtotal = product ? product.price * item.quantity : 0;

              return (
                <TableRow key={item.productId} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body1">
                        {product?.name || item.productId}
                      </Typography>
                      {!product && (
                        <Typography variant="caption" color="error">
                          Product not found
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    ${((product?.price || 0) / 100).toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <TextField
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          handleQuantityChange(item.productId, val);
                        }}
                        inputProps={{
                          min: 1,
                          step: 1,
                          style: { textAlign: 'center', width: '50px' },
                        }}
                        variant="outlined"
                        size="small"
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    ${(subtotal / 100).toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemove(item.productId)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Card sx={{ minWidth: 300 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Subtotal
            </Typography>
            <Typography variant="h6">${(total / 100).toFixed(2)}</Typography>

            <Typography color="textSecondary" sx={{ mt: 2 }} gutterBottom>
              Shipping
            </Typography>
            <Typography variant="body1">Calculated at checkout</Typography>

            <Box sx={{ borderTop: '1px solid #eee', my: 2, pt: 2 }}>
              <Typography variant="h5">Total: ${(total / 100).toFixed(2)}</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button variant="contained" color="primary" fullWidth href="/checkout">
                Proceed to Checkout
              </Button>
              <Button variant="outlined" color="error" onClick={handleClear}>
                Clear Cart
              </Button>
            </Box>

            <Button variant="text" fullWidth href="/products" sx={{ mt: 1 }}>
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
