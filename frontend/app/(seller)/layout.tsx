'use client';

import { ROUTES } from '@/constants';
import LogoutButton from '@/components/LogoutButton';
import type { ReactNode } from 'react';
import RouteGuard from '@/components/RouteGuard';
import Link from 'next/link';

export default function SellerLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard allowedRoles={['SELLER']}>
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
              <Link
                key={href}
                href={href}
                className="px-4 py-3 rounded-sm text-white/70 font-body text-sm
                  hover:bg-white/10 hover:text-white transition-colors"
              >
                {label}
              </Link>
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
    </RouteGuard>
  );
}