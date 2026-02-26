'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sage-500">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-semibold text-sage-900 mb-2">Cheffle</h1>
      <p className="text-sage-600 mb-8 text-center max-w-md">
        Add recipes from any URL. Your AI-native recipe collection.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 font-medium transition"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 font-medium transition"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
