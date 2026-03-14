'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { authFetch } from '@/lib/auth-fetch';

const MAIN_MENU = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/discover', label: 'Discover', icon: 'sparkles' },
  { href: '/recipes', label: 'Recipes', icon: 'book' },
];

const MY_KITCHEN = [
  { href: '/glossary', label: 'Glossary' },
];

function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
      <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5z" clipRule="evenodd" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
      <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
      <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
      <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
    </svg>
  );
}

function MagnifyingGlassIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
      <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
      <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
    </svg>
  );
}

function XMarkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  );
}

const KITCHEN_ICONS: Record<string, React.ReactNode> = {
  'Glossary': <MagnifyingGlassIcon />,
};

interface SidebarCollection {
  id: number;
  name: string;
  recipe_count: number;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collections, setCollections] = useState<SidebarCollection[]>([]);

  useEffect(() => {
    if (!user) { setCollections([]); return; }
    authFetch('/api/collections')
      .then((r) => r.ok ? r.json() : [])
      .then(setCollections)
      .catch(() => {});
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const activeCollectionId = pathname === '/recipes' ? searchParams.get('collection') : null;

  const handleNavClick = () => onClose?.();

  return (
    <>
      {/* Mobile backdrop - only when sidebar open on mobile */}
      <div
        aria-hidden
        className={`fixed inset-0 z-40 bg-sage-900/50 md:hidden transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 shrink-0 border-r border-sage-200/60 bg-white/95 backdrop-blur-xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Logo + mobile close button */}
        <div className="flex h-16 items-center justify-between gap-2 px-6 border-b border-sage-200/60">
          <div className="flex items-center gap-2 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={32} height={32} className="shrink-0 rounded-md shadow-sm" aria-hidden>
              <rect width="32" height="32" rx="6" fill="#C84B31" />
              <ellipse cx="16" cy="11" rx="9" ry="3.5" fill="white" />
              <rect x="9" y="11" width="14" height="12" fill="white" />
            </svg>
            <span className="text-2xl font-serif font-semibold tracking-tight text-terracotta-600">Cheffle</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-2 -m-2 rounded-lg text-sage-600 hover:bg-sage-50 hover:text-sage-900 transition-colors"
            aria-label="Close menu"
          >
            <XMarkIcon />
          </button>
        </div>

      {/* Main menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        <p className="px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-sage-400 mb-3 font-sans">Main menu</p>
        <ul className="space-y-1 px-4">
          {MAIN_MENU.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon === 'book' ? BookIcon : link.icon === 'sparkles' ? SparklesIcon : HomeIcon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={link.href === '/' ? false : undefined}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 rounded-xl py-2 px-3 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-terracotta-50/50 text-terracotta-700 shadow-[inset_2px_0_0_0_#C84B31]'
                      : 'text-sage-600 hover:bg-sage-50/50 hover:text-sage-900'
                  }`}
                >
                  <Icon />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Collections */}
        {user && collections.length > 0 && (
          <>
            <p className="px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-sage-400 mt-8 mb-3 font-sans">Collections</p>
            <ul className="space-y-1 px-4">
              {collections.map((col) => {
                const active = activeCollectionId === String(col.id);
                return (
                  <li key={col.id}>
                    <Link
                      href={`/recipes?collection=${col.id}`}
                      onClick={handleNavClick}
                      className={`flex items-center gap-3 rounded-xl py-2 px-3 text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-terracotta-50/50 text-terracotta-700 shadow-[inset_2px_0_0_0_#C84B31]'
                          : 'text-sage-600 hover:bg-sage-50/50 hover:text-sage-900'
                      }`}
                    >
                      <FolderIcon />
                      <span className="truncate flex-1">{col.name}</span>
                      <span className="text-xs text-sage-400">{col.recipe_count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <p className="px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-sage-400 mt-8 mb-3 font-sans">My kitchen</p>
        <ul className="space-y-1 px-4">
          {MY_KITCHEN.map((link) => {
            const active = isActive(link.href);
            return (
              <li key={link.href + link.label}>
                <Link
                  href={link.href}
                  prefetch={undefined}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 rounded-xl py-2 px-3 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-terracotta-50/50 text-terracotta-700 shadow-[inset_2px_0_0_0_#C84B31]'
                      : 'text-sage-600 hover:bg-sage-50/50 hover:text-sage-900'
                  }`}
                >
                  {KITCHEN_ICONS[link.label] ?? <BookmarkIcon />}
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section: user profile or auth links */}
      <div className="border-t border-sage-200/60 p-4 bg-sage-50/30">
        {user ? (
          <>
            <Link
              href="/profile"
              onClick={handleNavClick}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sage-800 hover:bg-white hover:shadow-sm transition-all duration-200"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-700 font-serif text-lg">
                {user.username?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sage-900">{user.username}</p>
                <p className="truncate text-[11px] text-sage-500 uppercase tracking-wider font-semibold">Profile</p>
              </div>
              <ChevronRightIcon />
            </Link>
            <button
              onClick={handleLogout}
              className="mt-3 w-full text-left px-4 py-2 text-sm text-sage-500 hover:text-sage-900 hover:bg-white rounded-lg transition-all duration-200"
            >
              Logout
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-3 px-3">
            <Link
              href="/register"
              onClick={handleNavClick}
              className="btn-primary text-center text-sm py-2.5"
            >
              Sign up free
            </Link>
            <Link
              href="/login"
              onClick={handleNavClick}
              className="btn-secondary text-center text-sm py-2.5"
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
