"use client";

import React, { JSX, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import "bootstrap/dist/css/bootstrap.min.css";
import { useRouter } from "next/navigation";

type LoginPayload = { email: string; password: string; code?: string | null };
type AttemptResult = { ok: boolean; status: number; data: unknown | null; rawText?: string };

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

  // form state
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // 2FA
  const [show2FAModal, setShow2FAModal] = useState<boolean>(false);
  const [twoFACode, setTwoFACode] = useState<string>("");
  const [pendingCredentials, setPendingCredentials] = useState<LoginPayload | null>(null);

  // misc
  const [accountMissing, setAccountMissing] = useState<boolean>(false);
  const isMounted = useRef<boolean>(false);
  const twoFAInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // lock scroll while modal open & focus management
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (show2FAModal) {
      document.body.style.overflow = "hidden";
      setTimeout(() => twoFAInputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = prev;
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show2FAModal]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && show2FAModal) setShow2FAModal(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show2FAModal]);

  // attemptLogin: POST to /api/twofactor/login-2fa/ with optional code, includes timeout via AbortController
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
      // debug: don't log passwords
      // console.debug("[Login] sending", { url, email: safePayload.email, hasCode: !!safePayload.code });
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

  // helpers to parse server responses
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

    // detect 2FA requirement
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

  // persist token/user from server response (note: localStorage has XSS risks)
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

  // handle main login submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
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

        if (result.data && typeof result.data === "object" && "need_2fa" in (result.data as Record<string, unknown>)) {
          setPendingCredentials({ email, password });
          setTwoFACode("");
          setShow2FAModal(true);
          setMessage("Two-Factor required — enter the 6-digit code from your authenticator.");
          if (isMounted.current) setLoading(false);
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
          if (isMounted.current) setLoading(false);
          return;
        }
        setMessage(`❌ ${interpreted.message}`);
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.error("[Login] exception during submit:", err);
        const msg = err && typeof err === "object" && (err as any).message ? (err as any).message : "Unable to reach server.";
        setMessage(`❌ ${msg}`);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    [email, password, loading, router]
  );

  // handle 2FA submit
  const handle2FASubmit = useCallback(
    async (e?: React.FormEvent<HTMLFormElement>) => {
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
        if (isMounted.current) setLoading(false);
      }
    },
    [twoFACode, pendingCredentials, loading, router]
  );

  // --- render the original (simple) layout but integrated ---
  return (
    <section className="login-sec">
      <div className="login-container container">
        <div className="login-card">
          {/* Logo */}
          <Image className="login-logo img-fluid" src="/assets/images/new/login-logo.png" alt="logo" width={200} height={80} />

          <h2 className="login-title">Login to Dashboard</h2>
          <p className="login-subtitle">Fill form to access your account.</p>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="mb-3">
              <label htmlFor="inputEmail" className="form-label small">
                Email address
              </label>
              <input
                id="inputEmail"
                type="email"
                className="form-control"
                aria-describedby="emailHelp"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="mb-3 icon-input">
              <label htmlFor="inputPassword" className="form-label small">
                Password
              </label>
              <input
                id="inputPassword"
                type="password"
                className="form-control"
                placeholder="Password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                required
                autoComplete="current-password"
                aria-label="Password"
              />
              <div className="forgot-link mt-1">
              <a className="text-decoration-none" href="/forgot-password">Forgot Password?</a>
            </div>
            </div>

            

            <button type="submit" className="btn btn-primary login-btn mt-3" disabled={loading} aria-busy={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="flex align-items-center mt-3">
              <p className="text-center fs-6">Don't have an Account ? <a className="text-decoration-none" href="/UserSignup">Create an
                                            account</a>
                                    </p>
            </div>
          </form>

          {message && (
            <div className="alert alert-info mt-3" role="alert" aria-live="polite">
              {message}
              {accountMissing && (
                <div className="mt-2">
                  <a href="/UserSignup" className="btn btn-sm btn-outline-primary">
                    Go to Sign Up
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side Image */}
        <div className="login-image-wrap text-end">
          <Image className="img-fluid" src="/assets/images/new/login-img.png" alt="login" width={600} height={600} />
        </div>
      </div>

      {/* 2FA Modal */}
      {show2FAModal && (
        <>
          <div
            className="modal-backdrop fade show tofa"
            style={{ position: "fixed", inset: 0, zIndex: 1040, backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={() => setShow2FAModal(false)}
          />
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            style={{ position: "fixed", inset: 0, zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShow2FAModal(false)}
          >
            <div className="modal-dialog modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, margin: "0 1rem" }}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Two-Factor Authentication</h5>
                  <button type="button" className="btn-close" onClick={() => setShow2FAModal(false)} aria-label="Close" />
                </div>

                <form onSubmit={handle2FASubmit}>
                  <div className="modal-body">
                    <p>Enter the 6-digit code from your authenticator app.</p>
                    <input
                      ref={twoFAInputRef}
                      type="text"
                      className="form-control"
                      maxLength={6}
                      value={twoFACode}
                      onChange={(ev) => setTwoFACode(ev.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      inputMode="numeric"
                      autoFocus
                    />
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-light" onClick={() => setShow2FAModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? "Verifying..." : "Verify & Login"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .login-sec {
          padding: 40px 0;
        }
        .login-container {
          display: flex;
          gap: 2rem;
          align-items: center;
          justify-content: center;
        }
        .login-card {
          max-width: 420px;
          padding: 28px;
          border-radius: 8px;
          background: #fff;
      
        }
        .login-image-wrap {
          flex: 1 1 40%;
        }
        @media (max-width: 992px) {
          .login-container {
            flex-direction: column;
          }
          .login-image-wrap {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
