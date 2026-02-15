"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css";
 const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000/";
 const API_BASE = `${API_BASE_URL}api/`;
export default function VerifyCodePage() {
  const DIGITS = 6;
  const [code, setCode] = useState<string[]>(Array(DIGITS).fill(""));
  const inputsRef = useRef<HTMLInputElement[]>([]);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // focus first input on mount
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (value: string, index: number) => {
    // allow only digits
    const lastChar = value.slice(-1);
    const digit = /\d/.test(lastChar) ? lastChar : "";
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < DIGITS - 1) {
      // move focus to next
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      if (code[idx]) {
        // clear current
        const newCode = [...code];
        newCode[idx] = "";
        setCode(newCode);
      } else if (idx > 0) {
        // move to previous and clear it
        inputsRef.current[idx - 1]?.focus();
        const newCode = [...code];
        newCode[idx - 1] = "";
        setCode(newCode);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < DIGITS - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  // supports pasting the full code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").trim();
    const digits = pasted.replace(/\D/g, "").slice(0, DIGITS);
    if (digits.length === 0) return;
    const newCode = Array(DIGITS).fill("");
    for (let i = 0; i < digits.length; i++) newCode[i] = digits[i];
    setCode(newCode);
    // focus next empty or last
    const nextIndex = Math.min(digits.length, DIGITS - 1);
    inputsRef.current[nextIndex]?.focus();
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const entered = code.join("");
    if (entered.length !== DIGITS || /\D/.test(entered)) {
      setError(`Enter the ${DIGITS}-digit code.`);
      return;
    }

    // get email from sessionStorage (set by forgot page)
    const email = (typeof window !== "undefined" && sessionStorage.getItem("passwordResetEmail")) || "";
    if (!email) {
      setError("Missing email — please re-start the forgot password flow.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/password-reset/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: entered }),
      });

      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

      if (res.ok) {
        const token = data.reset_token;
        if (!token) {
          setError("Server did not return a reset token. Try requesting a new code.");
        } else {
          try { sessionStorage.setItem("passwordResetToken", String(token)); } catch (_) {}
          setMessage("Code verified — redirecting to reset password...");
          setTimeout(() => router.push("/reset-password"), 700);
        }
      } else {
        const serverMsg = data.detail || data.error || text || `HTTP ${res.status}`;
        setError(serverMsg);
      }
    } catch (err: any) {
      console.error("Verify error:", err);
      setError("Network error. Check server or CORS.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-main">
      {/* Waves (kept same) */}
      <svg className="header-wave-1" width="1601" height="179" viewBox="0 0 1601 179" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M232.103 122.45C141.213 90.3102 90.2161 91.1818 -0.683594 122.45V0.804688H1607.32V149.303C1562.32 176.64 1453.72 181.868 1385.72 176.64C1229.39 164.623 1117.01 136.095 1068.66 122.45C891.815 72.5319 815.995 57.9616 601.526 122.45C461.147 173.456 380.08 170.887 232.103 122.45Z" fill="url(#paint0_linear_29_5221)" />
        <defs><linearGradient id="paint0_linear_29_5221" x1="-0.683594" y1="89.6266" x2="1607.32" y2="89.6266" gradientUnits="userSpaceOnUse"><stop offset="0.5" stopColor="#9C51C7" /></linearGradient></defs>
      </svg>

      <svg className="header-wave-2" width="1601" height="235" viewBox="0 0 1601 235" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path opacity="0.95" d="M323.836 51.7684C240.584 209.143 171.31 251.483 -0.683594 228.654V-13.0898H1607.32V98.938V119.498L1310.87 210.966C1185.2 252.167 1062.36 134.82 985.713 119.498C909.062 104.177 703.355 266.037 573.922 119.498L323.836 51.7684Z" fill="url(#paint0_linear_29_5220)" />
        <defs><linearGradient id="paint0_linear_29_5220" x1="-0.704553" y1="-13.0858" x2="1607.27" y2="-13.0858" gradientUnits="userSpaceOnUse"><stop stopColor="#E79D5A" /><stop offset="1" stopColor="#F2D05F" /></linearGradient></defs>
      </svg>

      {/* Header */}
      <header className="landing-header position-relative z-3">
        <nav className="navbar navbar-expand-lg navbar-dark border-bottom">
          <div className="container">
            <a className="navbar-brand" href="#"><img className="footer-logo" src="/assets/images/tracker-logo-latest.png" alt="Logo" /></a>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"><span className="navbar-toggler-icon"></span></button>
          </div>
        </nav>
      </header>

      {/* Wave Section */}
      <section className="wave-section pt-lg-5 pb-lg-5 position-relative z-2 overflow-hidden">
        <div className="container py-5">
          <div className="row justify-content-center">
            {/* Left */}
            <div className="col-md-5 d-flex align-items-center justify-content-center left-pannel px-0 position-relative">
              <div className="text-center px-4"><img src="/assets/images/OTP.png" alt="OTP" width={400} height={300} /></div>
            </div>

            {/* Right */}
            <div className="col-md-4 d-flex align-items-center justify-content-center bg-white px-0 right-pannel">
              <div className="p-4 w-100 form-wrapper">
                <h3 className="fw-bold text-purple mb-4">Enter Verification Code</h3>

                <form onSubmit={handleSubmit}>
                  <div className="d-flex justify-content-between mb-3">
                    {code.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { inputsRef.current[idx] = el!; }}
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        className="form-control mx-1 text-center"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(e.target.value, idx)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        onPaste={handlePaste}
                        style={{ width: "50px", height: "50px", fontSize: 20 }}
                        required
                      />
                    ))}
                  </div>

                  {error && <div className="alert alert-danger">{error}</div>}
                  {message && <div className="alert alert-success">{message}</div>}

                  <div className="text-center mt-4">
                    <button type="submit" className="btn g-btn" disabled={loading}>
                      {loading ? "Verifying..." : "Submit Code"}
                    </button>
                  </div>
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

      <footer className=" text-white py-4">
        <div className="container">
          <div className="row align-items-center mb-3 border-bottom pb-3">
            <div className="col-md-3 text-md-start text-center mb-3 mb-md-0"><a href="#"><img className="footer-logo" src="/assets/images/landing-logo.png" alt="Logo" /></a></div>
            <div className="col-md-6 text-center mb-3 mb-md-0">
              <a href="#" className="text-white me-4 text-decoration-none">Product</a>
              <a href="#" className="text-white me-4 text-decoration-none">Features</a>
              <a href="#" className="text-white me-4 text-decoration-none">Pricing</a>
              <a href="#" className="text-white text-decoration-none">Support</a>
            </div>
            <div className="col-md-3 text-md-end text-center social-icons-wrap">
              <a href="#" className="text-white me-2">
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.2071 1.9831C10.7881 2.16933 10.3458 2.28573 9.88023 2.35557C10.3458 2.07622 10.7183 1.63392 10.8812 1.0985C10.4389 1.35457 9.95006 1.5408 9.41465 1.6572C8.99562 1.2149 8.39037 0.935547 7.73856 0.935547C6.48149 0.935547 5.45721 1.95982 5.45721 3.21689C5.45721 3.40312 5.48049 3.56608 5.52705 3.72903C3.64145 3.63591 1.94208 2.72803 0.801411 1.33129C0.615178 1.68048 0.498783 2.05294 0.498783 2.47196C0.498783 3.26345 0.894527 3.96182 1.52306 4.38084C1.1506 4.35756 0.801411 4.26445 0.475504 4.10149V4.12477C0.475504 5.24216 1.26699 6.17333 2.31455 6.38284C2.12831 6.42939 1.9188 6.45267 1.70929 6.45267C1.56962 6.45267 1.40666 6.42939 1.26699 6.40612C1.56962 7.314 2.40766 7.98909 3.40866 7.98909C2.61717 8.59434 1.63945 8.96681 0.56862 8.96681C0.382388 8.96681 0.196156 8.96681 0.0332031 8.94353C1.05748 9.59534 2.24471 9.96781 3.54833 9.96781C7.76184 9.96781 10.0665 6.47595 10.0665 3.44968C10.0665 3.35656 10.0665 3.24017 10.0665 3.14705C10.5088 2.84443 10.9045 2.44868 11.2071 1.9831Z" fill="white"/></svg>
              </a>
            </div>
          </div>
          <div className="text-center small">© Copyright 2022, All Rights Reserved by Webwiz</div>
        </div>
      </footer>

      <style jsx>{`
        .wave-section { color: rgb(0,0,0); padding-bottom: 80px; position: relative; margin-top: 80px; }
        .form-wrapper { max-width: 400px; padding-top: 100px; padding-bottom: 60px; }
        .right-pannel input { border-right: 0; border-left: 0; border: 1px solid #827ddc !important; }
      `}</style>
    </div>
  );
}
