'use client';

import { useEffect, useState } from 'react';
import ProductCard from '@/components/ecommerce/ProductCard';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Flame } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/lib/types';

const TrendingProducts = () => {
  const addToRefs = useScrollReveal();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      setIsLoading(true);
      try {
        // Fetch top-rated products as "Trending"
        const response = await fetch('/api/products?sortBy=rating-desc&limit=4');
        if (!response.ok) throw new Error('Failed to fetch trending products');
        const data = await response.json();
        setProducts(data.products || data); // handle both { products: [] } and [] array formats
      } catch (error) {
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrending();
  }, []);

  if (isLoading) {
    return (
      <section className="mb-12 md:mb-16">
        <h2 className="text-3xl font-headline font-bold mb-6 text-center text-orange-500 flex items-center justify-center">
          <Flame className="w-8 h-8 mr-2 text-orange-500 animate-pulse" /> Trending Products
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section ref={addToRefs} className="scroll-reveal mb-12 md:mb-16">
      <h2 className="text-3xl font-headline font-bold mb-6 text-center text-orange-500 flex items-center justify-center">
        <Flame className="w-8 h-8 mr-2 text-orange-500 animate-pulse" /> Trending Products
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </section>
  );
};

export default TrendingProducts;

