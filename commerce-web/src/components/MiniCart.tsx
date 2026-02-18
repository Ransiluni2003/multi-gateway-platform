'use client';

import React, { useEffect, useState } from 'react';
import {
  IconButton,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Typography,
  Button,
  Divider,
  Box,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function MiniCart() {
  const [open, setOpen] = useState(false);
  const { cart, products, itemCount, total, clearCart, removeFromCart, loadCart } = useCart();

  // Reload cart when drawer opens to get latest data
  useEffect(() => {
    if (open) {
      loadCart();
    }
  }, [open, loadCart]);

  const handleRemove = async (productId: string) => {
    try {
      await removeFromCart(productId);
    } catch (err) {
      console.error('Remove error:', err);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear your cart?')) {
      try {
        await clearCart();
      } catch (err) {
        console.error('Clear error:', err);
      }
    }
  };

  const items = cart.map((c) => ({
    ...c,
    product: products.find((p) => p.id === c.productId),
  }));

  return (
    <>
      <IconButton
        color="inherit"
        onClick={() => setOpen(true)}
        aria-label="open cart"
        sx={{ position: 'relative' }}
      >
        <Badge badgeContent={itemCount} color="error">
          <ShoppingCartIcon />
        </Badge>
      </IconButton>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 380, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Shopping Cart
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {cart.length === 0 ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="textSecondary">Your cart is empty</Typography>
            </Box>
          ) : (
            <>
              <List sx={{ flex: 1, overflowY: 'auto' }}>
                {items.map((it) => (
                  <ListItem
                    key={it.productId}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemove(it.productId)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                    sx={{ mb: 1 }}
                  >
                    <ListItemText
                      primary={it.product?.name || it.productId}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            Price: ${((it.product?.price || 0) / 100).toFixed(2)}
                          </Typography>
                          <Typography variant="caption">Qty: {it.quantity}</Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">Subtotal:</Typography>
                  <Typography variant="subtitle2">${(total / 100).toFixed(2)}</Typography>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  Shipping calculated at checkout
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  fullWidth
                  component={Link}
                  href="/cart"
                  onClick={() => setOpen(false)}
                >
                  View Cart
                </Button>
                <Button variant="outlined" fullWidth onClick={handleClear} color="error">
                  Clear
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>
    </>
  );
}
