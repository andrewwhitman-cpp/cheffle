'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { authFetch } from '@/lib/auth-fetch';

const MAIN_MENU = [
  { href: '/', label: 'Home', icon: 'home' },
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

function BookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
      <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
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

function BookOpenIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
      <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
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

const KITCHEN_ICONS: Record<string, React.ReactNode> = {
  'Glossary': <BookOpenIcon />,
};

interface SidebarCollection {
  id: number;
  name: string;
  recipe_count: number;
}

export default function Sidebar() {
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
  const isFavoritesActive = pathname === '/recipes' && searchParams.get('favorite') === '1';

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 shrink-0 border-r border-sage-200 bg-white flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-sage-100">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={32} height={32} className="shrink-0 rounded-md" aria-hidden>
          <rect width="32" height="32" rx="6" fill="#dd4f32" />
          <ellipse cx="16" cy="11" rx="9" ry="3.5" fill="white" />
          <rect x="9" y="11" width="14" height="12" fill="white" />
        </svg>
        <span className="text-xl font-semibold tracking-tight text-terracotta-600">Cheffle</span>
      </div>

      {/* Main menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        <p className="px-6 text-xs font-semibold uppercase tracking-wider text-sage-400 mb-2">Main menu</p>
        <ul className="space-y-0.5 px-3">
          {MAIN_MENU.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon === 'book' ? BookIcon : HomeIcon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={link.href === '/' ? false : undefined}
                  className={`flex items-center gap-3 rounded-lg border-l-2 py-2.5 pr-3 pl-3 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-terracotta-50 text-terracotta-700 border-terracotta-500'
                      : 'border-transparent text-sage-600 hover:bg-sage-50 hover:text-sage-900'
                  }`}
                >
                  <Icon />
                  {link.label}
                </Link>
              </li>
            );
          })}
          {user && (
            <li>
              <Link
                href="/recipes?favorite=1"
                className={`flex items-center gap-3 rounded-lg border-l-2 py-2.5 pr-3 pl-3 text-sm font-medium transition-colors ${
                  isFavoritesActive
                    ? 'bg-terracotta-50 text-terracotta-700 border-terracotta-500'
                    : 'border-transparent text-sage-600 hover:bg-sage-50 hover:text-sage-900'
                }`}
              >
                <HeartIcon />
                Favorites
              </Link>
            </li>
          )}
        </ul>

        {/* Collections */}
        {user && collections.length > 0 && (
          <>
            <p className="px-6 text-xs font-semibold uppercase tracking-wider text-sage-400 mt-6 mb-2">Collections</p>
            <ul className="space-y-0.5 px-3">
              {collections.map((col) => {
                const active = activeCollectionId === String(col.id);
                return (
                  <li key={col.id}>
                    <Link
                      href={`/recipes?collection=${col.id}`}
                      className={`flex items-center gap-3 rounded-lg border-l-2 py-2 pr-3 pl-3 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-terracotta-50 text-terracotta-700 border-terracotta-500'
                          : 'border-transparent text-sage-600 hover:bg-sage-50 hover:text-sage-900'
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

        <p className="px-6 text-xs font-semibold uppercase tracking-wider text-sage-400 mt-6 mb-2">My kitchen</p>
        <ul className="space-y-0.5 px-3">
          {MY_KITCHEN.map((link) => {
            const active = isActive(link.href);
            return (
              <li key={link.href + link.label}>
                <Link
                  href={link.href}
                  prefetch={undefined}
                  className={`flex items-center gap-3 rounded-lg border-l-2 py-2.5 pr-3 pl-3 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-terracotta-50 text-terracotta-700 border-terracotta-500'
                      : 'border-transparent text-sage-600 hover:bg-sage-50 hover:text-sage-900'
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
      <div className="border-t border-sage-200 p-4">
        {user ? (
          <>
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sage-700 hover:bg-sage-50 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-700 font-medium text-sm">
                {user.username?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sage-900">{user.username}</p>
                <p className="truncate text-xs text-sage-500">Profile</p>
              </div>
              <ChevronRightIcon />
            </Link>
            <button
              onClick={handleLogout}
              className="mt-2 w-full text-left px-3 py-1.5 text-sm text-sage-600 hover:text-sage-900"
            >
              Logout
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2 px-3">
            <Link
              href="/register"
              className="btn-primary text-center text-sm py-2"
            >
              Sign up free
            </Link>
            <Link
              href="/login"
              className="btn-secondary text-center text-sm py-2"
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
