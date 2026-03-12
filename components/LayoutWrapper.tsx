'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from './AppLayout';

const AUTH_PATHS = ['/login', '/register', '/onboarding'];

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const pathname = usePathname();

  const isAuthPage = AUTH_PATHS.some((p) => pathname?.startsWith(p));

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sage-500">Loading...</div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
