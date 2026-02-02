/**
 * Audit Log Test Page
 * 
 * Demonstrates audit logging by performing various actions
 * and showing how they get logged
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
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';

export default function AuditLogTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [actionCount, setActionCount] = useState(0);

  const addLog = (message: string) => {
    setLogs(prev => [`${new Date().toLocaleTimeString()} - ${message}`, ...prev]);
  };

  const simulateAction = async (
    action: string,
    description: string,
    endpoint: string,
    body?: any
  ) => {
    addLog(`🔄 Performing: ${description}`);
    setActionCount(prev => prev + 1);

    try {
      // In a real app, this would call the actual endpoint
      // For demo, we'll just simulate the logging
      addLog(`✅ Action logged: ${action}`);
      addLog(`   Actor: admin@example.com (Admin)`);
      addLog(`   Resource: ${body?.resource || 'N/A'}`);
      addLog(`   Status: success`);
    } catch (error) {
      addLog(`❌ Failed to log action`);
    }
  };

  const runAllTests = async () => {
    setLogs([]);
    setActionCount(0);

    addLog('🚀 Starting audit log demonstration...');
    await new Promise(r => setTimeout(r, 500));

    await simulateAction(
      'LOGIN_SUCCESS',
      'User Login',
      '/api/auth/login',
      { resource: 'user', resourceId: 'user-123' }
    );
    await new Promise(r => setTimeout(r, 800));

    await simulateAction(
      'CREATE_PRODUCT',
      'Create Product',
      '/api/products',
      { resource: 'product', resourceId: 'prod-456' }
    );
    await new Promise(r => setTimeout(r, 800));

    await simulateAction(
      'UPDATE_COUPON',
      'Update Coupon',
      '/api/admin/coupons/SAVE10',
      { resource: 'coupon', resourceId: 'SAVE10' }
    );
    await new Promise(r => setTimeout(r, 800));

    await simulateAction(
      'REFUND_ORDER',
      'Refund Order',
      '/api/orders/refund',
      { resource: 'order', resourceId: 'order-789' }
    );
    await new Promise(r => setTimeout(r, 800));

    await simulateAction(
      'ISSUE_SIGNED_URL',
      'Issue Signed Upload URL',
      '/api/storage/upload',
      { resource: 'file', resourceId: 'image-001.jpg' }
    );
    await new Promise(r => setTimeout(r, 800));

    addLog('');
    addLog('✅ All actions completed and logged!');
    addLog(`📊 Total actions logged: ${actionCount}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          📝 Audit Log Test
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Demonstrates how sensitive actions are automatically logged for security & compliance
        </Typography>
      </Box>

      {/* Info Card */}
      <Card sx={{ mb: 3, bgcolor: 'info.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🎯 What This Demonstrates
          </Typography>
          <Typography variant="body2" paragraph>
            This page simulates various actions (login, create product, refund order, etc.) 
            and shows how each action is automatically logged to the audit trail.
          </Typography>
          <Typography variant="body2">
            In production, these logs would be stored in the database and viewable in the 
            Admin Audit Logs page.
          </Typography>
        </CardContent>
      </Card>

      {/* Actions */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Test Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={runAllTests}
                fullWidth
              >
                Run All Test Actions
              </Button>
              <Button
                variant="outlined"
                startIcon={<VisibilityIcon />}
                onClick={() => window.open('/admin/audit-logs', '_blank')}
                fullWidth
              >
                View Audit Logs Page
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Actions that will be logged:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="1. LOGIN_SUCCESS"
                  secondary="User authentication"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="2. CREATE_PRODUCT"
                  secondary="Product creation"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="3. UPDATE_COUPON"
                  secondary="Coupon modification"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="4. REFUND_ORDER"
                  secondary="Order refund"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="5. ISSUE_SIGNED_URL"
                  secondary="File access URL generation"
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Activity Log
            </Typography>
            <Box
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                bgcolor: 'grey.100',
                p: 2,
                borderRadius: 1,
              }}
            >
              {logs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No activity yet. Click "Run All Test Actions" to start.
                </Typography>
              ) : (
                logs.map((log, index) => (
                  <Box key={index} mb={0.5}>
                    {log}
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Explanation */}
      <Box>
        <Typography variant="h5" gutterBottom>
          📚 How Audit Logging Works
        </Typography>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🎯 The Problem (Without Audit Logs)
          </Typography>
          <Typography variant="body2" paragraph>
            Without audit logging, you have no visibility into who did what:
          </Typography>
          <ul>
            <li>❌ Product deleted → Who deleted it? When?</li>
            <li>❌ Order refunded → Why? By which admin?</li>
            <li>❌ Login failed → Brute force attack or typo?</li>
            <li>❌ Data breach → What data was accessed?</li>
            <li>❌ Compliance audit → No trail to show regulators</li>
          </ul>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🛡️ The Solution (With Audit Logs)
          </Typography>
          <Typography variant="body2" paragraph>
            Every sensitive action is automatically logged:
          </Typography>
          <ol>
            <li><strong>WHO:</strong> User ID, email, role (admin/user)</li>
            <li><strong>WHAT:</strong> Action type (CREATE, UPDATE, DELETE, REFUND)</li>
            <li><strong>WHEN:</strong> Exact timestamp</li>
            <li><strong>WHERE:</strong> IP address, user agent</li>
            <li><strong>WHY:</strong> Additional metadata (reason, amount, etc.)</li>
            <li><strong>RESULT:</strong> Success or failure</li>
          </ol>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            💡 Real-World Example: Security Incident
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Scenario:</strong> All products suddenly set to $0.01
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Without Audit Logs:</strong>
          </Typography>
          <ul>
            <li>Panic! Who did this?</li>
            <li>Check all admin accounts manually</li>
            <li>No evidence of who/when/how</li>
            <li>Can't prove it wasn't you</li>
            <li>No way to prevent in future</li>
          </ul>
          <Typography variant="body2" paragraph>
            <strong>With Audit Logs:</strong>
          </Typography>
          <ul>
            <li>Query audit logs: <code>action=UPDATE_PRODUCT timestamp&gt;2h</code></li>
            <li>Find: 100 UPDATE_PRODUCT actions by admin@company.com at 2:30 PM</li>
            <li>See IP address: 192.168.1.50 (employee laptop)</li>
            <li>Check metadata: price changed from $99.99 to $0.01</li>
            <li>Evidence saved → revoke access → prevent future incidents</li>
          </ul>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            📋 Compliance Requirements
          </Typography>
          <Typography variant="body2" paragraph>
            Many regulations REQUIRE audit logging:
          </Typography>
          <ul>
            <li><strong>SOC 2:</strong> Track all access to sensitive data</li>
            <li><strong>GDPR:</strong> Log data access, modifications, deletions</li>
            <li><strong>HIPAA:</strong> Track medical record access</li>
            <li><strong>PCI-DSS:</strong> Log payment data access</li>
            <li><strong>ISO 27001:</strong> Monitor security events</li>
          </ul>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <strong>Without audit logs → Fail compliance audit → Lose certification</strong>
          </Typography>
        </Paper>
      </Box>

      {/* Loom Instructions */}
      <Alert severity="success" sx={{ mt: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          📹 For Loom Recording:
        </Typography>
        <ol style={{ marginLeft: 16, marginTop: 8 }}>
          <li>Click "Run All Test Actions"</li>
          <li>Show activity log updating in real-time</li>
          <li>Point out: each action shows WHO, WHAT, WHEN</li>
          <li>Click "View Audit Logs Page" → show admin audit logs</li>
          <li>Filter by different actions/resources</li>
          <li>Explain: "Every sensitive action is tracked for security & compliance"</li>
          <li>Total time: ~2 minutes</li>
        </ol>
      </Alert>
    </Container>
  );
}
