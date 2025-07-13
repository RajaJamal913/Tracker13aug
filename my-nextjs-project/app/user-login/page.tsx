"use client";
import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css"; // Bootstrap CSS
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${data.non_field_errors || data.detail || "Login failed"}`);
        return;
      }
      // store token & redirect
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setMessage("❌ Unable to reach server.");
    }
  };

  return (
    <>
      <Head>
        <title>Login</title>
      </Head>

      <section className="vh-100">
        <div className="container py-5 h-100">
          <div className="row d-flex align-items-center justify-content-center rounded-4" style={{border:"1px solid black"}}>
            <div className="col-md-8 col-lg-7 col-xl-6 text-center px-lg-0 py-5">
              <img
                src="/assets/images/signup-new.png"
                className="img-fluid mx-auto"
                alt="Login"
                style={{maxWidth:"450px"}}
              />
            </div>

            <div className="col-md-7 col-lg-5 col-xl-5" style={{borderLeft:"1px solid black"}}>
              <div className="p-4 rounded-3">
              <h2 className="fw-bold mb-4">Login</h2>

              <form onSubmit={handleSubmit}>
                {/* Email */}
                <div className="form-outline mb-4">
                  <label className="form-label">Email address</label>
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Password */}
                <div className="form-outline mb-4 ">
                    <label className="form-label">Password</label>
                  <div className="pas-wrap position-relative">

                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control form-control-lg"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="position-absolute end-0 top-50 translate-middle-y me-3"
                    style={{ cursor: "pointer", color: "#0d6efd" }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </span>
                  </div>
                </div>

                {/* Remember & Forgot */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="rememberMe"
                      defaultChecked
                    />
                    <label className="form-check-label" htmlFor="rememberMe">
                      Remember me
                    </label>
                  </div>
                  <a href="#">Forgot password?</a>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="g-btn w-100 mb-3"
                >
                  Sign in
                </button>

                {/* Message */}
                {message && (
                  <div className="alert alert-info mt-3" role="alert">
                    {message}
                  </div>
                )}
              </form>
               <div className="text-center mt-2">
  New user must registered{" "}
  <a href="/user-signup" style={{ color: "#0d6efd", textDecoration: "underline", cursor: "pointer" }}>
    User Signup
  </a>
  </div>

              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
