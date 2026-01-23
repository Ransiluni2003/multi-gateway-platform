'use client';

import { useEffect, useState } from 'react';
import {
  Container,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  stock: number;
  status: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    images: '',
    stock: '',
    status: 'active',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  // Apply filters whenever products or filters change
  useEffect(() => {
    let results = products;
    
    if (filters.status) {
      results = results.filter(p => p.status === filters.status);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredProducts(results);
  }, [products, filters]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      
      if (res.ok) {
        const productsWithImages = (data.products || []).map((p: any) => ({
          ...p,
          images: Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? JSON.parse(p.images) : []),
        }));
        setProducts(productsWithImages);
      } else {
        setError(data.error || 'Failed to load products');
      }
    } catch (err) {
      setError('Error loading products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (product?: Product) => {
    if (product) {
      setEditing(product);
      setFormData({
        name: product.name,
        price: product.price.toString(),
        description: product.description,
        images: Array.isArray(product.images) ? product.images.join(', ') : '',
        stock: product.stock.toString(),
        status: product.status,
      });
    } else {
      setEditing(null);
      setFormData({
        name: '',
        price: '',
        description: '',
        images: '',
        stock: '0',
        status: 'active',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Product name is required');
      return;
    }
    if (!formData.price.trim()) {
      alert('Price is required');
      return;
    }

    const imagesArray = formData.images
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s);

    const payload = {
      ...(editing && { id: editing.id }),
      name: formData.name,
      price: formData.price,
      description: formData.description,
      images: imagesArray,
      stock: formData.stock,
      status: formData.status,
    };

    const method = editing ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        fetchProducts();
        handleClose();
      } else {
        alert(data.error || 'Failed to save product');
      }
    } catch (error) {
      console.error(error);
      alert('Error saving product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProducts();
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error(error);
      alert('Error deleting product');
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Product Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Product
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'end' }}>
          <TextField
            label="Search"
            size="small"
            placeholder="Search by name or description..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            sx={{ minWidth: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredProducts.length} of {products.length} products
          </Typography>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Price</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Stock</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={product.stock} 
                      variant="outlined"
                      color={product.stock > 0 ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={product.status}
                      color={product.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={() => handleOpen(product)} title="Edit">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(product.id)} title="Delete">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && filteredProducts.length === 0 && products.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No products match your filters.
          </Typography>
        </Box>
      )}

      {!loading && filteredProducts.length === 0 && products.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No products yet. Click "Add Product" to create one.
          </Typography>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
          />
          <TextField
            label="Price"
            fullWidth
            margin="normal"
            type="number"
            inputProps={{ step: '0.01', min: '0' }}
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <TextField
            label="Images (comma separated URLs)"
            fullWidth
            margin="normal"
            value={formData.images}
            onChange={(e) => setFormData({ ...formData, images: e.target.value })}
            helperText="e.g., https://example.com/img1.jpg, https://example.com/img2.jpg"
          />
          <TextField
            label="Stock"
            fullWidth
            margin="normal"
            type="number"
            inputProps={{ min: '0' }}
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              label="Status"
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editing ? 'Update Product' : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
