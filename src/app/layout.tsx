import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AIChatbotButton from '@/components/ai/AIChatbotButton';
import { AuthProvider } from '@/context/AuthContext';
import { isFirebaseConfigured } from '@/lib/firebase-client';
import SetupInstructions from '@/components/layout/SetupInstructions';
import ParticleBackground from '@/components/ParticleBackground';
import ConditionalShell from '@/components/layout/ConditionalShell';

// Configure font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ZilaCart – Kenya’s Digital Marketplace',
  description: 'Kenya’s Premier Digital Marketplace for all your needs.',
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
    <html lang="en" className={`${inter.variable} dark`}>
      <head>
        {/* Font links are now handled by next/font */}
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        <ParticleBackground />
        <AuthProvider>
          {/* ConditionalShell will render Header/Footer for public routes and hide them for dashboard routes */}
          <div className="flex-grow">
            <ConditionalShell>{children}</ConditionalShell>
          </div>
          <Toaster />
          <AIChatbotButton />
        </AuthProvider>
      </body>
    </html>
  );
}
