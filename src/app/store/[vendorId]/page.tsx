import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import Link from 'next/link';
import type { ProductWithVendor, UserProfile } from '@/lib/types';
import type { PublicVendorSettings } from '@/app/api/vendors/[vendorId]/settings/route';
import type { Metadata } from 'next';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { absoluteImageUrl, absoluteUrl, cleanDescription } from '@/lib/site-metadata';

// Fetch vendor profile, products, and public settings from API
async function getVendorData(vendorId: string) {
  const [profileDoc, settingsDoc, productsSnapshot] = await Promise.all([
    firestoreAdmin.collection('users').doc(vendorId).get(),
    firestoreAdmin.collection('vendorSettings').doc(vendorId).get(),
    firestoreAdmin.collection('products').where('vendorId', '==', vendorId).where('status', '==', 'active').orderBy('dateAdded', 'desc').get(),
  ]);
  if (!profileDoc.exists) return { profile: null as UserProfile | null, products: [] as ProductWithVendor[], settings: null };
  const profileData = profileDoc.data() || {};
  const profile: UserProfile = {
    uid: profileDoc.id,
    email: profileData.email || null,
    fullName: profileData.fullName || null,
    role: profileData.role || 'customer',
    status: profileData.status || 'active',
    createdAt: profileData.createdAt?.toDate?.() || new Date(),
    updatedAt: profileData.updatedAt?.toDate?.(),
  };
  const settingsData = settingsDoc.data() || {};
  const settings: PublicVendorSettings = {
    storeName: settingsData.storeName || '',
    storeDescription: settingsData.storeDescription || '',
    contactEmail: settingsData.contactEmail || '',
    contactPhone: settingsData.contactPhone || '',
    logoUrl: settingsData.logoUrl || 'https://placehold.co/150x150/7777FF/FFFFFF?text=Logo',
    bannerUrl: settingsData.bannerUrl || 'https://placehold.co/600x200/77DDFF/FFFFFF?text=Banner',
    socialFacebook: settingsData.socialFacebook || '',
    socialTwitter: settingsData.socialTwitter || '',
    socialInstagram: settingsData.socialInstagram || '',
  };
  const products: ProductWithVendor[] = productsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || 'Unnamed Product',
      description: data.description || '',
      price: Number(data.price || 0),
      category: data.category || 'Uncategorized',
      stock: data.stock ?? 0,
      imageUrl: data.imageUrl,
      additionalImageUrls: data.additionalImageUrls || [],
      brand: data.brand,
      vendorId,
      status: 'active',
      rating: data.rating,
    };
  });

  // Guard: ensure the profile actually belongs to a vendor, otherwise treat as not found
  if (!profile || profile.role !== 'vendor') {
    return { profile: null, products: [], settings: null };
  }

  return { profile, products, settings };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}): Promise<Metadata> {
  const { vendorId } = await params;
  const { profile, settings } = await getVendorData(vendorId);
  if (!profile) {
    return { title: 'Store Not Found', robots: { index: false, follow: false } };
  }
  const storeName = settings?.storeName || profile.fullName || 'Vendor Store';
  const description = cleanDescription(settings?.storeDescription, `Shop trusted products from ${storeName} on ZilaCart.`);
  const image = absoluteImageUrl(settings?.bannerUrl || settings?.logoUrl);
  const url = absoluteUrl(`/store/${vendorId}`);
  return {
    title: `${storeName} Store`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${storeName} Store`,
      description,
      url,
      siteName: 'ZilaCart',
      locale: 'en_KE',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: `${storeName} storefront` }],
    },
    twitter: { card: 'summary_large_image', title: `${storeName} Store`, description, images: [image] },
  };
}

export default async function VendorStorefrontPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;
  const { profile, products, settings } = await getVendorData(vendorId);

  if (!profile) {
    return notFound();
  }

  const storeName = settings?.storeName || profile.fullName || 'Vendor Store';
  const storeDescription = settings?.storeDescription || 'No description provided.';
  const socials = [
    { label: 'Facebook', url: settings?.socialFacebook, className: 'text-blue-600' },
    { label: 'Twitter', url: settings?.socialTwitter, className: 'text-blue-400' },
    { label: 'Instagram', url: settings?.socialInstagram, className: 'text-pink-500' },
  ].filter((s) => s.url);

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8 bg-card border-border shadow-lg">
        <CardHeader className="flex flex-col md:flex-row items-center gap-6">
          <Image
            src={settings?.bannerUrl || 'https://placehold.co/600x200/77DDFF/FFFFFF?text=Banner'}
            alt="Store Banner"
            width={600}
            height={200}
            className="rounded-md object-cover w-full md:w-[600px] h-[200px]"
          />
          <div className="flex flex-col items-center md:items-start">
            <Image
              src={settings?.logoUrl || 'https://placehold.co/150x150/7777FF/FFFFFF?text=Logo'}
              alt="Store Logo"
              width={100}
              height={100}
              className="rounded-full border-2 border-accent mb-2"
            />
            <CardTitle className="text-2xl font-headline text-glow-primary">{storeName}</CardTitle>
            <CardDescription className="text-muted-foreground mb-2">{storeDescription}</CardDescription>
            <div className="flex flex-wrap gap-3 mt-2">
              {socials.map((social) => (
                <Link
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={social.className}
                >
                  {social.label}
                </Link>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Separator className="my-8 border-border/50" />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Products</h2>
        <Link
          href={`/store/${vendorId}/products`}
          className="text-primary hover:underline text-sm"
        >
          View all
        </Link>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card
              key={product.id}
              className="bg-card border-border hover:border-accent hover:shadow-xl transition-all"
            >
              <CardHeader className="p-0">
                <Image
                  src={product.imageUrl || 'https://placehold.co/200x200/cccccc/E0E0E0?text=No+Image'}
                  alt={product.name || "Product Image"}
                  width={200}
                  height={200}
                  className="rounded object-cover w-full h-40"
                />
                <CardContent className="p-4">
                  <CardTitle className="mt-2 text-lg font-semibold">{product.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">{product.price.toLocaleString()} KSh</CardDescription>
                  {product.stock != null && product.stock > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {product.stock} in stock
                    </p>
                  )}
                  <Link
                    href={`/products/${product.id}`}
                    className="text-primary hover:underline mt-2 inline-block"
                  >
                    View Product
                  </Link>
                </CardContent>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products found for this vendor.</p>
          <Link
            href={`/store/${vendorId}/products`}
            className="text-primary hover:underline mt-2 inline-block"
          >
            View product listing
          </Link>
        </div>
      )}
    </div>
  );
}
