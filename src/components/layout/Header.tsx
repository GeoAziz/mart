
'use client';

import Link from 'next/link';
import { ShoppingCart, UserCircle, Menu, X, LogOutIcon as LogoutIconComp, Loader2, Shield, Landmark } from 'lucide-react';
import Logo from './Logo';
import SearchInput from './SearchInput';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import CartDrawerContent from '@/components/ecommerce/CartDrawerContent'; 
import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext'; 

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const { currentUser, userProfile, logOut, loading: authLoading, cart, isCartLoading } = useAuth(); 

  const cartItemCount = useMemo(() => {
    if (isCartLoading && currentUser) return 0;
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart, isCartLoading, currentUser]);

  const baseNavLinks = [
    { href: "/products", label: "All Products" },
    { href: "/categories/fashion", label: "Fashion" },
    { href: "/categories/electronics", label: "Electronics" },
  ];

  const dynamicNavLinks = useMemo(() => {
    const links = [...baseNavLinks];
    if (userProfile?.role === 'vendor' || userProfile?.role === 'admin') {
      links.push({ href: "/vendor", label: "Vendor Dashboard" });
    }
    if (userProfile?.role === 'admin') {
      links.push({ href: "/admin", label: "Admin Panel" });
    }
    return links;
  }, [userProfile]);


  const handleLogout = async () => {
    await logOut();
    setIsMobileMenuOpen(false); 
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md">
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        <Logo />
        <div className="hidden md:flex flex-grow justify-center">
          <SearchInput />
        </div>
        <nav className="hidden md:flex items-center space-x-2">
          <Sheet open={isCartDrawerOpen} onOpenChange={setIsCartDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Cart" className="relative hover:text-primary transition-colors">
                <ShoppingCart className="h-6 w-6" />
                {cartItemCount > 0 && !isCartLoading && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-primary-foreground transform translate-x-1/2 -translate-y-1/2 bg-accent rounded-full">
                    {cartItemCount}
                  </span>
                )}
                 {isCartLoading && currentUser && (
                   <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1 py-1 text-xs font-bold leading-none text-primary-foreground transform translate-x-1/2 -translate-y-1/2 bg-accent rounded-full">
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[350px] sm:w-[400px] bg-card border-primary shadow-xl flex flex-col p-0">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="text-xl font-headline text-glow-primary">Your Cart</SheetTitle>
              </SheetHeader>
              <CartDrawerContent onClose={() => setIsCartDrawerOpen(false)} />
            </SheetContent>
          </Sheet>

          {authLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : currentUser ? (
            <>
              {userProfile?.role === 'admin' && (
                <Link href="/admin" passHref>
                  <Button variant="ghost" size="icon" aria-label="Admin Panel" className="hover:text-primary transition-colors">
                    <Shield className="h-6 w-6" />
                  </Button>
                </Link>
              )}
               {(userProfile?.role === 'vendor' || userProfile?.role === 'admin') && (
                <Link href="/vendor" passHref>
                  <Button variant="ghost" size="icon" aria-label="Vendor Dashboard" className="hover:text-primary transition-colors">
                    <Landmark className="h-6 w-6" />
                  </Button>
                </Link>
              )}
              <Link href="/account" passHref>
                <Button variant="ghost" size="icon" aria-label="Account" className="hover:text-primary transition-colors">
                  <UserCircle className="h-6 w-6" />
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout} className="border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all glow-edge-accent">
                <LogoutIconComp className="mr-2 h-4 w-4" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login" passHref>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all glow-edge-primary">Login</Button>
              </Link>
              <Link href="/auth/register" passHref>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all glow-edge-primary">Register</Button>
              </Link>
            </>
          )}
        </nav>
        <div className="md:hidden flex items-center">
           <Sheet open={isCartDrawerOpen} onOpenChange={setIsCartDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Cart" className="relative hover:text-primary transition-colors mr-2">
                <ShoppingCart className="h-6 w-6" />
                {cartItemCount > 0 && !isCartLoading && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-primary-foreground transform translate-x-1/2 -translate-y-1/2 bg-accent rounded-full">
                    {cartItemCount}
                  </span>
                )}
                {isCartLoading && currentUser && (
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
          
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Toggle menu">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-background p-0">
              <SheetHeader className="p-4 border-b border-border flex flex-row justify-between items-center">
                <SheetTitle><Logo /></SheetTitle>
                <SheetClose asChild>
                    <Button variant="ghost" size="icon" aria-label="Close menu"><X className="h-5 w-5"/></Button>
                </SheetClose>
              </SheetHeader>
              <div className="p-4">
                <nav className="flex flex-col space-y-1">
                  {dynamicNavLinks.map(link => (
                     <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-foreground hover:text-primary transition-colors py-3 px-2 rounded-md hover:bg-muted">
                       {link.label}
                     </Link>
                  ))}
                  <Separator className="my-4 !mt-4 !mb-2"/>
                  {authLoading ? (
                     <div className="flex items-center justify-center py-3"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : currentUser ? (
                    <>
                      <Link href="/account" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 text-lg font-medium text-foreground hover:text-primary transition-colors py-3 px-2 rounded-md hover:bg-muted">
                        <UserCircle className="h-6 w-6" />
                        <span>My Account</span>
                      </Link>
                      <Separator className="!my-2"/>
                      <Button variant="outline" onClick={handleLogout} className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all glow-edge-accent text-base py-3">
                        <LogoutIconComp className="mr-2 h-5 w-5" /> Logout
                      </Button>
                    </>
                  ) : (
                    <div className="pt-4 space-y-3">
                      <Link href="/auth/login" passHref onClick={() => setIsMobileMenuOpen(false)}>
                         <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all glow-edge-primary text-base py-3">Login</Button>
                      </Link>
                      <Link href="/auth/register" passHref onClick={() => setIsMobileMenuOpen(false)}>
                        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all glow-edge-primary text-base py-3">Register</Button>
                      </Link>
                    </div>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
       <div className="md:hidden px-4 pb-3 border-t border-border/30 pt-2">
         <SearchInput />
       </div>
    </header>
  );
};

export default Header;
