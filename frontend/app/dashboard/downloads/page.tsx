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
  fileKey?: string;
}

interface Toast {
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export default function DownloadsPage() {
  const router = useRouter();
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [urlCache, setUrlCache] = useState<Record<string, { url: string; expiresAt: number }>>({});
  const [expiredFiles, setExpiredFiles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (!token) {
      router.push("/login");
      return;
    }

    if (userData && userData !== "undefined" && userData !== "null") {
      try {
        JSON.parse(userData);
      } catch (err) {
        console.error("Failed to parse user data:", err);
        localStorage.removeItem("user");
      }
    }
  }, [router]);

  useEffect(() => {
    const mockDownloads: Download[] = [
      {
        id: "1",
        name: "Fraud Analytics Report",
        type: "PDF",
        size: "2.4 MB",
        createdAt: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
        fileKey: "2025-09-19.pdf",
      },
      {
        id: "2",
        name: "Form I-3A - Week 13",
        type: "PDF",
        size: "1.8 MB",
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
        fileKey: "Form I-3A - week 13.pdf",
      },
    ];

    setDownloads(mockDownloads);
    setLoading(false);
  }, []);

  const showToast = (message: string, type: Toast["type"] = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDownload = async (download: Download) => {
    const fileKey = download.fileKey;
    if (!fileKey) {
      showToast("❌ File key missing. Contact support.", "error");
      return;
    }

    if (expiredFiles[fileKey]) {
      showToast("⏰ Download link expired! Please refresh the page to download again.", "error");
      return;
    }

    setDownloadingId(download.id);
    showToast("🔄 Preparing download...", "info");

    try {
      let downloadUrl: string | undefined;
      let expiresAt: number | undefined;

      if (urlCache[fileKey]) {
        const cached = urlCache[fileKey];
        const now = Date.now();
        const timeLeft = (cached.expiresAt - now) / 1000;

        if (timeLeft > 0) {
          downloadUrl = cached.url;
          expiresAt = cached.expiresAt;
        } else {
          showToast("🔄 Link expired, refreshing...", "warning");
          setUrlCache((prev) => {
            const next = { ...prev };
            delete next[fileKey];
            return next;
          });
        }
      }

      if (!downloadUrl) {
        const expirySeconds = 60;
        const res = await fetch(`/api/files/download-url?key=${encodeURIComponent(fileKey)}&expires=${expirySeconds}`);

        if (!res.ok) {
          showToast("❌ Failed to generate download link", "error");
          setDownloadingId(null);
          return;
        }

        const data = await res.json();
        downloadUrl = data.downloadUrl;
        expiresAt = data.expiresAt;

        const ensuredDownloadUrl = downloadUrl;
        const ensuredExpiresAt = expiresAt;

        if (!ensuredDownloadUrl || ensuredExpiresAt === undefined) {
          showToast("❌ Missing download URL", "error");
          setDownloadingId(null);
          return;
        }

        setUrlCache((prev) => ({
          ...prev,
          [fileKey]: { url: ensuredDownloadUrl, expiresAt: ensuredExpiresAt },
        }));

        const timeUntilExpiry = ensuredExpiresAt - Date.now();
        setTimeout(() => {
          setExpiredFiles((prev) => ({ ...prev, [fileKey]: true }));
          setUrlCache((prev) => {
            const next = { ...prev };
            delete next[fileKey];
            return next;
          });
        }, timeUntilExpiry);
      }

      if (!downloadUrl) {
        showToast("❌ Missing download URL", "error");
        setDownloadingId(null);
        return;
      }

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        showToast("❌ Failed to fetch file for download", "error");
        setDownloadingId(null);
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      const fileName = download.name || "download";
      const fileExtension = download.fileKey?.split(".").pop() || "";
      const fullFileName = fileExtension && !fileName.includes(".") ? `${fileName}.${fileExtension}` : fileName;
      link.href = objectUrl;
      link.download = fullFileName;
      link.setAttribute("download", fullFileName);
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
        showToast(`✅ Download started! File: ${download.name}`, "success");
      }, 500);
    } catch (err) {
      console.error("[DOWNLOADS] Download error:", err);
      showToast("❌ Network error. Please try again.", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className={styles.dashboard}>
      <nav className={styles.navbar} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className={styles.navBrand}>Multi-Gateway Platform</div>
        <div className={styles.navLinks} style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <a href="/dashboard" className={styles.navLink}>Dashboard</a>
          <a href="/dashboard/traces" className={styles.navLink}>Traces</a>
          <a href="/dashboard/downloads" className={styles.navLink}>Downloads</a>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            router.push("/login");
          }}
          className={styles.navLogout}
        >
          Logout
        </button>
      </nav>

      <div style={{ padding: "32px", color: "#e2e8f0", background: "#0f172a", minHeight: "100vh" }}>
        {toast && (
          <div
            style={{
              position: "fixed",
              top: "120px",
              right: "20px",
              background:
                toast.type === "success"
                  ? "#22c55e"
                  : toast.type === "error"
                  ? "#ef4444"
                  : toast.type === "warning"
                  ? "#f97316"
                  : "#3b82f6",
              color: "#fff",
              padding: "16px 24px",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
              zIndex: 99999,
              fontSize: "14px",
              fontWeight: "600",
              minWidth: "250px",
            }}
          >
            {toast.message}
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", color: "#e2e8f0" }}>Downloads & Exports</h1>
          <p style={{ margin: "8px 0", color: "#94a3b8" }}>
            Export reports and data as PDF, CSV, or JSON. Links auto-refresh on expiry.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Loading downloads...</div>
        ) : downloads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>No downloads available.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            {downloads.map((download) => (
              <div
                key={download.id}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: "700", fontSize: "16px", color: "#e2e8f0" }}>
                      {download.name}
                    </span>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                      {download.type} • {download.size}
                    </span>
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

                <p style={{ margin: "0", color: "#64748b", fontSize: "12px" }}>Created: {download.createdAt}</p>

                <button
                  onClick={() => handleDownload(download)}
                  disabled={downloadingId === download.id}
                  style={{
                    background:
                      downloadingId === download.id
                        ? "rgba(167, 139, 250, 0.1)"
                        : expiredFiles[download.fileKey || ""]
                        ? "rgba(239, 68, 68, 0.15)"
                        : "rgba(167, 139, 250, 0.15)",
                    color:
                      downloadingId === download.id
                        ? "#94a3b8"
                        : expiredFiles[download.fileKey || ""]
                        ? "#ef4444"
                        : "#a78bfa",
                    border:
                      downloadingId === download.id
                        ? "1px solid rgba(148, 163, 184, 0.2)"
                        : expiredFiles[download.fileKey || ""]
                        ? "1px solid rgba(239, 68, 68, 0.3)"
                        : "1px solid rgba(167, 139, 250, 0.3)",
                    borderRadius: "8px",
                    padding: "10px",
                    cursor: downloadingId === download.id ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (downloadingId !== download.id && !expiredFiles[download.fileKey || ""]) {
                      e.currentTarget.style.background = "rgba(167, 139, 250, 0.25)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (downloadingId !== download.id && !expiredFiles[download.fileKey || ""]) {
                      e.currentTarget.style.background = "rgba(167, 139, 250, 0.15)";
                    }
                  }}
                >
                  {downloadingId === download.id
                    ? "⏳ Downloading..."
                    : expiredFiles[download.fileKey || ""]
                    ? "⏰ Expired"
                    : "⬇️ Download"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
