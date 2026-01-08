"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../dashboard.module.css";

interface Span {
  spanID: string;
  operation: string;
  service: string;
  status: number;
  startOffsetMs: number;
  durationMs: number;
  attributes?: any;
}

interface Trace {
  traceID: string;
  serviceName: string;
  path: string;
  method: string;
  status: number;
  duration: number;
  ts: string;
  spans: Span[];
}

export default function TraceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [trace, setTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");
    
    if (!token) {
      router.push("/login");
      return;
    }
    
    if (userData && userData !== "undefined" && userData !== "null") {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("Failed to parse user data:", e);
        localStorage.removeItem("user");
      }
    }
  }, [router]);

  useEffect(() => {
    async function fetchTraceDetails() {
      try {
        const res = await fetch(`/api/traces/${params.id}`);
        if (!res.ok) throw new Error("Failed to fetch trace details");
        const data = await res.json();
        setTrace(data.trace);
      } catch (err: any) {
        setError(err.message || "Error loading trace details");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchTraceDetails();
    }
  }, [params.id]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return { bg: "rgba(34, 197, 94, 0.2)", color: "#22c55e" };
    if (status >= 400) return { bg: "rgba(239, 68, 68, 0.2)", color: "#ef4444" };
    return { bg: "rgba(251, 191, 36, 0.2)", color: "#fbbf24" };
  };

  // Calculate waterfall visualization data
  const getWaterfallData = () => {
    if (!trace || !trace.spans || trace.spans.length === 0) return { spans: [], totalDuration: 0 };
    
    const minStart = Math.min(...trace.spans.map(s => s.startOffsetMs || 0));
    const maxEnd = Math.max(...trace.spans.map(s => (s.startOffsetMs || 0) + (s.durationMs || 0)));
    const totalDuration = maxEnd - minStart || trace.duration / 1000;

    return {
      spans: trace.spans.map(span => {
        const start = (span.startOffsetMs || 0) - minStart;
        const duration = span.durationMs || 0;
        const leftPercent = totalDuration > 0 ? (start / totalDuration) * 100 : 0;
        const widthPercent = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
        
        return {
          ...span,
          leftPercent,
          widthPercent,
        };
      }),
      totalDuration,
    };
  };

  if (!user) return null;

  return (
    <div className={styles.dashboard}>
      <nav className={styles.navbar}>
        <div className={styles.navBrand}>Multi-Gateway Platform</div>
        <div className={styles.navLinks}>
          <a href="/dashboard" className={styles.navLink}>Dashboard</a>
          <a href="/dashboard/traces" className={styles.navLink}>Traces</a>
          <a href="/dashboard/downloads" className={styles.navLink}>Downloads</a>
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

      <div style={{ padding: "24px", color: "#e6eef8" }}>
        <div style={{ marginBottom: "24px" }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: "8px 16px",
              background: "rgba(148, 163, 184, 0.15)",
              color: "#cbd5e1",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ← Back to Traces
          </button>
        </div>

        <h1>🔍 Trace Details</h1>
        <p style={{ color: "#cbd5e1", marginBottom: "20px" }}>
          Detailed view of spans and timing information
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            Loading trace details...
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#ef4444" }}>
            Error: {error}
          </div>
        ) : !trace ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            Trace not found
          </div>
        ) : (
          <>
            {/* Trace Overview */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(148, 163, 184, 0.15)",
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "24px",
              }}
            >
              <h2 style={{ marginBottom: "16px", color: "#e6eef8" }}>Overview</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>Request ID</div>
                  <div style={{ color: "#e6eef8", fontFamily: "monospace", fontSize: "14px" }}>{trace.traceID}</div>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>Service</div>
                  <div style={{ color: "#e6eef8", fontSize: "14px" }}>{trace.serviceName}</div>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>Method</div>
                  <div style={{ color: "#a78bfa", fontSize: "14px", fontWeight: "600" }}>{trace.method}</div>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>Path</div>
                  <div style={{ color: "#e6eef8", fontSize: "14px" }}>{trace.path}</div>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>Status</div>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: getStatusColor(trace.status).bg,
                      color: getStatusColor(trace.status).color,
                    }}
                  >
                    {trace.status}
                  </span>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>Total Duration</div>
                  <div style={{ color: "#e6eef8", fontSize: "14px", fontWeight: "600" }}>
                    {(trace.duration / 1000).toFixed(2)} ms
                  </div>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>Timestamp</div>
                  <div style={{ color: "#e6eef8", fontSize: "14px" }}>
                    {new Date(trace.ts).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>Spans Count</div>
                  <div style={{ color: "#e6eef8", fontSize: "14px", fontWeight: "600" }}>
                    {trace.spans?.length || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Waterfall Chart */}
            {trace.spans && trace.spans.length > 0 && (
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                  borderRadius: "12px",
                  padding: "24px",
                  marginBottom: "24px",
                }}
              >
                <h2 style={{ marginBottom: "16px", color: "#e6eef8" }}>Waterfall View</h2>
                <div style={{ overflowX: "auto" }}>
                  {(() => {
                    const { spans, totalDuration } = getWaterfallData();
                    return (
                      <div style={{ minWidth: "600px" }}>
                        {/* Timeline header */}
                        <div style={{ display: "flex", marginBottom: "12px", paddingLeft: "250px" }}>
                          <div style={{ flex: 1, borderBottom: "1px solid rgba(148, 163, 184, 0.3)", position: "relative" }}>
                            {[0, 25, 50, 75, 100].map(percent => (
                              <div
                                key={percent}
                                style={{
                                  position: "absolute",
                                  left: `${percent}%`,
                                  top: "-20px",
                                  fontSize: "11px",
                                  color: "#94a3b8",
                                }}
                              >
                                {((totalDuration * percent) / 100).toFixed(1)}ms
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Spans */}
                        {spans.map((span: any, idx: number) => (
                          <div
                            key={span.spanID}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: "8px",
                              minHeight: "40px",
                            }}
                          >
                            {/* Span info */}
                            <div
                              style={{
                                width: "250px",
                                paddingRight: "12px",
                                fontSize: "13px",
                              }}
                            >
                              <div style={{ color: "#e6eef8", fontWeight: "500", marginBottom: "2px" }}>
                                {span.service}
                              </div>
                              <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                                {span.operation.substring(0, 30)}{span.operation.length > 30 ? '...' : ''}
                              </div>
                            </div>
                            
                            {/* Bar */}
                            <div style={{ flex: 1, position: "relative", height: "24px" }}>
                              <div
                                style={{
                                  position: "absolute",
                                  left: `${span.leftPercent}%`,
                                  width: `${Math.max(span.widthPercent, 2)}%`,
                                  height: "100%",
                                  background: getStatusColor(span.status).bg,
                                  border: `1px solid ${getStatusColor(span.status).color}`,
                                  borderRadius: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  paddingLeft: "4px",
                                  fontSize: "11px",
                                  color: getStatusColor(span.status).color,
                                  fontWeight: "600",
                                }}
                                title={`${span.operation} - ${span.durationMs.toFixed(2)}ms`}
                              >
                                {span.widthPercent > 10 && `${span.durationMs.toFixed(1)}ms`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Spans Table */}
            {trace.spans && trace.spans.length > 0 && (
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                  borderRadius: "12px",
                  padding: "24px",
                }}
              >
                <h2 style={{ marginBottom: "16px", color: "#e6eef8" }}>Spans Details</h2>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.2)" }}>
                        <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                          Span ID
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                          Service
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                          Operation
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                          Status
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                          Start Offset (ms)
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                          Duration (ms)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {trace.spans.map((span, idx) => (
                        <tr
                          key={span.spanID}
                          style={{
                            borderTop: idx > 0 ? "1px solid rgba(148, 163, 184, 0.1)" : "none",
                          }}
                        >
                          <td style={{ padding: "12px", color: "#94a3b8", fontFamily: "monospace", fontSize: "12px" }}>
                            {span.spanID.substring(0, 8)}...
                          </td>
                          <td style={{ padding: "12px", color: "#e6eef8" }}>{span.service}</td>
                          <td style={{ padding: "12px", color: "#a78bfa", fontSize: "13px" }}>{span.operation}</td>
                          <td style={{ padding: "12px" }}>
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontWeight: "600",
                                background: getStatusColor(span.status).bg,
                                color: getStatusColor(span.status).color,
                              }}
                            >
                              {span.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px", color: "#e6eef8" }}>
                            {span.startOffsetMs.toFixed(2)}
                          </td>
                          <td style={{ padding: "12px", color: "#e6eef8", fontWeight: "600" }}>
                            {span.durationMs.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
