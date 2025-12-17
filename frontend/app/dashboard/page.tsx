"use client";
import React, { useEffect, useState } from 'react';
import FraudTrend from '../../components/FraudTrend';

export default function Dashboard() {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');
    type FraudData = { date: string; fraudCount: number; refundRatio: number };
    const [data, setData] = useState<FraudData[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Simulate adding a new transaction for today
    const handleSimulateTransaction = () => {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10);
      const newEntry = {
        date: dateStr,
        fraudCount: 4 + Math.round(4 * Math.random()),
        refundRatio: 0.08 + 0.08 * Math.random(),
      };
      // Remove any existing entry for today
      const filtered = data.filter(d => d.date !== dateStr);
      setData([...filtered, newEntry]);
    };
  // Generate demo chart data for the last 14 days up to today
  const today = new Date();
  const demoData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    const dateStr = d.toISOString().slice(0, 10);
    // Generate some sample values with a pattern
    return {
      date: dateStr,
      fraudCount: 4 + Math.round(4 * Math.sin(i / 2)),
      refundRatio: 0.08 + 0.08 * Math.abs(Math.cos(i / 3)),
    };
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadRealData() {
      setLoading(true);
      try {
        const res = await fetch('/api/fraud/trend');
        if (!res.ok) throw new Error('Failed to fetch fraud trend');
        const json = await res.json();
        if (mounted) {
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        console.error('Error loading fraud trend:', err);
        if (mounted) {
          setError(err?.message || 'Unknown error');
          // Fallback to demo data on error
          setData(demoData);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRealData();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter data by time range
  const filteredData = (data.length ? data : demoData as any).filter((d: any, idx: number, arr: any[]) => {
    if (timeRange === 'all') return true;
    if (timeRange === '7d') return idx >= arr.length - 7;
    if (timeRange === '30d') return idx >= arr.length - 30;
    return true;
  });

  return (
    <div className="main">
      <div className="dashboard">
        <header className="dashboard-header">
          <h1>Analytics Dashboard</h1>
          <p className="subtitle">Overview of system metrics, fraud trends and traces</p>
        </header>

        {error && (
          <div style={{ background: '#ffeded', color: '#b71c1c', padding: '12px 18px', borderRadius: 8, marginBottom: 18, fontWeight: 500 }}>
            Error: {error}
          </div>
        )}

        <button
          onClick={handleSimulateTransaction}
          style={{ marginBottom: 18, padding: '10px 22px', borderRadius: 8, background: '#7c3aed', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 16 }}
        >
          Simulate Transaction
        </button>

        <section className="cards">
          <div className="card">
            <h3>Total Transactions</h3>
            <div className="metric">12,345</div>
            <div className="meta">Last 24 hours</div>
          </div>

          <div className="card">
            <h3>Fraud Events</h3>
            <div className="metric">21</div>
            <div className="meta">↑ 8% from yesterday</div>
          </div>

          <div className="card">
            <h3>Avg. Refund Ratio</h3>
            <div className="metric">9.2%</div>
            <div className="meta">Past week</div>
          </div>
        </section>

        <section className="chart-section">
          <h2>Fraud Trend & Refund Ratio</h2>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="timeRange" style={{ fontWeight: 500, marginRight: 12 }}>Time Range:</label>
            <select
              id="timeRange"
              value={timeRange}
              onChange={e => setTimeRange(e.target.value as '7d' | '30d' | 'all')}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #7c3aed', background: '#23234a', color: '#e6eef8', fontWeight: 500 }}
            >
              <option value="all">All</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
          <div className="chart-card">
            {loading ? <div>Loading…</div> : <FraudTrend data={filteredData} />}
          </div>
        </section>
      </div>
    </div>
  );
}
