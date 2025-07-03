
import HeroCarousel from '@/components/sections/HeroCarousel';
import PromoBanners from '@/components/sections/PromoBanners';
import CategoryTiles from '@/components/sections/CategoryTiles';
import FlashSalesSlider from '@/components/sections/FlashSalesSlider';
import FeaturedItems from '@/components/sections/FeaturedItems';
import AiRecommendations from '@/components/sections/AiRecommendations';
import NewsletterPromo from '@/components/sections/NewsletterPromo';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="space-y-12 md:space-y-20">
      <PromoBanners area="homepage_top" />
      <HeroCarousel />
      <CategoryTiles />
      <Separator className="my-8 md:my-12 border-border/50" />
      <FlashSalesSlider />
      <Separator className="my-8 md:my-12 border-border/50" />
      <FeaturedItems />
      <Separator className="my-8 md:my-12 border-border/50" />
      <AiRecommendations />
      <Separator className="my-8 md:my-12 border-border/50" />
      <NewsletterPromo />
    </div>
  );
}
