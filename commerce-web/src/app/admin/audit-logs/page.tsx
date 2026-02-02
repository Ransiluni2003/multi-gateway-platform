/**
 * Admin Audit Logs Page
 * 
 * Shows complete audit trail of all sensitive actions
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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Card,
  CardContent,
  Grid,
  Pagination,
  Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SecurityIcon from '@mui/icons-material/Security';

interface AuditLog {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface AuditStats {
  totalLogs: number;
  failedActions: number;
  uniqueActors: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  
  const limit = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      });

      if (actionFilter !== 'all') {
        params.append('action', actionFilter);
      }
      if (resourceFilter !== 'all') {
        params.append('resource', resourceFilter);
      }

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await response.json();

      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, resourceFilter]);

  const getStatusColor = (status: string) => {
    return status === 'success' ? 'success' : 'error';
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('REFUND')) return 'error';
    if (action.includes('CREATE') || action.includes('LOGIN_SUCCESS')) return 'success';
    if (action.includes('UPDATE')) return 'warning';
    if (action.includes('FAILURE') || action.includes('DENIED')) return 'error';
    return 'default';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <SecurityIcon fontSize="large" />
          <Typography variant="h4">
            Audit Logs
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Complete audit trail of all sensitive actions in the system
        </Typography>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Logs
                </Typography>
                <Typography variant="h4">
                  {stats.totalLogs.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Failed Actions
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats.failedActions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Unique Users
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {stats.uniqueActors}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Action</InputLabel>
            <Select
              value={actionFilter}
              label="Action"
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">All Actions</MenuItem>
              <MenuItem value="LOGIN_SUCCESS">Login Success</MenuItem>
              <MenuItem value="LOGIN_FAILURE">Login Failure</MenuItem>
              <MenuItem value="CREATE_PRODUCT">Create Product</MenuItem>
              <MenuItem value="UPDATE_PRODUCT">Update Product</MenuItem>
              <MenuItem value="DELETE_PRODUCT">Delete Product</MenuItem>
              <MenuItem value="REFUND_ORDER">Refund Order</MenuItem>
              <MenuItem value="CREATE_COUPON">Create Coupon</MenuItem>
              <MenuItem value="ISSUE_SIGNED_URL">Issue Signed URL</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Resource</InputLabel>
            <Select
              value={resourceFilter}
              label="Resource"
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">All Resources</MenuItem>
              <MenuItem value="product">Product</MenuItem>
              <MenuItem value="order">Order</MenuItem>
              <MenuItem value="coupon">Coupon</MenuItem>
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="file">File</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchLogs}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* Why Audit Logs Matter */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          🔒 Why Audit Logs Are Important:
        </Typography>
        <ul style={{ marginLeft: 16, marginTop: 8 }}>
          <li><strong>Security:</strong> Track unauthorized access attempts and suspicious activity</li>
          <li><strong>Compliance:</strong> Required for SOC 2, GDPR, HIPAA, PCI-DSS</li>
          <li><strong>Debugging:</strong> See what happened before an error occurred</li>
          <li><strong>Forensics:</strong> Investigate security incidents and data breaches</li>
          <li><strong>Accountability:</strong> Know who made changes and when</li>
        </ul>
      </Alert>

      {/* Logs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Time</strong></TableCell>
              <TableCell><strong>Actor</strong></TableCell>
              <TableCell><strong>Action</strong></TableCell>
              <TableCell><strong>Resource</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>IP Address</strong></TableCell>
              <TableCell><strong>Details</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(log.createdAt).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {log.actorEmail || log.actorId ? (
                      <Box>
                        <Typography variant="body2">
                          {log.actorEmail || 'Unknown'}
                        </Typography>
                        {log.actorRole && (
                          <Chip
                            label={log.actorRole}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        System
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.action}
                      color={getActionColor(log.action)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {log.resource ? (
                      <Box>
                        <Typography variant="body2">{log.resource}</Typography>
                        {log.resourceId && (
                          <Typography variant="caption" color="text.secondary">
                            ID: {log.resourceId.slice(0, 8)}...
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.status}
                      color={getStatusColor(log.status)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {log.ipAddress || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {log.metadata ? (
                      <Typography
                        variant="caption"
                        component="pre"
                        sx={{
                          maxWidth: 200,
                          overflow: 'auto',
                          fontSize: '0.7rem',
                        }}
                      >
                        {JSON.stringify(log.metadata, null, 2)}
                      </Typography>
                    ) : log.errorMessage ? (
                      <Typography variant="caption" color="error">
                        {log.errorMessage}
                      </Typography>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {total > limit && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={Math.ceil(total / limit)}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Explanation */}
      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          📚 What Gets Logged
        </Typography>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🔐 Authentication Events
          </Typography>
          <ul>
            <li><strong>LOGIN_SUCCESS:</strong> User logged in successfully</li>
            <li><strong>LOGIN_FAILURE:</strong> Failed login attempt (wrong password)</li>
            <li><strong>LOGOUT:</strong> User logged out</li>
            <li><strong>PASSWORD_RESET:</strong> User reset their password</li>
          </ul>
          <Typography variant="body2" color="text.secondary">
            <strong>Why:</strong> Track unauthorized access attempts, detect brute force attacks
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            📦 Data Modification Events
          </Typography>
          <ul>
            <li><strong>CREATE_PRODUCT:</strong> Admin created new product</li>
            <li><strong>UPDATE_PRODUCT:</strong> Admin modified product</li>
            <li><strong>DELETE_PRODUCT:</strong> Admin deleted product</li>
            <li><strong>REFUND_ORDER:</strong> Admin refunded customer order</li>
            <li><strong>CREATE_COUPON:</strong> Admin created discount coupon</li>
          </ul>
          <Typography variant="body2" color="text.secondary">
            <strong>Why:</strong> Know who made changes, investigate data loss, recover deleted items
          </Typography>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🚨 Security Events
          </Typography>
          <ul>
            <li><strong>ACCESS_DENIED:</strong> User tried to access forbidden resource</li>
            <li><strong>RATE_LIMIT_EXCEEDED:</strong> Too many requests from IP</li>
            <li><strong>ISSUE_SIGNED_URL:</strong> Signed URL generated for file access</li>
          </ul>
          <Typography variant="body2" color="text.secondary">
            <strong>Why:</strong> Detect attacks, identify compromised accounts, monitor abuse
          </Typography>
        </Paper>
      </Box>

      {/* Loom Instructions */}
      <Alert severity="success" sx={{ mt: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          📹 For Loom Recording:
        </Typography>
        <ol style={{ marginLeft: 16, marginTop: 8 }}>
          <li>Show statistics cards: Total Logs, Failed Actions, Unique Users</li>
          <li>Show audit log table with various actions</li>
          <li>Filter by action: "CREATE_PRODUCT" → see only product creations</li>
          <li>Filter by resource: "order" → see only order-related actions</li>
          <li>Point out actor, timestamp, IP address columns</li>
          <li>Explain: "Every sensitive action is logged for security & compliance"</li>
          <li>Total time: ~2 minutes</li>
        </ol>
      </Alert>
    </Container>
  );
}
