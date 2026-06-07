"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/constants";

export default function SellerLoginPage() {
  const router = useRouter();
  const { login, register, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      if (isRegister) {
        await register(email, password, "SELLER");
      } else {
        await login(email, password);
      }
      router.push(ROUTES.SELLER_DASHBOARD);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-primary p-10 rounded-md w-full max-w-lg shadow-xl">
        <h1 className="font-display text-2xl text-white text-center mb-8">
          {isRegister ? "Seller Register" : "Seller Login"}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="bg-danger/20 border border-danger text-red-200 p-3 rounded-sm text-sm font-body">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="font-body text-sm text-white/70">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seller@kivy.com"
              autoComplete="email"
              className="p-3 rounded-sm border border-white/20 bg-white/10 text-white font-body text-base
                placeholder:text-white/40 focus:border-secondary focus:outline-none transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="font-body text-sm text-white/70">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="p-3 rounded-sm border border-white/20 bg-white/10 text-white font-body text-base
                placeholder:text-white/40 focus:border-secondary focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 p-3 bg-secondary text-white rounded-sm font-body text-base font-semibold
              hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
              transition-transform cursor-pointer"
          >
            {isLoading
              ? isRegister
                ? "Creating account..."
                : "Signing in..."
              : isRegister
              ? "Create Account"
              : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="text-sm font-body text-secondary hover:underline cursor-pointer bg-transparent border-none outline-none"
          >
            {isRegister
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </button>
        </div>

        <div className="mt-6 text-center border-t border-white/10 pt-4">
          <a
            href="/admin/login"
            className="text-sm font-body text-white/50 hover:text-white hover:underline transition-colors"
          >
            👮 Admin Login
          </a>
        </div>

        {!isRegister && (
          <div
            onClick={() => {
              setEmail("seller@kivy.com");
              setPassword("sellerpassword");
            }}
            className="mt-6 p-4 rounded bg-white/5 border border-dashed border-white/10 hover:bg-white/10 transition-colors cursor-pointer text-center flex flex-col gap-1"
            title="Click to auto-fill credentials"
          >
            <span className="text-xs text-white/40 uppercase font-semibold font-body tracking-wider">
              💡 Default Credentials (Click to auto-fill)
            </span>
            <span className="text-sm text-white/80 font-mono mt-1">
              Email: <strong className="text-secondary">seller@kivy.com</strong>
            </span>
            <span className="text-sm text-white/80 font-mono">
              Pass: <strong className="text-secondary">sellerpassword</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
