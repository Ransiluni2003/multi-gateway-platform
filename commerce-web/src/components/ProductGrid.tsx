"use client";

import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CardMedia from "@mui/material/CardMedia";

type Product = {
  id: string;
  title: string;
  price: number;
  currency?: string;
  description?: string;
  image?: string;
};

export default function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .finally(() => setLoading(false));
  }, []);

  const addToCart = async (productId: string) => {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    // naive: no local UI update; user can view Cart page
  };

  if (loading) return <Typography>Loading products...</Typography>;

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
      {products.map((p) => (
        <Card key={p.id}>
          {p.image && <CardMedia component="img" height="140" image={p.image} alt={p.title} />}
          <CardContent>
            <Typography variant="h6">{p.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {p.description}
            </Typography>
            <Typography sx={{ mt: 1 }}>
              {(p.price / 100).toFixed(2)} {p.currency || "USD"}
            </Typography>
          </CardContent>
          <CardActions>
            <Button size="small" onClick={() => addToCart(p.id)}>
              Add to cart
            </Button>
          </CardActions>
        </Card>
      ))}
    </Box>
  );
}
