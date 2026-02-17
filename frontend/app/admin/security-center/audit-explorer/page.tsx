"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../security-center.module.css';

interface AuditLog {
  _id: string;
  action: string;
  status: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function AuditExplorer() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    target: '',
    status: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  });

  // Fetch available actions
  useEffect(() => {
    fetchActions();
  }, []);

  // Fetch logs when filters change
  useEffect(() => {
    fetchLogs();
  }, [filters.page]);

  const fetchActions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:5000/api/audit-logs/actions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setActions(data.actions || []);
      }
    } catch (err) {
      console.error('Failed to fetch actions:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      
      // Build query string
      const params = new URLSearchParams();
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());
      if (filters.action) params.append('action', filters.action);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.target) params.append('target', filters.target);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await fetch(`http://localhost:5000/api/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      action: '',
      userId: '',
      target: '',
      status: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20
    });
  };

  const handleExportCSV = async () => {
    try {
      setSuccess(null);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      
      // Build query string with current filters
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.target) params.append('target', filters.target);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await fetch(`http://localhost:5000/api/audit-logs/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to export logs');
      }

      // Download the CSV file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('CSV exported successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to export CSV');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📋 Audit Explorer</h1>
        <p>Search and filter audit logs</p>
        <button 
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={() => router.push('/admin/security-center')}
          style={{ marginTop: '1rem' }}
        >
          ← Back to Security Center
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.filters}>
        <h3 style={{ marginBottom: '1rem' }}>Filters</h3>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label>Action Type</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">All Actions</option>
              {actions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>User ID (Actor)</label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              placeholder="Enter user ID"
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Target</label>
            <input
              type="text"
              value={filters.target}
              onChange={(e) => handleFilterChange('target', e.target.value)}
              placeholder="Enter target"
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label>Start Date</label>
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>End Date</label>
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filterActions}>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleSearch}
          >
            🔍 Search
          </button>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={handleExportCSV}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      <div className={styles.table}>
        {loading ? (
          <div className={styles.loading}>Loading audit logs...</div>
        ) : (
          <>
            <div className={styles.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Status</th>
                    <th>User ID</th>
                    <th>IP Address</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log._id}>
                        <td>{formatDate(log.createdAt)}</td>
                        <td>{log.action}</td>
                        <td>
                          <span className={`${styles.badge} ${
                            log.status === 'success' ? styles.badgeSuccess :
                            log.status === 'failure' ? styles.badgeError :
                            styles.badgeWarning
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td>{log.userId || '-'}</td>
                        <td>{log.ip || '-'}</td>
                        <td style={{ fontSize: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className={styles.pagination}>
                <div className={styles.paginationInfo}>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
                </div>
                <div className={styles.paginationButtons}>
                  <button
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    disabled={!pagination.hasPreviousPage}
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0.5rem 1rem' }}>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    disabled={!pagination.hasNextPage}
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
