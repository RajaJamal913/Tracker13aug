"use client";

import React, { JSX, useEffect, useState } from "react";
import Image from "next/image";
import "bootstrap/dist/css/bootstrap.min.css";
import { useRouter } from "next/navigation";

/**
 * Full LoginPage (TypeScript / TSX)
 * - DRF Token auth (Authorization: Token <token>)
 * - attemptLogin uses AbortController timeout
 * - Handles need_2fa flow via modal
 * - Fully typed to avoid implicit any errors
 *
 * This version contains a robust 2FA modal implementation that fixes
 * mouse-click responsiveness issues (backdrop ordering, z-index,
 * pointer-events and click propagation).
 */

type LoginPayload = {
  email: string;
  password: string;
  code?: string | null;
};

type AttemptResult = {
  ok: boolean;
  status: number;
  data: unknown | null;
  rawText?: string;
};

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

  // UI state
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // 2FA
  const [show2FAModal, setShow2FAModal] = useState<boolean>(false);
  const [twoFACode, setTwoFACode] = useState<string>("");
  const [pendingCredentials, setPendingCredentials] = useState<LoginPayload | null>(null);

  // show sign-up hint when server indicates no account
  const [accountMissing, setAccountMissing] = useState<boolean>(false);

  // ---------- auth helpers ----------

  function buildAuthHeader(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Token ${token}` } : {};
  }

  async function authFetch(input: RequestInfo, init: RequestInit = {}) {
    const headers = new Headers(init.headers || {});
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json; charset=utf-8");
    }
    const auth = buildAuthHeader();
    if (auth.Authorization) headers.set("Authorization", auth.Authorization);

    const res = await fetch(input, { ...init, headers });
    const ct = res.headers.get("content-type") ?? "";
    let data: unknown | null = null;
    if (ct.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    }
    return { ok: res.ok, status: res.status, data, raw: res };
  }

  // Attempt login/verify; returns parsed data or raw text
  async function attemptLogin(payload: LoginPayload): Promise<AttemptResult> {
    const safePayload: LoginPayload = {
      email: String(payload.email || ""),
      password: String(payload.password || ""),
      ...(payload.code ? { code: String(payload.code) } : {}),
    };

    const url = `${API_BASE}/api/twofactor/login-2fa/`;
    const bodyText = JSON.stringify(safePayload);

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutMs = 10000;
    let timeoutId: number | undefined;
    if (controller) timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      // safe debug: do not print passwords
      // eslint-disable-next-line no-console
      console.debug("[Login] sending", { url, email: safePayload.email, hasCode: !!safePayload.code });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json, text/plain, */*",
        },
        body: bodyText,
        signal: controller?.signal,
      });

      const contentType = res.headers.get("content-type") ?? "";
      let parsed: unknown | null = null;
      let rawText = "";

      if (contentType.includes("application/json")) {
        try {
          parsed = await res.json();
        } catch {
          rawText = await res.text();
        }
      } else {
        rawText = await res.text();
        try {
          parsed = JSON.parse(rawText);
        } catch {
          parsed = null;
        }
      }

      return { ok: res.ok, status: res.status, data: parsed ?? rawText, rawText };
    } catch (err: unknown) {
      if (err && typeof err === "object" && (err as any).name === "AbortError") {
        throw new Error("Request timed out");
      }
      throw err;
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }

  // safe helpers to extract strings from unknown server responses
  function asString(x: unknown): string | null {
    if (x == null) return null;
    if (typeof x === "string") return x;
    if (typeof x === "number" || typeof x === "boolean") return String(x);
    return null;
  }

  function extractErrorMessage(data: unknown): string | null {
    if (data == null) return null;
    if (typeof data === "string") return data;
    if (typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if ("detail" in obj) return asString(obj.detail);
      if ("non_field_errors" in obj) {
        const v = obj.non_field_errors;
        if (Array.isArray(v)) return v.join(" ");
        return asString(v) ?? null;
      }
      try {
        return Object.entries(obj)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as any).join(" ") : asString(v) ?? JSON.stringify(v)}`)
          .join(" ");
      } catch {
        return null;
      }
    }
    return null;
  }

  function interpretAuthFailure(result: AttemptResult): { message: string; userExists: boolean | null } {
    if (!result.data) return { message: `Login failed (HTTP ${result.status})`, userExists: null };

    if (typeof result.data === "object" && result.data !== null && "need_2fa" in (result.data as Record<string, unknown>)) {
      return { message: "Two-Factor Authentication required.", userExists: true };
    }

    const msg = extractErrorMessage(result.data) ?? `Login failed (HTTP ${result.status})`;

    if (typeof result.data === "object" && result.data !== null) {
      const d = result.data as Record<string, unknown>;
      if (d.email) {
        const v = d.email;
        const s = Array.isArray(v) ? v.join(" ") : asString(v);
        if (s && /not found|does not exist|no account/i.test(s)) return { message: s, userExists: false };
      }
      if (d.password) {
        const v = d.password;
        const s = Array.isArray(v) ? v.join(" ") : asString(v);
        if (s && /incorrect|invalid/i.test(s)) return { message: s, userExists: true };
      }
      if (d.detail) {
        const s = asString(d.detail) ?? "";
        if (/invalid credentials|invalid/i.test(s.toLowerCase())) return { message: "Incorrect email or password.", userExists: null };
        if (/not found|does not exist/i.test(s.toLowerCase())) return { message: "Account not found. Please sign up.", userExists: false };
      }
    }

    return { message: msg, userExists: null };
  }

  function persistTokensFromResponse(data: unknown): void {
    if (!data || typeof data !== "object") return;
    const obj = data as Record<string, unknown>;
    if ("token" in obj && typeof obj.token === "string") {
      try {
        localStorage.setItem("token", obj.token);
        localStorage.setItem("isLoggedIn", "1");
      } catch {
        // ignore storage errors
      }
    }
    if ("user" in obj) {
      try {
        localStorage.setItem("user", JSON.stringify(obj.user));
      } catch {
        // ignore
      }
    }
  }

  // ---------- handlers ----------

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setAccountMissing(false);
    setMessage("");
    setLoading(true);

    if (!email || !password) {
      setMessage("❌ Please enter email and password.");
      setLoading(false);
      return;
    }

    try {
      const result = await attemptLogin({ email, password });

      if (result.data) {
        const serverMsg = extractErrorMessage(result.data);
        if (serverMsg) setMessage(serverMsg);
      }

      // backend returns { need_2fa: true } when code is required (HTTP 200)
      if (result.data && typeof result.data === "object" && "need_2fa" in (result.data as Record<string, unknown>)) {
        setPendingCredentials({ email, password });
        setTwoFACode("");
        setShow2FAModal(true);
        setMessage("Two-Factor required — enter the 6-digit code from your authenticator.");
        setLoading(false);
        return;
      }

      if (result.ok) {
        persistTokensFromResponse(result.data);
        router.replace("/dashboard");
        return;
      }

      const interpreted = interpretAuthFailure(result);
      if (interpreted.userExists === false) {
        setAccountMissing(true);
        setMessage(`❌ ${interpreted.message}`);
        setLoading(false);
        return;
      }
      if (interpreted.userExists === true && interpreted.message) {
        setMessage(`❌ ${interpreted.message}`);
        setLoading(false);
        return;
      }
      setMessage(`❌ ${interpreted.message}`);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[Login] exception during submit:", err);
      const msg = err && typeof err === "object" && (err as any).message ? (err as any).message : "Unable to reach server.";
      setMessage(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (loading) return;

    setMessage("");
    setLoading(true);

    if (!pendingCredentials) {
      setMessage("Missing pending credentials — retry login.");
      setShow2FAModal(false);
      setLoading(false);
      return;
    }

    const codeClean = (twoFACode || "").trim().replace(/\D/g, "");
    if (codeClean.length !== 6) {
      setMessage("Enter the 6-digit code from your authenticator.");
      setLoading(false);
      return;
    }

    try {
      const result = await attemptLogin({
        email: pendingCredentials.email,
        password: pendingCredentials.password,
        code: codeClean,
      });

      if (result.data) {
        const serverMsg = extractErrorMessage(result.data);
        if (serverMsg) setMessage(serverMsg);
      }

      if (result.ok) {
        persistTokensFromResponse(result.data);
        setShow2FAModal(false);
        router.replace("/dashboard");
        return;
      }

      if (result.data && typeof result.data === "object" && "need_2fa" in (result.data as Record<string, unknown>)) {
        setMessage("Server still requires a two-factor code — re-check the code.");
        setLoading(false);
        return;
      }

      setMessage(`❌ Verification failed (HTTP ${result.status}).`);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[2FA] network/error", err);
      setMessage("❌ Network error or request timed out. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- render ----------
  return (
    <div className="landing-main">
      {/* header waves */}
      <svg className="header-wave-1" width="1601" height="179" viewBox="0 0 1601 179" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M232.103 122.45C141.213 90.3102 90.2161 91.1818 -0.683594 122.45V0.804688H1607.32V149.303C1562.32 176.64 1453.72 181.868 1385.72 176.64C1229.39 164.623 1117.01 136.095 1068.66 122.45C891.815 72.5319 815.995 57.9616 601.526 122.45C461.147 173.456 380.08 170.887 232.103 122.45Z" fill="url(#paint0_linear_29_5221)" />
        <defs>
          <linearGradient id="paint0_linear_29_5221" x1="-0.683594" y1="89.6266" x2="1607.32" y2="89.6266" gradientUnits="userSpaceOnUse">
            <stop offset="0.5" stopColor="#9C51C7" />
          </linearGradient>
        </defs>
      </svg>

      <svg className="header-wave-2" width="1601" height="235" viewBox="0 0 1601 235" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path opacity="0.95" d="M323.836 51.7684C240.584 209.143 171.31 251.483 -0.683594 228.654V-13.0898H1607.32V98.938V119.498L1310.87 210.966C1185.2 252.167 1062.36 134.82 985.713 119.498C909.062 104.177 703.355 266.037 573.922 119.498L323.836 51.7684Z" fill="url(#paint0_linear_29_5220)" />
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
              <span className="navbar-toggler-icon" />
            </button>
          </div>
        </nav>
      </header>

      {/* Wave Section */}
      <section className="wave-section pt-lg-5 pb-lg-5 position-relative z-2 overflow-hidden">
        <div className="container py-5">
          <div className="row justify-content-center">
            {/* Left */}
            <div className="col-md-5 d-flex align-items-center justify-content-center left-pannel px-0 position-relative">
              <div className="text-center px-4">
                <Image src="/assets/images/login-graphic.webp" alt="Login Illustration" width={400} height={300} />
              </div>
            </div>

            {/* Right */}
            <div className="col-md-4 d-flex align-items-center justify-content-center bg-white px-0 right-pannel">
              <div className="welcome-banner-bar">
                <h6 className="welcome-banner-txt text-white mb-2 fw-semibold text-end">Welcome back</h6>
              </div>

              <div className="p-4 w-100 form-wrapper">
                <h3 className="fw-bold text-purple mb-4">Login your Account</h3>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label text-muted" htmlFor="email">UserEmail</label>
                    <input id="email" type="email" className="form-control" value={email} onChange={(ev) => setEmail(ev.target.value)} required autoComplete="email" />
                  </div>

                  <div className="mb-4">
                    <label className="form-label text-muted" htmlFor="password">Password</label>
                    <div className="position-relative">
                      <input id="password" type={showPassword ? "text" : "password"} className="form-control rounded-0" value={password} onChange={(ev) => setPassword(ev.target.value)} required autoComplete="current-password" aria-label="Password" />
                      <button type="button" onClick={() => setShowPassword((s) => !s)} className="btn btn-link position-absolute end-0 top-50 translate-middle-y me-3 p-0" style={{ textDecoration: "none" }} aria-pressed={showPassword}>
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <button className="btn g-btn mx-auto px-5" type="submit" disabled={loading} aria-busy={loading}>
                      {loading ? "Logging in..." : "Login"}
                    </button>
                  </div>

                  <div className="mt-3 text-center no-account-wrapper">
                    <small>Don’t have an account? <a href="/UserSignup" className="fw-bold">Sign Up</a></small>
                    <br />
                    <a href="/forgot-password" className="text-purple small d-block mt-2">Forgot Password</a>
                  </div>

                  {message && (
                    <div className="alert alert-info mt-3" role="alert" aria-live="polite">
                      {message}
                      {accountMissing && (
                        <div className="mt-2">
                          <a href="/UserSignup" className="btn btn-sm btn-outline-primary">Go to Sign Up</a>
                        </div>
                      )}
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

      {/* 2FA Modal: fixed ordering, fixed positioning, click propagation handled */}
      {show2FAModal && (
        <>
          {/* Backdrop first so stacking is predictable */}
          <div
            className="modal-backdrop fade show"
            style={{ position: "fixed", inset: 0, zIndex: 1040 }}
            onClick={() => {
              // optional: allow click outside to close modal
              setShow2FAModal(false);
            }}
          />

          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            style={{ position: "fixed", inset: 0, zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => {
              // clicking outside the dialog will close (backdrop already does this)
              setShow2FAModal(false);
            }}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              role="document"
              onClick={(e) => e.stopPropagation()} // prevent backdrop clicks from reaching modal content
              style={{ maxWidth: 520, margin: "0 1rem" }}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Two-Factor Authentication</h5>
                  <button type="button" className="btn-close" onClick={() => setShow2FAModal(false)} aria-label="Close" />
                </div>

                {/* keep the form so Enter still works */}
                <form onSubmit={handle2FASubmit}>
                  <div className="modal-body">
                    <p>Enter the 6-digit code from your authenticator app.</p>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={6}
                      value={twoFACode}
                      onChange={(ev) => setTwoFACode(ev.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      autoFocus
                    />
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-light" onClick={() => setShow2FAModal(false)}>
                      Cancel
                    </button>

                    {/* add onClick plus keep type submit to preserve keyboard Enter behavior */}
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? "Verifying..." : "Verify & Login"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      <footer className="text-white py-4">
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
              <a href="#" className="text-white me-2">
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.2071 1.9831C10.7881 2.16933 10.3458 2.28573 9.88023 2.35557C10.3458 2.07622 10.7183 1.63392 10.8812 1.0985C10.4389 1.35457 9.95006 1.5408 9.41465 1.6572C8.99562 1.2149 8.39037 0.935547 7.73856 0.935547C6.48149 0.935547 5.45721 1.95982 5.45721 3.21689C5.45721 3.40312 5.48049 3.56608 5.52705 3.72903C3.64145 3.63591 1.94208 2.72803 0.801411 1.33129C0.615178 1.68048 0.498783 2.05294 0.498783 2.47196C0.498783 3.26345 0.894527 3.96182 1.52306 4.38084C1.1506 4.35756 0.801411 4.26445 0.475504 4.10149V4.12477C0.475504 5.24216 1.26699 6.17333 2.31455 6.38284C2.12831 6.42939 1.9188 6.45267 1.70929 6.45267C1.56962 6.45267 1.40666 6.42939 1.26699 6.40612C1.56962 7.314 2.40766 7.98909 3.40866 7.98909C2.61717 8.59434 1.63945 8.96681 0.56862 8.96681C0.382388 8.96681 0.196156 8.96681 0.0332031 8.94353C1.05748 9.59534 2.24471 9.96781 3.54833 9.96781C7.76184 9.96781 10.0665 6.47595 10.0665 3.44968C10.0665 3.35656 10.0665 3.24017 10.0665 3.14705C10.5088 2.84443 10.9045 2.44868 11.2071 1.9831Z" fill="white" />
                </svg>
              </a>
            </div>
          </div>
          <div className="text-center small">© Copyright 2022, All Rights Reserved by Webwiz</div>
        </div>
      </footer>

      <style jsx>{`
        .wave-section { color: rgb(0,0,0); padding-bottom: 80px; position: relative; margin-top: 80px; }
        svg.header-wave-1, svg.header-wave-2 { position: absolute; top: 0; left: 0; width: 100%; height: auto; object-fit: cover; z-index: 1; }
        .landing-header { z-index: 99 !important; position: relative !important; }
        .footer-logo { max-width: 230px; width: 100%; height: auto; }
        footer { background: linear-gradient(90deg, #7C29AB 0%, #9C51C7 50%, #5C2C97 100%); }
        .social-icons-wrap { display:flex; align-items:center; justify-content:center; gap:20px; flex-wrap:wrap; }
        .form-wrapper { max-width: 400px; padding-top: 100px; padding-bottom: 60px; }
        @media (max-width: 768px) { .form-wrapper { padding-top: 40px; } }

        /* modal stacking / pointer safety */
        .modal { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; z-index: 1050 !important; }
        .modal-backdrop { position: fixed !important; inset: 0 !important; z-index: 1040 !important; }
        .modal-dialog { pointer-events: auto; }

        .modal-backdrop { background-color: rgba(0,0,0,0.45); }
        .modal { display: flex !important; align-items: center; justify-content: center; }

        .modal .modal-content { box-shadow: 0 10px 30px rgba(0,0,0,0.2); }

        .modal { outline: 0; }

        .modal-backdrop { transition: none; }

        .modal-backdrop.fade.show { opacity: 1; }
        .modal.fade.show { opacity: 1; }

        .modal-backdrop { z-index: 1040; }
        .modal { z-index: 1050; }

      `}</style>
    </div>
  );
}
