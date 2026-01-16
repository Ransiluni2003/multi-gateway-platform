"use client";

import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import ProductGrid from "@/components/ProductGrid";

export default function Home() {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Welcome to Commerce Demo
      </Typography>
      <ProductGrid />
    </Container>
  );
}
