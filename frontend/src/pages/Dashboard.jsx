import FraudTrend from '../../components/FraudTrend';

const dummyData = [
  { date: '2025-11-01', fraudCount: 3, refundRatio: 0.12 },
  { date: '2025-11-02', fraudCount: 5, refundRatio: 0.08 },
  { date: '2025-11-03', fraudCount: 2, refundRatio: 0.15 },
];

export default function Dashboard() {
  return (
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
          <FraudTrend data={dummyData} />
        </div>
      </section>
    </div>
  );
}
