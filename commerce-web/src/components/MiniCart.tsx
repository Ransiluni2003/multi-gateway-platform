"use client";

import React, { useEffect, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Link from "next/link";

type CartItem = { productId: string; quantity: number };
type Product = { id: string; title: string; price: number; currency?: string };

export default function MiniCart() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = async () => {
    try {
      const r1 = await fetch("/api/cart");
      const d1 = await r1.json();
      setCart(d1.cart || []);

      const r2 = await fetch("/api/products");
      const d2 = await r2.json();
      setProducts(d2.products || []);
    } catch (e) {
      setCart([]);
      setProducts([]);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const count = cart.reduce((s, c) => s + (c.quantity || 0), 0);

  const clear = async () => {
    await fetch("/api/cart", { method: "DELETE" });
    setCart([]);
  };

  const items = cart.map((c) => ({
    ...c,
    product: products.find((p) => p.id === c.productId),
  }));

  const total = items.reduce((s, it) => s + (it.product ? it.product.price * it.quantity : 0), 0);

  return (
    <>
      <IconButton color="inherit" onClick={() => setOpen(true)} aria-label="open cart">
        <Badge badgeContent={count} color="secondary">
          <ShoppingCartIcon />
        </Badge>
      </IconButton>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 360, p: 2 }}>
          <Typography variant="h6">Your Cart</Typography>
          <Divider sx={{ my: 1 }} />

          {items.length === 0 ? (
            <Typography sx={{ mt: 2 }}>Cart is empty.</Typography>
          ) : (
            <List>
              {items.map((it) => (
                <ListItem key={it.productId}>
                  <ListItemText
                    primary={it.product?.title ?? it.productId}
                    secondary={`${((it.product?.price || 0) / 100).toFixed(2)} x ${it.quantity}`}
                  />
                </ListItem>
              ))}
            </List>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Total: ${(total / 100).toFixed(2)}</Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              <Button variant="contained" component={Link} href="/checkout" onClick={() => setOpen(false)}>
                Checkout
              </Button>
              <Button variant="outlined" onClick={clear}>
                Clear
              </Button>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
