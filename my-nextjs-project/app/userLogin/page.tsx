"use client";
// This tells Next.js to never statically prerender this route
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import "bootstrap/dist/css/bootstrap.min.css";
import { useRouter } from "next/navigation";

/**
 * Updated LoginPage with two-factor support.
 * - Calls /api/twofactor/login-2fa/
 * - If response indicates need_2fa, shows modal to collect 6-digit code and retries.
 * - Stores token shapes in localStorage like your original code.
 *
 * Ensure NEXT_PUBLIC_API_BASE is set or defaults to http://127.0.0.1:8000
 */

export default function LoginPage() {
  useEffect(() => {
    // If you need Bootstrap JS (dropdowns, modals), uncomment:
    // import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

  // --- Login state
  const [username, setUsername] = useState(""); // kept for compatibility
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(""); // visible message to user
  const [showPassword, setShowPassword] = useState(false);

  // 2FA modal state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);

  // helper to read cookie (for CSRF/session auth)
  function getCookie(name: string) {
    if (typeof document === "undefined") return "";
    const match = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
    return match ? decodeURIComponent(match.pop() || "") : "";
  }

  // wrapper to attach Authorization header automatically (uses access or token)
  function authFetch(input: RequestInfo, init: RequestInit = {}) {
    const access = localStorage.getItem("access") || localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    } as Record<string, string>;
    return fetch(input, { ...init, headers });
  }

  // optional: refresh Simple JWT access token (returns true if refreshed)
  async function refreshAccessIfNeeded(): Promise<boolean> {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) return false;
    try {
      const res = await fetch(`${API_BASE}/api/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.access) {
        localStorage.setItem("access", data.access);
        return true;
      }
      return false;
    } catch (err) {
      console.error("refresh error", err);
      return false;
    }
  }

  // perform a login attempt against the twofactor login endpoint (server may require code)
  async function attemptLogin(payload: { email: string; password: string; code?: string | null }) {
    const res = await fetch(`${API_BASE}/api/twofactor/login-2fa/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get("content-type") || "";
    let data: any = null;
    if (contentType.includes("application/json")) {
      try {
        data = await res.json();
      } catch (err) {
        console.error("Failed to parse JSON response:", err);
      }
    } else {
      try {
        const raw = await res.text();
        console.warn("Non-JSON response body:", raw);
      } catch {}
    }
    return { ok: res.ok, status: res.status, data };
  }

  // Extract helpful error text from JSON shapes
  function extractErrorMessage(data: any) {
    if (!data) return null;
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    if (data.non_field_errors) return Array.isArray(data.non_field_errors) ? data.non_field_errors.join(" ") : String(data.non_field_errors);
    try {
      const entries = Object.entries(data);
      return entries.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`).join(" ");
    } catch {
      return null;
    }
  }

  // persist token shapes to localStorage (keeps your previous logic)
  function persistTokensFromResponse(data: any) {
    if (!data) return;
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    if (data.access) {
      localStorage.setItem("access", data.access);
    }
    if (data.refresh) {
      localStorage.setItem("refresh", data.refresh);
    }
    localStorage.setItem("isLoggedIn", "1");
  }

  // primary form submit: first call without code
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setMessage("");
    setLoading(true);

    try {
      const result = await attemptLogin({ email, password });

      if (result.ok) {
        // success — persist tokens and redirect
        persistTokensFromResponse(result.data);
        router.push("/dashboard");
        return;
      }

      // if server says 2FA is required, prompt for code
      if (result.data?.need_2fa) {
        setPendingCredentials({ email, password });
        setTwoFACode("");
        setShow2FAModal(true);
        setMessage("Two-Factor Authentication required — enter the 6-digit code from your authenticator.");
        setLoading(false);
        return;
      }

      // otherwise display error
      const errMsg = extractErrorMessage(result.data) || `Login failed (HTTP ${result.status})`;
      setMessage(`❌ ${errMsg}`);
    } catch (err) {
      console.error(err);
      setMessage("❌ Unable to reach server. Check API URL or network.");
    } finally {
      setLoading(false);
    }
  };

  // second step: submit code
  const handle2FASubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");

    if (!pendingCredentials) {
      setMessage("Missing pending credentials — please try logging in again.");
      setShow2FAModal(false);
      setLoading(false);
      return;
    }

    try {
      const result = await attemptLogin({ email: pendingCredentials.email, password: pendingCredentials.password, code: twoFACode.trim() });

      if (result.ok) {
        persistTokensFromResponse(result.data);
        setShow2FAModal(false);
        router.push("/dashboard");
        return;
      }

      const errMsg = extractErrorMessage(result.data) || `Invalid two-factor code (HTTP ${result.status})`;
      setMessage(`❌ ${errMsg}`);
    } catch (err) {
      console.error("2FA error", err);
      setMessage("❌ Unable to reach server. Check API URL or network.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-main">
      {/* Waves */}
      <svg
        className="header-wave-1"
        width="1601"
        height="179"
        viewBox="0 0 1601 179"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M232.103 122.45C141.213 90.3102 90.2161 91.1818 -0.683594 122.45V0.804688H1607.32V149.303C1562.32 176.64 1453.72 181.868 1385.72 176.64C1229.39 164.623 1117.01 136.095 1068.66 122.45C891.815 72.5319 815.995 57.9616 601.526 122.45C461.147 173.456 380.08 170.887 232.103 122.45Z"
          fill="url(#paint0_linear_29_5221)"
        />
        <defs>
          <linearGradient id="paint0_linear_29_5221" x1="-0.683594" y1="89.6266" x2="1607.32" y2="89.6266" gradientUnits="userSpaceOnUse">
            <stop offset="0.5" stopColor="#9C51C7" />
          </linearGradient>
        </defs>
      </svg>

      <svg
        className="header-wave-2"
        width="1601"
        height="235"
        viewBox="0 0 1601 235"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          opacity="0.95"
          d="M323.836 51.7684C240.584 209.143 171.31 251.483 -0.683594 228.654V-13.0898H1607.32V98.938V119.498L1310.87 210.966C1185.2 252.167 1062.36 134.82 985.713 119.498C909.062 104.177 703.355 266.037 573.922 119.498L323.836 51.7684Z"
          fill="url(#paint0_linear_29_5220)"
        />
        <defs>
          <linearGradient id="paint0_linear_29_5220" x1="-0.704553" y1="-13.0858" x2="1607.27" y2="-13.0858" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E79D5A" />
            <stop offset="1" stopColor="#F2D05F" />
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      <header className="landing-header position-relative z-3">
        <nav className="navbar navbar-expand-lg navbar-dark border-bottom">
          <div className="container">
            <a className="navbar-brand" href="#">
              <img className="footer-logo" src="/assets/images/tracker-logo-latest.png" alt="Logo" />
            </a>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
              <span className="navbar-toggler-icon"></span>
            </button>
          </div>
        </nav>
      </header>

      {/* Wave Section */}
      <section className="wave-section pt-lg-5 pb-lg-5 position-relative z-2 overflow-hidden">
        <div className="container py-5">
          <div className="row justify-content-center">
            {/* Left Section */}
            <div className="col-md-5 d-flex align-items-center justify-content-center left-pannel px-0 position-relative">
              <div className="text-center px-4">
                <Image src="/assets/images/login-graphic.webp" alt="Login Illustration" width={400} height={300} />
              </div>
            </div>

            {/* Right Section */}
            <div className="col-md-4 d-flex align-items-center justify-content-center bg-white px-0 right-pannel">
              <div className="welcome-banner-bar">
                <h6 className="welcome-banner-txt text-white mb-2 fw-semibold text-end">Welcome back</h6>
              </div>

              <div className="p-4 w-100 form-wrapper">
                <h3 className="fw-bold text-purple mb-4">Login your Account</h3>

                {/* --- wired form (login API integrated) --- */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label text-muted" htmlFor="username">
                      UserEmail
                    </label>
                    <input id="email" type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                  </div>

                  <div className="mb-4">
                    <label className="form-label text-muted" htmlFor="password">
                      Password
                    </label>
                    <div className="position-relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="form-control rounded-0"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        aria-label="Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y me-3 p-0"
                        style={{ textDecoration: "none" }}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      className="btn g-btn mx-auto px-5"
                      type="submit"
                      disabled={loading}
                      aria-busy={loading}
                    >
                      {loading ? "Logging in..." : "Login"}
                    </button>
                  </div>

                  <div className="mt-3 text-center no-account-wrapper">
                    <small>
                      Don’t have an account? <a href="/UserSignup" className="fw-bold">Sign Up</a>
                    </small>
                    <br />
                    <a href="/forgot-password" className="text-purple small d-block mt-2">Forgot Password</a>
                  </div>

                  {/* message */}
                  {message && (
                    <div className="alert alert-info mt-3" role="alert" aria-live="polite">
                      {message}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>

        <img className="sup landing-line-graphic" src="/assets/images/landing-line-graphic.png" alt="" />
        <img className="sup landing-blob-graphic-signup" src="/assets/images/landing-blob-graphic.png" alt="" />

        <img className="form-img form-key" src="/assets/images/form-key.png" alt="" />
        <img className="form-img form-lock" src="/assets/images/form-lock.png" alt="" />
        <img className="form-img form-task" src="/assets/images/form-task.png" alt="" />
        <img className="form-img form-watch" src="/assets/images/form-watch.png" alt="" />
      </section>

      {/* 2FA Modal (Bootstrap-style markup; no external react-bootstrap required) */}
      {show2FAModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Two-Factor Authentication</h5>
                <button type="button" className="btn-close" onClick={() => setShow2FAModal(false)} aria-label="Close"></button>
              </div>
              <form onSubmit={handle2FASubmit}>
                <div className="modal-body">
                  <p>Enter the 6-digit code from your authenticator app.</p>
                  <input
                    type="text"
                    className="form-control"
                    maxLength={6}
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    autoFocus
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShow2FAModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Verifying..." : "Verify & Login"}</button>
                </div>
              </form>
            </div>
          </div>
          {/* backdrop */}
          <div className="modal-backdrop fade show"></div>
        </div>
      )}

      <footer className=" text-white py-4">
        <div className="container">
          <div className="row align-items-center mb-3 border-bottom pb-3">
            <div className="col-md-3 text-md-start text-center mb-3 mb-md-0">
              <a href="#">
                <img className="footer-logo" src="/assets/images/landing-logo.png" alt="Logo" />
              </a>
            </div>
            <div className="col-md-6 text-center mb-3 mb-md-0">
              <a href="#" className="text-white me-4 text-decoration-none">Product</a>
              <a href="#" className="text-white me-4 text-decoration-none">Features</a>
              <a href="#" className="text-white me-4 text-decoration-none">Pricing</a>
              <a href="#" className="text-white text-decoration-none">Support</a>
            </div>
            <div className="col-md-3 text-md-end text-center social-icons-wrap">
              {/* icons */}
              <a href="#" className="text-white me-2">
                {/* twitter svg */}
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.2071 1.9831C10.7881 2.16933 10.3458 2.28573 9.88023 2.35557C10.3458 2.07622 10.7183 1.63392 10.8812 1.0985C10.4389 1.35457 9.95006 1.5408 9.41465 1.6572C8.99562 1.2149 8.39037 0.935547 7.73856 0.935547C6.48149 0.935547 5.45721 1.95982 5.45721 3.21689C5.45721 3.40312 5.48049 3.56608 5.52705 3.72903C3.64145 3.63591 1.94208 2.72803 0.801411 1.33129C0.615178 1.68048 0.498783 2.05294 0.498783 2.47196C0.498783 3.26345 0.894527 3.96182 1.52306 4.38084C1.1506 4.35756 0.801411 4.26445 0.475504 4.10149V4.12477C0.475504 5.24216 1.26699 6.17333 2.31455 6.38284C2.12831 6.42939 1.9188 6.45267 1.70929 6.45267C1.56962 6.45267 1.40666 6.42939 1.26699 6.40612C1.56962 7.314 2.40766 7.98909 3.40866 7.98909C2.61717 8.59434 1.63945 8.96681 0.56862 8.96681C0.382388 8.96681 0.196156 8.96681 0.0332031 8.94353C1.05748 9.59534 2.24471 9.96781 3.54833 9.96781C7.76184 9.96781 10.0665 6.47595 10.0665 3.44968C10.0665 3.35656 10.0665 3.24017 10.0665 3.14705C10.5088 2.84443 10.9045 2.44868 11.2071 1.9831Z" fill="white" />
                </svg>
              </a>
              {/* other icons omitted for brevity */}
            </div>
          </div>
          <div className="text-center small">© Copyright 2022, All Rights Reserved by Webwiz</div>
        </div>
      </footer>

      <style jsx>{`
        .wave-section {
          color: rgb(0, 0, 0);
          padding-bottom: 80px;
          position: relative;
          margin-top: 80px;
        }
        .wave-section svg {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: auto;
        }
        .landing-header {
          z-index: 9;
          position: relative;
        }
        .header-wave-1,
        .header-wave-2 {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: auto;
          object-fit: cover;
          z-index: 1;
        }
        svg.header-wave-1 {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: auto;
          object-fit: cover;
          z-index: 9;
        }
        svg.header-wave-2 {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: auto;
          object-fit: cover;
        }
        .landing-header {
          z-index: 99 !important;
          position: relative !important;
        }
        .footer-logo {
          max-width: 230px;
          width: 100%;
          height: auto;
        }
        footer {
          background: linear-gradient(90deg, #7C29AB 0%, #9C51C7 50%, #5C2C97 100%);
        }
        .social-icons-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .social-icons-wrap > a {
          background: #ffbb58;
          width: 40px;
          height: 40px;
          border-radius: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .social-icons-wrap > a > svg {
          width: 20px;
          height: 20px;
        }
        .social-icons-wrap > a:hover {
          background: white;
          border: 0px solid;
          color: #7c29ab !important;
        }
        .social-icons-wrap > a:hover svg path {
          fill: #7c29ab !important;
        }

        /* moved inline styles into a class */
        .form-wrapper {
          max-width: 400px;
          padding-top: 100px;
          padding-bottom: 60px;
        }

        /* small responsive tweak */
        @media (max-width: 768px) {
          .form-wrapper {
            padding-top: 40px;
          }
        }

        /* modal z-index / backdrop */
        .modal-backdrop { z-index: 1040; }
        .modal { z-index: 1050; }
      `}</style>
    </div>
  );
}
