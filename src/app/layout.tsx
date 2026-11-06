import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { GeistSans } from 'geist/font/sans';
import Topbar from '@/components/Topbar';
import AuthProvider from '@/components/AuthProvider';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { SITE_NAME, SITE_TITLE, SITE_URL, SITE_DESCRIPTION } from '@/lib/site';
import '../styles/tailwind.css';

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
      className={GeistSans.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={`${GeistSans.className} relative`} suppressHydrationWarning>
        <AuthProvider>
          <GoogleAnalytics />
          <Analytics />
          <Topbar />
          <main className="relative min-h-screen bg-background text-foreground">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
