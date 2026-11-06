import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Inter, JetBrains_Mono, Noto_Sans_Khmer } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import Topbar from '@/components/Topbar';
import SiteFooter from '@/components/SiteFooter';
import AutoTranslate from '@/components/AutoTranslate';
import AuthProvider from '@/components/AuthProvider';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { SITE_NAME, SITE_TITLE, SITE_URL, SITE_DESCRIPTION } from '@/lib/site';
import '../styles/tailwind.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });
const khmer = Noto_Sans_Khmer({ subsets: ['khmer'], variable: '--font-khmer', display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'developer tools', 'online tools', 'JSON formatter', 'SQL formatter', 'YAML formatter',
    'JWT decoder', 'KHQR', 'QR code', 'UUID generator', 'Base64', 'regex tester',
    'text diff', 'PDF to Word', 'DLTools',
  ],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
    images: [{ url: '/assets/images/app_logo.jpg' }],
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/assets/images/app_logo.jpg'],
  },
  icons: {
    icon: [
      { url: '/assets/images/app_logo.jpg', type: 'image/jpeg' },
      { url: '/assets/images/app_logo.jpg', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="km"
      data-theme="alabaster-paper"
      className={`${inter.variable} ${jetbrains.variable} ${khmer.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="relative font-sans" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <GoogleAnalytics />
            <Analytics />
            <Topbar />
            <main className="relative min-h-screen bg-background text-foreground">
              {children}
            </main>
            <SiteFooter />
            <AutoTranslate />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
