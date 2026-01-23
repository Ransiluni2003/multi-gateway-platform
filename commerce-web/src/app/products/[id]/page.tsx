'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Container,
  Grid,
  Typography,
  Box,
  Card,
  CardMedia,
  Chip,
  CircularProgress,
} from '@mui/material';
import AddToCart from '@/components/AddToCart';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  stock: number;
  status: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/products?id=${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          setProduct(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [params.id]);

  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!product) {
    return (
      <Container sx={{ py: 8 }}>
        <Typography variant="h5">Product not found</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          {product.images && product.images.length > 0 ? (
            <>
              <Card>
                <CardMedia
                  component="img"
                  height="400"
                  image={product.images[selectedImage]}
                  alt={product.name}
                  sx={{ objectFit: 'cover' }}
                />
              </Card>
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                {product.images.map((img, idx) => (
                  <Card
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    sx={{
                      cursor: 'pointer',
                      border: selectedImage === idx ? '2px solid primary.main' : 'none',
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="80"
                      image={img}
                      alt={`${product.name} ${idx + 1}`}
                      sx={{ width: 80, objectFit: 'cover' }}
                    />
                  </Card>
                ))}
              </Box>
            </>
          ) : (
            <Card sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.200' }}>
              <Typography variant="body2" color="text.secondary">No image</Typography>
            </Card>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h4" gutterBottom>
            {product.name}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Chip
              label={product.status === 'active' ? 'Available' : 'Unavailable'}
              color={product.status === 'active' ? 'success' : 'default'}
              size="small"
            />
            <Chip label={`Stock: ${product.stock}`} size="small" sx={{ ml: 1 }} />
          </Box>

          <Typography variant="h5" color="primary" gutterBottom>
            ${(product.price / 100).toFixed(2)}
          </Typography>

          <Typography variant="body1" paragraph sx={{ mt: 3 }}>
            {product.description}
          </Typography>

          <AddToCart
            productId={product.id}
            maxStock={product.stock}
            variant="contained"
            size="large"
            fullWidth
          />
        </Grid>
      </Grid>
    </Container>
  );
}
