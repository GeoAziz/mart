'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import ProductCard from '@/components/ecommerce/ProductCard';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/lib/types';

const AiRecommendations = () => {
  const addToRefs = useScrollReveal();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        // This endpoint should return personalized recommendations for the current user
        const response = await fetch('/api/ai/recommendations');
        if (!response.ok) throw new Error('Failed to fetch recommendations');
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  if (isLoading) {
    return (
      <section className="mb-12 md:mb-16">
        <h2 className="text-3xl font-headline font-bold mb-6 text-center text-glow-accent flex items-center justify-center">
          <Sparkles className="w-8 h-8 mr-2 text-accent animate-pulse" /> Recommended for You
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
      <h2 className="text-3xl font-headline font-bold mb-6 text-center text-glow-accent flex items-center justify-center">
        <Sparkles className="w-8 h-8 mr-2 text-accent animate-pulse" /> Recommended for You
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </section>
  );
};

export default AiRecommendations;
