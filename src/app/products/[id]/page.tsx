import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { firestoreAdmin } from '@/lib/firebase-admin';
import type { Product } from '@/lib/types';
import { absoluteImageUrl, absoluteUrl, cleanDescription, createPageMetadata } from '@/lib/site-metadata';
import ProductDetailClient from './ProductDetailClient';

async function getProduct(id: string): Promise<Product | null> {
  const snapshot = await firestoreAdmin.collection('products').doc(id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (!data || data.status !== 'active') return null;
  return {
    id: snapshot.id,
    name: data.name || 'Unnamed Product',
    description: data.description || '',
    price: Number(data.price || 0),
    category: data.category || 'Uncategorized',
    imageUrl: data.imageUrl,
    additionalImageUrls: data.additionalImageUrls || [],
    brand: data.brand,
    vendorId: data.vendorId,
    status: data.status,
    rating: data.rating,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) {
    return createPageMetadata({
      title: 'Product Not Found',
      description: 'This product is no longer available on ZilaCart.',
      path: `/products/${id}`,
    });
  }

  const description = cleanDescription(product.description, `Shop ${product.name} in ${product.category} on ZilaCart.`);
  const title = `${product.name} | ZilaCart`;
  const image = absoluteImageUrl(product.imageUrl || product.additionalImageUrls?.[0]);
  const url = absoluteUrl(`/products/${product.id}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'ZilaCart',
      locale: 'en_KE',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: product.name }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    other: {
      'product:price:amount': String(product.price),
      'product:price:currency': 'KES',
      'product:category': product.category,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: cleanDescription(product.description, `Shop ${product.name} on ZilaCart.`),
    image: [absoluteImageUrl(product.imageUrl || product.additionalImageUrls?.[0])],
    category: product.category,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/products/${product.id}`),
      priceCurrency: 'KES',
      price: product.price,
      availability: 'https://schema.org/InStock',
    },
    ...(product.rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        bestRating: 5,
      },
    } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ProductDetailClient />
    </>
  );
}
