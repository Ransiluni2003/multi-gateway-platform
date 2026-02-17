"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../security-center.module.css';

interface RateLimitStats {
  period: string;
  totalBlocked: number;
  hourlyBlocks: Record<string, number>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  topIPs: Array<{ ip: string; count: number }>;
  limiterMode: string;
  timestamp: string;
}

interface RateLimitConfig {
  mode: string;
  redisUrl: string;
  upstashUrl: string;
  distributed: boolean;
  recommendation: string;
}

interface RecentBlock {
  timestamp: string;
  ip: string;
  endpoint: string;
  userAgent?: string;
  userId?: string;
}

export default function RateLimitMonitor() {
  const router = useRouter();
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [config, setConfig] = useState<RateLimitConfig | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<RecentBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchConfig();
    fetchRecentBlocks();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentBlocks();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:5000/api/rate-limit-monitor/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch stats');

      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch statistics');
    }
  };

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:5000/api/rate-limit-monitor/config', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch config');

      const data = await res.json();
      setConfig(data);
    } catch (err: any) {
      console.error('Failed to fetch config:', err);
    }
  };

  const fetchRecentBlocks = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:5000/api/rate-limit-monitor/recent?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch recent blocks');

      const data = await res.json();
      setRecentBlocks(data.blocks || []);
    } catch (err: any) {
      console.error('Failed to fetch recent blocks:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getModeColor = (mode: string) => {
    if (mode === 'upstash' || mode === 'redis') return '#4CAF50';
    return '#ff9800';
  };

  const getModeIcon = (mode: string) => {
    if (mode === 'upstash') return '☁️';
    if (mode === 'redis') return '🔴';
    return '💾';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🚦 Rate Limit Monitor</h1>
        <p>Monitor rate limiting activity and blocked requests</p>
        <button 
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={() => router.push('/admin/security-center')}
          style={{ marginTop: '1rem' }}
        >
          ← Back to Security Center
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Configuration */}
      {config && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Current Limiter Mode</h3>
            <div className={styles.statValue} style={{ color: getModeColor(config.mode) }}>
              {getModeIcon(config.mode)} {config.mode.toUpperCase()}
            </div>
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#666' }}>
              {config.distributed ? '✅ Distributed' : '⚠️ Single instance'}
            </p>
          </div>

          <div className={styles.statCard}>
            <h3>Redis Connection</h3>
            <div className={styles.statValue} style={{ fontSize: '1.2rem' }}>
              {config.redisUrl === 'configured' ? '✅ Connected' : '❌ Not configured'}
            </div>
          </div>

          <div className={styles.statCard}>
            <h3>Upstash Connection</h3>
            <div className={styles.statValue} style={{ fontSize: '1.2rem' }}>
              {config.upstashUrl === 'configured' ? '✅ Connected' : '❌ Not configured'}
            </div>
          </div>
        </div>
      )}

      {config && !config.distributed && (
        <div style={{ 
          background: '#fff3e0', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          border: '1px solid #ffb74d'
        }}>
          <strong>⚠️ Recommendation:</strong> {config.recommendation}
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>Total Blocked (24h)</h3>
              <div className={styles.statValue}>{stats.totalBlocked}</div>
              <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#666' }}>
                Last updated: {formatDate(stats.timestamp)}
              </p>
            </div>

            <div className={styles.statCard}>
              <h3>Top Blocked Endpoint</h3>
              <div className={styles.statValue} style={{ fontSize: '0.9rem' }}>
                {stats.topEndpoints[0]?.endpoint || 'N/A'}
              </div>
              <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#666' }}>
                {stats.topEndpoints[0]?.count || 0} blocks
              </p>
            </div>

            <div className={styles.statCard}>
              <h3>Top Blocked IP</h3>
              <div className={styles.statValue} style={{ fontSize: '0.9rem' }}>
                {stats.topIPs[0]?.ip || 'N/A'}
              </div>
              <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#666' }}>
                {stats.topIPs[0]?.count || 0} blocks
              </p>
            </div>
          </div>

          {/* Top Endpoints */}
          <div className={styles.table} style={{ marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: 0 }}>Top Rate-Limited Endpoints (24h)</h3>
            </div>
            <div className={styles.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Endpoint</th>
                    <th>Blocked Count</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topEndpoints.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                        No rate-limited endpoints in the last 24 hours
                      </td>
                    </tr>
                  ) : (
                    stats.topEndpoints.map((item, index) => (
                      <tr key={item.endpoint}>
                        <td>{index + 1}</td>
                        <td>{item.endpoint}</td>
                        <td><strong>{item.count}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top IPs */}
          <div className={styles.table} style={{ marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: 0 }}>Top Rate-Limited IP Addresses (24h)</h3>
            </div>
            <div className={styles.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>IP Address</th>
                    <th>Blocked Count</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topIPs.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                        No rate-limited IPs in the last 24 hours
                      </td>
                    </tr>
                  ) : (
                    stats.topIPs.map((item, index) => (
                      <tr key={item.ip}>
                        <td>{index + 1}</td>
                        <td>{item.ip}</td>
                        <td><strong>{item.count}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Recent Blocks */}
      <div className={styles.table}>
        <div style={{ padding: '1rem', background: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: 0 }}>Recent Rate Limit Violations</h3>
        </div>
        <div className={styles.tableContainer}>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>IP Address</th>
                <th>Endpoint</th>
                <th>User ID</th>
              </tr>
            </thead>
            <tbody>
              {recentBlocks.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                    No recent rate limit violations
                  </td>
                </tr>
              ) : (
                recentBlocks.slice(0, 20).map((block, index) => (
                  <tr key={index}>
                    <td>{formatDate(block.timestamp)}</td>
                    <td>{block.ip || '-'}</td>
                    <td>{block.endpoint || '-'}</td>
                    <td>{block.userId || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
