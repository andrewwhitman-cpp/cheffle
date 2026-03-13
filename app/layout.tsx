import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGateProvider } from '@/contexts/AuthGateContext';
import LayoutWrapper from '@/components/LayoutWrapper';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

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
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
                  <body className="font-sans antialiased text-foreground bg-background selection:bg-terracotta-200">
                    <AuthProvider>
                      <AuthGateProvider>
                        <LayoutWrapper>{children}</LayoutWrapper>
                      </AuthGateProvider>
                    </AuthProvider>
                    <Analytics />
                  </body>
    </html>
  );
}
