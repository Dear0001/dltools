import React from 'react';
import type { Metadata, Viewport } from 'next';
import VercelAnalytics from '@/components/VercelAnalytics';
import { Inter, JetBrains_Mono, Noto_Sans_Khmer } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import Topbar from '@/components/Topbar';
import SiteFooter from '@/components/SiteFooter';
import AutoTranslate from '@/components/AutoTranslate';
import AuthProvider from '@/components/AuthProvider';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import JsonLd from '@/components/JsonLd';
import Toast from '@/components/ui/Toast';
import { SITE_NAME, SITE_TITLE, SITE_URL, SITE_DESCRIPTION } from '@/lib/site';
import { DEFAULT_OG_IMAGE, buildSiteJsonLd } from '@/lib/seo';
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
  // No `url` here: every page without its own openGraph would inherit it and report "/" as its og:url.
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE.url, alt: DEFAULT_OG_IMAGE.alt }],
  },
  // Favicons come from the app/icon.png and app/apple-icon.png file conventions.
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
        <JsonLd data={buildSiteJsonLd()} />
      </head>
      <body className="relative font-sans" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <GoogleAnalytics />
            <VercelAnalytics />
            <Toast />
            <Topbar />
            <main id="main-content" tabIndex={-1} className="relative min-h-[calc(100dvh-4rem)] bg-background text-foreground focus:outline-none">
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
