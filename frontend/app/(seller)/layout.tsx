'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants';
import LogoutButton from '@/components/LogoutButton';
import type { ReactNode } from 'react';

export default function SellerLayout({ children }: { children: ReactNode }) {
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

    const isLoginPage = pathname === '/seller/login';

    if (!user && !isLoginPage) {
      router.push('/seller/login');
    } else if (user && isLoginPage) {
      router.push('/seller/dashboard');
    } else if (user && user.role !== 'SELLER' && !isLoginPage) {
      router.push('/seller/login');
    }
  }, [user, pathname, router, mounted]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#EDEADE]" />;
  }

  const isLoginPage = pathname === '/seller/login';

  if (!user && !isLoginPage) {
    return (
      <div className="min-h-screen bg-[#EDEADE] flex items-center justify-center font-body text-[#111827]">
        Loading Seller Console...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <aside className="hidden md:flex flex-col w-64 bg-primary text-white shrink-0 fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-white/10">
          <span className="font-display text-xl tracking-wide">Kivy Seller</span>
        </div>
        <nav className="flex flex-col gap-1 p-4 flex-1">
          {[
            { href: ROUTES.SELLER_DASHBOARD, label: 'Seller Verification' },
            { href: ROUTES.SELLER_PRODUCTS, label: 'Product Management' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="px-4 py-3 rounded-sm text-white/70 font-body text-sm
                hover:bg-white/10 hover:text-white transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="md:hidden flex items-center justify-between px-4 py-4 bg-primary text-white">
          <span className="font-display text-lg">Kivy Seller</span>
          <LogoutButton className="px-3 py-1.5 rounded-sm border border-danger/40 text-red-200 text-xs font-semibold hover:bg-danger/10 transition-colors flex items-center gap-1" />
        </header>

        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}