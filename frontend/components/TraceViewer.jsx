import React, { useEffect, useState } from "react";

const TraceViewer = () => {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/traces/recent?limit=10")
      .then((res) => res.json())
      .then((data) => {
        setTraces(data.traces || []);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load traces");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading traces...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h2>Recent Service Traces</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Trace ID</th>
            <th>Service</th>
            <th>Path</th>
            <th>Method</th>
            <th>Status</th>
            <th>Duration (μs)</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {traces.map((t) => (
            <tr key={t.traceID}>
              <td>{t.traceID}</td>
              <td>{t.serviceName}</td>
              <td>{t.path}</td>
              <td>{t.method}</td>
              <td>{t.status}</td>
              <td>{t.duration}</td>
              <td>{new Date(t.ts).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TraceViewer;
