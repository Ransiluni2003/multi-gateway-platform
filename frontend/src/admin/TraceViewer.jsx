// frontend/src/admin/TraceViewer.jsx
import React, { useEffect, useState } from 'react';
import TraceWaterfall from './TraceWaterfall';

export default function TraceViewer() {
  const [service, setService] = useState('');
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [spans, setSpans] = useState([]);
  const [spansLoading, setSpansLoading] = useState(false);

  const fetchTraces = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ service, limit: '10' });
      const res = await fetch(`/api/traces/recent?${params}`);
      const data = await res.json();
      setTraces(data.traces || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpans = async (traceId) => {
    setSpansLoading(true);
    setSpans([]);
    try {
      // Try to fetch spans for the selected trace
      const res = await fetch(`/api/traces/${traceId}/spans`);
      if (res.ok) {
        const data = await res.json();
        setSpans(data.spans || []);
      } else {
        setSpans([]);
      }
    } catch (err) {
      setSpans([]);
    } finally {
      setSpansLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, []);

  const handleTraceClick = (trace) => {
    setSelectedTrace(trace);
    fetchSpans(trace.traceID);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Service Trace Viewer</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={service}
          onChange={(e) => setService(e.target.value)}
          placeholder="Service name"
          className="border p-1 rounded"
        />
        <button onClick={fetchTraces} className="bg-blue-500 text-white px-3 rounded">
          Fetch
        </button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <table className="border-collapse border w-full text-left">
          <thead>
            <tr>
              <th className="border p-1">Trace ID</th>
              <th className="border p-1">Service</th>
              <th className="border p-1">Duration (μs)</th>
              <th className="border p-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {traces.map((t) => (
              <tr key={t.traceID} className={selectedTrace && selectedTrace.traceID === t.traceID ? 'bg-blue-100' : ''} style={{ cursor: 'pointer' }} onClick={() => handleTraceClick(t)}>
                <td className="border p-1">{t.traceID}</td>
                <td className="border p-1">{t.serviceName}</td>
                <td className="border p-1">{t.duration}</td>
                <td className="border p-1">{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-6">
        <h3 className="font-bold mb-2">Trace Detail</h3>
        {selectedTrace ? (
          spansLoading ? (
            <div>Loading spans…</div>
          ) : (
            <TraceWaterfall spans={spans} />
          )
        ) : (
          <div>Select a trace to inspect spans.</div>
        )}
      </div>
    </div>
  );
}
