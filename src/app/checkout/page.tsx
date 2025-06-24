'use client';

import CheckoutWizard from '@/components/checkout/CheckoutWizard';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { cart, isCartLoading, currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If cart is not loading and user is loaded
    if (!isCartLoading && currentUser) {
      if (cart.length === 0) {
        // If cart is empty after loading, redirect to products page
        router.replace('/products');
      }
    } else if (!isCartLoading && !currentUser) {
      // If not loading and no user, redirect to login
      router.replace('/auth/login?redirect=/checkout');
    }
    // If cart is loading or user is loading, don't do anything yet
  }, [cart, isCartLoading, currentUser, router]);

  // Render nothing or a loading indicator while checking cart/user
  if (isCartLoading || !currentUser || (currentUser && cart.length === 0 && !isCartLoading)) {
    return (
        <div className="container mx-auto py-8 text-center">
            {/* Optional: Add a more specific loading spinner here */}
            <p className="text-lg text-muted-foreground mt-2">Loading checkout...</p>
        </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-headline font-bold text-glow-primary">Secure Checkout</h1>
        <p className="text-lg text-muted-foreground mt-2">Almost there! Complete your purchase.</p>
      </div>
      <CheckoutWizard />
    </div>
  );
}
