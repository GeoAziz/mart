import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  Store
} from 'lucide-react';

export default function AboutPage() {
  const stats = [
    { label: "Active Vendors", value: "250+" },
    { label: "Counties Covered", value: "47" },
    { label: "Happy Shoppers", value: "50,000+" },
    { label: "Products Cataloged", value: "10,000+" },
  ];

  const pillars = [
    {
      icon: Store,
      title: "Empowering Local Vendors",
      description: "We provide Kenyan merchants, artisans, and retailers with digital storefronts, inventory management, and fast payouts to scale across East Africa."
    },
    {
      icon: ShieldCheck,
      title: "Secure & Trusted Commerce",
      description: "Integrated escrow payments via M-Pesa, card protection, and strict product moderation ensure buyers always get genuine goods."
    },
    {
      icon: Truck,
      title: "Reliable Nationwide Logistics",
      description: "From Nairobi same-day dispatch to door-to-door delivery across all 47 counties, we make online shopping dependable."
    },
    {
      icon: Sparkles,
      title: "Next-Gen AI Assistance",
      description: "Built-in smart search, automated catalog moderation, and personalized recommendations powered by cutting-edge Genkit AI."
    }
  ];

  return (
    <div className="space-y-16 py-8">
      {/* HERO SECTION */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          Kenya&apos;s Digital Marketplace
        </div>
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-glow-primary">
          Building the Future of Commerce in Kenya
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          ZilaCart connects millions of Kenyan consumers with authentic local vendors, offering high-quality fashion, electronics, home goods, and daily essentials backed by trusted M-Pesa transactions.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/products" className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <span>Explore Catalog</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="hover:border-primary">
            <Link href="/auth/register" className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              <span>Become a Vendor</span>
            </Link>
          </Button>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="bg-card border-border shadow-sm text-center p-6">
              <p className="text-3xl sm:text-4xl font-headline font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* MISSION & VISION */}
      <section className="container mx-auto grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h2 className="text-3xl font-headline font-bold text-glow-accent">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our mission is to eliminate friction in African e-commerce. By combining mobile-first payments, vendor automation, and trusted delivery networks, we empower small and medium enterprises to thrive in the modern digital economy.
          </p>
          <ul className="space-y-2.5 pt-2">
            {[
              "100% verified authentic sellers & transparent rating systems",
              "Instant M-Pesa STK push checkout & automated receipts",
              "Fair vendor commission rates & fast weekly payouts",
              "Dedicated 7-day buyer guarantee on eligible merchandise"
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border shadow-md space-y-4">
          <h3 className="text-2xl font-headline font-semibold text-foreground">Built in Nairobi, Built for Africa</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Headquartered in Nairobi, Kenya, ZilaCart was engineered from the ground up to solve local commerce hurdles: low card penetration, logistical address ambiguity, and trust barriers.
          </p>
          <div className="pt-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/contact" className="flex items-center gap-1.5">
                <span>Get in touch with our team</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CORE PILLARS */}
      <section className="container mx-auto space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-3xl font-headline font-bold text-glow-primary">Why Choose ZilaCart</h2>
          <p className="text-sm text-muted-foreground">The technology and commitment that powers every transaction</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <Card key={i} className="bg-card border-border hover:border-primary/50 transition-all p-6">
                <CardContent className="p-0 space-y-3">
                  <div className="p-3 bg-primary/10 rounded-lg w-fit text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold font-headline">{pillar.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{pillar.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="container mx-auto text-center p-10 bg-card rounded-2xl border border-primary/40 shadow-xl space-y-4">
        <h2 className="text-3xl font-headline font-bold">Ready to start shopping?</h2>
        <p className="text-muted-foreground max-w-md mx-auto text-sm">
          Discover thousands of trending gadgets, fashion apparel, home appliances, and beauty products right now.
        </p>
        <div className="pt-2">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
            <Link href="/products">Browse All Products</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
