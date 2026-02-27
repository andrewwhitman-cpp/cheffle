'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sage-500">Loading...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      const returnUrl = searchParams.get('returnUrl');
      const safeReturnUrl =
        returnUrl &&
        returnUrl.startsWith('/') &&
        !returnUrl.startsWith('//') &&
        !returnUrl.includes('\\')
          ? returnUrl
          : null;
      router.push(safeReturnUrl || '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-50 via-cream-100 to-sage-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-8 space-y-8">
          <div className="text-center">
            <Link
              href="/"
              className="inline-block text-xl font-semibold tracking-tight text-terracotta-600 hover:text-terracotta-700 mb-6 transition-colors"
            >
              Cheffle
            </Link>
            <h2 className="text-3xl font-semibold text-sage-900 mb-2 tracking-tight">
              Sign in to Cheffle
            </h2>
            <p className="text-sm text-sage-600">
              Or{' '}
              <Link href="/register" className="font-medium text-terracotta-600 hover:text-terracotta-700 transition-colors">
                create a new account
              </Link>
            </p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-coral-50 border-l-4 border-coral-500 text-coral-800 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-sage-700 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-sage-300 rounded-lg text-sage-900 bg-white placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 transition"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-sage-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-sage-300 rounded-lg text-sage-900 bg-white placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 transition"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-terracotta-600 hover:bg-terracotta-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-terracotta-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-sage-500">Loading...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
