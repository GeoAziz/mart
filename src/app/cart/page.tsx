
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Minus, Plus, Trash2, Loader2, ShoppingCart, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const { 
    cart, 
    updateCartItemQuantity, 
    removeCartItem, 
    isCartLoading, 
    isCartSaving, 
    currentUser,
    appliedPromotion,
    applyPromotion,
    removePromotion,
    isPromotionLoading
  } = useAuth();
  
  const [couponCode, setCouponCode] = useState('');
  const router = useRouter();

  useEffect(() => {
    // If a promotion is already applied in context, pre-fill the input
    if (appliedPromotion) {
        setCouponCode(appliedPromotion.code);
    }
  }, [appliedPromotion]);


  const handleQuantityChange = async (productId: string, currentQuantity: number, amount: number) => {
    const item = cart.find(i => i.productId === productId);
    const maxStock = item?.stock ?? 999;
    const newQuantity = Math.max(1, Math.min(currentQuantity + amount, maxStock));
    if (newQuantity !== currentQuantity) {
      await updateCartItemQuantity(productId, newQuantity);
    }
  };
  
  const handleApplyCoupon = async () => {
    if (couponCode.trim()) {
      await applyPromotion(couponCode.trim());
    }
  };
  
  const handleRemoveCoupon = async () => {
    await removePromotion();
    setCouponCode('');
  };


  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = appliedPromotion?.discountAmount || 0;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const shippingCost = subtotalAfterDiscount > 5000 ? 0 : 500; 
  const tax = subtotalAfterDiscount * 0.16; 
  const total = subtotalAfterDiscount + shippingCost + tax;

  if (isCartLoading && currentUser) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
        <h1 className="text-3xl font-headline font-bold text-glow-primary">Loading Your Cart...</h1>
        <p className="text-lg text-muted-foreground mt-2">Please wait a moment.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-headline font-bold text-glow-primary">Your Shopping Cart</h1>
      </div>

      {cart.length === 0 && !isCartLoading && (
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Add some products to get started"
          action={{
            label: "Browse Products",
            onClick: () => router.push('/products'),
          }}
        />
      )}

      {cart.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-6">
            {cart.map(item => (
              <Card key={item.productId} className="flex flex-col sm:flex-row items-center p-4 gap-4 bg-card border-border shadow-md hover:shadow-primary/20 transition-shadow">
                <Image 
                  src={item.imageUrl || 'https://placehold.co/100x100/cccccc/E0E0E0?text=No+Image'} 
                  alt={item.name} 
                  width={100} 
                  height={100} 
                  className="rounded-md object-cover w-full sm:w-24 h-24" 
                  data-ai-hint={item.dataAiHint || 'product image'}
                />
                <div className="flex-grow text-center sm:text-left">
                  <Link href={`/products/${item.productId}`} className="text-lg font-semibold hover:text-primary transition-colors">{item.name}</Link>
                  <p className="text-sm text-muted-foreground">Price: KSh {item.price.toLocaleString()}</p>
                  {item.stock !== undefined && item.stock > 0 && item.stock <= 5 && (
                    <p className="text-xs text-amber-500">Only {item.stock} left in stock</p>
                  )}
                  {item.stock !== undefined && item.stock === 0 && (
                    <p className="text-xs text-destructive">Out of stock</p>
                  )}
                  {item.stock !== undefined && item.quantity > item.stock && (
                    <p className="text-xs text-destructive">Quantity exceeds available stock ({item.stock})</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 my-2 sm:my-0">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleQuantityChange(item.productId, item.quantity, -1)} 
                    className="h-8 w-8"
                    disabled={isCartSaving || item.quantity <= 1}
                  >
                    <Minus size={16}/>
                  </Button>
                  <Input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) {
                        updateCartItemQuantity(item.productId, Math.min(val, item.stock || 999));
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val) || val < 1) {
                        updateCartItemQuantity(item.productId, 1);
                      }
                    }}
                    min={1}
                    max={item.stock || 999}
                    className="w-16 h-8 text-center bg-transparent focus-visible:ring-1"
                    disabled={isCartSaving}
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleQuantityChange(item.productId, item.quantity, 1)} 
                    className="h-8 w-8"
                    disabled={isCartSaving || (item.stock !== undefined && item.quantity >= item.stock)}
                  >
                    <Plus size={16}/>
                  </Button>
                </div>
                <p className="font-semibold w-24 text-center sm:text-right">KSh {(item.price * item.quantity).toLocaleString()}</p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeCartItem(item.productId)} 
                  className="text-destructive hover:text-destructive/80" 
                  aria-label="Remove item"
                  disabled={isCartSaving}
                >
                  <Trash2 size={20}/>
                </Button>
              </Card>
            ))}
            {isCartSaving && (
              <div className="flex items-center justify-center p-4 text-muted-foreground">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Updating cart...
              </div>
            )}
          </div>

          {/* Order Summary Box */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-card border-primary shadow-xl glow-edge-primary">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-2xl font-headline text-glow-accent">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-0">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>KSh {subtotal.toLocaleString()}</span>
                </div>
                {appliedPromotion && (
                    <div className="flex justify-between text-green-400">
                        <span>Discount ({appliedPromotion.code})</span>
                        <span>-KSh {discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>KSh {shippingCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (VAT 16%)</span>
                  <span>KSh {tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <Separator className="my-3 border-border/50"/>
                <div className="flex justify-between text-xl font-bold text-foreground">
                  <span>Total</span>
                  <span>KSh {total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div className="pt-4">
                  <Label htmlFor="coupon" className="text-sm font-medium">Discount Code</Label>
                  <div className="flex space-x-2 mt-1">
                    <Input 
                      id="coupon" 
                      placeholder="Enter coupon" 
                      value={couponCode} 
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="bg-input border-primary focus:ring-accent"
                      disabled={isPromotionLoading || !!appliedPromotion}
                    />
                     {appliedPromotion ? (
                        <Button variant="ghost" size="icon" onClick={handleRemoveCoupon} className="text-destructive h-10 w-10" aria-label="Remove coupon">
                            <X className="h-5 w-5"/>
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={handleApplyCoupon} disabled={isPromotionLoading || !couponCode} className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                            {isPromotionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Apply"}
                        </Button>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-0 mt-6">
                <Link href="/checkout" className="w-full">
                  <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground animate-pulse-glow">
                    Proceed to Checkout
                  </Button>
                </Link>
              </CardFooter>
            </Card>
            <div className="mt-4 text-center">
                <Link href="/products" className="text-sm text-primary hover:underline">
                    &larr; Continue Shopping
                </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
