'use client';

import React, { JSX, useEffect, useState } from "react";

/**
 * TwoFASettings.tsx
 * Complete frontend component (single-file) to manage TOTP 2FA setup, verify, and disable.
 * - Uses localStorage access/token for Authorization header
 * - Improved authFetch with debug logging and flexible content-type handling
 * - Better error messages surfaced to the user
 * - Optional status check (GET /api/twofactor/status/) if your backend exposes it
 *
 * Drop this file into your Next.js app (e.g. app/components/TwoFASettings.tsx) and import where needed.
 * Ensure Bootstrap CSS is available in your app (you already used it in your project).
 */

function buildAuthHeader() {
  const access = typeof window !== 'undefined' ? localStorage.getItem("access") : null;
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
  if (access) return { Authorization: `Bearer ${access}` };
  if (token) return { Authorization: `Token ${token}` };
  return {};
}

export default function TwoFASettings(): JSX.Element {
  const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/$/, "");

  const [qrDataUri, setQrDataUri] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("");
  const [passwordForDisable, setPasswordForDisable] = useState("");
  const [enabled, setEnabled] = useState<boolean | null>(null);

  async function authFetch(path: string, opts: RequestInit = {}) {
    const headers = new Headers(opts.headers as HeadersInit || {});

    // Set Content-Type only when we send a body (and it's not a FormData)
    if (opts.body && !(opts.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const auth = buildAuthHeader();
    if (auth.Authorization) headers.set("Authorization", auth.Authorization);

    const fetchOpts: RequestInit = {
      ...opts,
      headers,
      // If you're using cookie+session authentication, uncomment next line and ensure CSRF header is provided
      // credentials: 'include',
    };

    const url = `${API_BASE_URL}${path}`;
    const res = await fetch(url, fetchOpts);

    // Try parse JSON body when possible
    const ct = res.headers.get("content-type") || "";
    let data: any = null;
    if (ct.includes("application/json")) {
      try { data = await res.json(); } catch (e) { data = null; }
    }

    // debug log for easier troubleshooting
    // Remove or reduce logging in production
    console.debug("[TwoFA][authFetch]", { url, status: res.status, ok: res.ok, data });

    return { ok: res.ok, status: res.status, data, raw: res };
  }

  // Start setup (POST /api/twofactor/setup/)
  async function startSetup() {
    setIsLoading(true);
    setStepMessage(null);
    try {
      const r = await authFetch("/api/twofactor/setup/", { method: "POST" });
      if (!r.ok) {
        const err = r.data?.detail || JSON.stringify(r.data) || `Status ${r.status}`;
        setStepMessage(`Failed to start 2FA setup: ${err}`);
        setIsLoading(false);
        return;
      }
      setOtpauthUrl(r.data?.otpauth_url ?? null);
      setQrDataUri(r.data?.qr_code_data_uri ?? null);
      setStepMessage("Scan the QR or open the provisioning URL in your authenticator, then enter the 6-digit code below to verify.");
    } catch (err) {
      console.error("Network error startSetup:", err);
      setStepMessage("Network error while starting setup.");
    } finally {
      setIsLoading(false);
    }
  }

  // Verify setup (POST /api/twofactor/verify-setup/)
  async function verifySetup() {
    if (!code) {
      setStepMessage("Enter the 6-digit code first.");
      return;
    }
    setIsLoading(true);
    setStepMessage(null);

    try {
      const payload = { code: code.trim() };
      const r = await authFetch("/api/twofactor/verify-setup/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        if (r.data) {
          // serializer errors often come as { code: ["..."] }
          const fieldErr = (Array.isArray(r.data.code) && r.data.code.join(" ")) || r.data.detail || JSON.stringify(r.data);
          setStepMessage(fieldErr || `Verify failed (status ${r.status}).`);
        } else {
          setStepMessage(`Verify failed (status ${r.status}).`);
        }
        setIsLoading(false);
        return;
      }

      setStepMessage("2FA setup verified and enabled.");
      setQrDataUri(null);
      setOtpauthUrl(null);
      setCode("");
      setEnabled(true);
    } catch (err) {
      console.error("Network error verifying code:", err);
      setStepMessage("Network error verifying code.");
    } finally {
      setIsLoading(false);
    }
  }

  // Disable 2FA (POST /api/twofactor/disable/)
  async function disable2FA() {
    if (!passwordForDisable) {
      setStepMessage("Enter your password to disable 2FA.");
      return;
    }
    setIsLoading(true);
    setStepMessage(null);

    try {
      const payload = { password: passwordForDisable, code: code || "" };
      const r = await authFetch("/api/twofactor/disable/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        if (r.data) {
          const err = r.data.detail || JSON.stringify(r.data);
          setStepMessage(err || `Unable to disable 2FA (status ${r.status}).`);
        } else {
          setStepMessage(`Unable to disable 2FA (status ${r.status}).`);
        }
        setIsLoading(false);
        return;
      }

      setStepMessage("2FA disabled.");
      setEnabled(false);
      setPasswordForDisable("");
      setCode("");
    } catch (err) {
      console.error("Network error disabling 2FA:", err);
      setStepMessage("Network error disabling 2FA.");
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard(text?: string | null) {
    if (!text) return;
    try { navigator.clipboard?.writeText(text); setStepMessage("Copied to clipboard."); } catch (e) { /* ignore */ }
  }

  // Optional: check current 2FA enabled state if your backend provides an endpoint.
  // If you don't have such an endpoint you can remove this block.
  useEffect(() => {
    let mounted = true;
    async function checkStatus() {
      try {
        const r = await authFetch("/api/twofactor/status/", { method: "GET" });
        if (!mounted) return;
        if (r.ok && r.data && typeof r.data.enabled === 'boolean') {
          setEnabled(r.data.enabled);
        } else {
          // if not available, leave enabled as null
          console.debug('[TwoFA] status endpoint not present or returned unexpected payload', r);
        }
      } catch (e) {
        console.debug('[TwoFA] status check failed', e);
      }
    }
    checkStatus();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="cardWrapper mx-3 mx-lg-0">
      <div className="cardHeader d-flex justify-content-start align-items-center p-4">
        <h5 className="cardTitle text-white m-0">Two-Factor Authentication</h5>
      </div>

      <div className="p-4">
        <p>
          Two-Factor Authentication (TOTP) provides an extra layer of security. Use an authenticator app
          (Google Authenticator, Authy, etc.).
        </p>

        <div className="mb-3 d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-primary me-2" onClick={startSetup} disabled={isLoading}>
            {isLoading ? "Working..." : "Set up Authenticator"}
          </button>

          <button className="btn btn-outline-secondary" onClick={() => { setQrDataUri(null); setOtpauthUrl(null); setCode(""); setStepMessage(null); }}>
            Cancel Setup
          </button>
        </div>

        {/* QR image if available */}
        {qrDataUri && (
          <div className="mb-3">
            <div>
              <strong>Scan this QR with an authenticator app:</strong>
            </div>
            <img src={qrDataUri} alt="2FA QR" style={{ maxWidth: 220, border: "1px solid #ddd", padding: 8 }} />
            <div className="mt-2">
              <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => copyToClipboard(otpauthUrl)}>Copy provisioning URL</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setStepMessage("If your authenticator doesn't accept the QR, copy & paste the provisioning URL.")}>Help</button>
            </div>
          </div>
        )}

        {/* Provisioning URL fallback */}
        {otpauthUrl && !qrDataUri && (
          <div className="mb-3">
            <div><strong>Provisioning URL:</strong></div>
            <div className="small text-break">{otpauthUrl}</div>
            <div className="mt-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => copyToClipboard(otpauthUrl)}>Copy provisioning URL</button>
            </div>
          </div>
        )}

        {/* Verify / Confirm */}
        {(qrDataUri || otpauthUrl) && (
          <div className="mb-3">
            <label className="form-label">Enter 6-digit code to verify</label>
            <div className="d-flex gap-2">
              <input
                type="text"
                maxLength={6}
                className="form-control"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
              />
              <button className="btn btn-primary" onClick={verifySetup} disabled={isLoading}>Verify</button>
            </div>
          </div>
        )}

        {/* Disable UI */}
        <div className="mt-4 border-top pt-3">
          <h6>Disable Two-Factor</h6>
          <p className="small text-muted">To disable 2FA enter your password (and optionally a current TOTP code for confirmation).</p>
          <div className="mb-2">
            <input type="password" className="form-control" value={passwordForDisable} onChange={(e) => setPasswordForDisable(e.target.value)} placeholder="Current password" />
          </div>
          <div className="mb-2">
            <input type="text" className="form-control" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Current authenticator code (optional)" />
          </div>
          <div>
            <button className="btn btn-danger" onClick={disable2FA} disabled={isLoading}>Disable 2FA</button>
          </div>
        </div>

        {stepMessage && (
          <div className="alert alert-info mt-3" role="alert">
            {stepMessage}
          </div>
        )}

        {/* show current status for convenience */}
        <div className="mt-3 small text-muted">
          Current 2FA status: {enabled === null ? "unknown" : enabled ? "enabled" : "disabled"}
        </div>
      </div>
    </div>
  );
}
