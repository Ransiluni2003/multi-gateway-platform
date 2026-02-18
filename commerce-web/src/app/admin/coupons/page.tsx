'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

interface Coupon {
  code: string;
  type: string;
  value: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  isActive: boolean;
  description?: string;
  redemptionCount?: number;
}

export default function CouponsAdminPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percent',
    value: 10,
    maxRedemptions: '',
    expiresAt: '',
    description: '',
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/coupons');
      if (!response.ok) throw new Error('Failed to fetch coupons');
      const data = await response.json();
      setCoupons(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async () => {
    try {
      setError('');
      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(String(formData.value)),
          maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions) : null,
          expiresAt: formData.expiresAt || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create coupon');
      }

      setOpenDialog(false);
      setFormData({
        code: '',
        type: 'percent',
        value: 10,
        maxRedemptions: '',
        expiresAt: '',
        description: '',
      });
      await fetchCoupons();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDisableCoupon = async (code: string) => {
    try {
      const response = await fetch(`/api/admin/coupons/${code}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to disable coupon');
      await fetchCoupons();
    } catch (err) {
      setError(String(err));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">Coupon Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create Coupon
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Card}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Value</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Redemptions</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Expires</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.code}>
                <TableCell sx={{ fontWeight: 'bold' }}>{coupon.code}</TableCell>
                <TableCell>
                  <Chip
                    label={coupon.type === 'percent' ? '% OFF' : '$ OFF'}
                    color={coupon.type === 'percent' ? 'primary' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{coupon.value}</TableCell>
                <TableCell>
                  {coupon.maxRedemptions
                    ? `${coupon.redemptionCount || 0} / ${coupon.maxRedemptions}`
                    : 'Unlimited'}
                </TableCell>
                <TableCell>
                  {coupon.expiresAt
                    ? new Date(coupon.expiresAt).toLocaleDateString()
                    : 'Never'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={coupon.isActive ? 'Active' : 'Inactive'}
                    color={coupon.isActive ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDisableCoupon(coupon.code)}
                    color="error"
                  >
                    Disable
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Create New Coupon
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Coupon Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., SAVE10"
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value="percent">Percentage (%)</MenuItem>
                <MenuItem value="amount">Fixed Amount ($)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Value"
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
              fullWidth
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <TextField
              label="Max Redemptions (leave empty for unlimited)"
              type="number"
              value={formData.maxRedemptions}
              onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
              fullWidth
            />

            <TextField
              label="Expires At"
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={handleCreateCoupon}
                fullWidth
              >
                Create
              </Button>
              <Button
                variant="outlined"
                onClick={() => setOpenDialog(false)}
                fullWidth
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Dialog>
    </Box>
  );
}
