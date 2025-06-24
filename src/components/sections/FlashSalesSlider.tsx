
'use client';

import ProductCard from '@/components/ecommerce/ProductCard';
import ProductCardSkeleton from '@/components/ecommerce/ProductCardSkeleton';
import { Zap } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useState, useEffect } from 'react';
import type { Product } from '@/lib/types';

const FlashSalesSlider = () => {
  const addToRefs = useScrollReveal();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFlashSaleProducts = async () => {
      setIsLoading(true);
      try {
        // Fetch 4 cheapest products to simulate a "flash sale"
        const response = await fetch('/api/products?sortBy=price-asc&limit=4');
        if (!response.ok) {
          throw new Error('Failed to fetch flash sale products');
        }
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error(error);
        // Silently fail is okay here, the section just won't render
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlashSaleProducts();
  }, []);

  if (isLoading) {
    return (
      <section className="mb-12 md:mb-16">
        <h2 className="text-3xl font-headline font-bold mb-6 text-center text-glow-primary flex items-center justify-center">
          <Zap className="w-8 h-8 mr-2 text-primary" /> Flash Sales
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null; // Don't render the section if no products were fetched
  }

  return (
    <section ref={addToRefs} className="scroll-reveal mb-12 md:mb-16">
      <div className="flex items-center justify-center mb-6">
        <h2 className="text-3xl font-headline font-bold text-glow-primary flex items-center">
          <Zap className="w-8 h-8 mr-2 text-primary animate-pulse" /> Flash Sales
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <div key={product.id} className="relative">
             <ProductCard {...product} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default FlashSalesSlider;
