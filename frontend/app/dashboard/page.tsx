"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FraudTrend from '../../components/FraudTrend';
import styles from './dashboard.module.css';

interface FraudData {
  date: string;
  fraudCount: number;
  refundRatio: number;
  [key: string]: any;
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<FraudData[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (userData && userData !== "undefined" && userData !== "null") {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("Failed to parse user data:", e);
        localStorage.removeItem('user');
      }
    }
  }, [router]);

  // Load fraud trend data
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch('/api/fraud/trend');
        if (!res.ok) throw new Error('Failed to fetch data');
        const json = await res.json();
        if (mounted) {
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Unknown error');
          setData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter data by time range
  const filteredData = data.filter((d: any, idx: number, arr: any[]) => {
    if (timeRange === 'all') return true;
    if (timeRange === '7d') return idx >= arr.length - 7;
    if (timeRange === '30d') return idx >= arr.length - 30;
    return true;
  });

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleSimulateTransaction = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const newEntry = {
      date: dateStr,
      fraudCount: 4 + Math.round(4 * Math.random()),
      refundRatio: 0.08 + 0.08 * Math.random(),
    };
    const filtered = data.filter((d: any) => d.date !== dateStr);
    setData([...filtered, newEntry]);
  };

  if (!user) {
    return null; // Loading auth state
  }

  return (
    <div className={styles.dashboard}>
      {/* Navigation Bar */}
      <nav className={styles.navbar}>
        <div className={styles.navBrand}>Multi-Gateway Platform</div>
        <div className={styles.navLinks}>
          <a href="/dashboard" className={styles.navLink}>Dashboard</a>
          <a href="/dashboard/payments" className={styles.navLink}>Payments</a>
          <a href="/dashboard/fraud" className={styles.navLink}>Fraud Logs</a>
          <a href="/dashboard/reports" className={styles.navLink}>Reports</a>
          {user.role === 'administrator' && (
            <a href="/dashboard/admin" className={styles.navLink}>Admin</a>
          )}
        </div>
        <div className={styles.navUser}>
          <span>{user.name}</span>
          <button onClick={handleLogout} className={styles.navLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>📊 Fraud Analytics Dashboard</h1>
          <p>Fraud Trendline & Refund Ratio Monitor</p>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.container}>
        {error && (
          <div className={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {/* Controls */}
        <div className={styles.controls}>
          <div>
            <label htmlFor="timeRange">Time Range:</label>
            <select
              id="timeRange"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | 'all')}
              className={styles.select}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <button onClick={handleSimulateTransaction} className={styles.simulateBtn}>
            ➕ Simulate Transaction
          </button>
        </div>

        {/* Chart Section */}
        <div className={styles.chartSection}>
          <h2>Fraud Trend & Refund Ratio</h2>
          <p className={styles.chartDescription}>
            🔴 Red line = Fraud incidents | 🔵 Blue line = Refund ratio
          </p>
          <div className={styles.chartContainer}>
            {loading ? (
              <div className={styles.loading}>Loading chart...</div>
            ) : (
              <FraudTrend data={filteredData} />
            )}
          </div>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.redDot}></span>
            <span><strong>Fraud Events:</strong> Number of fraudulent transactions detected per day</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.blueDot}></span>
            <span><strong>Refund Ratio:</strong> Percentage of transactions that were refunded</span>
          </div>
        </div>
      </div>
    </div>
  );
}
