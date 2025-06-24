
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Facebook, Twitter, Instagram, Send } from 'lucide-react';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="bg-card text-card-foreground border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground">
              Kenya’s Digital Marketplace. Your one-stop shop for everything.
            </p>
            <div className="flex space-x-4 mt-6">
              <Link href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook size={20} />
              </Link>
              <Link href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter size={20} />
              </Link>
              <Link href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram size={20} />
              </Link>
            </div>
          </div>

          <div>
            <h5 className="font-semibold text-lg mb-4 text-foreground">Shop</h5>
            <ul className="space-y-2">
              <li><Link href="/categories/fashion" className="text-sm text-muted-foreground hover:text-primary transition-colors">Fashion</Link></li>
              <li><Link href="/categories/electronics" className="text-sm text-muted-foreground hover:text-primary transition-colors">Electronics</Link></li>
              <li><Link href="/categories/home" className="text-sm text-muted-foreground hover:text-primary transition-colors">Home & Garden</Link></li>
              <li><Link href="/products" className="text-sm text-muted-foreground hover:text-primary transition-colors">All Products</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-lg mb-4 text-foreground">Support</h5>
            <ul className="space-y-2">
              <li><Link href="/help" className="text-sm text-muted-foreground hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="/track-order" className="text-sm text-muted-foreground hover:text-primary transition-colors">Track Order</Link></li>
              <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About ZilaCart</Link></li>
              <li><Link href="/shipping" className="text-sm text-muted-foreground hover:text-primary transition-colors">Shipping & Returns</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-lg mb-4 text-foreground">Newsletter</h5>
            <p className="text-sm text-muted-foreground mb-3">Subscribe for updates and special offers.</p>
            <form className="flex space-x-2">
              <Input type="email" placeholder="Enter your email" className="flex-grow bg-input border-primary focus:ring-accent" aria-label="Email for newsletter"/>
              <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90 glow-edge-primary" aria-label="Subscribe to newsletter">
                <Send size={18} />
              </Button>
            </form>
          </div>
        </div>
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ZilaCart. All rights reserved.</p>
          <p>Designed with <span className="text-primary">&hearts;</span> in Kenya</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

