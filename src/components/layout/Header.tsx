
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
        
        {/* DESKTOP NAVIGATION */}
        <nav className="hidden lg:flex items-center space-x-8">
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors font-medium">
            Home
          </Link>
          {dynamicNavLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors font-medium">
            About
          </Link>
          <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors font-medium">
            Contact
          </Link>
        </nav>

        {/* DESKTOP RIGHT SIDE */}
        <div className="hidden md:flex items-center space-x-4">
          <SearchInput />
          
          {/* Cart for customers */}
          {showCart && (
            <Sheet open={isCartDrawerOpen} onOpenChange={setIsCartDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Cart" className="relative hover:text-primary transition-colors">
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

          {/* User Menu */}
          {currentUser ? (
            <div className="flex items-center space-x-2">
              <Link href="/account">
                <Button variant="ghost" size="icon" className="hover:text-primary transition-colors">
                  <UserCircle className="h-6 w-6" />
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="hover:text-destructive transition-colors"
                disabled={authLoading}
              >
                {authLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <LogoutIconComp className="h-4 w-4 mr-1" />
                )}
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="hover:text-primary transition-colors">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* MOBILE MENU */}
        <div className="lg:hidden flex items-center space-x-2">
          {/* Mobile Cart */}
          {showCart && (
            <Sheet open={isCartDrawerOpen} onOpenChange={setIsCartDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Cart" className="relative hover:text-primary transition-colors">
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

          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-card">
              <SheetHeader>
                <SheetTitle className="text-left text-xl font-headline">Menu</SheetTitle>
              </SheetHeader>
              
              <div className="flex flex-col space-y-4 mt-6">
                {/* Search in mobile */}
                <div className="pb-4 border-b border-border">
                  <SearchInput />
                </div>

                {/* Navigation Links */}
                <div className="space-y-3">
                  <Link 
                    href="/" 
                    className="block py-2 px-3 rounded-md hover:bg-accent transition-colors text-foreground"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                  {dynamicNavLinks.map((link) => (
                    <Link 
                      key={link.href} 
                      href={link.href}
                      className="block py-2 px-3 rounded-md hover:bg-accent transition-colors text-foreground"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link 
                    href="/about" 
                    className="block py-2 px-3 rounded-md hover:bg-accent transition-colors text-foreground"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    About
                  </Link>
                  <Link 
                    href="/contact" 
                    className="block py-2 px-3 rounded-md hover:bg-accent transition-colors text-foreground"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Contact
                  </Link>
                </div>

                <Separator />

                {/* User Section */}
                {currentUser ? (
                  <div className="space-y-3">
                    <Link 
                      href="/account"
                      className="flex items-center space-x-2 py-2 px-3 rounded-md hover:bg-accent transition-colors text-foreground"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <UserCircle className="h-5 w-5" />
                      <span>My Account</span>
                    </Link>
                    <Button 
                      variant="ghost" 
                      onClick={handleLogout}
                      className="w-full justify-start hover:text-destructive transition-colors"
                      disabled={authLoading}
                    >
                      {authLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <LogoutIconComp className="h-4 w-4 mr-2" />
                      )}
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Login
                      </Button>
                    </Link>
                    <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full bg-primary hover:bg-primary/90">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};


export default Header;
