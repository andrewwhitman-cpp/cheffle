'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

function RegisterForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');

  useEffect(() => {
    if (!authLoading && user) {
      const target = returnUrl ? `/onboarding?returnUrl=${encodeURIComponent(returnUrl)}` : '/onboarding';
      router.replace(target);
    }
  }, [authLoading, user, router, returnUrl]);

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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(username, email, password);
      const target = returnUrl ? `/onboarding?returnUrl=${encodeURIComponent(returnUrl)}` : '/onboarding';
      router.push(target);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-sage-200/60 p-8 sm:p-12 space-y-8">
          <div className="text-center">
            <Link
              href="/"
              className="inline-block text-2xl font-serif font-semibold tracking-tight text-terracotta-600 hover:text-terracotta-700 mb-6 transition-colors"
            >
              Cheffle
            </Link>
            <h2 className="text-3xl font-serif text-sage-900 mb-3 tracking-tight">
              Create an account
            </h2>
            <p className="text-sm text-sage-600 font-light">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-terracotta-600 hover:text-terracotta-700 transition-colors underline decoration-terracotta-200 underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-coral-50 border border-coral-200 text-coral-800 px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}
            <div className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-xs font-bold uppercase tracking-widest text-sage-500 font-sans mb-2 pl-1">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full px-5 py-3.5 border border-sage-300 rounded-xl text-sage-900 bg-sage-50/30 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:bg-white transition-all duration-300"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-sage-500 font-sans mb-2 pl-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-5 py-3.5 border border-sage-300 rounded-xl text-sage-900 bg-sage-50/30 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:bg-white transition-all duration-300"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-sage-500 font-sans mb-2 pl-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-5 py-3.5 border border-sage-300 rounded-xl text-sage-900 bg-sage-50/30 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:bg-white transition-all duration-300"
                  placeholder="Create a password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-widest text-sage-500 font-sans mb-2 pl-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="w-full px-5 py-3.5 border border-sage-300 rounded-xl text-sage-900 bg-sage-50/30 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:bg-white transition-all duration-300"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3.5 text-base shadow-[0_4px_14px_-6px_rgba(200,75,49,0.4)]"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-sage-500">Loading...</div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
