'use client';

import Link from 'next/link';
import { 
  ShoppingCart, 
  UserCircle, 
  Menu, 
  LogOut as LogoutIcon, 
  Loader2, 
  ShieldCheck, 
  Store, 
  ShoppingBag, 
  Sparkles
} from 'lucide-react';
import Logo from './Logo';
import SearchInput from './SearchInput';
import CommandPalette from '@/components/command/CommandPalette';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CartDrawerContent from '@/components/ecommerce/CartDrawerContent'; 
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; 

const Header = () => {
  const { currentUser, userProfile, logOut, loading: authLoading, cart, isCartLoading } = useAuth(); 
  
  // Cart is relevant for customers and unauthenticated users
  const showCart = !userProfile || userProfile.role === 'customer';
  const cartItemCount = useMemo(() => cart?.length ?? 0, [cart]);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Command palette shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleCmdPalette = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handleCmdPalette);
    return () => window.removeEventListener('keydown', handleCmdPalette);
  }, []);

  const baseNavLinks = [
    { href: "/products", label: "All Products" },
    { href: "/categories/fashion", label: "Fashion" },
    { href: "/categories/electronics", label: "Electronics" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  const handleLogout = async () => {
    await logOut();
    setIsMobileMenuOpen(false); 
  };

  const cartTriggerButton = (
    <Button 
      variant="ghost" 
      size="icon" 
      aria-label="View shopping cart" 
      className="relative hover:text-primary transition-colors"
      onClick={() => setIsCartDrawerOpen(true)}
    >
      <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
      {cartItemCount > 0 && !isCartLoading && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold leading-none text-primary-foreground bg-accent rounded-full shadow-sm">
          {cartItemCount > 99 ? '99+' : cartItemCount}
        </span>
      )}
      {isCartLoading && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-primary-foreground bg-accent rounded-full shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
        </span>
      )}
    </Button>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:h-20">
        
        {/* LOGO */}
        <div className="flex shrink-0 items-center">
          <Logo />
        </div>
        
        {/* DESKTOP NAVIGATION (>= 1024px) */}
        <nav className="hidden lg:flex items-center justify-center gap-6 xl:gap-8">
          <Link href="/" className="text-sm xl:text-base text-muted-foreground hover:text-primary transition-colors font-medium">
            Home
          </Link>
          {baseNavLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className="text-sm xl:text-base text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
          {/* Quick link to Vendor or Admin dashboard if role applies */}
          {userProfile?.role === 'vendor' && (
            <Link 
              href="/vendor" 
              className="text-sm xl:text-base text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <Store className="h-4 w-4" />
              Vendor Portal
            </Link>
          )}
          {userProfile?.role === 'admin' && (
            <Link 
              href="/admin" 
              className="text-sm xl:text-base text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
        </nav>

        {/* SEARCH BAR (Visible on >= 768px in the center/right) */}
        <div className="hidden md:flex flex-1 max-w-xs lg:max-w-sm xl:max-w-md mx-2">
          <SearchInput />
        </div>

        {/* DESKTOP ACTIONS (>= 768px) */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          <CommandPalette open={isCommandOpen} onOpenChange={setIsCommandOpen} />
          
          <TooltipButton 
            label="Quick Search (Ctrl+K)" 
            onClick={() => setIsCommandOpen(true)}
          >
            <Button variant="ghost" size="icon" aria-label="Search Palette" className="text-muted-foreground hover:text-primary">
              <Sparkles className="h-5 w-5" />
            </Button>
          </TooltipButton>

          {/* Cart for customers/guests */}
          {showCart && cartTriggerButton}

          {/* User Menu */}
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account Menu" className="relative hover:text-primary transition-colors">
                  <UserCircle className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">{userProfile?.fullName || currentUser.displayName || 'My Account'}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{currentUser.email}</p>
                    {userProfile?.role && (
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                        Role: {userProfile.role}
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link href="/account" className="cursor-pointer flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    <span>My Account</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/account/orders" className="cursor-pointer flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    <span>My Orders</span>
                  </Link>
                </DropdownMenuItem>

                {userProfile?.role === 'vendor' && (
                  <DropdownMenuItem asChild>
                    <Link href="/vendor" className="cursor-pointer flex items-center gap-2 font-medium text-primary">
                      <Store className="h-4 w-4" />
                      <span>Vendor Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                {userProfile?.role === 'admin' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer flex items-center gap-2 font-medium text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/vendor" className="cursor-pointer flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        <span>Vendor Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem 
                  onClick={handleLogout} 
                  disabled={authLoading}
                  className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
                >
                  {authLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogoutIcon className="h-4 w-4" />
                  )}
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="hover:text-primary transition-colors">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* MOBILE & TABLET RIGHT ACTIONS (< 1024px) */}
        <div className="flex items-center gap-1 sm:gap-2 lg:hidden">
          {/* Cart Icon */}
          {showCart && cartTriggerButton}

          {/* Mobile Drawer */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open Navigation Menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-card sm:w-[360px] overflow-y-auto flex flex-col">
              <SheetHeader className="text-left pb-4 border-b border-border">
                <SheetTitle className="text-xl font-headline">Menu</SheetTitle>
              </SheetHeader>
              
              <div className="flex flex-col space-y-4 py-4 flex-1">
                {/* Search in mobile sheet */}
                <div className="pb-3 border-b border-border">
                  <SearchInput onSearchComplete={() => setIsMobileMenuOpen(false)} />
                </div>

                {/* Primary Navigation Links */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1">
                    Navigation
                  </p>
                  <Link 
                    href="/" 
                    className="block py-2 px-3 rounded-md hover:bg-accent transition-colors text-foreground font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                  {baseNavLinks.map((link) => (
                    <Link 
                      key={link.href} 
                      href={link.href}
                      className="block py-2 px-3 rounded-md hover:bg-accent transition-colors text-foreground font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Dedicated Portals for Vendors/Admins */}
                {(userProfile?.role === 'vendor' || userProfile?.role === 'admin') && (
                  <div className="space-y-1 pt-2 border-t border-border">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1">
                      Management Portals
                    </p>
                    {userProfile?.role === 'vendor' && (
                      <Link 
                        href="/vendor" 
                        className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-accent text-primary font-medium"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Store className="h-4 w-4" />
                        <span>Vendor Dashboard</span>
                      </Link>
                    )}
                    {userProfile?.role === 'admin' && (
                      <>
                        <Link 
                          href="/admin" 
                          className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-accent text-primary font-medium"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>Admin Panel</span>
                        </Link>
                        <Link 
                          href="/vendor" 
                          className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-accent text-muted-foreground"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Store className="h-4 w-4" />
                          <span>Vendor Portal</span>
                        </Link>
                      </>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-border">
                  {currentUser ? (
                    <div className="space-y-2">
                      <div className="px-3 py-1">
                        <p className="text-sm font-semibold truncate">{userProfile?.fullName || currentUser.displayName || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                      </div>
                      <Link 
                        href="/account"
                        className="flex items-center space-x-2 py-2 px-3 rounded-md hover:bg-accent transition-colors text-foreground font-medium"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <UserCircle className="h-5 w-5" />
                        <span>My Account</span>
                      </Link>
                      <Link 
                        href="/account/orders"
                        className="flex items-center space-x-2 py-2 px-3 rounded-md hover:bg-accent transition-colors text-foreground font-medium"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <ShoppingBag className="h-5 w-5" />
                        <span>My Orders</span>
                      </Link>
                      <Button 
                        variant="ghost" 
                        onClick={handleLogout}
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                        disabled={authLoading}
                      >
                        {authLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <LogoutIcon className="h-4 w-4 mr-2" />
                        )}
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)} className="block">
                        <Button variant="outline" className="w-full justify-center">
                          Login
                        </Button>
                      </Link>
                      <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)} className="block">
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground justify-center">
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>

      {/* SHARED CART DRAWER */}
      {showCart && (
        <Sheet open={isCartDrawerOpen} onOpenChange={setIsCartDrawerOpen}>
          <SheetContent className="flex w-[300px] flex-col border-primary bg-card p-0 shadow-xl sm:w-[380px]">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="text-xl font-headline text-glow-primary">Your Cart</SheetTitle>
            </SheetHeader>
            <CartDrawerContent onClose={() => setIsCartDrawerOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
};

function TooltipButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <div onClick={onClick} title={label}>
      {children}
    </div>
  );
}

export default Header;
