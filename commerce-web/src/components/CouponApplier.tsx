'use client';

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ClearIcon from '@mui/icons-material/Clear';

interface CouponResult {
  valid: boolean;
  code: string;
  type: string;
  value: number;
  description?: string;
  subtotal: number;
  discountAmount: number;
  total: number;
}

interface CouponApplierProps {
  subtotal: number;
  onCouponApplied: (discount: CouponResult) => void;
  onCouponRemoved: () => void;
}

export function CouponApplier({
  subtotal,
  onCouponApplied,
  onCouponRemoved,
}: CouponApplierProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState<CouponResult | null>(null);

  const handleValidate = async () => {
    if (!code.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid coupon');
        setApplied(null);
        return;
      }

      setApplied(data);
      onCouponApplied(data);
      setCode('');
    } catch (err) {
      setError('Failed to validate coupon');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setApplied(null);
    setCode('');
    setError('');
    onCouponRemoved();
  };

  if (applied) {
    return (
      <Card sx={{ p: 2, mb: 2, bgcolor: '#f0f7ff', border: '1px solid #90caf9' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <LocalOfferIcon sx={{ color: '#1976d2', fontSize: 32 }} />
          <Box flex={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Coupon Applied: <Chip label={applied.code} size="small" />
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              {applied.description || `${applied.value}${applied.type === 'percent' ? '%' : '$'} off`}
            </Typography>
            <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 'bold', mt: 0.5 }}>
              Discount: -${applied.discountAmount.toFixed(2)}
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={handleRemove}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Remove
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        <LocalOfferIcon sx={{ mr: 1, fontSize: 20, verticalAlign: 'middle' }} />
        Have a Promo Code?
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <TextField
          size="small"
          placeholder="Enter coupon code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError('');
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleValidate()}
          disabled={loading}
          sx={{ flex: 1 }}
        />
        <Button
          variant="outlined"
          onClick={handleValidate}
          disabled={loading || !code.trim()}
        >
          {loading ? <CircularProgress size={24} /> : 'Apply'}
        </Button>
      </Stack>

      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#999' }}>
        Try: SAVE10 (10% off) or SUMMER20 ($20 off)
      </Typography>
    </Card>
  );
}
