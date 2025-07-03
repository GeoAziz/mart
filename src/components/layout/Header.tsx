
'use client';

import Link from 'next/link';
import { ShoppingCart, UserCircle, Menu, X, LogOutIcon as LogoutIconComp, Loader2, Shield, Landmark } from 'lucide-react';
import Logo from './Logo';
import SearchInput from './SearchInput';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import CartDrawerContent from '@/components/ecommerce/CartDrawerContent'; 
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; 


const Header = () => {
  const { currentUser, userProfile, logOut, loading: authLoading, cart, isCartLoading } = useAuth(); 
  // Only show cart for customers or unauthenticated
  const showCart = !userProfile || userProfile.role === 'customer';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Accessibility: keyboard shortcut for cart (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && showCart) {
        setIsCartDrawerOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCart]);

  // cartItemCount is already defined above, remove duplicate below

  const baseNavLinks = [
    { href: "/products", label: "All Products" },
    { href: "/categories/fashion", label: "Fashion" },
    { href: "/categories/electronics", label: "Electronics" },
  ];

  // Only show customer-facing links to customers (or unauthenticated)
  type NavLink = { href: string; label: string };
  const dynamicNavLinks: NavLink[] = useMemo(() => {
    if (!userProfile || userProfile.role === 'customer') {
      return baseNavLinks;
    } else if (userProfile.role === 'vendor') {
      return [
        { href: "/vendor", label: "Vendor Dashboard" }
      ];
    } else if (userProfile.role === 'admin') {
      return [
        { href: "/admin", label: "Admin Panel" },
        { href: "/vendor", label: "Vendor Dashboard" }
      ];
    }
    return [];
  }, [userProfile]);

  const handleLogout = async () => {
    await logOut();
    setIsMobileMenuOpen(false); 
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md">
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        <Logo />
        <div className="md:hidden flex items-center">
          {showCart && (
            <Sheet open={isCartDrawerOpen} onOpenChange={setIsCartDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Cart" className="relative hover:text-primary transition-colors mr-2">
                  <ShoppingCart className="h-6 w-6" />
                  {cart.length > 0 && !isCartLoading && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-primary-foreground transform translate-x-1/2 -translate-y-1/2 bg-accent rounded-full">
                      {cart.length}
                    </span>
                  )}
                  {isCartLoading && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1 py-1 text-xs font-bold leading-none text-primary-foreground transform translate-x-1/2 -translate-y-1/2 bg-accent rounded-full">
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[300px] sm:w-[350px] bg-card border-primary shadow-xl flex flex-col p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="text-xl font-headline text-glow-primary">Your Cart</SheetTitle>
                </SheetHeader>
                <CartDrawerContent onClose={() => setIsCartDrawerOpen(false)} />
              </SheetContent>
            </Sheet>
          )}
        </div>
        {/* ...rest of your header code (nav, etc.)... */}
      </div>
    </header>
  );
};


export default Header;
