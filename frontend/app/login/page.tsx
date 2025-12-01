"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  role: string;
  username: string;
  [key: string]: any;
}

export default function LoginPage() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  // SSR-safe localStorage helper
  const setLocalStorage = (key: string, value: any) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  };

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);

      // 1️⃣ Authenticate
      const authRes = await fetch(
        "https://docker-image-production-71e6.up.railway.app/wp-json/api/auth/me",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      if (!authRes.ok) throw new Error("Invalid username or password");

      const authData = await authRes.json();
      const token: string = authData.token;

      // 2️⃣ Fetch user info
      const userRes = await fetch(
        "https://docker-image-production-71e6.up.railway.app/wp-json/api/auth/me",
        {
          headers: { Authorization: "Bearer " + token },
        }
      );

      if (!userRes.ok) throw new Error("Failed to fetch user info");

      const user: User = await userRes.json();

      // 3️⃣ Save token + user data
      setLocalStorage("token", token);
      setLocalStorage("user", user);

      // Save in cookies for middleware access
      if (typeof document !== "undefined") {
        document.cookie = `token=${token}; path=/;`;
        document.cookie = `user=${JSON.stringify(user)}; path=/;`;
      }

      // 4️⃣ Redirect by role
      if (user.role === "administrator") router.push("/dashboard");
      else if (user.role === "seller") router.push("/dashboard/seller");
      else if (["subscriber", "customer"].includes(user.role))
        router.push("/dashboard/user");
      else alert("Unknown user role.");
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h2 className="text-2xl font-semibold mb-4">Login</h2>

      <input
        type="text"
        placeholder="Username"
        className="border rounded-md p-2 w-64 mb-3"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="border rounded-md p-2 w-64 mb-3"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={() => login(username, password)}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}
