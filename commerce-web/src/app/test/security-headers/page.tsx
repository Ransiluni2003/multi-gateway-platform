/**
 * Security Headers Test Page
 * 
 * Purpose: Verify that all security headers are properly configured
 * Access: http://localhost:3001/test/security-headers
 */

'use client';

import { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell,  
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Alert,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface HeaderCheck {
  header: string;
  expected: string;
  actual: string | null;
  status: 'pass' | 'fail' | 'warning';
  why: string;
}

export default function SecurityHeadersTestPage() {
  const [headers, setHeaders] = useState<HeaderCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current page to check response headers
    fetch('/api/test/headers')
      .then(res => {
        const checks: HeaderCheck[] = [
          {
            header: 'Content-Security-Policy',
            expected: 'Should contain default-src, script-src, etc.',
            actual: res.headers.get('content-security-policy'),
            status: res.headers.get('content-security-policy') ? 'pass' : 'fail',
            why: 'Prevents XSS attacks by controlling which resources can load',
          },
          {
            header: 'X-Frame-Options',
            expected: 'DENY or SAMEORIGIN',
            actual: res.headers.get('x-frame-options'),
            status: res.headers.get('x-frame-options') ? 'pass' : 'fail',
            why: 'Prevents clickjacking by blocking iframe embedding',
          },
          {
            header: 'X-Content-Type-Options',
            expected: 'nosniff',
            actual: res.headers.get('x-content-type-options'),
            status: res.headers.get('x-content-type-options') === 'nosniff' ? 'pass' : 'fail',
            why: 'Prevents MIME type sniffing attacks',
          },
          {
            header: 'Referrer-Policy',
            expected: 'strict-origin-when-cross-origin',
            actual: res.headers.get('referrer-policy'),
            status: res.headers.get('referrer-policy') ? 'pass' : 'fail',
            why: 'Controls how much referrer info is sent to external sites',
          },
          {
            header: 'Permissions-Policy',
            expected: 'Should contain camera=(), microphone=(), etc.',
            actual: res.headers.get('permissions-policy'),
            status: res.headers.get('permissions-policy') ? 'pass' : 'fail',
            why: 'Locks down browser features like camera/mic/geolocation',
          },
          {
            header: 'X-DNS-Prefetch-Control',
            expected: 'on or off',
            actual: res.headers.get('x-dns-prefetch-control'),
            status: res.headers.get('x-dns-prefetch-control') ? 'pass' : 'warning',
            why: 'Controls DNS prefetching for privacy',
          },
          {
            header: 'Strict-Transport-Security',
            expected: 'max-age=31536000 (production only)',
            actual: res.headers.get('strict-transport-security'),
            status: process.env.NODE_ENV === 'production' 
              ? (res.headers.get('strict-transport-security') ? 'pass' : 'fail')
              : 'warning',
            why: 'Forces HTTPS connections (production only)',
          },
        ];
        
        setHeaders(checks);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch headers:', err);
        setLoading(false);
      });
  }, []);

  const passCount = headers.filter(h => h.status === 'pass').length;
  const totalCount = headers.filter(h => h.status !== 'warning').length;

  const openDevTools = () => {
    alert('Press F12 to open DevTools, then go to Network tab → Reload page → Click on any request → Headers tab');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          🔒 Security Headers Test
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page verifies that all security headers are properly configured.
        </Typography>
      </Box>

      {/* Summary Card */}
      <Card sx={{ mb: 3, bgcolor: passCount === totalCount ? 'success.light' : 'warning.light' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {passCount === totalCount ? '✅ All Security Headers Active' : '⚠️ Some Headers Missing'}
          </Typography>
          <Typography variant="body1">
            {passCount} of {totalCount} critical headers configured correctly
          </Typography>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          How to Verify in DevTools:
        </Typography>
        <ol style={{ marginLeft: 16, marginTop: 8 }}>
          <li>Press <strong>F12</strong> to open DevTools</li>
          <li>Go to <strong>Network</strong> tab</li>
          <li>Reload this page (<strong>Ctrl+R</strong>)</li>
          <li>Click on the request to this page</li>
          <li>Go to <strong>Headers</strong> tab</li>
          <li>Scroll to <strong>Response Headers</strong></li>
          <li>Verify headers below match what you see</li>
        </ol>
        <Button 
          variant="outlined" 
          onClick={openDevTools} 
          sx={{ mt: 2 }}
        >
          Show Me How
        </Button>
      </Alert>

      {/* Headers Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Header Name</strong></TableCell>
              <TableCell><strong>Expected</strong></TableCell>
              <TableCell><strong>Actual Value</strong></TableCell>
              <TableCell><strong>Why This Matters</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              headers.map((check) => (
                <TableRow key={check.header}>
                  <TableCell>
                    {check.status === 'pass' && (
                      <Chip 
                        icon={<CheckCircleIcon />} 
                        label="PASS" 
                        color="success" 
                        size="small" 
                      />
                    )}
                    {check.status === 'fail' && (
                      <Chip 
                        icon={<ErrorIcon />} 
                        label="FAIL" 
                        color="error" 
                        size="small" 
                      />
                    )}
                    {check.status === 'warning' && (
                      <Chip 
                        label="Optional" 
                        color="warning" 
                        size="small" 
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <code>{check.header}</code>
                  </TableCell>
                  <TableCell>{check.expected}</TableCell>
                  <TableCell>
                    {check.actual ? (
                      <Box 
                        component="code" 
                        sx={{ 
                          fontSize: '0.75rem',
                          display: 'block',
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={check.actual}
                      >
                        {check.actual}
                      </Box>
                    ) : (
                      <Typography color="error" variant="body2">
                        Not set
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {check.why}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Security Explanations */}
      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          📚 Security Headers Explained
        </Typography>
        
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🛡️ Content-Security-Policy (CSP)
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Attack Prevented:</strong> Cross-Site Scripting (XSS)
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>How It Works:</strong> Tells browser which resources (scripts, styles, images) are allowed to load. 
            If attacker injects malicious script, browser blocks it.
          </Typography>
          <Typography variant="body2">
            <strong>Example:</strong> Attacker injects {`<script src="evil.com/steal-cookies.js">`}. 
            CSP blocks it because evil.com is not in allowed list.
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🖼️ X-Frame-Options / frame-ancestors
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Attack Prevented:</strong> Clickjacking
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>How It Works:</strong> Prevents your site from being embedded in iframe on attacker's site.
          </Typography>
          <Typography variant="body2">
            <strong>Example:</strong> Attacker creates fake-bank.com with invisible iframe showing your login page. 
            User thinks they're clicking "Login" but actually clicking attacker's button. Header blocks this.
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            📝 X-Content-Type-Options
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Attack Prevented:</strong> MIME Sniffing Attacks
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>How It Works:</strong> Forces browser to respect Content-Type header (don't guess file type).
          </Typography>
          <Typography variant="body2">
            <strong>Example:</strong> Attacker uploads "image.jpg" that's actually JavaScript. Without this header, 
            browser might execute it as script. With header, browser treats it as image only.
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🔗 Referrer-Policy
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Attack Prevented:</strong> Information Leakage
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>How It Works:</strong> Controls how much URL info is sent when user clicks external link.
          </Typography>
          <Typography variant="body2">
            <strong>Example:</strong> User views /admin/orders?secret=abc123 then clicks external link. 
            Without policy, external site sees full URL including secret. With policy, only domain is sent.
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🎥 Permissions-Policy
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Attack Prevented:</strong> Unauthorized Feature Access
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>How It Works:</strong> Locks down browser features (camera, mic, location) by default.
          </Typography>
          <Typography variant="body2">
            <strong>Example:</strong> Malicious ad script tries to access camera. Browser blocks it because 
            policy says camera=() (no one allowed). Only enable when you explicitly need it.
          </Typography>
        </Paper>
      </Box>

      {/* Loom Recording Instructions */}
      <Alert severity="success" sx={{ mt: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          📹 For Loom Recording:
        </Typography>
        <ol style={{ marginLeft: 16, marginTop: 8 }}>
          <li>Open this page: http://localhost:3001/test/security-headers</li>
          <li>Press F12 → Network tab → Reload page</li>
          <li>Click on the request → Headers tab → Response Headers</li>
          <li>Show each header in the list above</li>
          <li>Point out the "Why This Matters" column</li>
          <li>Total time: ~2 minutes</li>
        </ol>
      </Alert>
    </Container>
  );
}
