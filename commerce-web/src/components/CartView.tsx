"use client";

import React, { useEffect, useState } from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

type CartItem = { productId: string; quantity: number };
type Product = { id: string; title: string; price: number; currency?: string };

export default function CartView() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = async () => {
    const r1 = await fetch("/api/cart");
    const data1 = await r1.json();
    setCart(data1.cart || []);

    const r2 = await fetch("/api/products");
    const data2 = await r2.json();
    setProducts(data2.products || []);
  };

  useEffect(() => {
    load();
  }, []);

  const clear = async () => {
    await fetch("/api/cart", { method: "DELETE" });
    setCart([]);
  };

  if (cart.length === 0) return <Typography>Cart is empty.</Typography>;

  const items = cart.map((c) => ({
    ...c,
    product: products.find((p) => p.id === c.productId),
  }));

  const total = items.reduce((s, it) => s + (it.product ? it.product.price * it.quantity : 0), 0);

  return (
    <div>
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

      <Typography variant="h6">Total: ${(total / 100).toFixed(2)}</Typography>
      <Button variant="contained" sx={{ mt: 2, mr: 1 }} href="/checkout">
        Checkout
      </Button>
      <Button variant="outlined" sx={{ mt: 2 }} onClick={clear}>
        Clear
      </Button>
    </div>
  );
}
