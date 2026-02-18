"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  role?: string;
  name?: string;
}

const cards = [
  { title: "Fraud Alerts", value: "12 open", desc: "Review and resolve suspicious events" },
  { title: "Refund Queue", value: "7 pending", desc: "Refunds awaiting approval" },
  { title: "Payouts", value: "$42.3k", desc: "Scheduled disbursements" },
  { title: "System Health", value: "Operational", desc: "All services reporting healthy" },
];

const quickLinks = [
  { label: "View Fraud Logs", href: "/dashboard/fraud" },
  { label: "Payments", href: "/dashboard/payments" },
  { label: "Payouts", href: "/dashboard/payouts" },
  { label: "System Health", href: "/dashboard/health" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const rawUser = localStorage.getItem("user");
    if (!token || !rawUser) {
      router.push("/login");
      return;
    }
    try {
      const parsed = JSON.parse(rawUser) as User;
      setUser(parsed);
      if (parsed.role !== "administrator") {
        router.push("/dashboard");
      }
    } catch (err) {
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, [router]);

  if (!user || user.role !== "administrator") {
    return null; // briefly render nothing while redirecting
  }

  return (
    <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin Control Center</h1>
          <p style={{ margin: "6px 0 0", color: "#444" }}>Welcome {user.name || "Admin"}. Manage fraud, refunds, payouts, and system health.</p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          style={{ padding: "10px 14px", border: "1px solid #d0d7de", background: "#fff", borderRadius: 6, cursor: "pointer" }}
        >
          Back to Dashboard
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {cards.map((c) => (
          <div key={c.title} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 14, color: "#6b7280" }}>{c.title}</div>
            <div style={{ fontSize: 22, fontWeight: 700, margin: "6px 0" }}>{c.value}</div>
            <div style={{ fontSize: 13, color: "#4b5563" }}>{c.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}>
        <h2 style={{ margin: "0 0 12px" }}>Quick Links</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
          {quickLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} style={{ textDecoration: "none", color: "#2563eb", fontWeight: 600 }}>{link.label}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
