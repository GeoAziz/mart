
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, ShoppingCart, ShieldCheck, Truck, MessageCircle, ChevronLeft, ChevronRight, Minus, Plus, X, Maximize, Loader2, Send, AlertCircle, Share2, Copy, Facebook, Twitter, Mail, ZoomIn, Heart } from 'lucide-react';
import RelatedProductsAI from '@/components/ai/RelatedProductsAI';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Product as ProductData, Review as ReviewType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const { currentUser, addItemToCart, isCartSaving } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [errorProduct, setErrorProduct] = useState<string | null>(null);
  const [errorReviews, setErrorReviews] = useState<string | null>(null);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'verified' | 'highest' | 'lowest'>('all');
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);

  const fetchProductDetails = useCallback(async () => {
    setIsLoadingProduct(true);
    setErrorProduct(null);
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch product details');
      }
      const data: ProductData = await response.json();
      setProduct(data);
      setSelectedImageIndex(0); // Reset to primary image on new product load
    } catch (err) {
      console.error("Error fetching product:", err);
      setErrorProduct(err instanceof Error ? err.message : "Could not load product data.");
    } finally {
      setIsLoadingProduct(false);
    }
  }, [productId]);

  const fetchReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    setErrorReviews(null);
    try {
      const response = await fetch(`/api/products/${productId}/reviews`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch reviews');
      }
      const data: ReviewType[] = await response.json();
      setReviews(data.map(r => ({...r, createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(String(r.createdAt))})));
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setErrorReviews(err instanceof Error ? err.message : "Could not load reviews.");
    } finally {
      setIsLoadingReviews(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
      fetchReviews();
    }
  }, [productId, fetchProductDetails, fetchReviews]);

  const allImages = useMemo(() => {
    if (!product) return [];
    const images = [product.imageUrl, ...(product.additionalImageUrls || [])].filter(Boolean) as string[];
    return images.length > 0 ? images : [`https://placehold.co/600x600/5555FF/FFFFFF?text=${encodeURIComponent(product?.name?.substring(0, 20) || 'Product')}`];
  }, [product]);

  const ratingDistribution = useMemo(() => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating as keyof typeof distribution]++;
      }
    });
    return distribution;
  }, [reviews]);

  const filteredAndSortedReviews = useMemo(() => {
    let filtered = [...reviews];

    // Apply filter
    if (reviewFilter === 'verified') {
      filtered = filtered.filter(r => r.verifiedPurchase);
    }

    // Apply sort
    if (reviewFilter === 'highest') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (reviewFilter === 'lowest') {
      filtered.sort((a, b) => a.rating - b.rating);
    } else {
      // Default: sort by most recent
      filtered.sort((a, b) => (b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(String(b.createdAt)).getTime()) - (a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(String(a.createdAt)).getTime()));
    }

    return filtered;
  }, [reviews, reviewFilter]);

  const currentDisplayImage = allImages[selectedImageIndex] || 'https://placehold.co/600x600/cccccc/E0E0E0?text=No+Image';

  const selectImage = (index: number) => {
    setSelectedImageIndex(index);
  };
  
  const nextImage = useCallback(() => {
    if (allImages.length === 0) return;
    setSelectedImageIndex((prevIndex) => (prevIndex + 1) % allImages.length);
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    if (allImages.length === 0) return;
    setSelectedImageIndex((prevIndex) => (prevIndex - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  const handleQuantityChange = (amount: number) => {
    setQuantity(prev => Math.max(1, prev + amount));
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numeric input
    if (value === '' || /^\d+$/.test(value)) {
      const numValue = value === '' ? 1 : parseInt(value, 10);
      // Clamp between 1 and stock
      const maxQuantity = product?.stock !== undefined ? Math.max(1, product.stock) : 999;
      setQuantity(Math.min(Math.max(1, numValue), maxQuantity));
    }
  };

  const openImageModal = (index?: number) => {
    if (index !== undefined) setSelectedImageIndex(index);
    setIsImageModalOpen(true);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to add items to your cart.", variant: "destructive" });
      return;
    }
    setIsAddingToCart(true);
    await addItemToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl, // primary image for cart
      dataAiHint: product.dataAiHint,
    }, quantity);
    setIsAddingToCart(false);
  };

  const copyProductLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Copied!", description: "Product link copied to clipboard." });
      setIsShareMenuOpen(false);
    }).catch(() => {
      toast({ title: "Failed", description: "Could not copy link.", variant: "destructive" });
    });
  };

  const shareVia = (platform: 'facebook' | 'twitter' | 'email') => {
    if (!product) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `Check out this product: ${product.name}`;
    
    let shareUrl = '';
    if (platform === 'facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    } else if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    } else if (platform === 'email') {
      shareUrl = `mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(`${text}\n${url}`)}`;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank');
      setIsShareMenuOpen(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!product) return;
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to add items to your wishlist.", variant: "destructive" });
      return;
    }

    setIsAddingToWishlist(true);
    try {
      const token = await currentUser.getIdToken();
      const endpoint = isInWishlist 
        ? `/api/wishlist/${product.id}` 
        : `/api/wishlist`;

      const response = await fetch(endpoint, {
        method: isInWishlist ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: isInWishlist ? undefined : JSON.stringify({ productId: product.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update wishlist');
      }

      setIsInWishlist(!isInWishlist);
      toast({ 
        title: isInWishlist ? "Removed from Wishlist" : "Added to Wishlist",
        description: isInWishlist 
          ? "Item removed from your wishlist." 
          : "Item added to your wishlist.",
      });
    } catch (err) {
      console.error("Error updating wishlist:", err);
      toast({ 
        title: "Failed", 
        description: err instanceof Error ? err.message : "Could not update wishlist.", 
        variant: "destructive" 
      });
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!currentUser || !product) {
      toast({ title: "Error", description: "You must be logged in to submit a review.", variant: "destructive" });
      return;
    }
    if (newReviewRating === 0) {
      toast({ title: "Rating Required", description: "Please select a star rating.", variant: "destructive" });
      return;
    }
    if (newReviewComment.trim() === "") {
      toast({ title: "Comment Required", description: "Please write a comment for your review.", variant: "destructive" });
      return;
    }

    setIsSubmittingReview(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: newReviewRating, comment: newReviewComment.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit review.");
      }
      
      toast({ title: "Review Submitted!", description: "Thank you for your feedback." });
      setNewReviewRating(0);
      setNewReviewComment('');
      setIsReviewModalOpen(false);
      fetchReviews(); 
    } catch (err) {
      console.error("Error submitting review:", err);
      toast({ title: "Submission Failed", description: err instanceof Error ? err.message : "Could not submit your review.", variant: "destructive" });
    } finally {
      setIsSubmittingReview(false);
    }
  };
  
  const averageRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;

  if (isLoadingProduct) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
        <h1 className="text-3xl font-headline font-bold text-glow-primary">Loading Product...</h1>
      </div>
    );
  }

  if (errorProduct || !product) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
        <h1 className="text-3xl font-headline font-bold text-destructive">Product Not Found</h1>
        <p className="text-lg text-muted-foreground mt-2">{errorProduct || "The product you are looking for does not exist or is unavailable."}</p>
        <Button asChild className="mt-6">
            <Link href="/products">Back to Products</Link>
        </Button>
      </div>
    );
  }
  
  const displayImageDataAiHint = product.dataAiHint || product.category.toLowerCase().split(' ')[0] || "product";

  return (
    <div className="container mx-auto py-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-12">
        {/* Image Gallery */}
        <div className="relative">
          <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
            <DialogContent className="max-w-3xl min-h-[70vh] p-2 bg-background/90 backdrop-blur-md border-primary shadow-2xl glow-edge-primary flex flex-col">
               <Image
                src={currentDisplayImage.replace('600x600', '1000x1000').replace('400x300', '1000x1000')}
                alt={product.name || 'Product image'}
                width={1000}
                height={1000}
                className="w-full h-auto object-contain rounded-md flex-grow"
                data-ai-hint={displayImageDataAiHint}
                unoptimized 
              />
              {allImages.length > 1 && (
                <div className="absolute inset-y-0 left-0 flex items-center">
                    <Button variant="ghost" size="icon" onClick={prevImage} className="text-foreground hover:bg-muted/50 m-2" aria-label="Previous image"><ChevronLeft className="h-8 w-8"/></Button>
                </div>
              )}
              {allImages.length > 1 && (
                 <div className="absolute inset-y-0 right-0 flex items-center">
                    <Button variant="ghost" size="icon" onClick={nextImage} className="text-foreground hover:bg-muted/50 m-2" aria-label="Next image"><ChevronRight className="h-8 w-8"/></Button>
                </div>
              )}
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="absolute top-3 right-3 text-foreground hover:bg-muted/50" aria-label="Close image preview">
                  <X />
                </Button>
              </DialogClose>
            </DialogContent>
          </Dialog>

          <Card className="overflow-hidden shadow-xl border-primary glow-edge-primary relative group">
            <div className="relative aspect-square bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
              <Image
                src={currentDisplayImage}
                alt={product.name || 'Product image'}
                width={600}
                height={600}
                className="w-full h-full object-cover aspect-square transition-transform duration-500 ease-in-out cursor-pointer group-hover:scale-110"
                data-ai-hint={displayImageDataAiHint}
                priority
                onClick={() => openImageModal()}
                unoptimized 
              />
              {/* Zoom Icon on Hover */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors duration-300 opacity-0 group-hover:opacity-100">
                <div className="bg-primary/90 rounded-full p-3">
                  <ZoomIn className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
            </div>
            {/* Maximize Button */}
            <Button 
              onClick={() => openImageModal()}
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 z-20 bg-background/30 hover:bg-primary hover:text-primary-foreground rounded-full backdrop-blur-sm" 
              aria-label="Enlarge image"
            >
              <Maximize className="h-5 w-5"/>
            </Button>
            {/* Stock Badge */}
            {product.stock !== undefined && (
              <div className={`absolute top-12 right-2 z-10 px-2 py-1 text-xs font-semibold rounded text-white whitespace-nowrap ${
                product.stock <= 0 
                  ? 'bg-red-500/90' 
                  : product.stock <= 10
                  ? 'bg-yellow-500/90'
                  : 'bg-green-500/90'
              }`}>
                {product.stock <= 0 ? 'Out of Stock' : product.stock <= 10 ? `Low Stock (${product.stock})` : 'In Stock'}
              </div>
            )}
          </Card>
          
          {allImages.length > 1 && (
            <div className="mt-4 grid grid-cols-4 sm:grid-cols-5 gap-2">
              {allImages.map((imgUrl, index) => (
                <button
                  key={index}
                  onClick={() => selectImage(index)}
                  className={cn(
                    "aspect-square rounded-md overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary",
                    selectedImageIndex === index ? "border-primary ring-2 ring-primary shadow-lg" : "border-border hover:border-primary/70"
                  )}
                  aria-label={`View image ${index + 1}`}
                >
                  <Image
                    src={imgUrl}
                    alt={`Thumbnail ${index + 1}`}
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                    data-ai-hint={displayImageDataAiHint}
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info Panel */}
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl lg:text-5xl font-bold font-headline text-glow-primary">{product.name}</h1>
            </div>
            {/* Share Button */}
            <Dialog open={isShareMenuOpen} onOpenChange={setIsShareMenuOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="border-primary text-primary hover:bg-primary/10" aria-label="Share product">
                  <Share2 className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-80 bg-card border-primary">
                <DialogHeader>
                  <DialogTitle>Share This Product</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 border-primary/30 hover:bg-primary/10"
                    onClick={copyProductLink}
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 border-blue-500/30 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    onClick={() => shareVia('facebook')}
                  >
                    <Facebook className="h-4 w-4" />
                    Share on Facebook
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 border-sky-500/30 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400"
                    onClick={() => shareVia('twitter')}
                  >
                    <Twitter className="h-4 w-4" />
                    Share on Twitter
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 border-amber-500/30 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    onClick={() => shareVia('email')}
                  >
                    <Mail className="h-4 w-4" />
                    Share via Email
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-6 w-6 ${i < Math.round(averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50'}`} />
              ))}
              <span className="ml-2 text-muted-foreground">({reviews.length} reviews)</span>
            </div>
          </div>
          
          <div>
            <span className="text-4xl font-semibold text-primary">KSh {product.price.toLocaleString()}</span>
          </div>

          <p className="text-lg text-foreground/90 leading-relaxed">{product.description ? product.description.substring(0,150) + (product.description.length > 150 ? '...' : '') : 'No description available.'}</p>
          
          <div className="flex items-center space-x-3">
            <Label htmlFor="quantity" className="text-lg">Quantity:</Label>
            <div className="flex items-center border border-border rounded-md">
              <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(-1)} className="rounded-r-none h-10 w-10" aria-label="Decrease quantity"><Minus className="h-4 w-4"/></Button>
              <Input id="quantity" type="text" value={quantity} onChange={handleQuantityInputChange} maxLength={3} className="w-16 h-10 text-center border-y-0 border-x focus-visible:ring-0 focus-visible:ring-primary rounded-none bg-transparent" aria-label="Product quantity" placeholder="1"/>
              <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(1)} className="rounded-l-none h-10 w-10" aria-label="Increase quantity"><Plus className="h-4 w-4"/></Button>
            </div>
            {product?.stock !== undefined && quantity > product.stock && (
              <span className="text-xs text-destructive font-semibold">Only {product.stock} available</span>
            )}
          </div>

          {/* Stock Warning Card */}
          {product?.stock !== undefined && quantity > product.stock && (
            <Card className="bg-destructive/10 border-destructive/30 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive font-medium">
                  Only {product.stock} item{product.stock !== 1 ? 's' : ''} available. Please adjust your quantity.
                </p>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            <div className="flex gap-3 items-center">
              <Button 
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary transition-all hover:shadow-lg hover:shadow-primary/50 h-12 px-6 rounded-lg font-semibold flex items-center justify-center gap-2"
                onClick={handleAddToCart}
                disabled={isAddingToCart || isCartSaving || (product.stock !== undefined && product.stock <=0)}
                aria-label="Add to Cart"
              >
                {isAddingToCart || isCartSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ShoppingCart className="h-6 w-6" />
                )}
                <span>{isAddingToCart || isCartSaving ? 'Adding...' : (product.stock !== undefined && product.stock <=0 ? 'Out of Stock' : 'Add to Cart')}</span>
              </Button>
              <Button 
                className={`h-12 w-12 rounded-full transition-all flex items-center justify-center flex-shrink-0 ${isInWishlist ? 'bg-accent text-accent-foreground hover:bg-accent/90' : 'border-2 border-accent/50 text-accent hover:bg-accent/10'}`}
                onClick={handleAddToWishlist}
                disabled={isAddingToWishlist}
                aria-label={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                title={isInWishlist ? "In Wishlist" : "Add to Wishlist"}
              >
                {isAddingToWishlist ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Heart className={`h-6 w-6 ${isInWishlist ? 'fill-current' : ''}`} />
                )}
              </Button>
            </div>
            <Button 
              className="w-full h-12 px-6 border border-primary/30 bg-background text-primary hover:bg-primary/10 font-semibold rounded-lg transition-colors"
              disabled={product.stock !== undefined && product.stock <= 0}
            >
              Buy Now
            </Button>
          </div>

          <Card className="bg-card border-border p-4">
            <div className="flex items-center space-x-3 mb-2">
              <ShieldCheck className="h-6 w-6 text-green-400" />
              <p className="text-sm">Secure Transaction & Buyer Protection</p>
            </div>
            <div className="flex items-center space-x-3">
              <Truck className="h-6 w-6 text-blue-400" />
              <p className="text-sm">Estimated Delivery: Typically 2-3 business days</p>
            </div>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="description" className="w-full mb-12">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex bg-card border border-border mb-4">
          <TabsTrigger value="description" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Description</TabsTrigger>
          <TabsTrigger value="reviews" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="shipping" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Shipping & Seller</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="p-6 bg-card rounded-md border border-border shadow-lg">
          <h3 className="text-2xl font-semibold mb-4 text-glow-accent">Product Details</h3>
          <p className="text-foreground/80 leading-loose whitespace-pre-line">{product.description || 'Detailed description not available.'}</p>
          <Separator className="my-6" />
          
          {/* Specifications Table */}
          <h4 className="text-lg font-semibold mb-3 text-foreground">Specifications</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-muted-foreground bg-muted/20 w-1/3">Brand</td>
                  <td className="py-3 px-4 text-foreground">{product.brand || 'N/A'}</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-muted-foreground bg-muted/20 w-1/3">Category</td>
                  <td className="py-3 px-4 text-foreground">{product.category}</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-muted-foreground bg-muted/20 w-1/3">SKU</td>
                  <td className="py-3 px-4 text-foreground font-mono text-xs">{product.sku || 'N/A'}</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-muted-foreground bg-muted/20 w-1/3">Availability</td>
                  <td className="py-3 px-4">
                    {product.stock !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${product.stock > 10 ? 'bg-green-500' : product.stock > 0 ? 'bg-yellow-500' : 'bg-destructive'}`} />
                        <span className="text-foreground">
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Available</span>
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-muted-foreground bg-muted/20 w-1/3">Price</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-primary">KSh {product.price.toLocaleString()}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="reviews" className="p-6 bg-card rounded-md border border-border shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-glow-accent">Customer Reviews</h3>
            {currentUser && (
              <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">Write a Review</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-card border-primary">
                  <DialogHeader>
                    <DialogTitle>Write a Review</DialogTitle>
                    <DialogDescription>Share your experience with this product.</DialogDescription>
                  </DialogHeader>

                  <div className="flex items-center space-x-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        className={`transition-colors ${
                          (hoverRating || newReviewRating) >= star ? 'text-yellow-400' : 'text-muted-foreground/50 hover:text-yellow-300'
                        }`}
                        onClick={() => setNewReviewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`${star} star rating`}
                      >
                        <Star className="h-7 w-7 fill-current" />
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1 mb-4">
                    <Label htmlFor="comment">Comment</Label>
                    <Textarea id="comment" value={newReviewComment} onChange={(e) => setNewReviewComment(e.target.value)} placeholder="Tell us more about your experience..." rows={4} className="bg-input border-primary focus:ring-accent"/>
                  </div>

                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsReviewModalOpen(false)} disabled={isSubmittingReview}>Cancel</Button>
                    <Button onClick={handleReviewSubmit} disabled={isSubmittingReview || newReviewRating === 0 || newReviewComment.trim() === ''} className="bg-primary hover:bg-primary/90">
                      {isSubmittingReview ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                      {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {/* Review Summary Widget */}
          {reviews.length > 0 && (
            <Card className="mb-8 p-6 bg-muted/30 border-primary/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-3xl font-bold text-primary">{averageRating.toFixed(1)}</span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < Math.round(averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{reviews.length} verified reviews</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = ratingDistribution[rating as keyof typeof ratingDistribution];
                    const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                    return (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground w-6">{rating}⭐</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
          {/* Review Filters */}
          {reviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { key: 'all', label: 'All Reviews' },
                { key: 'verified', label: '✓ Verified Purchase' },
                { key: 'highest', label: '⭐ Highest First' },
                { key: 'lowest', label: '⭐ Lowest First' },
              ].map(filter => (
                <Button
                  key={filter.key}
                  variant={reviewFilter === filter.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReviewFilter(filter.key as typeof reviewFilter)}
                  className={reviewFilter === filter.key ? 'bg-primary text-primary-foreground' : 'border-primary/50 text-muted-foreground hover:border-primary hover:text-foreground'}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          )}
          {isLoadingReviews ? (
            <div className="text-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto"/> <p className="text-muted-foreground">Loading reviews...</p></div>
          ) : errorReviews ? (
             <div className="text-center py-4 text-destructive"><AlertCircle className="h-8 w-8 mx-auto mb-2"/> <p>{errorReviews}</p></div>
          ) : filteredAndSortedReviews.length > 0 ? (
            filteredAndSortedReviews.map(review => (
              <div key={review.id} className="mb-6 pb-6 border-b border-border/50 last:border-b-0 last:pb-0">
                <div className="flex items-center mb-2 gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50'}`} />
                  ))}
                  <strong className="ml-1 font-medium text-foreground">{review.customerName || 'Anonymous'}</strong>
                  {review.verifiedPurchase && (
                    <Badge variant="outline" className="bg-green-500/10 border-green-500/50 text-green-300 text-xs">
                      ✓ Verified Purchase
                    </Badge>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">{(review.createdAt instanceof Date ? review.createdAt : new Date(String(review.createdAt))).toLocaleDateString()}</span>
                </div>
                <p className="text-foreground/80">{review.comment}</p>
                {review.reply && (
                  <div className="mt-3 ml-6 p-3 bg-muted/50 rounded-md border border-primary/30">
                    <p className="text-sm font-semibold text-primary">Reply from {product.vendorId ? 'Seller' : 'ZilaCart'}:</p>
                    <p className="text-sm text-muted-foreground">{review.reply}</p>
                    {review.repliedAt && <p className="text-xs text-muted-foreground/70 text-right">Replied on: {(review.repliedAt instanceof Date ? review.repliedAt : new Date(String(review.repliedAt))).toLocaleDateString()}</p>}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">No reviews yet. Be the first to share your thoughts!</p>
          )}
        </TabsContent>
        <TabsContent value="shipping" className="p-6 bg-card rounded-md border border-border shadow-lg">
          <h3 className="text-2xl font-semibold mb-4 text-glow-accent">Shipping Information</h3>
          <p className="text-foreground/80 mb-2"><strong className="text-muted-foreground">Estimated Delivery:</strong> Typically 2-3 business days.</p>
          <p className="text-foreground/80 mb-2"><strong className="text-muted-foreground">Shipping Cost:</strong> Calculated at checkout.</p>
          <p className="text-foreground/80 mb-6"><strong className="text-muted-foreground">Details:</strong> Ships via ChronoPost Express. Quantum-locked secure packaging.</p>
          <Separator className="my-6" />

          {/* Return Policy Section */}
          <h3 className="text-2xl font-semibold mb-4 text-glow-accent">Return & Refund Policy</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* 30-Day Returns Card */}
            <Card className="bg-blue-500/10 border-blue-400/30 p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 p-2 rounded-lg flex-shrink-0">
                  <Truck className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">30-Day Returns</h4>
                  <p className="text-sm text-foreground/80">Return within 30 days of delivery for a full refund. Product must be unused and in original packaging.</p>
                </div>
              </div>
            </Card>

            {/* Easy Refund Card */}
            <Card className="bg-green-500/10 border-green-400/30 p-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-500/20 p-2 rounded-lg flex-shrink-0">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Easy Refund Process</h4>
                  <p className="text-sm text-foreground/80">Initiate returns through your account. We process refunds within 5-7 business days of receiving your return.</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Return Conditions */}
          <div className="mb-6 p-4 bg-muted/40 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-3">Return Conditions</h4>
            <ul className="space-y-2 text-sm text-foreground/80">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✓</span>
                <span>Product must be unused and in original condition</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✓</span>
                <span>Original packaging must be intact</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✓</span>
                <span>All included accessories and documentation required</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✓</span>
                <span>Return shipping is customer's responsibility</span>
              </li>
            </ul>
          </div>

          <Separator className="my-6" />

          {/* Warranty Section */}
          <h3 className="text-2xl font-semibold mb-4 text-glow-accent">Warranty & Protection</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Manufacturer Warranty Card */}
            <Card className="bg-purple-500/10 border-purple-400/30 p-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-500/20 p-2 rounded-lg flex-shrink-0">
                  <ShieldCheck className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">12-Month Manufacturer Warranty</h4>
                  <p className="text-sm text-foreground/80">Covers defects in materials and workmanship under normal use. Extended warranty options available at checkout.</p>
                </div>
              </div>
            </Card>

            {/* Buyer Protection Card */}
            <Card className="bg-amber-500/10 border-amber-400/30 p-4">
              <div className="flex items-start gap-3">
                <div className="bg-amber-500/20 p-2 rounded-lg flex-shrink-0">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">ZilaCart Buyer Protection</h4>
                  <p className="text-sm text-foreground/80">If the product doesn't arrive or isn't as described, you're covered. File a claim within 60 days of purchase.</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Warranty Coverage */}
          <div className="p-4 bg-muted/40 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-3">What's Covered</h4>
            <ul className="space-y-2 text-sm text-foreground/80">
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold mt-0.5">★</span>
                <span>Manufacturing defects and material failures</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold mt-0.5">★</span>
                <span>Faulty components under normal usage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold mt-0.5">★</span>
                <span>Free repairs or replacement at manufacturer's discretion</span>
              </li>
            </ul>
          </div>

          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-foreground/80">
            <strong className="text-destructive">Not Covered:</strong> Physical damage, misuse, unauthorized repairs, normal wear and tear, or damage from accidents.
          </div>

          <Separator className="my-6" />
          <h3 className="text-2xl font-semibold mb-4 text-glow-accent">Seller Information</h3>
          {product.vendorId ? (
            <>
              <div className="flex items-start space-x-4 mb-4 p-4 bg-card/50 border border-primary/20 rounded-lg">
                <Image src={`https://placehold.co/80x80/5555FF/FFFFFF?text=${product.vendorId.substring(0,1).toUpperCase()}`} alt={`${product.vendorId} logo`} width={60} height={60} className="rounded-full border-2 border-accent flex-shrink-0" data-ai-hint="seller logo"/>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-lg font-semibold text-primary">{product.vendorId ? `Vendor ${product.vendorId.substring(0,6)}...` : 'ZilaCart Official'}</p>
                    <Badge className="bg-green-500/20 text-green-300 border-green-400/50">
                      ✓ Verified Seller
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold">4.7</span>
                      <span className="text-xs text-muted-foreground">(2,347 sales)</span>
                    </div>
                    <div className="text-muted-foreground">📞 Avg. response: under 2 hours</div>
                    <div className="flex gap-2 text-xs">
                      <span className="text-green-600 dark:text-green-400">✓ Fast Shipper</span>
                      <span className="text-green-600 dark:text-green-400">✓ 99.2% Positive</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <Link href={`/messaging/new?recipientId=${product.vendorId || ''}&contextId=${product.id}&contextType=product&contextName=${encodeURIComponent(product.name)}&recipientName=${encodeURIComponent(`Vendor ${(product.vendorId || '').substring(0,6)}...`)}`}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Contact Seller
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-foreground/80">This product is sold directly by ZilaCart.</p>
          )}
        </TabsContent>
      </Tabs>

      <RelatedProductsAI product={product} />

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed md:hidden bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-2xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Price Section */}
            <div className="flex flex-col min-w-fit">
              <span className="text-xs text-muted-foreground">Price</span>
              <span className="text-xl font-bold text-primary">KSh {product.price.toLocaleString()}</span>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center border border-border rounded-md bg-muted/30">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleQuantityChange(-1)} 
                className="rounded-r-none h-8 w-8 p-0" 
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input 
                type="text" 
                value={quantity} 
                onChange={handleQuantityInputChange} 
                maxLength={3} 
                className="w-12 h-8 text-center border-0 focus-visible:ring-0 focus-visible:ring-primary bg-transparent text-sm" 
                aria-label="Product quantity" 
                placeholder="1"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleQuantityChange(1)} 
                className="rounded-l-none h-8 w-8 p-0" 
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* CTA Button */}
            <Button 
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-all h-8 text-sm px-2"
              onClick={handleAddToCart}
              disabled={isAddingToCart || isCartSaving || (product.stock !== undefined && product.stock <= 0)}
              aria-label="Add to Cart"
            >
              {isAddingToCart || isCartSaving ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
              ) : (
                <ShoppingCart className="h-4 w-4 flex-shrink-0 text-primary-foreground" />
              )}
              <span className="hidden sm:inline">{isAddingToCart || isCartSaving ? 'Adding...' : (product.stock !== undefined && product.stock <= 0 ? 'Out' : 'Add')}</span>
            </Button>

            {/* Wishlist Button */}
            <Button 
              size="sm"
              variant={isInWishlist ? "default" : "outline"}
              className={isInWishlist ? "bg-accent text-accent-foreground hover:bg-accent/90" : "border-accent/30 text-accent hover:bg-accent/10"}
              onClick={handleAddToWishlist}
              disabled={isAddingToWishlist}
              aria-label="Add to wishlist"
            >
              {isAddingToWishlist ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
              )}
            </Button>
          </div>

          {/* Stock Warning - Shown below controls if needed */}
          {product?.stock !== undefined && quantity > product.stock && (
            <div className="mt-2 px-2 py-1 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              <span>Only {product.stock} item{product.stock !== 1 ? 's' : ''} available</span>
            </div>
          )}
        </div>
      </div>

      {/* Spacer for mobile sticky bar */}
      <div className="md:hidden h-24"></div>
    </div>
  );
}
