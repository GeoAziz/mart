'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const NewsletterPromo = () => {
  const addToRefs = useScrollReveal();
  return (
    <section ref={addToRefs} className="scroll-reveal mb-12 md:mb-16">
      <Card className="bg-gradient-to-br from-primary/30 via-card to-accent/30 p-6 md:p-10 rounded-lg shadow-2xl glow-edge-primary">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-headline font-bold mb-3 text-glow-primary">Stay Updated!</h2>
            <p className="text-lg text-foreground/90 mb-6">
              Subscribe to our newsletter for the latest deals, new arrivals, and futuristic tech insights.
            </p>
            <form className="flex flex-col sm:flex-row gap-3">
              <Input 
                type="email" 
                placeholder="Your_email@future.net" 
                className="flex-grow bg-input border-primary focus:ring-accent text-base" 
                aria-label="Email for newsletter"
              />
              <Button type="submit" size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all glow-edge-primary">
                <Send className="mr-2 h-5 w-5" /> Subscribe
              </Button>
            </form>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-headline font-semibold mb-2 text-glow-accent">Get the ZilaCart App!</h3>
            <p className="text-md text-foreground/80 mb-4">
              Experience seamless shopping on the go. Exclusive app-only deals await!
            </p>
            <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-3">
              <Button variant="outline" size="lg" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all glow-edge-accent">
                <Download className="mr-2 h-5 w-5" /> App Store
              </Button>
              <Button variant="outline" size="lg" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all glow-edge-accent">
                <Download className="mr-2 h-5 w-5" /> Google Play
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
};

export default NewsletterPromo;
