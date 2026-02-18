'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { useCart } from '@/context/CartContext';

interface AddToCartProps {
  productId: string;
  maxStock?: number;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export default function AddToCart({
  productId,
  maxStock = 10,
  variant = 'contained',
  size = 'medium',
  fullWidth = false,
}: AddToCartProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { addToCart } = useCart();

  const handleAddToCart = async () => {
    if (quantity <= 0) {
      setErrorMsg('Quantity must be at least 1');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await addToCart(productId, quantity);
      setSuccess(true);
      setQuantity(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add to cart';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            inputProps={{
              min: 1,
              max: maxStock,
              step: 1,
            }}
            label="Quantity"
            size={size === 'small' ? 'small' : 'medium'}
            sx={{ width: '100px' }}
          />

          <Button
            variant={variant}
            size={size}
            fullWidth={fullWidth}
            onClick={handleAddToCart}
            disabled={loading || quantity <= 0}
            startIcon={loading ? <CircularProgress size={20} /> : <AddShoppingCartIcon />}
          >
            {loading ? 'Adding...' : 'Add to Cart'}
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Added {quantity} item{quantity > 1 ? 's' : ''} to cart!
        </Alert>
      </Snackbar>
    </>
  );
}
