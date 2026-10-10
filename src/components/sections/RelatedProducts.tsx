'use client';

import { useEffect, useState } from 'react';
import ProductCard from '@/components/ecommerce/ProductCard';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/lib/types';

interface RelatedProductsProps {
  product: Product;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ product }) => {
  const addToRefs = useScrollReveal();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!product || !product.category) return;
      setIsLoading(true);
      try {
        // Fetch products in the same category
        const response = await fetch(`/api/products?category=${encodeURIComponent(product.category)}&limit=5`);
        if (!response.ok) throw new Error('Failed to fetch related products');
        const data = await response.json();
        const related = (data.products || data).filter((p: Product) => p.id !== product.id).slice(0, 4);
        setProducts(related);
      } catch (error) {
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRelated();
  }, [product]);

  if (isLoading) {
    return (
      <section className="mb-12 md:mb-16 mt-16">
        <h2 className="text-3xl font-headline font-bold mb-6 text-center text-primary flex items-center justify-center">
          <Sparkles className="w-8 h-8 mr-2 text-primary" /> Related Products
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section ref={addToRefs} className="scroll-reveal mb-12 md:mb-16 mt-16">
      <h2 className="text-3xl font-headline font-bold mb-6 text-center text-primary flex items-center justify-center">
        <Sparkles className="w-8 h-8 mr-2 text-primary" /> Related Products
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((p) => (
          <ProductCard key={p.id} {...p} />
        ))}
      </div>
    </section>
  );
};

export default RelatedProducts;

