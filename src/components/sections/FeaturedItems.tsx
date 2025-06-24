
import ProductCard from '@/components/ecommerce/ProductCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/types';
import { firestoreAdmin } from '@/lib/firebase-admin';

// Interfaces defined here to make the component self-contained
interface FeaturedItem {
  id: string;
  type: 'product' | 'category' | 'vendor';
  itemId: string;
  displayName: string;
  imageUrl?: string;
  dataAiHint?: string;
}

interface HomepageCmsData {
  featuredItems: FeaturedItem[];
}

// Helper function to fetch a single product directly from Firestore
async function getProductDetails(productId: string): Promise<Product | null> {
    try {
        const productDoc = await firestoreAdmin.collection('products').doc(productId).get();
        if (!productDoc.exists) {
            console.warn(`Featured product with ID ${productId} not found.`);
            return null;
        };
        const data = productDoc.data();
        if (!data) return null;

        // Map Firestore data to Product type
        return {
            id: productDoc.id,
            name: data.name || 'Unnamed Product',
            description: data.description || '',
            price: data.price || 0,
            category: data.category || 'Uncategorized',
            stock: data.stock === undefined ? 0 : data.stock,
            imageUrl: data.imageUrl,
            additionalImageUrls: data.additionalImageUrls || [],
            brand: data.brand || 'Unknown Brand',
            dateAdded: data.dateAdded?.toDate ? data.dateAdded.toDate() : new Date(data.dateAdded || Date.now()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
            dataAiHint: data.dataAiHint,
            vendorId: data.vendorId,
            status: data.status || 'pending_approval',
            sku: data.sku || '',
            rating: data.rating,
        };
    } catch (error) {
        console.error(`Error fetching product details for ${productId}:`, error);
        return null;
    }
}

// Main async server component
async function FeaturedItems() {
  let cmsData: HomepageCmsData | null = null;
  
  try {
      const docSnap = await firestoreAdmin.collection('cms').doc('homepage_content').get();
      if (docSnap.exists) {
        cmsData = docSnap.data() as HomepageCmsData;
      }
  } catch (error) {
      console.error("Failed to fetch homepage CMS data from Firestore:", error);
  }

  const featuredCmsProducts = cmsData?.featuredItems?.filter(item => item.type === 'product') || [];
  const featuredCmsVendors = cmsData?.featuredItems?.filter(item => item.type === 'vendor') || [];

  // Fetch full product details for the featured products
  const productPromises = featuredCmsProducts.map(item => getProductDetails(item.itemId));
  const fetchedProducts = (await Promise.all(productPromises)).filter(p => p !== null) as Product[];

  return (
    <>
      {fetchedProducts.length > 0 && (
        <section className="mb-12 md:mb-16">
          <h2 className="text-3xl font-headline font-bold mb-6 text-center text-glow-primary">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {fetchedProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </section>
      )}

      {featuredCmsVendors.length > 0 && (
        <section className="mb-12 md:mb-16">
          <h2 className="text-3xl font-headline font-bold mb-6 text-center text-glow-accent">Top Vendors</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {featuredCmsVendors.map((vendor) => (
              <Link href={`/vendors/${vendor.itemId}`} key={vendor.id} passHref>
                <Card className="group bg-card border-border hover:border-accent hover:shadow-xl hover:shadow-accent/30 transition-all duration-300 ease-in-out transform hover:-translate-y-1 glow-edge-accent">
                  <CardHeader className="flex flex-row items-center space-x-4 p-4">
                    <Image 
                        src={vendor.imageUrl || "https://placehold.co/100x100/7777FF/FFFFFF?text=V"} 
                        alt={`${vendor.displayName} logo`} 
                        width={64} 
                        height={64} 
                        className="rounded-full border-2 border-accent group-hover:scale-110 transition-transform" 
                        data-ai-hint={vendor.dataAiHint || "store logo"} 
                    />
                    <div>
                      <CardTitle className="text-xl font-headline text-card-foreground group-hover:text-accent transition-colors">{vendor.displayName}</CardTitle>
                      {/* Tagline can be added to CMS later if needed */}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button variant="link" className="p-0 text-accent group-hover:underline">
                      Visit Store <Store className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
};

export default FeaturedItems;
