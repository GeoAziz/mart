"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

/**
 * ConditionalShell: Runtime-based navigation context separator
 * 
 * Renders Header/Footer for public routes, hides them for dashboard routes.
 * This approach provides immediate UX separation without file restructuring.
 * 
 * TODO (Long-term refactor): As dashboard surface grows, consider moving to
 * route groups: src/app/(public)/* and src/app/(dashboard)/* with dedicated layouts.
 * This would eliminate client-side pathname detection and be more explicit/scalable.
 * Current implementation prioritizes low-friction deployment while maintaining UX win.
 */
export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const isDashboard = pathname.startsWith('/admin') || pathname.startsWith('/vendor') || pathname.startsWith('/account');

  return (
    <>
      {!isDashboard && <Header />}
      <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
      {!isDashboard && <Footer />}
    </>
  );
}
