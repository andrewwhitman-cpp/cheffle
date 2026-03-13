'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRecipeChatContext } from '@/contexts/RecipeChatContext';
import Sidebar from './Sidebar';
import RecipeChatSheet from './RecipeChatSheet';

function TabHomeIcon({ active }: { active: boolean }) {
  if (active) return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function TabRecipesIcon({ active }: { active: boolean }) {
  if (active) return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function TabGlossaryIcon({ active }: { active: boolean }) {
  if (active) return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function TabProfileIcon({ active }: { active: boolean }) {
  if (active) return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function CheffleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={28} height={28} className="shrink-0" aria-hidden>
      <ellipse cx="16" cy="11" rx="9" ry="3.5" fill="white" />
      <rect x="9" y="11" width="14" height="12" fill="white" />
    </svg>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const { chatOpen, setChatOpen, recipeId } = useRecipeChatContext();
  const pathname = usePathname();
  const router = useRouter();

  const handleFabClick = useCallback(() => {
    if (recipeId) {
      setChatOpen(true);
    } else {
      const urlInput = document.querySelector('input[type="url"]') as HTMLInputElement | null;
      if (urlInput) {
        urlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => urlInput.focus(), 300);
      } else {
        router.push('/');
      }
    }
  }, [recipeId, setChatOpen, router]);

  const isTabActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const profileHref = user ? '/profile' : '/login';

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar isOpen={false} onClose={() => {}} />
      <div className="flex flex-1 flex-col pl-0 md:pl-64 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-center border-b border-sage-200/60 bg-white/80 backdrop-blur-md px-4">
          <Link href="/" className="flex items-center gap-2 min-w-0 justify-center" prefetch={false}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={28} height={28} className="shrink-0 rounded-md" aria-hidden>
              <rect width="32" height="32" rx="6" fill="#C84B31" />
              <ellipse cx="16" cy="11" rx="9" ry="3.5" fill="white" />
              <rect x="9" y="11" width="14" height="12" fill="white" />
            </svg>
            <span className="text-xl font-serif font-semibold tracking-tight text-terracotta-600 truncate">Cheffle</span>
          </Link>
        </header>
        <main className="flex-1 flex flex-col md:flex-row pb-24 md:pb-0">
          <div className="flex-1 min-w-0">
            {children}
          </div>
          {chatOpen && recipeId && (
            <RecipeChatSheet recipeId={recipeId} onClose={() => setChatOpen(false)} />
          )}
        </main>
        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]" aria-label="Main navigation">
          <div className="relative border-t border-sage-200/60 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
            {/* FAB - raised above the bar */}
            <button
              type="button"
              onClick={handleFabClick}
              className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-terracotta-600 text-white shadow-[0_8px_20px_-6px_rgba(200,75,49,0.4)] hover:bg-terracotta-700 active:scale-95 transition-all flex items-center justify-center overflow-hidden border-4 border-white/90 backdrop-blur-md"
              aria-label={recipeId ? 'Talk with Cheffle' : 'Add recipe'}
            >
              <CheffleIcon />
            </button>

            {/* Tab bar */}
            <div className="flex items-center justify-around h-14">
              <Link
                href="/"
                prefetch={false}
                className={`flex flex-col items-center gap-0.5 pt-1.5 min-w-[48px] transition-colors ${isTabActive('/') ? 'text-terracotta-600' : 'text-sage-400'}`}
              >
                <TabHomeIcon active={isTabActive('/')} />
                <span className="text-[10px] font-medium">Home</span>
              </Link>

              <Link
                href="/recipes"
                className={`flex flex-col items-center gap-0.5 pt-1.5 min-w-[48px] transition-colors ${isTabActive('/recipes') ? 'text-terracotta-600' : 'text-sage-400'}`}
              >
                <TabRecipesIcon active={isTabActive('/recipes')} />
                <span className="text-[10px] font-medium">Recipes</span>
              </Link>

              {/* Spacer for FAB */}
              <div className="w-14" />

              <Link
                href="/glossary"
                className={`flex flex-col items-center gap-0.5 pt-1.5 min-w-[48px] transition-colors ${isTabActive('/glossary') ? 'text-terracotta-600' : 'text-sage-400'}`}
              >
                <TabGlossaryIcon active={isTabActive('/glossary')} />
                <span className="text-[10px] font-medium">Glossary</span>
              </Link>

              <Link
                href={profileHref}
                className={`flex flex-col items-center gap-0.5 pt-1.5 min-w-[48px] transition-colors ${isTabActive(profileHref) ? 'text-terracotta-600' : 'text-sage-400'}`}
              >
                <TabProfileIcon active={isTabActive(profileHref)} />
                <span className="text-[10px] font-medium">{user ? 'Profile' : 'Log in'}</span>
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
