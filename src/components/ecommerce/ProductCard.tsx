
'use client'; 

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, ShoppingCart, Heart, Loader2 } from 'lucide-react'; 
import { useAuth, type ProductForWishlist } from '@/context/AuthContext'; 
import { useState, useMemo } from 'react'; 
import { useRouter } from 'next/navigation';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  rating?: number;
  category: string;
  dataAiHint?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ id, name, price, imageUrl, rating, category, dataAiHint }) => {
  const { 
    addItemToCart, 
    isCartSaving, 
    currentUser,
    wishlistItems,
    toggleWishlistItem,
    isWishlistSaving
  } = useAuth();
  const router = useRouter();

  const isInWishlist = useMemo(() => 
    wishlistItems.some(item => item.productId === id),
  [wishlistItems, id]);

  const handleAddToCart = async () => {
    if (!currentUser) {
      router.push('/auth/login?redirect=' + window.location.pathname);
      return;
    }
    await addItemToCart({ id, name, price, imageUrl, dataAiHint }, 1);
  };

  const handleToggleWishlist = async () => {
    if (!currentUser) {
      router.push('/auth/login?redirect=' + window.location.pathname);
      return;
    }
    const productPayload: ProductForWishlist = { id, name, price, imageUrl, category, rating, dataAiHint };
    await toggleWishlistItem(productPayload);
  };

  return (
    <Card className="group relative overflow-hidden shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 ease-in-out transform hover:-translate-y-1 bg-card border-border hover:border-primary">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10 h-9 w-9 bg-background/50 hover:bg-primary/20 backdrop-blur-sm rounded-full"
        onClick={handleToggleWishlist}
        disabled={isWishlistSaving}
        aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        {isWishlistSaving && wishlistItems.some(i => i.productId === id) !== isInWishlist ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Heart className={`h-5 w-5 transition-colors ${isInWishlist ? 'fill-destructive text-destructive' : 'text-muted-foreground group-hover:text-destructive'}`} />
        )}
      </Button>
      <Link href={`/products/${id}`} passHref>
        <CardHeader className="p-0 relative">
          <Image
            src={imageUrl || 'https://placehold.co/400x300?text=No+Image'}
            alt={name}
            width={400}
            height={300}
            className="object-cover w-full h-48 group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={dataAiHint || category}
          />
          {category && <div className="absolute top-2 left-2 bg-accent text-accent-foreground px-2 py-1 text-xs font-semibold rounded glow-edge-accent">{category}</div>}
        </CardHeader>
        <CardContent className="p-4">
          <CardTitle className="text-lg font-headline leading-tight mb-1 truncate group-hover:text-primary transition-colors">{name}</CardTitle>
          <div className="flex items-center justify-between">
            <p className="text-xl font-semibold text-primary">KSh {price.toLocaleString()}</p>
            {rating && (
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                <span className="text-sm text-muted-foreground">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Link>
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full bg-primary hover:bg-primary/80 text-primary-foreground transition-all animate-pulse-glow group-hover:animate-none"
          onClick={handleAddToCart}
          disabled={isCartSaving}
        >
          {isCartSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="mr-2 h-4 w-4" />
          )}
          {isCartSaving ? 'Adding...' : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
