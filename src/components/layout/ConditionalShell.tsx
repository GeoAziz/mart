"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

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
