"use client";
import '../App.css';
import React, { useEffect, useState } from 'react';
import FraudTrend from '../../components/FraudTrend';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/fraud/trend');
        if (!res.ok) throw new Error('Failed to fetch fraud trend');
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err) {
        console.error('Error loading fraud trend:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="App">
      <div className="main">
        <div className="dashboard">
          <header className="dashboard-header">
            <h1>Analytics Dashboard</h1>
            <p className="subtitle">Overview of system metrics, fraud trends and traces</p>
          </header>

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
            <div className="chart-card">
              {loading ? <div>Loading…</div> : <FraudTrend data={data} />}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
