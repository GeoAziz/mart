import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/site-metadata';
import ProductListingClient from './ProductListingClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Shop Products',
  description: 'Browse electronics, fashion, home goods, groceries, and more from trusted Kenyan vendors.',
  path: '/products',
});

export default function ProductListingPage() {
  return <ProductListingClient />;
}
