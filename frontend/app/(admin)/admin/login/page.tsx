'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, logout, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password cannot be empty');
      return;
    }

    try {
      const profile = await login(email, password);
      if (!profile || profile.role !== 'ADMIN') {
        await logout();
        setError('Only Administrator accounts are allowed access!');
        return;
      }

      router.push(ROUTES.ADMIN_DASHBOARD);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="bg-[#072C2C] p-10 rounded-md w-full max-w-lg shadow-xl border border-white/5">
        <div className="flex flex-col gap-1 text-center mb-8">
          <span className="font-display text-xs text-[#FF5F03] font-bold tracking-widest uppercase">
            Console
          </span>
          <h1 className="font-display text-2xl text-white font-bold uppercase tracking-wider">
            Admin Login
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="bg-danger/20 border border-danger text-red-200 p-3 rounded-sm text-sm font-body">
              ⚠️ {error}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="font-body text-sm text-white/70">
              Admin Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kivy.com"
              autoComplete="email"
              className="p-3 rounded-sm border border-white/20 bg-white/10 text-white font-body text-base
                placeholder:text-white/40 focus:border-[#FF5F03] focus:outline-none transition-colors"
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
                placeholder:text-white/40 focus:border-[#FF5F03] focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 p-3 bg-[#FF5F03] text-white rounded-sm font-body text-base font-semibold
              hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
              transition-transform cursor-pointer"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/seller/login"
            className="text-sm font-body text-white/50 hover:text-white hover:underline transition-colors"
          >
            🏪 Seller Login
          </a>
        </div>

        <div
          onClick={() => {
            setEmail('admin@kivy.com');
            setPassword('adminpassword');
          }}
          className="mt-8 p-4 rounded bg-white/5 border border-dashed border-white/10 hover:bg-white/10 transition-colors cursor-pointer text-center flex flex-col gap-1"
          title="Click to auto-fill credentials"
        >
          <span className="text-xs text-white/40 uppercase font-semibold font-body tracking-wider">
            💡 Default Credentials (Click to auto-fill)
          </span>
          <span className="text-sm text-white/80 font-mono mt-1">
            Email: <strong className="text-[#FF5F03]">admin@kivy.com</strong>
          </span>
          <span className="text-sm text-white/80 font-mono">
            Pass: <strong className="text-[#FF5F03]">adminpassword</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
