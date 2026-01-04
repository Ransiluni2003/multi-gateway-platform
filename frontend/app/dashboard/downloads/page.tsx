"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";

interface Download {
  id: string;
  name: string;
  type: string;
  size: string;
  createdAt: string;
  fileKey?: string; // Supabase file key for real downloads
  url?: string;
}

interface Toast {
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export default function DownloadsPage() {
  const router = useRouter();
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [urlCache, setUrlCache] = useState<{ [key: string]: { url: string; expiresAt: number } }>({});

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
    // Simulate available downloads
    const mockDownloads: Download[] = [
      {
        id: "1",
        name: "Fraud Report (14-Day)",
        type: "PDF",
        size: "2.4 MB",
        createdAt: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
        fileKey: "reports/fraud-report-14d.pdf",
      },
      {
        id: "2",
        name: "Refund Summary (30-Day)",
        type: "CSV",
        size: "1.1 MB",
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
        fileKey: "reports/refund-summary-30d.csv",
      },
      {
        id: "3",
        name: "Transaction Logs",
        type: "JSON",
        size: "5.8 MB",
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
        fileKey: "logs/transactions.json",
      },
    ];

    setDownloads(mockDownloads);
    setLoading(false);
  }, []);

  const showToast = (message: string, type: Toast["type"] = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const isUrlExpired = (expiresAt: number): boolean => {
    // Add 5-second buffer for network latency
    return Date.now() >= expiresAt - 5000;
  };

  const fetchDownloadUrl = async (fileKey: string): Promise<string | null> => {
    try {
      // Check cache first
      if (urlCache[fileKey] && !isUrlExpired(urlCache[fileKey].expiresAt)) {
        console.log("[DOWNLOADS] Using cached URL for:", fileKey);
        return urlCache[fileKey].url;
      }

      console.log("[DOWNLOADS] Fetching fresh signed URL for:", fileKey);
      const res = await fetch(
        `/api/files/download-url?key=${encodeURIComponent(fileKey)}&expires=300`
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        
        if (res.status === 404) {
          showToast("❌ File not found.", "error");
          return null;
        } else if (res.status === 401 || res.status === 403) {
          showToast("🔑 Download link expired or unauthorized.", "error");
          return null;
        } else if (res.status >= 500) {
          showToast("⚠️ Server error. Please try again later.", "error");
          return null;
        }
        
        showToast(`❌ ${data.error || "Failed to generate download link"}`, "error");
        return null;
      }

      const data = await res.json();
      const expiresAt = data.expiresAt || Date.now() + 300 * 1000;

      // Cache the URL
      setUrlCache((prev) => ({
        ...prev,
        [fileKey]: { url: data.downloadUrl, expiresAt },
      }));

      showToast("✅ Download link ready!", "success");
      return data.downloadUrl;
    } catch (err) {
      console.error("[DOWNLOADS] Error fetching URL:", err);
      showToast("❌ Network error. Please check your connection.", "error");
      return null;
    }
  };

  const handleDownload = async (download: Download) => {
    if (!download.fileKey) {
      showToast("❌ File key missing. Contact support.", "error");
      return;
    }

    setDownloadingId(download.id);
    try {
      // Attempt to get URL (will refresh if expired)
      const downloadUrl = await fetchDownloadUrl(download.fileKey);

      if (!downloadUrl) {
        showToast(`❌ Unable to download ${download.name}`, "error");
        return;
      }

      // Attempt download with retry logic
      let retryCount = 0;
      const MAX_RETRIES = 2;

      const attemptDownload = async (): Promise<boolean> => {
        try {
          console.log("[DOWNLOADS] Starting download attempt", retryCount + 1, "of", MAX_RETRIES + 1);
          
          const dlRes = await fetch(downloadUrl, { method: "GET" });

          if (!dlRes.ok) {
            if (dlRes.status === 401 || dlRes.status === 403) {
              // URL expired, refresh and retry
              if (retryCount < MAX_RETRIES) {
                console.warn("[DOWNLOADS] URL expired, refreshing and retrying...");
                showToast("🔄 Link expired, refreshing...", "warning");
                
                // Clear cache and fetch fresh URL
                setUrlCache((prev) => {
                  const next = { ...prev };
                  delete next[download.fileKey!];
                  return next;
                });

                retryCount++;
                const freshUrl = await fetchDownloadUrl(download.fileKey);
                if (freshUrl) {
                  return await attemptDownloadWithUrl(freshUrl);
                }
              }
              showToast("❌ Download link expired. Please try again.", "error");
              return false;
            } else if (dlRes.status === 404) {
              showToast("❌ File not found.", "error");
              return false;
            } else if (dlRes.status >= 500) {
              showToast("⚠️ Server error. Please try again.", "error");
              return false;
            }
          }

          // Create blob and trigger download
          const blob = await dlRes.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = download.name || "download";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);

          showToast(`✅ Downloaded ${download.name}!`, "success");
          return true;
        } catch (err) {
          console.error("[DOWNLOADS] Download error:", err);
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log("[DOWNLOADS] Retrying after error...");
            return await attemptDownload();
          }
          return false;
        }
      };

      const attemptDownloadWithUrl = async (url: string): Promise<boolean> => {
        try {
          const dlRes = await fetch(url, { method: "GET" });
          if (!dlRes.ok) {
            if (dlRes.status === 401 || dlRes.status === 403) {
              return false; // Let parent handle retry
            }
            return false;
          }
          const blob = await dlRes.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = download.name || "download";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          showToast(`✅ Downloaded ${download.name}!`, "success");
          return true;
        } catch (err) {
          return false;
        }
      };

      await attemptDownload();
    } catch (err) {
      console.error("[DOWNLOADS] Fatal error:", err);
      showToast("❌ Download failed. Please try again.", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  if (!user) {
    return null;
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
        <h1>📥 Downloads & Exports</h1>
        <p style={{ color: "#cbd5e1", marginBottom: "20px" }}>
          Export reports and data as PDF, CSV, or JSON. Links auto-refresh on expiry.
        </p>

        {/* Toast Notifications */}
        {toast && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              background:
                toast.type === "success"
                  ? "rgba(34, 197, 94, 0.9)"
                  : toast.type === "error"
                  ? "rgba(239, 68, 68, 0.9)"
                  : toast.type === "warning"
                  ? "rgba(249, 115, 22, 0.9)"
                  : "rgba(59, 130, 246, 0.9)",
              color: "#fff",
              padding: "16px 24px",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              zIndex: 9999,
              animation: "slideIn 0.3s ease-out",
            }}
          >
            {toast.message}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            Loading downloads...
          </div>
        ) : downloads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            No downloads available.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {downloads.map((download) => (
              <div
                key={download.id}
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600" }}>
                      {download.name}
                    </h3>
                    <p style={{ margin: "0", color: "#94a3b8", fontSize: "14px" }}>
                      {download.type} • {download.size}
                    </p>
                  </div>
                  <span
                    style={{
                      background:
                        download.type === "PDF"
                          ? "rgba(239, 68, 68, 0.2)"
                          : download.type === "CSV"
                          ? "rgba(34, 197, 94, 0.2)"
                          : "rgba(59, 130, 246, 0.2)",
                      color:
                        download.type === "PDF"
                          ? "#ef4444"
                          : download.type === "CSV"
                          ? "#22c55e"
                          : "#3b82f6",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    {download.type}
                  </span>
                </div>

                <p style={{ margin: "0", color: "#64748b", fontSize: "12px" }}>
                  Created: {download.createdAt}
                </p>

                <button
                  onClick={() => handleDownload(download)}
                  disabled={downloadingId === download.id}
                  style={{
                    background:
                      downloadingId === download.id
                        ? "rgba(167, 139, 250, 0.1)"
                        : "rgba(167, 139, 250, 0.15)",
                    color:
                      downloadingId === download.id
                        ? "#94a3b8"
                        : "#a78bfa",
                    border:
                      downloadingId === download.id
                        ? "1px solid rgba(148, 163, 184, 0.2)"
                        : "1px solid rgba(167, 139, 250, 0.3)",
                    borderRadius: "8px",
                    padding: "10px",
                    cursor: downloadingId === download.id ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (downloadingId !== download.id) {
                      e.currentTarget.style.background = "rgba(167, 139, 250, 0.25)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (downloadingId !== download.id) {
                      e.currentTarget.style.background = "rgba(167, 139, 250, 0.15)";
                    }
                  }}
                >
                  {downloadingId === download.id ? "⏳ Downloading..." : "⬇️ Download"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
