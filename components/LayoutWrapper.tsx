'use client';

import { useAuth } from '@/contexts/AuthContext';
import AppLayout from './AppLayout';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  return <AppLayout showHeader={true}>{children}</AppLayout>;
}
