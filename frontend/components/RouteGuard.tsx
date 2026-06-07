'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants';
import type { ReactNode } from 'react';

interface RouteGuardProps {
  children: ReactNode;
  allowedRoles: ('ADMIN' | 'SELLER')[];
}

export default function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const loginRoute = allowedRoles.includes('ADMIN') ? ROUTES.ADMIN_LOGIN : ROUTES.SELLER_LOGIN;
  const dashboardRoute = allowedRoles.includes('ADMIN') ? ROUTES.ADMIN_DASHBOARD : ROUTES.SELLER_DASHBOARD;
  const isLoginPage = pathname === loginRoute;

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!user) {
      if (!isLoginPage) {
        router.push(loginRoute);
      }
    } else {
      if (isLoginPage) {
        router.push(dashboardRoute);
      } else if (!allowedRoles.includes(user.role)) {
        router.push(loginRoute);
      }
    }
  }, [user, isLoading, pathname, router, mounted, allowedRoles, isLoginPage, loginRoute, dashboardRoute]);

  // Prevent SSR rendering differences / hydration mismatch
  if (!mounted || isLoading) {
    const loadingText = allowedRoles.includes('ADMIN') ? 'Loading Admin Console...' : 'Loading Seller Console...';
    return (
      <div className="min-h-screen bg-[#EDEADE] flex items-center justify-center font-body text-[#111827]">
        {loadingText}
      </div>
    );
  }

  // Show loading during redirect states to prevent flash of content
  if (user && isLoginPage) {
    return (
      <div className="min-h-screen bg-[#EDEADE] flex items-center justify-center font-body text-[#111827]">
        Redirecting to dashboard...
      </div>
    );
  }

  if (!user && !isLoginPage) {
    return (
      <div className="min-h-screen bg-[#EDEADE] flex items-center justify-center font-body text-[#111827]">
        Redirecting to login...
      </div>
    );
  }

  if (user && !isLoginPage && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-[#EDEADE] flex items-center justify-center font-body text-[#111827]">
        Unauthorized. Redirecting...
      </div>
    );
  }

  return <>{children}</>;
}
