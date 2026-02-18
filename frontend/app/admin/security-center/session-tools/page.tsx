"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../security-center.module.css';

interface UserSession {
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

interface UserSessionData {
  email: string;
  activeSessions: UserSession[];
  recentLoginAttempts: Array<{
    timestamp: string;
    ipAddress: string;
    successful: boolean;
  }>;
}

export default function SessionTools() {
  const router = useRouter();
  const [searchEmail, setSearchEmail] = useState('');
  const [searchUserId, setSearchUserId] = useState('');
  const [sessionData, setSessionData] = useState<UserSessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  const handleSearchSessions = async () => {
    if (!searchUserId) {
      setError('Please enter a User ID');
      return;
    }

    setLoading(true);
    setError(null);
    setSessionData(null);

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`http://localhost:5000/api/admin/security/user-sessions/${searchUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('User not found');
        }
        throw new Error('Failed to fetch user sessions');
      }

      const data = await res.json();
      setSessionData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAllTokens = async () => {
    if (!searchUserId && !searchEmail) {
      setError('Please enter a User ID or Email');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      const body: any = {};
      if (searchUserId) body.userId = searchUserId;
      if (searchEmail) body.email = searchEmail;

      const res = await fetch('http://localhost:5000/api/admin/security/revoke-user-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error('Failed to revoke tokens');
      }

      const data = await res.json();
      setSuccess(data.message || 'All user tokens revoked successfully');
      setShowRevokeModal(false);
      
      // Refresh session data if we have it
      if (searchUserId) {
        handleSearchSessions();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupExpiredTokens = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:5000/api/admin/security/cleanup-expired-tokens', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to cleanup tokens');
      }

      const data = await res.json();
      setSuccess(`Cleanup completed: ${data.tokensRemoved} expired tokens removed`);
    } catch (err: any) {
      setError(err?.message || 'Failed to cleanup tokens');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🔑 Session & Token Tools</h1>
        <p>Manage user sessions and authentication tokens</p>
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

      {/* Search Users */}
      <div className={styles.filters}>
        <h3 style={{ marginBottom: '1rem' }}>Search User Sessions</h3>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label>User ID</label>
            <input
              type="text"
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              placeholder="Enter User ID"
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Email (for token operations)</label>
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Enter email"
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleSearchSessions}
            disabled={loading || !searchUserId}
          >
            🔍 View Sessions
          </button>
          <button
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={() => setShowRevokeModal(true)}
            disabled={loading || (!searchUserId && !searchEmail)}
          >
            🚫 Invalidate All Sessions
          </button>
        </div>
      </div>

      {/* System-Wide Actions */}
      <div className={styles.filters}>
        <h3 style={{ marginBottom: '1rem' }}>System-Wide Token Management</h3>
        <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
          Clean up expired tokens across all users to optimize database performance.
        </p>
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={handleCleanupExpiredTokens}
          disabled={loading}
        >
          🧹 Cleanup Expired Tokens
        </button>
      </div>

      {/* Session Data */}
      {loading && <div className={styles.loading}>Loading...</div>}

      {sessionData && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>User Email</h3>
              <div className={styles.statValue} style={{ fontSize: '1.2rem' }}>
                {sessionData.email}
              </div>
            </div>
            <div className={styles.statCard}>
              <h3>Active Sessions</h3>
              <div className={styles.statValue}>
                {sessionData.activeSessions.length}
              </div>
            </div>
            <div className={styles.statCard}>
              <h3>Recent Login Attempts</h3>
              <div className={styles.statValue}>
                {sessionData.recentLoginAttempts.length}
              </div>
            </div>
          </div>

          {/* Active Sessions Table */}
          <div className={styles.table} style={{ marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: 0 }}>Active Sessions</h3>
            </div>
            <div className={styles.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Expires</th>
                    <th>IP Address</th>
                    <th>User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionData.activeSessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                        No active sessions
                      </td>
                    </tr>
                  ) : (
                    sessionData.activeSessions.map((session, index) => (
                      <tr key={index}>
                        <td>{formatDate(session.createdAt)}</td>
                        <td>{formatDate(session.expiresAt)}</td>
                        <td>{session.ipAddress || '-'}</td>
                        <td style={{ fontSize: '0.75rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {session.userAgent || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Login Attempts Table */}
          <div className={styles.table}>
            <div style={{ padding: '1rem', background: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: 0 }}>Recent Login Attempts</h3>
            </div>
            <div className={styles.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>IP Address</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionData.recentLoginAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                        No recent login attempts
                      </td>
                    </tr>
                  ) : (
                    sessionData.recentLoginAttempts.map((attempt, index) => (
                      <tr key={index}>
                        <td>{formatDate(attempt.timestamp)}</td>
                        <td>{attempt.ipAddress || '-'}</td>
                        <td>
                          <span className={`${styles.badge} ${
                            attempt.successful ? styles.badgeSuccess : styles.badgeError
                          }`}>
                            {attempt.successful ? '✓ Success' : '✗ Failed'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Revoke Confirmation Modal */}
      {showRevokeModal && (
        <div className={styles.modal} onClick={() => setShowRevokeModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>⚠️ Confirm Token Revocation</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowRevokeModal(false)}
              >
                ×
              </button>
            </div>
            <p style={{ marginBottom: '1.5rem' }}>
              This will invalidate <strong>all active sessions</strong> for the user. 
              They will need to log in again.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => setShowRevokeModal(false)}
              >
                Cancel
              </button>
              <button
                className={`${styles.button} ${styles.buttonDanger}`}
                onClick={handleRevokeAllTokens}
              >
                Revoke All Tokens
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
