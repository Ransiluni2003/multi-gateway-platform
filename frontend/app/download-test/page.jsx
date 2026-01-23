"use client";
import React, { useState } from "react";
import SupabaseDownloadButton from "../../components/SupabaseDownloadButton";
import NavBar from "../../components/NavBar";

export default function DownloadTestPage() {
  const [downloadLogs, setDownloadLogs] = useState([]);

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setDownloadLogs((prev) => [{ timestamp, message, type }, ...prev].slice(0, 20));
  };

  const testScenarios = [
    {
      title: "✅ Valid File (Normal Flow)",
      fileKey: "Form I-3A - week 13.pdf",
      expires: 300, // 5 minutes
      description: "Should download successfully on first attempt",
    },
    {
      title: "⏰ Short Expiry (5 seconds)",
      fileKey: "Form I-3A - week 13.pdf",
      expires: 5,
      description: "Wait 10s, then click → should auto-refresh expired URL",
    },
    {
      title: "❌ Non-Existent File (404)",
      fileKey: "nonexistent-file-12345.pdf",
      expires: 120,
      description: "Should show 'File not found' error gracefully",
    },
    // {
    //   title: "🔄 Auto-Retry Test",
    //   fileKey: "undefined.jpeg",
    //   expires: 120,
    //   description: "Should retry on transient failures",
    // },
  ];

  return (
    <div>
      <NavBar />
      <div style={{ padding: "20px", maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Supabase Signed-URL Expiry Handling Demo
          </h1>
          <p style={{ color: "#6b7280" }}>
            Test scenarios: Valid → Expired → Refresh → Graceful Fail
          </p>
        </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Test Scenarios */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Test Scenarios</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {testScenarios.map((scenario, idx) => (
              <div key={idx} style={styles.scenarioCard}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{scenario.title}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                  {scenario.description}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
                  File: <code>{scenario.fileKey}</code> | Expires: {scenario.expires}s
                </div>
                <SupabaseDownloadButton
                  fileKey={scenario.fileKey}
                  expires={scenario.expires}
                  onDownloadStart={() => addLog(`Started: ${scenario.title}`, "info")}
                  onDownloadSuccess={() => addLog(`Success: ${scenario.title}`, "success")}
                  onDownloadError={(err) => addLog(`Error: ${scenario.title} - ${err}`, "error")}
                >
                  Test Download
                </SupabaseDownloadButton>
              </div>
            ))}
          </div>
        </div>

        {/* Live Logs */}
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={styles.cardTitle}>Live Download Logs</h2>
            <button
              onClick={() => setDownloadLogs([])}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: "#ef4444",
                color: "#fff",
                border: "none",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Clear Logs
            </button>
          </div>
          <div
            style={{
              maxHeight: 500,
              overflowY: "auto",
              background: "#0f172a",
              borderRadius: 8,
              padding: 12,
            }}
          >
            {downloadLogs.length === 0 ? (
              <div style={{ color: "#6b7280", textAlign: "center", padding: 20 }}>
                No logs yet. Try a download scenario.
              </div>
            ) : (
              downloadLogs.map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    marginBottom: 6,
                    background:
                      log.type === "error"
                        ? "rgba(239, 68, 68, 0.1)"
                        : log.type === "success"
                        ? "rgba(16, 185, 129, 0.1)"
                        : "rgba(59, 130, 246, 0.1)",
                    border: `1px solid ${
                      log.type === "error"
                        ? "#ef4444"
                        : log.type === "success"
                        ? "#10b981"
                        : "#3b82f6"
                    }`,
                  }}
                >
                  <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>
                    {log.timestamp}
                  </div>
                  <div style={{ fontSize: 13, color: "#e2e8f0" }}>{log.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Flow Documentation */}
      <div style={{ ...styles.card, marginTop: 24 }}>
        <h2 style={styles.cardTitle}>Implementation Details</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              ✅ Expiry Detection
            </h3>
            <ul style={{ fontSize: 13, color: "#6b7280", paddingLeft: 20 }}>
              <li>Client caches URL + expiresAt timestamp</li>
              <li>Before each download, checks if URL is expired (with 5s buffer)</li>
              <li>Auto-refreshes when expired</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              🔄 Retry Logic
            </h3>
            <ul style={{ fontSize: 13, color: "#6b7280", paddingLeft: 20 }}>
              <li>Max 2 retries on transient failures</li>
              <li>1-second delay between retries</li>
              <li>Validates URL with HEAD request before opening</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              ❌ Error Handling
            </h3>
            <ul style={{ fontSize: 13, color: "#6b7280", paddingLeft: 20 }}>
              <li>401/403 → Treats as expired, auto-refreshes</li>
              <li>404 → Shows "File not found" (no retry)</li>
              <li>Other errors → Retries up to limit, then shows error</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              🔔 User Feedback
            </h3>
            <ul style={{ fontSize: 13, color: "#6b7280", paddingLeft: 20 }}>
              <li>Toast notifications for all states</li>
              <li>Inline error messages</li>
              <li>Retry counter on success</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 16,
  },
  scenarioCard: {
    padding: 14,
    borderRadius: 10,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
  },
};
