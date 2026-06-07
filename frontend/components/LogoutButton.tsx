'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants';

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    const isAdmin = user?.role === 'ADMIN';
    logout();
    router.push(isAdmin ? '/admin/login' : ROUTES.LOGIN);
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className={
        className ||
        'px-4 py-3 rounded-sm text-red-200/70 font-body text-sm hover:bg-danger/10 hover:text-red-300 transition-colors w-full text-left flex items-center gap-2'
      }
    >
      <span>🚪</span>
      <span>Logout</span>
    </button>
  );
}
