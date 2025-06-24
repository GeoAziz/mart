'use client';

import Link from 'next/link';
import { Shirt, Smartphone, Home, Sparkles, Tag } from 'lucide-react'; // Example icons
import { Card } from '@/components/ui/card';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const categories = [
  { name: "Fashion", icon: <Shirt className="h-10 w-10 mb-2 text-accent" />, href: "/categories/fashion", dataAiHint: "clothing style" },
  { name: "Electronics", icon: <Smartphone className="h-10 w-10 mb-2 text-accent" />, href: "/categories/electronics", dataAiHint: "gadgets devices" },
  { name: "Home Goods", icon: <Home className="h-10 w-10 mb-2 text-accent" />, href: "/categories/home", dataAiHint: "furniture decor" },
  { name: "Beauty", icon: <Sparkles className="h-10 w-10 mb-2 text-accent" />, href: "/categories/beauty", dataAiHint: "cosmetics makeup" },
  { name: "All Deals", icon: <Tag className="h-10 w-10 mb-2 text-accent" />, href: "/deals", dataAiHint: "sale discount" },
];

const CategoryTiles = () => {
  const addToRefs = useScrollReveal();
  return (
    <section ref={addToRefs} className="scroll-reveal mb-12 md:mb-16">
      <h2 className="text-3xl font-headline font-bold mb-6 text-center text-glow-accent">Shop by Category</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
        {categories.map((category) => (
          <Link href={category.href} key={category.name} passHref>
            <Card className="flex flex-col items-center justify-center p-6 aspect-square bg-card border-border hover:border-primary hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 ease-in-out transform hover:-translate-y-1 glow-edge-primary group">
              {category.icon}
              <span className="text-md font-semibold text-center text-card-foreground group-hover:text-primary transition-colors">{category.name}</span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryTiles;
