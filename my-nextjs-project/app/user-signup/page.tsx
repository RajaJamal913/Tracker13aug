// signup 
"use client";

import { useState, FormEvent } from 'react';
import Head from 'next/head';
import { useRouter } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css"; // Bootstrap CSS
export default function SignupPage() { 
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message,  setMessage]  = useState('');
  const router = useRouter();

  // const handleSubmit = async (e) => {
  const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
    if (!username || !email || !phone || !password) {
      setMessage('❌ Please fill all fields.');
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${JSON.stringify(data)}`);
        return;
      }
      // store token & redirect
      localStorage.setItem("token", data.token);
      router.push("/user-login");
    } catch (err) {
      console.error(err);
      setMessage("❌ Signup failed.");
    }
  };

  return (
    <>
      <Head><title>Signup</title></Head>
      <section className="vh-100">
        <div className="container py-5 h-100">
          <div className="row d-flex align-items-center justify-content-center rounded-4" style={{border:"1px solid black"}}>
            <div className="col-md-8 col-lg-7 col-xl-6 text-center py-5 px-3">
              <img src="/assets/images/signup-new.png" className="img-fluid Signup-img" alt="Signup" />
              
            </div>
            <div className="col-md-7 col-lg-5 col-xl-5" style={{borderLeft:"1px solid black"}}>
              <div className=" p-4 rounded-3">
              <h2 className="fw-bold mb-4">Signup</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Choose a username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Enter your phone"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div className="mb-3 ">
                  <label className="form-label">Password</label>
                  <div className="pas-wrap position-relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Create password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="position-absolute end-0 top-50 translate-middle-y pe-3"
                    style={{ cursor: "pointer", color: "#0d6efd",fontSize: "14px !important" }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </span>

                  </div>
                </div>
                <button type="submit" className=" g-btn w-100 mb-3">Sign up</button>
                {message && <div className="alert alert-info">{message}</div>}
              </form>
              <div className="text-center mt-2">
  Already have an account?{" "}
  <a href="/user-login" style={{ color: "#0d6efd", textDecoration: "underline", cursor: "pointer" }}>
    User Login
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
