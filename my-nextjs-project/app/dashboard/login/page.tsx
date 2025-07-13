"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaEnvelope, FaLock } from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        // Handle error response
        console.error("Login failed");
        return;
      }
      const data = await res.json();
      console.log("Logged in successfully. Token:", data.token);
      // Store the token if needed, then redirect to the dashboard:
      router.push("/dashboard");
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-[60%] flex bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Left Side - Welcome Message with Background Image & Gradient Overlay */}
        <div
          className="w-1/2 relative text-white flex flex-col justify-center p-8 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/images/logbg.jpg')" }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-blue-600 opacity-75"></div>
          {/* Content */}
          <div className="relative z-10">
            <h2 className="text-3xl font-bold">WEBWIZ TRACKER SYSTEM</h2>
            <p className="text-2xl mt-2">Welcome Back</p>
            <p className="mt-2 text-sm">Nice to see you again</p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-1/2 p-8">
          <h2 className="text-3xl font-medium mb-6">Login Account</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field with Icon */}
            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                placeholder="Email ID"
                className="w-full pl-12 p-3 border border-gray-300 bg-gray-50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Field with Icon */}
            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                placeholder="Password"
                className="w-full pl-12 p-3 border border-gray-300 bg-gray-50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Keep me signed in checkbox */}
            <div className="flex items-center">
              <input type="checkbox" id="keepSignedIn" className="mr-2" />
              <label htmlFor="keepSignedIn" className="text-gray-700">
                Keep me signed in
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-full hover:bg-blue-700 transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
