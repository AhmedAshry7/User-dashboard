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
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
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
        setIsLoading(false);
        return;
      }

      const data = await res.json();

      /* store token automatically */
      localStorage.setItem("token", data.token);

      router.push("/");
    } catch (err) {
      setError("Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Decoration */}
      <div style={styles.bgDecoration1}></div>
      <div style={styles.bgDecoration2}></div>
      
      <div style={styles.loginCard}>
        {/* Logo/Icon Section */}
        <div style={styles.logoContainer}>
          <div style={styles.logoCircle}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
        </div>

        <h1 style={styles.title}>Welcome Back</h1>
        <p style={styles.subtitle}>Sign in to access your dashboard</p>

        <form onSubmit={handleLogin} style={styles.form}>
          {/* Username Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <div style={styles.inputWrapper}>
              <svg style={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <svg style={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                type={showPass ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={styles.togglePassword}
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                <img 
                  src={showPass ? show.src : hide.src} 
                  alt={showPass ? "Hide" : "Show"} 
                  width="20" 
                  height="20" 
                  style={{opacity: 0.6}}
                />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{minWidth: '18px'}}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            style={isLoading ? styles.buttonLoading : styles.button}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner-small"></div>
                Signing in...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: 8}}>
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10 17 15 12 10 7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Secure login • Protected by encryption
          </p>
        </div>
      </div>

      <style jsx>{`
        .spinner-small {
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #fff;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          animation: spin 0.8s linear infinite;
          margin-right: 10px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #2e7cb7 100%)",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  },
  bgDecoration1: {
    position: "absolute",
    width: "600px",
    height: "600px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "50%",
    top: "-300px",
    right: "-300px",
    animation: "float 6s ease-in-out infinite",
  },
  bgDecoration2: {
    position: "absolute",
    width: "400px",
    height: "400px",
    background: "rgba(255, 255, 255, 0.08)",
    borderRadius: "50%",
    bottom: "-200px",
    left: "-200px",
    animation: "float 8s ease-in-out infinite",
  },
  loginCard: {
    background: "#ffffff",
    padding: "48px 40px",
    borderRadius: "24px",
    width: "100%",
    maxWidth: "460px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 100px rgba(255, 255, 255, 0.1)",
    position: "relative",
    zIndex: 1,
    animation: "fadeInUp 0.6s ease-out",
  },
  logoContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "24px",
  },
  logoCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #667eea 0%, #26537d 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    boxShadow: "0 10px 25px rgba(102, 126, 234, 0.4)",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
    color: "#0f172a",
    textAlign: "center",
    margin: "0 0 8px 0",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "#64748b",
    textAlign: "center",
    margin: "0 0 32px 0",
    fontWeight: 400,
  },
  form: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: "24px",
  },
  label: {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#334155",
    marginBottom: "8px",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "16px",
    color: "#94a3b8",
    pointerEvents: "none",
    zIndex: 1,
  },
  input: {
    width: "100%",
    padding: "14px 16px 14px 48px",
    fontSize: "0.95rem",
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    outline: "none",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    backgroundColor: "#fff",
    color: "#0f172a",
  },
  togglePassword: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    transition: "all 0.2s ease",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    backgroundColor: "#fef2f2",
    border: "2px solid #fecaca",
    borderRadius: "12px",
    color: "#991b1b",
    fontSize: "0.875rem",
    fontWeight: 500,
    marginBottom: "20px",
    animation: "fadeInUp 0.3s ease-out",
  },
  button: {
    width: "100%",
    padding: "14px 24px",
    fontSize: "1rem",
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(135deg, #1c3295 0%, #261f63 100%)",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 14px rgba(102, 126, 234, 0.4)",
    fontFamily: "inherit",
    marginTop: "8px",
  },
  buttonLoading: {
    width: "100%",
    padding: "14px 24px",
    fontSize: "1rem",
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
    border: "none",
    borderRadius: "12px",
    cursor: "not-allowed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
    marginTop: "8px",
    opacity: 0.8,
  },
  footer: {
    marginTop: "32px",
    paddingTop: "24px",
    borderTop: "1px solid #f1f5f9",
    textAlign: "center",
  },
  footerText: {
    fontSize: "0.8rem",
    color: "#94a3b8",
    margin: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
};
