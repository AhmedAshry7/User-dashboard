"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import hide from "../../assets/hide.png";
import show from "../../assets/show.png";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: any) => {
    e.preventDefault();

    const res = await fetch("http://localhost:5000/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      setError("Invalid Username or password");
      setPassword("");
      setUsername("");
      return;
    }

    const data = await res.json();

    /* store token automatically */
    localStorage.setItem("token", data.token);

    router.push("/");
  };

  return (<div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f6ff",
      }}>
      <form
        onSubmit={handleLogin}
        style={{
          background: "white",
          padding: 30,
          borderRadius: 12,
          width: 500,
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        }}>
        <h2 style={{ textAlign: "center", color: "#1e40af" }}>Dashboard Login</h2>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 20, borderRadius: 8, border: "1px solid #cbd5e1" }}
        />

        <div style={{ position: "relative", marginTop: 15 }}>
          <input
            type={showPass ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
          />

          <span
            onClick={() => setShowPass(!showPass)}
            style={{
              position: "absolute",
              right: 10,
              top: 10,
              cursor: "pointer",
              color: "#2563eb",
              fontSize: 14,
            }}
          >
            {showPass ? <img src={show.src} alt="Hide" width="16" height="16" /> : <img src={hide.src} alt="Show" width="16" height="16" />}
          </span>
        </div>

        {error && (
          <div style={{ color: "red", marginTop: 10 }}>{error}</div>
        )}

        <button
          style={{
            width: "100%",
            marginTop: 20,
            padding: 10,
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </form>
      <style jsx>{`
      button:hover {
        filter: brightness(0.7);
        transition: filter 0.2s;
      }
    `}</style>
    </div>
    );
}
