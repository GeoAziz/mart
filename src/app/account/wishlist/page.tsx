'use client';

import { useState, useEffect, useCallback } from 'react';
import ProductCard from '@/components/ecommerce/ProductCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Heart, ShoppingCart, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { WishlistItemClient } from '@/context/AuthContext';

export default function WishlistPage() {
  const { 
    wishlistItems, 
    isWishlistLoading, 
    isWishlistSaving,
    toggleWishlistItem, 
    addItemToCart, 
    isCartSaving 
  } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleRemoveFromWishlist = async (product: WishlistItemClient) => {
    await toggleWishlistItem({
      id: product.productId,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      rating: product.rating,
      dataAiHint: product.dataAiHint,
    });
  };

  const handleMoveToCart = async (item: WishlistItemClient) => {
    await addItemToCart({
        id: item.productId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        dataAiHint: item.dataAiHint,
    }, 1);
    // After adding to cart, remove from wishlist
    await handleRemoveFromWishlist(item);
  };
  
  if (isWishlistLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading your wishlist...</p>
      </div>
    );
  }

  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-glow-primary">My Wishlist</CardTitle>
        <CardDescription className="text-muted-foreground">Your saved items for later.</CardDescription>
      </CardHeader>
      <CardContent>
        {wishlistItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => (
              <div key={item.productId} className="relative group">
                <ProductCard
                  id={item.productId}
                  name={item.name}
                  price={item.price}
                  imageUrl={item.imageUrl}
                  rating={item.rating}
                  category={item.category || ''}
                  dataAiHint={item.dataAiHint}
                />
                <div className="absolute top-12 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col space-y-2 z-10">
                  <Button 
                    variant="default" 
                    size="icon" 
                    className="h-9 w-9 bg-primary/80 hover:bg-primary text-primary-foreground"
                    onClick={() => handleMoveToCart(item)}
                    disabled={isCartSaving || isWishlistSaving}
                    aria-label="Move to cart"
                  >
                    {isCartSaving ? <Loader2 size={16} className="animate-spin"/> : <ShoppingCart size={16} />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Heart}
            title="No items in your wishlist"
            description="Save items you love for later"
            action={{
              label: "Explore Products",
              onClick: () => router.push('/products'),
            }}
          />
        )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
