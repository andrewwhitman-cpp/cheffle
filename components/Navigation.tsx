'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';

export default function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/recipes', label: 'Recipes' },
    { href: '/meal-plan', label: 'Meal plan' },
    { href: '/shopping-list', label: 'Shopping list' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/glossary', label: 'Glossary' },
    { href: '/profile', label: 'Profile' },
  ];

  return (
    <nav className="bg-white border-b border-sage-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center" prefetch={false}>
              <span className="text-xl font-semibold tracking-tight text-terracotta-600">Cheffle</span>
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={link.href === '/' || link.href === '/meal-plan' ? false : undefined}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'border-terracotta-500 text-sage-900'
                      : 'border-transparent text-sage-600 hover:text-sage-900 hover:border-sage-300'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-sage-700">{user.username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-sage-600 hover:text-sage-900 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
