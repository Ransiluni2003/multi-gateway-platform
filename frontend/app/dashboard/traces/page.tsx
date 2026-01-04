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
  duration: number; // in microseconds
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
        
        // Filter by request ID on client side (if backend doesn't support it)
        if (searchRequestId) {
          filteredTraces = filteredTraces.filter((t) =>
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
    alert(`Viewing spans for trace: ${trace.traceID}\n\nService: ${trace.serviceName}\nPath: ${trace.path}\nMethod: ${trace.method}\nStatus: ${trace.status}\nDuration: ${(trace.duration / 1000).toFixed(2)}ms`);
    // In a real system, this would open a detailed span viewer
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
      <h1>📊 Service Trace Viewer</h1>
      <p style={{ color: "#cbd5e1", marginBottom: "24px" }}>
        View and filter the last 10 API request traces with detailed span information.
      </p>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "14px", marginBottom: "6px", color: "#cbd5e1" }}>
            Filter by Service
          </label>
          <input
            type="text"
            placeholder="e.g., api, payments"
            value={searchService}
            onChange={(e) => setSearchService(e.target.value)}
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "8px",
              color: "#e6eef8",
              padding: "10px",
              fontSize: "14px",
              width: "200px",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "14px", marginBottom: "6px", color: "#cbd5e1" }}>
            Filter by Request ID
          </label>
          <input
            type="text"
            placeholder="e.g., g2m6rv9kddo"
            value={searchRequestId}
            onChange={(e) => setSearchRequestId(e.target.value)}
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "8px",
              color: "#e6eef8",
              padding: "10px",
              fontSize: "14px",
              width: "200px",
            }}
          />
        </div>
      </div>

      {error && (
        <div className={styles.error} style={{ marginBottom: "20px" }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          Loading traces...
        </div>
      ) : traces.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          No traces found. Try adjusting your filters.
        </div>
      ) : (
        <div
          style={{
            background: "rgba(15, 23, 42, 0.5)",
            border: "1px solid rgba(148, 163, 184, 0.15)",
            borderRadius: "12px",
            padding: "16px",
            overflowX: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.2)" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Request ID</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Service</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Method</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Path</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Duration (ms)</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Timestamp</th>
                <th style={{ padding: "12px", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((trace) => (
                <tr
                  key={trace.traceID}
                  style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}
                >
                  <td style={{ padding: "12px" }}>
                    <code style={{ color: "#a78bfa", fontSize: "12px" }}>
                      {trace.traceID.slice(0, 12)}
                    </code>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        background: "rgba(167, 139, 250, 0.15)",
                        color: "#a78bfa",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {trace.serviceName}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        background:
                          trace.method === "GET"
                            ? "rgba(59, 130, 246, 0.2)"
                            : trace.method === "POST"
                            ? "rgba(34, 197, 94, 0.2)"
                            : "rgba(249, 115, 22, 0.2)",
                        color:
                          trace.method === "GET"
                            ? "#3b82f6"
                            : trace.method === "POST"
                            ? "#22c55e"
                            : "#f97316",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {trace.method}
                    </span>
                  </td>
                  <td style={{ padding: "12px", fontSize: "12px" }}>{trace.path}</td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        color: trace.status === 200 ? "#22c55e" : trace.status >= 300 && trace.status < 400 ? "#f97316" : "#ef4444",
                        fontWeight: "600",
                      }}
                    >
                      {trace.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {(trace.duration / 1000).toFixed(2)}
                  </td>
                  <td style={{ padding: "12px", fontSize: "12px", color: "#94a3b8" }}>
                    {new Date(trace.ts).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <button
                      onClick={() => handleViewSpans(trace)}
                      style={{
                        background: "rgba(59, 130, 246, 0.15)",
                        color: "#3b82f6",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "12px",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(59, 130, 246, 0.25)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
                      }}
                    >
                      View Spans →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
