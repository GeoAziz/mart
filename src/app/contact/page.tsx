import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/site-metadata';
import ContactClient from './ContactClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Contact ZilaCart',
  description: 'Get in touch with the ZilaCart customer support team.',
  path: '/contact',
});

export default function ContactPage() {
  return <ContactClient />;
}
