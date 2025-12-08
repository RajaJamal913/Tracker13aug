"use client";
export const dynamic = "force-dynamic";

import React, { JSX, useEffect, useState } from "react";
import Image from "next/image";
import "bootstrap/dist/css/bootstrap.min.css";
import { useRouter } from "next/navigation";

type ErrorsMap = Record<string, string[]>;

export default function SignupPage(): JSX.Element {
  const router = useRouter();

  // derive invite token on client to avoid prerender/useSearchParams SSR issues
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    // Only run in browser — window is available here
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("invite") || params.get("token") || null;
      setInviteToken(token);
    } catch (err) {
      setInviteToken(null);
    }
  }, []);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

  // form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ui state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ErrorsMap>({});

  useEffect(() => {
    // optional: prefill email from invite metadata if you want
    // e.g. fetch invite details and setEmail(...)
  }, [inviteToken]);

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      if (!prev || !prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  const normalizeErrors = (data: any): ErrorsMap => {
    const out: ErrorsMap = {};
    if (!data) return out;

    if (typeof data === "string") {
      out.non_field_errors = [data];
      return out;
    }

    if (data.detail) {
      out.non_field_errors = Array.isArray(data.detail) ? data.detail : [String(data.detail)];
    }

    if (typeof data === "object") {
      for (const [k, v] of Object.entries(data)) {
        if (k === "detail") continue;
        if (Array.isArray(v)) out[k] = v.map((x) => String(x));
        else if (typeof v === "object" && v !== null) out[k] = [JSON.stringify(v)];
        else out[k] = [String(v)];
      }
    }

    return out;
  };

  const deriveUsername = (): string => {
    if (firstName && firstName.trim()) return firstName.trim();
    if (email && email.includes("@")) return email.split("@")[0];
    return `user${Math.floor(Math.random() * 900) + 100}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setMessage("");
    setErrors({});

    // basic client validation
    if (!firstName.trim() || !email.trim() || !password) {
      setMessage("❌ Please fill all required fields.");
      const tmp: ErrorsMap = {};
      if (!firstName.trim()) tmp.first_name = ["First name is required."];
      if (!email.trim()) tmp.email = ["Email is required."];
      if (!password) tmp.password = ["Password is required."];
      setErrors(tmp);
      return;
    }

    if (password !== confirmPassword) {
      const tmp: ErrorsMap = { password: ["Passwords do not match."] };
      setErrors(tmp);
      setMessage("❌ Passwords do not match.");
      return;
    }

    setLoading(true);
    const usernameToSend = deriveUsername();

    try {
      const payload: any = {
        username: usernameToSend,
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        password2: confirmPassword,
      };
      if (inviteToken) payload.invite = inviteToken;

      const res = await fetch(`${API_BASE}/api/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        const normalized = normalizeErrors(data);
        setErrors(normalized);

        if (normalized.non_field_errors && normalized.non_field_errors.length) {
          setMessage(`❌ ${normalized.non_field_errors.join(" ")}`);
        } else {
          const firstField = Object.keys(normalized)[0];
          if (firstField) {
            const firstMsgs = normalized[firstField];
            setMessage(`❌ ${firstMsgs.join(" ")}`);
          } else {
            setMessage("❌ Registration failed. Please check the form for errors.");
          }
        }

        setLoading(false);
        return;
      }

      // If backend returned a token (auto-login), persist it
      if (data && data.token) {
        try {
          localStorage.setItem("token", data.token);
          localStorage.setItem("isLoggedIn", "1");
          if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        } catch {
          /* ignore storage errors */
        }

        setMessage("✅ Account created and logged in. Redirecting...");
        // backend likely attached the invite if provided; safe to go to dashboard
        setTimeout(() => router.replace("/dashboard"), 800);
        return;
      }

      // No token returned — user must log in
      setMessage("✅ Account created. Please log in to continue.");
      const next = inviteToken ? `/userLogin?invite=${encodeURIComponent(inviteToken)}` : "/userLogin";
      setTimeout(() => router.push(next), 900);
    } catch (err) {
      console.error("Signup error", err);
      setMessage("❌ Unable to reach server. Check API URL or network.");
    } finally {
      setLoading(false);
    }
  };

  const renderFieldError = (field: string) => {
    const e = errors[field];
    if (!e || e.length === 0) return null;
    return (
      <div className="invalid-feedback d-block">
        {e.map((m, i) => (
          <div key={i}>{m}</div>
        ))}
      </div>
    );
  };

  const loginHref = `/userLogin${inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : ""}`;

  return (
    <section className="login-sec">
      <div className="login-container sign-up-container container">
        <div className="login-card">
          <Image className="login-logo img-fluid" src="/assets/images/new/login-logo.png" alt="logo" width={200} height={80} />
          <h2 className="login-title">Sign Up</h2>
          <p className="login-subtitle">Fill form to create your account.</p>

          {inviteToken && (
            <div className="alert alert-info">
              You are signing up using an invite. After registration your invite will be attached to this account.
            </div>
          )}

          {message && <div className={`alert ${Object.keys(errors).length ? "alert-danger" : "alert-info"} mt-2`}>{message}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="first_name" className="form-label small">
                First Name
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                className={`form-control ${errors["first_name"] ? "is-invalid" : ""}`}
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  clearFieldError("first_name");
                }}
                required
              />
              {renderFieldError("first_name")}
            </div>

            <div className="mb-3">
              <label htmlFor="last_name" className="form-label small">
                Last Name
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                className={`form-control ${errors["last_name"] ? "is-invalid" : ""}`}
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  clearFieldError("last_name");
                }}
              />
              {renderFieldError("last_name")}
            </div>

            <div className="mb-3 icon-input">
              <label htmlFor="email" className="form-label small">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`form-control ${errors["email"] ? "is-invalid" : ""}`}
                placeholder="Email Address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                required
              />
              {renderFieldError("email")}
            </div>

            <div className="mb-3 icon-input">
              <label htmlFor="password" className="form-label small">
                Password
              </label>
              <div className="position-relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={`form-control ${errors["password"] ? "is-invalid" : ""}`}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="btn btn-link position-absolute end-0 top-50 translate-middle-y me-3 p-0"
                  style={{ textDecoration: "none" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {renderFieldError("password")}
            </div>

            <div className="mb-3 icon-input">
              <label htmlFor="password2" className="form-label small">
                Confirm Password
              </label>
              <input
                id="password2"
                name="password2"
                type="password"
                className={`form-control ${errors["password2"] ? "is-invalid" : ""}`}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError("password2");
                }}
                required
              />
              {renderFieldError("password2")}
            </div>

            <div className="text-center">
              <button className="btn btn-primary login-btn mt-3" type="submit" disabled={loading}>
                {loading ? "Signing up..." : "Sign Up"}
              </button>
            </div>

            <div className="mt-3 text-center no-account-wrapper">
              <small>
                Already have an account?{" "}
                <a href={loginHref} className="fw-bold">
                  Sign In
                </a>
              </small>
            </div>
          </form>
        </div>

        <div className="login-image-wrap text-end d-none d-md-block">
          <Image className="img-fluid" src="/assets/images/new/signup-img.png" alt="signup" width={600} height={600} />
        </div>
      </div>

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
          max-width: 520px;
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
