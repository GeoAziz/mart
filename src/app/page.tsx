
import HeroCarousel from '@/components/sections/HeroCarousel';
import PromoBanners from '@/components/sections/PromoBanners';
import CategoryTiles from '@/components/sections/CategoryTiles';
import FlashSalesSlider from '@/components/sections/FlashSalesSlider';
import FeaturedItems from '@/components/sections/FeaturedItems';
import TrendingProducts from '@/components/sections/TrendingProducts';
import NewsletterPromo from '@/components/sections/NewsletterPromo';
import { Separator } from '@/components/ui/separator';
import type { Metadata } from 'next';
import { absoluteUrl, createPageMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Shop Kenya’s Digital Marketplace',
  description: 'Discover authentic products from trusted Kenyan vendors on ZilaCart.',
  path: '/',
  image: '/images/hero-banner.jpg',
});

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'ZilaCart',
            url: absoluteUrl('/'),
            logo: absoluteUrl('/images/logo.jpg'),
            description: 'Kenya’s premier digital marketplace.',
          }),
        }}
      />
      <div className="space-y-12 md:space-y-20">
        <PromoBanners area="homepage_top" />
        <HeroCarousel />
        <CategoryTiles />
        <Separator className="my-8 md:my-12 border-border/50" />
        <FlashSalesSlider />
        <Separator className="my-8 md:my-12 border-border/50" />
        <FeaturedItems />
        <Separator className="my-8 md:my-12 border-border/50" />
        <TrendingProducts />
        <Separator className="my-8 md:my-12 border-border/50" />
        <NewsletterPromo />
      </div>
    </>
  );
}
