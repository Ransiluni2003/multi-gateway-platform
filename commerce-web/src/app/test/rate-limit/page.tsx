/**
 * Rate Limiting Test Page
 * 
 * Purpose: Demonstrate rate limiting in action
 * Shows 429 responses when limit is exceeded
 */

'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';

interface RequestLog {
  id: number;
  timestamp: string;
  status: number;
  statusText: string;
  remaining: number | null;
  reset: string | null;
  message?: string;
}

export default function RateLimitTestPage() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [running, setRunning] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  const makeRequest = async (id: number) => {
    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'TEST', subtotal: 100 }),
      });

      const data = await response.json();
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const reset = response.headers.get('X-RateLimit-Reset');

      const log: RequestLog = {
        id,
        timestamp: new Date().toLocaleTimeString(),
        status: response.status,
        statusText: response.status === 429 ? '429 Too Many Requests' : response.statusText,
        remaining: remaining ? parseInt(remaining) : null,
        reset,
        message: data.message || data.error,
      };

      setLogs(prev => [log, ...prev].slice(0, 20)); // Keep last 20
      setRequestCount(prev => prev + 1);

      return response.status;
    } catch (error) {
      console.error('Request error:', error);
      return 500;
    }
  };

  const runRapidRequests = async () => {
    setRunning(true);
    setLogs([]);
    setRequestCount(0);

    // Send 15 requests rapidly (limit is 10 per minute)
    for (let i = 1; i <= 15; i++) {
      await makeRequest(i);
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay between requests
    }

    setRunning(false);
  };

  const stopTest = () => {
    setRunning(false);
  };

  const clearLogs = () => {
    setLogs([]);
    setRequestCount(0);
  };

  const rateLimited = logs.some(log => log.status === 429);
  const successCount = logs.filter(log => log.status !== 429).length;
  const blockedCount = logs.filter(log => log.status === 429).length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          🚦 Rate Limiting Test
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page demonstrates rate limiting by sending rapid requests to the coupon validation endpoint.
        </Typography>
      </Box>

      {/* Configuration Info */}
      <Card sx={{ mb: 3, bgcolor: 'info.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Rate Limit Configuration
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Endpoint:</strong> POST /api/coupons/validate
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Limit:</strong> 10 requests per minute
          </Typography>
          <Typography variant="body2">
            <strong>Why:</strong> Prevents attackers from brute-forcing coupon codes
          </Typography>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Controls
        </Typography>
        <Box display="flex" gap={2} mb={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={runRapidRequests}
            disabled={running}
          >
            Send 15 Rapid Requests
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<StopIcon />}
            onClick={stopTest}
            disabled={!running}
          >
            Stop
          </Button>
          <Button
            variant="text"
            onClick={clearLogs}
            disabled={running}
          >
            Clear Logs
          </Button>
        </Box>

        {running && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Sending requests... ({requestCount}/15)
            </Typography>
          </Box>
        )}

        {rateLimited && !running && (
          <Alert severity="success" sx={{ mt: 2 }}>
            ✅ Rate limiting working! Requests beyond limit were blocked with 429 status.
          </Alert>
        )}
      </Paper>

      {/* Results Summary */}
      {logs.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Results Summary
          </Typography>
          <Box display="flex" gap={3}>
            <Box>
              <Typography variant="h4" color="success.main">
                {successCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Allowed Requests
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4" color="error.main">
                {blockedCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Blocked Requests (429)
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4">
                {logs.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Requests
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Request Logs */}
      {logs.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>#</strong></TableCell>
                <TableCell><strong>Time</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Remaining</strong></TableCell>
                <TableCell><strong>Reset Time</strong></TableCell>
                <TableCell><strong>Message</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow 
                  key={log.id}
                  sx={{ 
                    bgcolor: log.status === 429 ? 'error.light' : 'success.light',
                    opacity: 0.9,
                  }}
                >
                  <TableCell>{log.id}</TableCell>
                  <TableCell>{log.timestamp}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.status}
                      color={log.status === 429 ? 'error' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {log.remaining !== null ? (
                      <Chip
                        label={`${log.remaining} left`}
                        size="small"
                        variant="outlined"
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {log.reset ? new Date(log.reset).toLocaleTimeString() : '-'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {log.message}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Explanation */}
      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          📚 How Rate Limiting Works
        </Typography>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🎯 The Problem: Brute Force Attacks
          </Typography>
          <Typography variant="body2" paragraph>
            Without rate limiting, an attacker can send thousands of requests per second to:
          </Typography>
          <ul>
            <li>Guess valid coupon codes (SAVE10, SAVE20, DISCOUNT, etc.)</li>
            <li>Brute force login passwords</li>
            <li>Spam webhook endpoints</li>
            <li>Overload your server (DoS attack)</li>
          </ul>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🛡️ The Solution: Request Limits
          </Typography>
          <Typography variant="body2" paragraph>
            Rate limiting tracks how many requests each IP address makes and blocks excess requests:
          </Typography>
          <ol>
            <li><strong>Track:</strong> Count requests per IP per minute</li>
            <li><strong>Limit:</strong> Allow only 10 requests per minute</li>
            <li><strong>Block:</strong> Return 429 "Too Many Requests" for excess</li>
            <li><strong>Reset:</strong> Counter resets after 1 minute</li>
          </ol>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            💡 Real-World Example
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Scenario:</strong> Attacker tries to guess coupon codes
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Without Rate Limiting:</strong>
          </Typography>
          <ul>
            <li>Attacker sends 1000 requests with different codes: SAVE10, SAVE20, SAVE30...</li>
            <li>Finds valid codes: SAVE10 ✓, SUMMER20 ✓</li>
            <li>Steals discounts worth $1000s</li>
          </ul>
          <Typography variant="body2" paragraph>
            <strong>With Rate Limiting:</strong>
          </Typography>
          <ul>
            <li>Attacker sends request 1-10: Allowed ✓</li>
            <li>Request 11: 429 Too Many Requests ❌</li>
            <li>Must wait 1 minute to try again</li>
            <li>Attack becomes impractical (would take days instead of seconds)</li>
          </ul>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            📋 Response Headers
          </Typography>
          <Typography variant="body2" paragraph>
            Rate limit info is sent in response headers:
          </Typography>
          <ul>
            <li><code>X-RateLimit-Limit: 10</code> - Maximum requests allowed</li>
            <li><code>X-RateLimit-Remaining: 5</code> - Requests left in current window</li>
            <li><code>X-RateLimit-Reset: 2026-01-30T10:15:00Z</code> - When limit resets</li>
            <li><code>Retry-After: 45</code> - Seconds until you can try again</li>
          </ul>
        </Paper>
      </Box>

      {/* Loom Instructions */}
      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          📹 For Loom Recording:
        </Typography>
        <ol style={{ marginLeft: 16, marginTop: 8 }}>
          <li>Click "Send 15 Rapid Requests" button</li>
          <li>Watch requests turn green (allowed) then red (blocked)</li>
          <li>Show Results Summary: 10 allowed, 5 blocked</li>
          <li>Point out 429 status codes in table</li>
          <li>Explain: First 10 pass, next 5 blocked = rate limiting works!</li>
          <li>Total time: ~1 minute</li>
        </ol>
      </Alert>
    </Container>
  );
}
