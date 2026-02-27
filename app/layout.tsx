import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cheffle.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Cheffle - AI Recipe App',
    template: '%s | Cheffle',
  },
  description: 'Add recipes from any URL. Your AI-native recipe collection. Chat with AI to customize recipes, follow guided cooking, and scale ingredients.',
  openGraph: {
    title: 'Cheffle - AI Recipe App',
    description: 'Add recipes from any URL. Your AI-native recipe collection. Chat with AI to customize recipes, follow guided cooking, and scale ingredients.',
    url: '/',
    siteName: 'Cheffle',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cheffle - AI Recipe App',
    description: 'Add recipes from any URL. Your AI-native recipe collection. Chat with AI to customize recipes, follow guided cooking, and scale ingredients.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
                  <body className={inter.className}>
                    <AuthProvider>
                      <Navigation />
                      <main className="min-h-screen bg-cream-50">
                        {children}
                      </main>
                    </AuthProvider>
                    <Analytics />
                  </body>
    </html>
  );
}
