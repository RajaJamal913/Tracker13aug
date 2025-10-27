'use client';
import React, { useEffect, useState } from "react";

/**
 * TwoFASettings
 * - Start setup -> POST /api/twofactor/setup/ (authenticated)
 *   returns { otpauth_url, qr_code_data_uri? }
 * - Verify setup -> POST /api/twofactor/verify-setup/ with { code }
 * - Disable -> POST /api/twofactor/disable/ with { password, code? }
 *
 * Uses localStorage token/access to authenticate:
 * - if localStorage.access exists -> uses Authorization: Bearer <access>
 * - else if localStorage.token exists -> uses Authorization: Token <token>
 *
 * Note: ensure user is already logged in (token present) before using.
 */

function buildAuthHeader() {
  const access = localStorage.getItem("access");
  const token = localStorage.getItem("token");
  if (access) return { Authorization: `Bearer ${access}` };
  if (token) return { Authorization: `Token ${token}` };
  return {};
}

export default function TwoFASettings() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

  const [qrDataUri, setQrDataUri] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("");
  const [passwordForDisable, setPasswordForDisable] = useState("");
  const [enabled, setEnabled] = useState<boolean | null>(null);

  async function authFetch(path: string, opts: RequestInit = {}) {
    const headers = new Headers(opts.headers as HeadersInit);
    headers.set("Content-Type", "application/json");
    const auth = buildAuthHeader();
    if (auth.Authorization) headers.set("Authorization", auth.Authorization);

    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    const ct = res.headers.get("content-type") || "";
    let data: any = null;
    if (ct.includes("application/json")) data = await res.json();
    else data = null;
    return { ok: res.ok, status: res.status, data };
  }

  async function startSetup() {
    setIsLoading(true);
    setStepMessage(null);
    try {
      const r = await authFetch("/api/twofactor/setup/", { method: "POST" });
      if (!r.ok) {
        setStepMessage(r.data?.detail || "Failed to start 2FA setup.");
        setIsLoading(false);
        return;
      }
      setOtpauthUrl(r.data?.otpauth_url ?? null);
      setQrDataUri(r.data?.qr_code_data_uri ?? null);
      setStepMessage("Scan the QR or use the provisioning URL, then enter the 6-digit code to verify.");
    } catch (err) {
      console.error(err);
      setStepMessage("Network error while starting setup.");
    } finally {
      setIsLoading(false);
    }
  }

  async function verifySetup() {
    if (!code) {
      setStepMessage("Enter the 6-digit code first.");
      return;
    }
    setIsLoading(true);
    setStepMessage(null);
    try {
      const r = await authFetch("/api/twofactor/verify-setup/", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!r.ok) {
        setStepMessage(r.data?.detail || "Invalid code.");
        setIsLoading(false);
        return;
      }
      setStepMessage("2FA setup verified and enabled.");
      setQrDataUri(null);
      setOtpauthUrl(null);
      setCode("");
      setEnabled(true);
    } catch (err) {
      console.error(err);
      setStepMessage("Network error verifying code.");
    } finally {
      setIsLoading(false);
    }
  }

  async function disable2FA() {
    if (!passwordForDisable) {
      setStepMessage("Enter your password to disable 2FA.");
      return;
    }
    setIsLoading(true);
    setStepMessage(null);
    try {
      const r = await authFetch("/api/twofactor/disable/", {
        method: "POST",
        body: JSON.stringify({ password: passwordForDisable, code: code || "" }),
      });
      if (!r.ok) {
        setStepMessage(r.data?.detail || "Unable to disable 2FA.");
        setIsLoading(false);
        return;
      }
      setStepMessage("2FA disabled.");
      setEnabled(false);
      setPasswordForDisable("");
      setCode("");
    } catch (err) {
      console.error(err);
      setStepMessage("Network error disabling 2FA.");
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard(text?: string | null) {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setStepMessage("Copied to clipboard.");
  }

  // optional: check current enabled state might be provided by an endpoint; fallback to null.
  useEffect(() => {
    // If you have an endpoint to check current 2FA status you can call it here.
    // For now we leave enabled=null (unknown) and update on actions.
  }, []);

  return (
    <div className="cardWrapper">
      <div className="cardHeader d-flex justify-content-start align-items-center p-4">
        <h5 className="cardTitle text-white m-0">Two-Factor Authentication</h5>
      </div>

      <div className="p-4">
        <p>
          Two-Factor Authentication (TOTP) provides an extra layer of security. Use an authenticator app
          (Google Authenticator, Authy, etc.).
        </p>

        <div className="mb-3">
          <button className="btn btn-outline-primary me-2" onClick={startSetup} disabled={isLoading}>
            {isLoading ? "Starting..." : "Set up Authenticator"}
          </button>

          <button className="btn btn-outline-danger" onClick={() => { setQrDataUri(null); setOtpauthUrl(null); setCode(""); setStepMessage(null); }}>
            Cancel Setup
          </button>
        </div>

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
              <input type="text" maxLength={6} className="form-control" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
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
          <div className="alert alert-info mt-3">
            {stepMessage}
          </div>
        )}
      </div>
    </div>
  );
}
