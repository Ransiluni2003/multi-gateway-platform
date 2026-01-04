"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

interface LoginResponse {
  _id: string;
  name: string;
  email: string;
  role: string;
  token: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistAuth = (payload: LoginResponse) => {
    const userPayload = {
      id: payload._id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };

    localStorage.setItem("authToken", payload.token);
    localStorage.setItem("user", JSON.stringify(userPayload));

    const cookieOptions = "path=/; max-age=604800; samesite=lax"; // 7 days
    document.cookie = `token=${payload.token}; ${cookieOptions}`;
    document.cookie = `user=${encodeURIComponent(JSON.stringify(userPayload))}; ${cookieOptions}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Login failed" }));
        throw new Error(body?.message || "Login failed");
      }

      const data: LoginResponse = await res.json();
      persistAuth(data);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.badge}>Secure access</div>
        <h2>Keep fraud and refunds in check.</h2>
        <p>Login to monitor fraud trends, refund ratios, and simulate traffic with one click.</p>
        <ul>
          <li>Real data sourced from MongoDB</li>
          <li>Dual-axis fraud and refund ratio chart</li>
          <li>Role-ready layout with quick logout</li>
        </ul>
      </div>

      <div className={styles.panel}>
        <div className={styles.brand}>Multi-Gateway</div>
        <h1>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to access the fraud analytics dashboard.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className={styles.label}>
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <div className={styles.error}>⚠️ {error}</div>}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className={styles.footer}>
          <span>Don't have an account?</span>
          <Link href="/register" className={styles.link}>Create one</Link>
        </div>
      </div>
    </div>
  );
}
