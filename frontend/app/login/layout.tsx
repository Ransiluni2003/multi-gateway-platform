"use client";

import { useEffect, useState } from "react";
import TraceViewer from "../../components/TraceViewer";
import Link from "next/link";
import { getUserFromLocalStorage } from "../utils/auth";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<string>("");

  // Only runs on client-side
  useEffect(() => {
    const user = getUserFromLocalStorage();
    if (user) setRole(user.role);
  }, []);

  const adminMenu = [
    { name: "Analytics", href: "/dashboard" },
    { name: "Payments", href: "/dashboard/payments" },
    { name: "Payouts", href: "/dashboard/payouts" },
    { name: "Fraud Logs", href: "/dashboard/fraud" },
    { name: "System Health", href: "/dashboard/health" },
  ];

  const sellerMenu = [
    { name: "Earnings", href: "/dashboard/seller/earnings" },
    { name: "Orders", href: "/dashboard/seller/orders" },
    { name: "Reports", href: "/dashboard/seller/reports" },
  ];

  const userMenu = [
    { name: "Orders", href: "/dashboard/user/orders" },
    { name: "Subscriptions", href: "/dashboard/user/subscriptions" },
    { name: "Billing History", href: "/dashboard/user/billing" },
  ];

  const menu =
    role === "administrator"
      ? adminMenu
      : role === "seller"
      ? sellerMenu
      : userMenu;

  return (
    <div className="flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white h-screen p-4">
        <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
        <ul>
          {menu.map((item) => (
            <li key={item.href} className="mb-2">
              <Link href={item.href}>{item.name}</Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <TraceViewer />
        {children}
      </main>
    </div>
  );
}
