"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";

interface Trace {
  traceID: string;
  serviceName: string;
  path: string;
  method: string;
  status: number;
  duration: number;
  ts: string;
}

export default function TracesPage() {
  const router = useRouter();
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchService, setSearchService] = useState("");
  const [searchRequestId, setSearchRequestId] = useState("");
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
    async function fetchTraces() {
      try {
        let url = "/api/traces/recent?limit=10";
        if (searchService) url += `&service=${encodeURIComponent(searchService)}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch traces");
        const data = await res.json();
        let filteredTraces = data.traces || [];
        
        if (searchRequestId) {
          filteredTraces = filteredTraces.filter((t: Trace) =>
            t.traceID.toLowerCase().includes(searchRequestId.toLowerCase())
          );
        }
        
        setTraces(filteredTraces);
      } catch (err: any) {
        setError(err.message || "Error loading traces");
      } finally {
        setLoading(false);
      }
    }

    fetchTraces();
  }, [searchService, searchRequestId]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleViewSpans = (trace: Trace) => {
    router.push(`/dashboard/traces/${trace.traceID}`);
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
        <h1>🔍 Service Traces</h1>
        <p style={{ color: "#cbd5e1", marginBottom: "20px" }}>
          View the last 10 traces from your services. Filter by service name or request ID.
        </p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Filter by service name..."
            value={searchService}
            onChange={(e) => setSearchService(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              borderRadius: "8px",
              color: "#e6eef8",
              fontSize: "14px",
            }}
          />
          <input
            type="text"
            placeholder="Filter by request ID..."
            value={searchRequestId}
            onChange={(e) => setSearchRequestId(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              borderRadius: "8px",
              color: "#e6eef8",
              fontSize: "14px",
            }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            Loading traces...
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#ef4444" }}>
            Error: {error}
          </div>
        ) : traces.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            No traces found matching your filters.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(148, 163, 184, 0.15)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ background: "rgba(30, 41, 59, 0.8)" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                    Request ID
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                    Service
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                    Method
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                    Path
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                    Status
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                    Duration (ms)
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                    Timestamp
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#cbd5e1", fontWeight: "600" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {traces.map((trace, idx) => (
                  <tr
                    key={trace.traceID}
                    style={{
                      borderTop: idx > 0 ? "1px solid rgba(148, 163, 184, 0.1)" : "none",
                    }}
                  >
                    <td style={{ padding: "12px", color: "#94a3b8", fontFamily: "monospace", fontSize: "12px" }}>
                      {trace.traceID.substring(0, 8)}...
                    </td>
                    <td style={{ padding: "12px", color: "#e6eef8" }}>{trace.serviceName}</td>
                    <td style={{ padding: "12px", color: "#a78bfa", fontWeight: "600" }}>{trace.method}</td>
                    <td style={{ padding: "12px", color: "#94a3b8", fontSize: "13px" }}>{trace.path}</td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background:
                            trace.status >= 200 && trace.status < 300
                              ? "rgba(34, 197, 94, 0.2)"
                              : trace.status >= 400
                              ? "rgba(239, 68, 68, 0.2)"
                              : "rgba(251, 191, 36, 0.2)",
                          color:
                            trace.status >= 200 && trace.status < 300
                              ? "#22c55e"
                              : trace.status >= 400
                              ? "#ef4444"
                              : "#fbbf24",
                        }}
                      >
                        {trace.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: "#e6eef8" }}>
                      {(trace.duration / 1000).toFixed(2)}
                    </td>
                    <td style={{ padding: "12px", color: "#94a3b8", fontSize: "13px" }}>
                      {new Date(trace.ts).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button
                        onClick={() => handleViewSpans(trace)}
                        style={{
                          padding: "6px 12px",
                          background: "rgba(167, 139, 250, 0.15)",
                          color: "#a78bfa",
                          border: "1px solid rgba(167, 139, 250, 0.3)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        View Spans
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
