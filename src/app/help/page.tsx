import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/site-metadata';
import HelpClient from './HelpClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Help Center',
  description: 'Find answers about shopping, payments, delivery, returns, and vendor support on ZilaCart.',
  path: '/help',
});

export default function HelpCenterPage() {
  return <HelpClient />;
}
