"use client";
// This tells Next JS to never statically prerender this route
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import "bootstrap/dist/css/bootstrap.min.css";
import { useRouter } from "next/navigation";
import BootstrapClient from "@/components/BootstrapClient";

export default function LoginPage() {
  useEffect(() => {
    // import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

  // --- Sign up state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setMessage("");

    // Basic client-side validation
    if (!firstName.trim() || !email.trim() || !password) {
      setMessage("❌ Please fill all required fields.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("❌ Passwords do not match.");
      return;
    }

    setLoading(true);

    // Use first name as username (fallback to email-prefix or generated string)
    const deriveUsername = () => {
      if (firstName && firstName.trim()) return firstName.trim();
      if (email && email.includes("@")) return email.split("@")[0];
      return `user${Math.floor(Math.random() * 900) + 100}`;
    };

    const usernameToSend = deriveUsername();

    try {
      const res = await fetch(`${API_BASE}/api/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameToSend,
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          password2: confirmPassword, // include if backend expects it
        }),
        // If backend returns HttpOnly cookie set, use credentials: "include" and configure backend.
        // credentials: "include",
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (err) {
        console.error("Failed to parse JSON response", err);
      }

      if (!res.ok) {
        const errMsg =
          (data && (data.non_field_errors || data.detail || data.errors)) ||
          "Registration failed. Please check your input.";
        setMessage(`❌ ${Array.isArray(errMsg) ? errMsg.join(" ") : errMsg}`);
        setLoading(false);
        return;
      }

      // Success path
      if (data && data.token) {
        localStorage.setItem("token", data.token);
        router.push("/dashboard");
        return;
      }

      setMessage("✅ Account created successfully. Redirecting to login...");
      router.push("/userLogin");
    } catch (err) {
      console.error(err);
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
          <linearGradient
            id="paint0_linear_29_5221"
            x1="-0.683594"
            y1="89.6266"
            x2="1607.32"
            y2="89.6266"
            gradientUnits="userSpaceOnUse"
          >
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
          <linearGradient
            id="paint0_linear_29_5220"
            x1="-0.704553"
            y1="-13.0858"
            x2="1607.27"
            y2="-13.0858"
            gradientUnits="userSpaceOnUse"
          >
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
              <img className="footer-logo" src="/assets/images/tracker-logo-latest.png" alt="" />
            </a>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
              <span className="navbar-toggler-icon"></span>
            </button>

          </div>
        </nav>
      </header>

      {/* Wave Section */}
      <section className="wave-section pt-lg-5 pb-lg-5 position-relative z-2 overflow-hidden signup-sec">
        <div className="container py-5">
          <div className="row justify-content-center">
            {/* Left Section */}
            <div className={`col-md-5 d-flex align-items-center justify-content-center left-pannel px-0 position-relative`}>
              <div className="text-center px-4">
                <Image src="/assets/images/signup-graphic.webp" alt="Login Illustration" width={400} height={300} />
              </div>
            </div>

            {/* Right Section */}
            <div className="col-md-4 d-flex align-items-center justify-content-center bg-white px-0 right-pannel tr-signup">
              <div className="welcome-banner-bar">
                <h6 className="welcome-banner-txt text-white mb-2 fw-semibold text-end">Lets Get Started</h6>
              </div>
              <div className="p-4 w-100" style={{ maxWidth: "400px" }}>
                <h3 className="fw-bold text-purple mb-4">Sign Up</h3>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label text-muted" htmlFor="firstName">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      className="form-control rounded-0"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted" htmlFor="lastName">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      className="form-control rounded-0"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted" htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="form-control rounded-0"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
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
                  <div className="mb-4">
                    <label className="form-label text-muted" htmlFor="confirmPassword">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      className="form-control rounded-0"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="text-center">
                    <button className="btn g-btn mx-auto px-5" type="submit" disabled={loading}>
                      {loading ? "Signing up..." : "Sign Up"}
                    </button>
                  </div>

                  <div className="mt-3 text-center no-account-wrapper">
                    <small className="">
                      Already have an account? <a href="/userLogin" className="fw-bold">Sign In</a>
                    </small>
                    <br />
                    <a href="#" className="text-purple small d-block mt-2">Forgot Password</a>
                  </div>

                  {/* message */}
                  {message && (
                    <div className="alert alert-info mt-3" role="alert">
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
              <a href="#" className="text-white me-2">
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                </svg>
              </a>
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
        .btn-custom {
          background-color: #a64bf4;
          color: white;
          border: none;
        }
        .btn-custom:hover {
          background-color: #922be0;
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

        // ===

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
        .wave-section {
          /* background: linear-gradient(to right, #a64bf4, #9c27b0); */
          color: rgb(0, 0, 0);
          padding-bottom: 80px;
          position: relative;
          margin-top: 80px;
        }
        .btn-custom {
          background-color: #a64bf4;
          color: white;
          border: none;
        }

        .footer-logo {
          max-width: 230px;
          width: 100%;
          height: auto;
        }
        footer {
          background: linear-gradient(282deg, #9a4afd, #955add, #6e34b5);
          background: linear-gradient(282deg, rgb(150, 72, 246), rgb(92, 44, 151));
          background: linear-gradient(90deg, #7C29AB 0%, #9C51C7 50%, #5C2C97 100%);
        }

        img.jsx-f98fbb6bd46d29de.footer-logo {
          max-width: 230px;
          width: 100%;
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
      `}</style>
    </div>
  );
}
