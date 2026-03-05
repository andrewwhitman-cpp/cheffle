'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRef, useEffect } from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  /** Optional: show header bar with search and New Recipe. Default true for home, false for other pages - we'll pass from parent */
  showHeader?: boolean;
  /** Optional: search placeholder */
  searchPlaceholder?: string;
  /** Optional: callback when search is submitted */
  onSearch?: (query: string) => void;
}

export default function AppLayout({
  children,
  showHeader = true,
  searchPlaceholder = 'Search recipes, ingredients...',
  onSearch,
}: AppLayoutProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.querySelector('input[name="search"]') as HTMLInputElement;
    const query = input?.value?.trim() ?? '';
    if (onSearch) {
      onSearch(query);
    } else if (query) {
      router.push(`/recipes?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-64">
        {showHeader && (
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-sage-200 bg-white px-6">
            <form onSubmit={handleSearch} className="flex flex-1 max-w-2xl">
              <div className="relative flex w-full items-center">
                <input
                  ref={searchInputRef}
                  type="text"
                  name="search"
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-sage-300 bg-sage-50/50 py-2.5 pl-4 pr-12 text-sage-900 placeholder:text-sage-400 focus:border-terracotta-500 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20"
                />
                <kbd className="absolute right-3 hidden rounded border border-sage-200 bg-white px-2 py-0.5 text-xs text-sage-500 sm:inline-block">
                  ⌘K
                </kbd>
              </div>
            </form>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg bg-terracotta-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-terracotta-700 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              New Recipe
            </Link>
          </header>
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
