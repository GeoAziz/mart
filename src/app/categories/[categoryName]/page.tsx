import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/site-metadata';
import CategoryProductListingClient from './CategoryProductListingClient';

function categoryTitle(slug: string): string {
  const names: Record<string, string> = {
    electronics: 'Electronics',
    fashion: 'Fashion',
    'home-kitchen': 'Home & Kitchen',
    home: 'Home & Kitchen',
    'health-beauty': 'Health & Beauty',
    'sports-outdoors': 'Sports & Outdoors',
    automotive: 'Automotive',
    groceries: 'Groceries',
  };
  const decoded = decodeURIComponent(slug).toLowerCase();
  return names[decoded] || decoded.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoryName: string }>;
}): Promise<Metadata> {
  const { categoryName } = await params;
  const category = categoryTitle(categoryName);
  return createPageMetadata({
    title: `${category} Products`,
    description: `Browse ${category.toLowerCase()} products from trusted Kenyan vendors on ZilaCart.`,
    path: `/categories/${encodeURIComponent(categoryName)}`,
  });
}

export default function CategoryProductListingPage() {
  return <CategoryProductListingClient />;
}
