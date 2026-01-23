
import React, { useEffect, useMemo, useState } from "react";

const chipColor = (status) => {
  if (!status) return "#d0d5dd";
  if (Number(status) >= 500) return "#fda29b";
  if (Number(status) >= 400) return "#fec84b";
  return "#a6f4c5";
};

const serviceColor = (service) => {
  const palette = ["#5b8def", "#7c3aed", "#10b981", "#f59e0b", "#ec4899", "#14b8a6"];
  let hash = 0;
  for (let i = 0; i < service.length; i += 1) {
    hash = (hash << 5) - hash + service.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % palette.length;
  return palette[index];
};

const TraceViewer = () => {
  const [traces, setTraces] = useState([]);
  const [selectedTraceId, setSelectedTraceId] = useState("demo-trace-1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [service, setService] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");

  const fetchTraces = () => {
    setLoading(true);
    setError(null);
    let url = "/api/traces/recent?limit=10";
    if (service) url += `&service=${encodeURIComponent(service)}`;
    if (method) url += `&method=${encodeURIComponent(method)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const nextTraces = data.traces || [];
        console.log("[TraceViewer] Fetched traces:", nextTraces.length, nextTraces);
        setTraces(nextTraces);
        const existingSelected = nextTraces.find((t) => t.traceID === selectedTraceId);
        if (!existingSelected && nextTraces.length) {
          setSelectedTraceId(nextTraces[0].traceID);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[TraceViewer] Fetch error:", err);
        setError("Failed to load traces");
        setLoading(false);
      });
  };

  useEffect(() => {
    console.log("[TraceViewer] Component mounted, fetching traces...");
    fetchTraces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, method, status]);

  const selectedTrace = useMemo(
    () => traces.find((t) => t.traceID === selectedTraceId) || traces[0],
    [selectedTraceId, traces]
  );

  const serviceOptions = Array.from(new Set(traces.map((t) => t.serviceName).filter(Boolean))).sort();
  const methodOptions = Array.from(new Set(traces.map((t) => t.method).filter(Boolean))).sort();
  const statusOptions = Array.from(new Set(traces.map((t) => t.status).filter(Boolean))).sort();

  const renderWaterfall = (trace) => {
    if (!trace || !trace.spans || !trace.spans.length) {
      return <div style={styles.emptyState}>No spans available for this trace.</div>;
    }

    const spansSorted = [...trace.spans].sort(
      (a, b) => (a.startOffsetMs || 0) - (b.startOffsetMs || 0)
    );
    const totalMs = Math.max(
      ...spansSorted.map((s) => (s.startOffsetMs || 0) + (s.durationMs || 0)),
      1
    );

    return (
      <div style={styles.waterfall}>
        {spansSorted.map((span) => {
          const left = ((span.startOffsetMs || 0) / totalMs) * 100;
          const width = Math.max(((span.durationMs || 0) / totalMs) * 100, 1.5);
          return (
            <div key={span.spanID} style={styles.spanRow}>
              <div style={styles.spanMeta}>
                <div style={styles.spanTitle}>{span.operation}</div>
                <div style={{ ...styles.spanService, color: serviceColor(span.service || "") }}>
                  {span.service || "unknown"}
                </div>
              </div>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: serviceColor(span.service || ""),
                  }}
                />
              </div>
              <div style={styles.spanTiming}>{(span.durationMs || 0).toFixed(2)} ms</div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div style={styles.state}>Loading traces...</div>;
  if (error) return <div style={styles.state}>{error}</div>;

  const renderEmptyTable = () => (
    <div style={styles.emptyCard}>
      <div style={styles.emptyTitle}>No traces yet</div>
      <div style={styles.emptyCopy}>
        Check that Tempo is reachable on port 3100 or use the mock fallback we return from the API.
      </div>
    </div>
  );

  return (

    <div style={styles.shell}>
      <div style={{ marginBottom: 8 }}>
        <span style={{
          color: 'limegreen',
          fontWeight: 600,
          fontSize: 15,
          background: 'rgba(50,205,50,0.08)',
          borderRadius: 6,
          padding: '4px 12px',
          display: 'inline-block',
          marginBottom: 4
        }}>
          ✅ Showing live data from MongoDB (not mock data)
        </span>
      </div>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Service Trace Viewer</h2>
          <p style={styles.subtitle}>Filter by service, method, status and inspect span timing.</p>
        </div>
        <button
          style={styles.refresh}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.refreshHover)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.refresh)}
          onClick={fetchTraces}
        >
          Refresh
        </button>
      </div>

      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.label} htmlFor="service-select">Service</label>
          <select 
            id="service-select"
            style={styles.select} 
            value={service} 
            onChange={(e) => setService(e.target.value)}
          >
            <option value="">All</option>
            {serviceOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.label} htmlFor="method-select">Method</label>
          <select 
            id="method-select"
            style={styles.select} 
            value={method} 
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="">All</option>
            {methodOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.label} htmlFor="status-select">Status</label>
          <select 
            id="status-select"
            style={styles.select} 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.split}>
        <div style={styles.tableCard}>
          <div style={styles.tableHead}>
            <span>Recent Traces</span>
            <span style={styles.muted}>{traces.length} shown</span>
          </div>
          <div style={{ ...styles.tableWrap }}>
            {traces.length === 0 ? (
              renderEmptyTable()
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Trace</th>
                    <th style={styles.th}>Service</th>
                    <th style={styles.th}>Path</th>
                    <th style={styles.th}>Method</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Duration</th>
                    <th style={styles.th}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.map((t, idx) => {
                    const isSelected = selectedTrace?.traceID === t.traceID;
                    return (
                      <tr
                        key={t.traceID}
                        onClick={() => setSelectedTraceId(t.traceID)}
                        style={{
                          cursor: "pointer",
                          backgroundColor: isSelected
                            ? "rgba(56, 189, 248, 0.18)"
                            : idx % 2 === 0
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(255,255,255,0.01)",
                          transition: "background-color 120ms ease, transform 120ms ease",
                          transform: isSelected ? "scale(1.002)" : "none",
                        }}
                      >
                        <td style={{ ...styles.cellBase, ...styles.cellMonospace }}>{t.traceID.slice(0, 8)}</td>
                        <td style={styles.cellBase}>{t.serviceName}</td>
                        <td style={styles.cellBase}>{t.path || "-"}</td>
                        <td style={styles.cellBase}>{t.method || "-"}</td>
                        <td style={styles.cellBase}>
                          <span style={{ ...styles.chip, backgroundColor: chipColor(t.status) }}>
                            {t.status || "-"}
                          </span>
                        </td>
                        <td style={styles.cellBase}>{t.duration ? `${t.duration} us` : "-"}</td>
                        <td style={styles.cellBase} suppressHydrationWarning>{new Date(t.ts).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={styles.detailCard}>
          <div style={styles.tableHead}>
            <div>
              <div style={styles.detailTitle}>Trace Detail</div>
              {selectedTrace ? (
                <div style={styles.detailMeta}>
                  <span style={styles.cellMonospace}>{selectedTrace.traceID}</span>
                  <span>
                    {selectedTrace.serviceName} - {selectedTrace.method || ""} {selectedTrace.path || ""}
                  </span>
                </div>
              ) : (
                <div style={styles.muted}>Select a trace to inspect spans.</div>
              )}
            </div>
            {selectedTrace?.status && (
              <span style={{ ...styles.chip, backgroundColor: chipColor(selectedTrace.status) }}>
                {selectedTrace.status}
              </span>
            )}
          </div>

          {selectedTrace && (
            <div>
              <div style={styles.summaryRow}>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryLabel}>Duration</div>
                  <div style={styles.summaryValue}>{selectedTrace.duration || "-"} us</div>
                </div>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryLabel}>Started</div>
                  <div style={styles.summaryValue} suppressHydrationWarning>{new Date(selectedTrace.ts).toLocaleString()}</div>
                </div>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryLabel}>Spans</div>
                  <div style={styles.summaryValue}>{selectedTrace.spans?.length || 0}</div>
                </div>
              </div>

              <div style={styles.sectionTitle}>Span Waterfall</div>
              {renderWaterfall(selectedTrace)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  shell: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    maxWidth: 1200,
    margin: "0 auto",
    background: "linear-gradient(180deg, #0b1224 0%, #0e162d 60%, #0b1224 100%)",
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    margin: 0,
    fontSize: 22,
  },
  subtitle: {
    margin: "4px 0 0",
    color: "#cbd5e1",
  },
  refresh: {
    padding: "10px 16px",
    borderRadius: 10,
    background: "linear-gradient(120deg, #22c55e, #06b6d4)",
    color: "#0b1224",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 8px 20px rgba(6, 182, 212, 0.35)",
    transition: "transform 120ms ease, box-shadow 120ms ease",
  },
  refreshHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 10px 24px rgba(34, 197, 94, 0.35)",
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.02)",
    backdropFilter: "blur(4px)",
  },
  filterGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontWeight: 700, fontSize: 12, color: "#cbd5e1", letterSpacing: 0.4 },
  select: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(11, 18, 36, 0.8)",
    color: "#e2e8f0",
    outline: "none",
    transition: "border-color 120ms ease, box-shadow 120ms ease",
  },
  split: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1fr",
    gap: 16,
    alignItems: "start",
  },
  tableCard: {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    overflow: "hidden",
    background: "#0f172a",
    boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
  },
  detailCard: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 16,
    background: "rgba(255,255,255,0.03)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
  },
  tableHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    fontWeight: 700,
    color: "#e2e8f0",
    background: "#0b1224",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#e2e8f0",
    fontSize: 14,
    background: "#0f172a",
  },
  tableWrap: {
    overflowX: "auto",
    background: "#0f172a",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    color: "#e2e8f0",
    fontWeight: 700,
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    background: "#0b1224",
  },
  cellBase: {
    padding: "10px 12px",
    color: "#e2e8f0",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    whiteSpace: "nowrap",
  },
  chip: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    color: "#0b1224",
    fontWeight: 700,
  },
  cellMonospace: { fontFamily: "SFMono-Regular, ui-monospace, monospace" },
  muted: { color: "#6b7280", fontSize: 12 },
  detailTitle: { fontWeight: 700 },
  detailMeta: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", color: "#e2e8f0" },
  summaryRow: { display: "flex", gap: 16, margin: "12px 0" },
  summaryItem: { flex: 1, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" },
  summaryLabel: { color: "#cbd5e1", fontSize: 12 },
  summaryValue: { fontWeight: 700, marginTop: 4, color: "#e2e8f0" },
  sectionTitle: { margin: "12px 0 8px", fontWeight: 700 },
  waterfall: { display: "flex", flexDirection: "column", gap: 12 },
  spanRow: { display: "grid", gridTemplateColumns: "260px 1fr 80px", alignItems: "center", gap: 12 },
  spanMeta: { display: "flex", flexDirection: "column", gap: 4 },
  spanTitle: { fontWeight: 600 },
  spanService: { fontSize: 12, fontWeight: 600 },
  barTrack: {
    position: "relative",
    height: 18,
    borderRadius: 12,
    background: "linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.12) 100%)",
    overflow: "hidden",
  },
  barFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
  },
  spanTiming: { fontVariantNumeric: "tabular-nums", color: "#e2e8f0" },
  emptyState: { padding: 12, color: "#cbd5e1" },
  state: { padding: 12, color: "#e2e8f0" },
  emptyCard: {
    padding: 18,
    color: "#e2e8f0",
    textAlign: "center",
    background: "rgba(255,255,255,0.02)",
    borderTop: "1px dashed rgba(255,255,255,0.12)",
  },
  emptyTitle: { fontWeight: 700, marginBottom: 6 },
  emptyCopy: { color: "#cbd5e1", fontSize: 13 },
};

export default TraceViewer;
