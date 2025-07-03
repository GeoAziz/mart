import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import Link from 'next/link';

// Fetch vendor profile and products from API
async function getVendorData(vendorId: string) {
  const [profileRes, productsRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/users/${vendorId}`),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/vendors/${vendorId}/products`),
  ]);
  if (!profileRes.ok) return null;
  const profile = await profileRes.json();
  const products = productsRes.ok ? await productsRes.json() : [];
  return { profile, products };
}

export default async function VendorStorefrontPage({ params }: { params: { vendorId: string } }) {
  const { vendorId } = params;
  const data = await getVendorData(vendorId);
  if (!data) return notFound();
  const { profile, products } = data;
  const settings = profile.settings || {};

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8 bg-card border-border shadow-lg">
        <CardHeader className="flex flex-col md:flex-row items-center gap-6">
          <Image src={settings.bannerUrl || 'https://placehold.co/600x200/77DDFF/FFFFFF?text=Banner'} alt="Store Banner" width={600} height={200} className="rounded-md object-cover w-full md:w-[600px] h-[200px]" />
          <div className="flex flex-col items-center md:items-start">
            <Image src={settings.logoUrl || 'https://placehold.co/150x150/7777FF/FFFFFF?text=Logo'} alt="Store Logo" width={100} height={100} className="rounded-full border-2 border-accent mb-2" />
            <CardTitle className="text-2xl font-headline text-glow-primary">{settings.storeName || profile.fullName || 'Vendor Store'}</CardTitle>
            <CardDescription className="text-muted-foreground mb-2">{settings.storeDescription || 'No description provided.'}</CardDescription>
            <div className="flex gap-3 mt-2">
              {settings.socialFacebook && <Link href={settings.socialFacebook} target="_blank" className="text-blue-600">Facebook</Link>}
              {settings.socialTwitter && <Link href={settings.socialTwitter} target="_blank" className="text-blue-400">Twitter</Link>}
              {settings.socialInstagram && <Link href={settings.socialInstagram} target="_blank" className="text-pink-500">Instagram</Link>}
            </div>
          </div>
        </CardHeader>
      </Card>
      <Separator className="my-8 border-border/50" />
      <h2 className="text-2xl font-bold mb-6">Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {products.length > 0 ? products.map((product: any) => (
          <Card key={product.id} className="bg-card border-border hover:border-accent hover:shadow-xl transition-all">
            <CardHeader>
              <Image src={product.imageUrl || 'https://placehold.co/200x200/cccccc/E0E0E0?text=No+Image'} alt={product.name} width={200} height={200} className="rounded object-cover w-full h-40" />
              <CardTitle className="mt-2 text-lg font-semibold">{product.name}</CardTitle>
              <CardDescription className="text-muted-foreground">KSh {product.price?.toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/products/${product.id}`} className="text-primary hover:underline">View Product</Link>
            </CardContent>
          </Card>
        )) : <p className="text-muted-foreground">No products found for this vendor.</p>}
      </div>
    </div>
  );
}
