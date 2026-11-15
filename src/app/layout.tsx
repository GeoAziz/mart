import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import SupportButton from '@/components/layout/SupportButton';
import { AuthProvider } from '@/context/AuthContext';
import { isFirebaseConfigured } from '@/lib/firebase-client';
import SetupInstructions from '@/components/layout/SetupInstructions';
import ParticleBackground from '@/components/ParticleBackground';
import ConditionalShell from '@/components/layout/ConditionalShell';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from '@/lib/site-metadata';

/**
 * Root Layout
 *
 * Minimal wrapper for all routes. Uses ConditionalShell to manage
 * Header/Footer visibility based on route context (public vs dashboard).
 *
 * See ConditionalShell for long-term refactor notes regarding route groups.
 */

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: 'ZilaCart – Kenya’s Digital Marketplace',
    template: '%s | ZilaCart',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'ZilaCart – Kenya’s Digital Marketplace',
    description: SITE_DESCRIPTION,
    url: '/',
    siteName: SITE_NAME,
    locale: 'en_KE',
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'ZilaCart marketplace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZilaCart – Kenya’s Digital Marketplace',
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
  manifest: '/manifest.json', // For PWA
};

export const viewport: Viewport = {
  themeColor: '#1A0B2E', // Dark purple for PWA theme
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" className="dark">
      <head>
        {/* Font links are now handled by next/font */}
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        <GoogleAnalytics />
        <ParticleBackground />
        <AuthProvider>
          {/* ConditionalShell will render Header/Footer for public routes and hide them for dashboard routes */}
          <div className="flex-grow">
            <ConditionalShell>{children}</ConditionalShell>
          </div>
          <Toaster />
          <SupportButton />
        </AuthProvider>
      </body>
    </html>
  );
}
