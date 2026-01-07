"use client";
export const dynamic = "force-dynamic";
import React, { JSX, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import "bootstrap/dist/css/bootstrap.min.css";
import { useRouter } from "next/navigation";

type LoginPayload = { email: string; password: string; code?: string | null; invite?: string | null };
type AttemptResult = { ok: boolean; status: number; data: unknown | null; rawText?: string };

export default function LoginPage(): JSX.Element {
  const router = useRouter();

  // derive inviteToken on client to avoid prerender/useSearchParams SSR issues
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("invite") || params.get("token") || null;
      setInviteToken(token);
    } catch {
      setInviteToken(null);
    }
  }, []);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

  // Form state
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // 2FA
  const [show2FAModal, setShow2FAModal] = useState<boolean>(false);
  const [twoFACode, setTwoFACode] = useState<string>("");
  const [pendingCredentials, setPendingCredentials] = useState<LoginPayload | null>(null);

  // Misc
  const [accountMissing, setAccountMissing] = useState<boolean>(false);
  const isMounted = useRef<boolean>(false);
  const twoFAInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (show2FAModal) {
      document.body.style.overflow = "hidden";
      setTimeout(() => twoFAInputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = prev;
    }
    return () => { document.body.style.overflow = prev; };
  }, [show2FAModal]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && show2FAModal) setShow2FAModal(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show2FAModal]);

  // --- Network helpers ---
  async function attemptLogin(payload: LoginPayload): Promise<AttemptResult> {
    const safePayload: LoginPayload = { email: String(payload.email || ""), password: String(payload.password || ""), ...(payload.code ? { code: String(payload.code) } : {}), ...(payload.invite ? { invite: payload.invite } : {}) };
    const url = `${API_BASE}/api/twofactor/login-2fa/`;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 10000) : undefined;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8", Accept: "application/json, text/plain, */*" },
        body: JSON.stringify(safePayload),
        signal: controller?.signal,
      });
      const contentType = res.headers.get("content-type") ?? "";
      let parsed: unknown | null = null;
      let rawText = "";
      if (contentType.includes("application/json")) {
        try { parsed = await res.json(); } catch { rawText = await res.text(); }
      } else {
        rawText = await res.text();
        try { parsed = JSON.parse(rawText); } catch { parsed = null; }
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

  function asString(x: unknown): string | null { if (x == null) return null; if (typeof x === "string") return x; if (typeof x === "number" || typeof x === "boolean") return String(x); return null; }

  function extractErrorMessage(data: unknown): string | null {
    if (data == null) return null;
    if (typeof data === "string") return data;
    if (typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if ("detail" in obj) return asString(obj.detail);
      if ("non_field_errors" in obj) { const v = obj.non_field_errors; if (Array.isArray(v)) return v.join(" "); return asString(v) ?? null; }
      try { return Object.entries(obj).map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as any).join(" ") : asString(v) ?? JSON.stringify(v)}`).join(" "); } catch { return null; }
    }
    return null;
  }

  function interpretAuthFailure(result: AttemptResult): { message: string; userExists: boolean | null } {
    if (!result.data) return { message: `Login failed (HTTP ${result.status})`, userExists: null };
    if (typeof result.data === "object" && result.data !== null && "need_2fa" in (result.data as Record<string, unknown>)) return { message: "Two-Factor Authentication required.", userExists: true };
    const msg = extractErrorMessage(result.data) ?? `Login failed (HTTP ${result.status})`;
    if (typeof result.data === "object" && result.data !== null) {
      const d = result.data as Record<string, unknown>;
      if (d.email) { const v = d.email; const s = Array.isArray(v) ? v.join(" ") : asString(v); if (s && /not found|does not exist|no account/i.test(s)) return { message: s, userExists: false }; }
      if (d.password) { const v = d.password; const s = Array.isArray(v) ? v.join(" ") : asString(v); if (s && /incorrect|invalid/i.test(s)) return { message: s, userExists: true }; }
      if (d.detail) { const s = asString(d.detail) ?? ""; if (/invalid credentials|invalid/i.test(s.toLowerCase())) return { message: "Incorrect email or password.", userExists: null }; if (/not found|does not exist/i.test(s.toLowerCase())) return { message: "Account not found. Please sign up.", userExists: false }; }
    }
    return { message: msg, userExists: null };
  }

  // Persist tokens but DO NOT surface token/user in the UI — instead log to console
  function persistTokensFromResponse(data: unknown): void {
    if (!data || typeof data !== "object") return;
    const obj = data as Record<string, unknown>;
    if ("token" in obj && typeof obj.token === "string") {
      try {
        localStorage.setItem("token", obj.token as string);
        localStorage.setItem("isLoggedIn", "1");
        // log token to console (developer-only)
        // eslint-disable-next-line no-console
        console.info("[auth] token saved:", obj.token);
      } catch { }
    }
    if ("user" in obj) {
      try {
        localStorage.setItem("user", JSON.stringify(obj.user));
        // log user to console (developer-only)
        // eslint-disable-next-line no-console
        console.info("[auth] user saved:", obj.user);
      } catch { }
    }
  }

  // --- Accept invitation after login (uses canonical /api/invites/accept/) ---
  async function acceptInvite(token: string) {
    if (!token) return;
    try {
      const persistToken = localStorage.getItem("token") || "";
      const res = await fetch(`${API_BASE}/api/invites/accept/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": persistToken ? `Token ${persistToken}` : "",
        },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // eslint-disable-next-line no-console
        console.warn("[acceptInvite] non-ok response", res.status, text);
        if (res.status === 401 || res.status === 403) {
          // eslint-disable-next-line no-console
          console.warn("[acceptInvite] Authorization failed when trying to accept invite; token present?", !!persistToken);
        }
      } else {
        try {
          const json = await res.json();
          // eslint-disable-next-line no-console
          console.info("[acceptInvite] accepted:", json);
        } catch { }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error accepting invite:", err);
    }
  }

  // --- Handle login submit ---
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
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
      // include invite token in the login attempt (2FA endpoint sees it if needed)
      const result = await attemptLogin({ email, password, invite: inviteToken ?? null });

      // Do NOT display raw server payload to the user. Log it instead for debugging.
      if (result.data) {
        // eslint-disable-next-line no-console
        console.debug("[login response]:", result.data);
      }

      // If server indicates 2FA is required, show modal and suspend
      if (result.data && typeof result.data === "object" && "need_2fa" in (result.data as Record<string, unknown>)) {
        setPendingCredentials({ email, password, invite: inviteToken ?? null });
        setTwoFACode("");
        setShow2FAModal(true);
        setMessage("Two-Factor required — enter the 6-digit code from your authenticator.");
        if (isMounted.current) setLoading(false);
        return;
      }

      if (result.ok) {
        // persist token / user first (so acceptInvite can use it) and log them to console
        persistTokensFromResponse(result.data);

        // do not setMessage with server payload or token — only show user-facing messages on errors
        if (inviteToken) {
          await acceptInvite(inviteToken);
        }

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
  }, [email, password, loading, router, inviteToken]);

  // --- Handle 2FA submit ---
  const handle2FASubmit = useCallback(async (e?: React.FormEvent<HTMLFormElement>) => {
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
      const result = await attemptLogin({ ...pendingCredentials, code: codeClean });

      // log server payload instead of showing it
      if (result.data) {
        // eslint-disable-next-line no-console
        console.debug("[2FA response]:", result.data);
      }

      if (result.ok) {
        persistTokensFromResponse(result.data);
        setShow2FAModal(false);

        if (inviteToken) {
          await acceptInvite(inviteToken);
        }

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
  }, [twoFACode, pendingCredentials, loading, router, inviteToken]);

  // --- JSX Render ---
  return (
    <>
      <header className="fixed-top bg-white">

        <nav className="navbar navbar-expand-lg">
          <div className="container header-container">
            <a className="navbar-brand" href="#">

              <Image
                className="login-logo img-fluid"
                src="/assets/images/new/login-logo.png"
                alt="logo"
                width={200}
                height={80}
              />

            </a>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarSupportedContent">
              <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
                <li className="nav-item">
                  <a className="nav-link active" aria-current="page" href="#">Product</a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="#">Solution</a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="#">Customer</a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="#">Resources</a>
                </li>

              </ul>
              <div className="hdr-btn-wrap d- flex gap-2">
                <a href="userLogin" className="login-link btn btn-primary text-decoration-none">Login</a>
                <a href="/UserSignup" className="signup-link btn btn-primary text-decoration-none">Sign Up</a>
              </div>
            </div>
          </div>
        </nav>


      </header>
      <section className="login-sec px-3 px-lg-0">
        <div className="login-container container">
          <div className="login-card">
            <Image className="login-logo img-fluid" src="/assets/images/new/login-logo.png" alt="logo" width={200} height={80} />
            <h2 className="login-title">Login to Dashboard</h2>
            <p className="login-subtitle">Fill form to access your account.</p>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="inputEmail" className="form-label small">Email address</label>
                <input id="inputEmail" type="email" placeholder="Email Address" className="form-control" value={email} onChange={(ev) => setEmail(ev.target.value)} required autoComplete="email" />
              </div>
              <div className="mb-3 icon-input">
                <label htmlFor="inputPassword" className="form-label small">Password</label>
                <input id="inputPassword" placeholder="Enter Password" type="password" className="form-control" value={password} onChange={(ev) => setPassword(ev.target.value)} required autoComplete="current-password" />
                <div className="forgot-link mt-1"><a className="text-decoration-none" href="/forgot-password">Forgot Password?</a></div>
              </div>

              <button type="submit" className="btn btn-primary login-btn mt-3" disabled={loading} aria-busy={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>

              <div className="flex align-items-center mt-3">
                <p className="text-center fs-6">Don't have an Account ? <a className="text-decoration-none" href="/UserSignup">Create an account</a></p>
              </div>
            </form>

            {message && (
              <div className="alert alert-info mt-3" role="alert" aria-live="polite">
                {message}
                {accountMissing && <div className="mt-2"><a href="/UserSignup" className="btn btn-sm btn-outline-primary">Go to Sign Up</a></div>}
              </div>
            )}
          </div>

          <div className="login-image-wrap text-end">
            <Image className="img-fluid" src="/assets/images/new/login-img.png" alt="login" width={600} height={600} />
          </div>
        </div>

        {/* 2FA Modal */}
        {show2FAModal && (
          <>
            <div className="modal-backdrop fade show tofa" style={{ position: "fixed", inset: 0, zIndex: 1040, backgroundColor: "rgba(0,0,0,0.45)" }} onClick={() => setShow2FAModal(false)} />
            <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShow2FAModal(false)}>
              <div className="modal-dialog modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, margin: "0 1rem" }}>
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Two-Factor Authentication</h5>
                    <button type="button" className="btn-close" onClick={() => setShow2FAModal(false)} aria-label="Close" />
                  </div>
                  <form onSubmit={handle2FASubmit}>
                    <div className="modal-body">
                      <p>Enter the 6-digit code from your authenticator app.</p>
                      <input ref={twoFAInputRef} type="text" className="form-control" maxLength={6} value={twoFACode} onChange={(ev) => setTwoFACode(ev.target.value.replace(/\D/g, ""))} placeholder="123456" inputMode="numeric" autoFocus />
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-light" onClick={() => setShow2FAModal(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Verifying..." : "Verify & Login"}</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        <style jsx>{`
        .login-sec {padding: 135px 0px 100px 0px;}
        .login-container { display: flex; gap: 2rem; align-items: center; justify-content: center; }
        .login-card { max-width: 420px; padding: 28px; border-radius: 8px; background: #fff; }
        .login-image-wrap { flex: 1 1 40%; }
        @media (max-width: 992px) { .login-container { flex-direction: column; } .login-image-wrap { display: none; }
        
        .login-card {
  
    max-width: 100%;
   padding: 10px;
    width: 100%;
}
    
    .login-container input.form-control {
    max-width: 100%;
    width: 100%;
   
}
        }
      `}</style>
      </section>


      <footer className=" text-white py-4" >
        <div className="container">
          <div className="row align-items-center mb-3 border-bottom pb-3">
            <div className="col-md-3 text-md-start text-center mb-3 mb-md-0">
              {/* <a href="#"><img className="footer-logo" src="/assets/images/landing-logo.png" alt="Logo" /></a> */}
              <a className="navbar-brand" href="#">

                <Image
                  className="footer-logo img-fluid"
                  src="/assets/images/new/white-logo.png"
                  alt="logo"
                  width={200}
                  height={80}
                />

              </a>
            </div>
            <div className="col-md-6 text-center mb-3 mb-md-0">
              <a href="#" className="text-white me-4 text-decoration-none">Product</a>
              <a href="#" className="text-white me-4 text-decoration-none">Features</a>
              <a href="#" className="text-white me-4 text-decoration-none">Pricing</a>
              <a href="#" className="text-white text-decoration-none">Support</a>
            </div>
            <div className="col-md-3 text-md-end text-center social-icons-wrap">
              <a href="#" className="text-white me-2"><svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.2071 1.9831C10.7881 2.16933 10.3458 2.28573 9.88023 2.35557C10.3458 2.07622 10.7183 1.63392 10.8812 1.0985C10.4389 1.35457 9.95006 1.5408 9.41465 1.6572C8.99562 1.2149 8.39037 0.935547 7.73856 0.935547C6.48149 0.935547 5.45721 1.95982 5.45721 3.21689C5.45721 3.40312 5.48049 3.56608 5.52705 3.72903C3.64145 3.63591 1.94208 2.72803 0.801411 1.33129C0.615178 1.68048 0.498783 2.05294 0.498783 2.47196C0.498783 3.26345 0.894527 3.96182 1.52306 4.38084C1.1506 4.35756 0.801411 4.26445 0.475504 4.10149V4.12477C0.475504 5.24216 1.26699 6.17333 2.31455 6.38284C2.12831 6.42939 1.9188 6.45267 1.70929 6.45267C1.56962 6.45267 1.40666 6.42939 1.26699 6.40612C1.56962 7.314 2.40766 7.98909 3.40866 7.98909C2.61717 8.59434 1.63945 8.96681 0.56862 8.96681C0.382388 8.96681 0.196156 8.96681 0.0332031 8.94353C1.05748 9.59534 2.24471 9.96781 3.54833 9.96781C7.76184 9.96781 10.0665 6.47595 10.0665 3.44968C10.0665 3.35656 10.0665 3.24017 10.0665 3.14705C10.5088 2.84443 10.9045 2.44868 11.2071 1.9831Z" fill="white" />
              </svg>
              </a>
              <a href="#" className="text-white me-2">
                <svg width="8" height="13" viewBox="0 0 8 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.70873 12.3038V6.75026H0.839844V4.58594H2.70873V2.98981C2.70873 1.13752 3.84005 0.128906 5.49242 0.128906C6.28392 0.128906 6.96418 0.187836 7.16243 0.214175V2.14993L6.01642 2.15045C5.11776 2.15045 4.94376 2.57748 4.94376 3.20411V4.58594H7.08697L6.80791 6.75026H4.94376V12.3038H2.70873Z" fill="white" />
                </svg>

              </a>
              <a href="#" className="text-white me-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.00076 1.44721C8.80947 1.44721 9.02366 1.45398 9.73818 1.48656C10.1678 1.49182 10.5933 1.5707 10.9962 1.71979C11.2884 1.83248 11.5538 2.00511 11.7753 2.22656C11.9967 2.44802 12.1694 2.71339 12.282 3.00559C12.4311 3.40853 12.51 3.83406 12.5153 4.26366C12.5475 4.97817 12.5546 5.19237 12.5546 7.00108C12.5546 8.80979 12.5479 9.02398 12.5153 9.7385C12.51 10.1681 12.4311 10.5936 12.282 10.9966C12.1694 11.2888 11.9967 11.5541 11.7753 11.7756C11.5538 11.997 11.2884 12.1697 10.9962 12.2824C10.5933 12.4315 10.1678 12.5103 9.73818 12.5156C9.02398 12.5479 8.80979 12.5549 7.00076 12.5549C5.19172 12.5549 4.97753 12.5482 4.26334 12.5156C3.83373 12.5103 3.40821 12.4315 3.00527 12.2824C2.71307 12.1697 2.44769 11.997 2.22624 11.7756C2.00479 11.5541 1.83216 11.2888 1.71947 10.9966C1.57038 10.5936 1.4915 10.1681 1.48624 9.7385C1.45398 9.02398 1.44689 8.80979 1.44689 7.00108C1.44689 5.19237 1.45366 4.97817 1.48624 4.26366C1.4915 3.83406 1.57038 3.40853 1.71947 3.00559C1.83216 2.71339 2.00479 2.44802 2.22624 2.22656C2.44769 2.00511 2.71307 1.83248 3.00527 1.71979C3.40821 1.5707 3.83373 1.49182 4.26334 1.48656C4.97785 1.4543 5.19205 1.44721 7.00076 1.44721ZM7.00076 0.226562C5.16205 0.226562 4.93043 0.234304 4.20785 0.267208C3.64561 0.278391 3.08934 0.384847 2.56269 0.582046C2.11092 0.752261 1.70172 1.019 1.36366 1.36366C1.01869 1.70184 0.751722 2.11127 0.581401 2.56334C0.384201 3.08998 0.277746 3.64625 0.266563 4.2085C0.234304 4.93043 0.226562 5.16205 0.226562 7.00076C0.226562 8.83946 0.234304 9.07108 0.267208 9.79366C0.278391 10.3559 0.384847 10.9122 0.582046 11.4388C0.752178 11.8908 1.01892 12.3002 1.36366 12.6385C1.70191 12.9832 2.11133 13.25 2.56334 13.4201C3.08998 13.6173 3.64626 13.7238 4.2085 13.7349C4.93108 13.7672 5.16172 13.7756 7.0014 13.7756C8.84108 13.7756 9.07172 13.7679 9.7943 13.7349C10.3565 13.7238 10.9128 13.6173 11.4395 13.4201C11.8893 13.2457 12.2978 12.9794 12.6389 12.6381C12.98 12.2968 13.246 11.8882 13.4201 11.4382C13.6173 10.9115 13.7238 10.3553 13.735 9.79301C13.7672 9.07108 13.775 8.83946 13.775 7.00076C13.775 5.16205 13.7672 4.93043 13.7343 4.20785C13.7231 3.64561 13.6167 3.08934 13.4195 2.56269C13.2493 2.11068 12.9826 1.70126 12.6379 1.36301C12.2996 1.01828 11.8902 0.751533 11.4382 0.581401C10.9115 0.384201 10.3553 0.277746 9.79301 0.266563C9.07108 0.234304 8.83947 0.226562 7.00076 0.226562Z" fill="white" />
                  <path d="M7.00215 3.52344C6.31413 3.52344 5.64155 3.72746 5.06948 4.10971C4.49741 4.49195 4.05154 5.03525 3.78824 5.6709C3.52494 6.30655 3.45605 7.00601 3.59028 7.68081C3.72451 8.35561 4.05582 8.97546 4.54233 9.46197C5.02884 9.94847 5.64868 10.2798 6.32349 10.414C6.99829 10.5482 7.69774 10.4794 8.33339 10.2161C8.96904 9.95276 9.51234 9.50689 9.89459 8.93481C10.2768 8.36274 10.4809 7.69017 10.4809 7.00215C10.4809 6.07954 10.1144 5.19471 9.46197 4.54233C8.80958 3.88994 7.92476 3.52344 7.00215 3.52344ZM7.00215 9.26021C6.55555 9.26021 6.11897 9.12778 5.74764 8.87966C5.3763 8.63154 5.08688 8.27888 4.91597 7.86627C4.74506 7.45366 4.70034 6.99964 4.78747 6.56162C4.8746 6.1236 5.08966 5.72125 5.40546 5.40545C5.72125 5.08966 6.1236 4.8746 6.56162 4.78747C6.99964 4.70034 7.45367 4.74506 7.86627 4.91597C8.27888 5.08687 8.63154 5.3763 8.87966 5.74763C9.12778 6.11897 9.26021 6.55554 9.26021 7.00215C9.26021 7.60102 9.02231 8.17537 8.59884 8.59884C8.17537 9.02231 7.60102 9.26021 7.00215 9.26021Z" fill="white" />
                  <path d="M10.6176 4.19807C11.0665 4.19807 11.4305 3.83412 11.4305 3.38517C11.4305 2.93621 11.0665 2.57227 10.6176 2.57227C10.1686 2.57227 9.80469 2.93621 9.80469 3.38517C9.80469 3.83412 10.1686 4.19807 10.6176 4.19807Z" fill="white" />
                </svg>

              </a>
              <a href="#" className="text-white">

                <svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M6.6088 0.226562C3.01786 0.226562 0.128906 3.11552 0.128906 6.70646C0.128906 9.56841 1.99188 11.9984 4.55684 12.8624C4.88083 12.9164 4.98883 12.7274 4.98883 12.5384C4.98883 12.3764 4.98883 11.9714 4.98883 11.4314C3.17986 11.8364 2.80186 10.5674 2.80186 10.5674C2.50487 9.81141 2.07287 9.62241 2.07287 9.62241C1.47888 9.21742 2.12687 9.21742 2.12687 9.21742C2.77486 9.27142 3.12586 9.89241 3.12586 9.89241C3.69285 10.8914 4.63783 10.5944 5.01583 10.4324C5.06983 10.0004 5.23182 9.73041 5.42082 9.56841C3.98984 9.40642 2.47787 8.83942 2.47787 6.35546C2.47787 5.65347 2.72086 5.05948 3.15286 4.62749C3.09886 4.46549 2.85586 3.8175 3.20686 2.89952C3.20686 2.89952 3.74685 2.73752 4.98883 3.57451C5.50182 3.43951 6.06881 3.35851 6.6088 3.35851C7.14879 3.35851 7.71578 3.43951 8.22878 3.57451C9.47076 2.73752 10.0107 2.89952 10.0107 2.89952C10.3617 3.79051 10.1457 4.43849 10.0647 4.62749C10.4697 5.08648 10.7397 5.65347 10.7397 6.35546C10.7397 8.83942 9.22776 9.37942 7.76978 9.54141C8.01278 9.73041 8.20178 10.1354 8.20178 10.7294C8.20178 11.5934 8.20178 12.2954 8.20178 12.5114C8.20178 12.6734 8.30977 12.8894 8.66077 12.8354C11.2257 11.9984 13.0887 9.56841 13.0887 6.70646C13.0887 3.11552 10.1997 0.226562 6.6088 0.226562Z" fill="white" />
                </svg>

              </a>
            </div>
          </div>
          <div className="text-center small">
            © Copyright 2022, All Rights Reserved by Tech Flow
          </div>
        </div>
      </footer>




    </>
  );
}
