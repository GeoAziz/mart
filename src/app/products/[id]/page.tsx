
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, ShoppingCart, ShieldCheck, Truck, MessageCircle, ChevronLeft, ChevronRight, Minus, Plus, X, Maximize, Loader2, Send, AlertCircle } from 'lucide-react';
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
    return images.length > 0 ? images : ['https://placehold.co/600x600/cccccc/E0E0E0?text=No+Image'];
  }, [product]);

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

          <Card className="overflow-hidden shadow-xl border-primary glow-edge-primary relative">
            <Image
              src={currentDisplayImage}
              alt={product.name || 'Product image'}
              width={600}
              height={600}
              className="w-full h-auto object-cover aspect-square transition-opacity duration-500 ease-in-out hover:opacity-90 cursor-pointer"
              data-ai-hint={displayImageDataAiHint}
              priority
              onClick={() => openImageModal()}
              unoptimized 
            />
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
          <h1 className="text-4xl lg:text-5xl font-bold font-headline text-glow-primary">{product.name}</h1>
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

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              size="lg" 
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/50"
              onClick={handleAddToCart}
              disabled={isAddingToCart || isCartSaving || !currentUser || (product.stock !== undefined && product.stock <=0)}
            >
              {isAddingToCart || isCartSaving ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ShoppingCart className="mr-2 h-5 w-5" />
              )}
              {isAddingToCart || isCartSaving ? 'Adding...' : (product.stock !== undefined && product.stock <=0 ? 'Out of Stock' : 'Add to Cart')}
            </Button>
            <Button size="lg" variant="outline" className="flex-1 border-accent text-accent hover:bg-accent hover:text-accent-foreground glow-edge-accent" disabled={product.stock !== undefined && product.stock <=0}>
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
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong className="text-muted-foreground">Brand:</strong> {product.brand || 'N/A'}</div>
            <div><strong className="text-muted-foreground">Category:</strong> {product.category}</div>
            <div><strong className="text-muted-foreground">SKU:</strong> {product.sku || 'N/A'}</div>
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
                    <DialogTitle className="text-glow-primary">Write a Review for {product.name}</DialogTitle>
                    <DialogDescription>Share your thoughts with other customers.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-1">
                      <Label htmlFor="rating">Rating</Label>
                      <div className="flex items-center">
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
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="comment">Comment</Label>
                      <Textarea id="comment" value={newReviewComment} onChange={(e) => setNewReviewComment(e.target.value)} placeholder="Tell us more about your experience..." rows={4} className="bg-input border-primary focus:ring-accent"/>
                    </div>
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
          {isLoadingReviews ? (
            <div className="text-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto"/> <p className="text-muted-foreground">Loading reviews...</p></div>
          ) : errorReviews ? (
             <div className="text-center py-4 text-destructive"><AlertCircle className="h-8 w-8 mx-auto mb-2"/> <p>{errorReviews}</p></div>
          ) : reviews.length > 0 ? (
            reviews.map(review => (
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
          <h3 className="text-2xl font-semibold mb-4 text-glow-accent">Seller Information</h3>
          {product.vendorId ? (
            <>
            <div className="flex items-center space-x-4">
              <Image src={`https://placehold.co/80x80/5555FF/FFFFFF?text=${product.vendorId.substring(0,1).toUpperCase()}`} alt={`${product.vendorId} logo`} width={60} height={60} className="rounded-full border-2 border-accent" data-ai-hint="seller logo"/>
              <div>
                <p className="text-xl font-semibold text-primary">Sold by: {product.vendorId ? `Vendor ${product.vendorId.substring(0,6)}...` : 'ZilaCart Official'}</p>
              </div>
            </div>
            <Button asChild variant="outline" className="mt-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <Link href={`/messaging/new?recipientId=${product.vendorId}&contextId=${product.id}&contextType=product&contextName=${encodeURIComponent(product.name)}&recipientName=${encodeURIComponent(`Vendor ${product.vendorId.substring(0,6)}...`)}`}>
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
    </div>
  );
}
