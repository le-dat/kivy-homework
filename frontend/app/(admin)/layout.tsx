'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import LogoutButton from '@/components/LogoutButton';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const isLoginPage = pathname === '/admin/login';

    if (!user && !isLoginPage) {
      router.push('/admin/login');
    } else if (user && isLoginPage) {
      router.push('/admin/dashboard');
    } else if (user && user.role !== 'ADMIN' && !isLoginPage) {
      router.push('/admin/login');
    }
  }, [user, pathname, router, mounted]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#EDEADE]" />;
  }

  const isLoginPage = pathname === '/admin/login';

  if (!user && !isLoginPage) {
    return (
      <div className="min-h-screen bg-[#EDEADE] flex items-center justify-center font-body text-[#111827]">
        Loading Admin Console...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#EDEADE] text-[#111827]">
      {!isLoginPage && (
        <>
          <header className="bg-[#072C2C] text-white px-6 py-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-6">
              <span className="font-display text-xl font-bold tracking-wider text-[#FF5F03]">KIVY ADMIN</span>
              <span className="text-white/20">|</span>
              <nav className="flex items-center gap-1">
                <Link
                  href="/admin/dashboard"
                  className={`px-3 py-1.5 rounded-sm text-sm font-body font-semibold transition-colors ${
                    pathname === '/admin/dashboard'
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/audit-log"
                  className={`px-3 py-1.5 rounded-sm text-sm font-body font-semibold transition-colors ${
                    pathname === '/admin/audit-log'
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Audit Log
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-body text-sm text-white/70">{user?.email}</span>
              <LogoutButton className="px-3 py-1.5 rounded-sm border border-red-500/40 text-red-200 text-xs font-semibold hover:bg-red-500/10 transition-colors cursor-pointer" />
            </div>
          </header>
        </>
      )}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
