'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { 
  HelpCircle, 
  Search, 
  Package, 
  CreditCard, 
  Truck, 
  Store, 
  RotateCcw,
  Mail
} from 'lucide-react';
import Link from 'next/link';

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      category: "Ordering & Tracking",
      icon: Package,
      items: [
        {
          q: "How do I place an order on ZilaCart?",
          a: "Browse or search for products, click 'Add to Cart', and proceed to Checkout. Enter your Kenyan delivery address and choose your preferred payment method (M-Pesa STK Push, Card, or Cash on Delivery)."
        },
        {
          q: "How can I track my active order?",
          a: "You can track your order live by navigating to your Account Dashboard > 'My Orders' (/account/orders). You'll receive real-time status updates as vendors pack and dispatch your parcels."
        },
        {
          q: "Can I cancel or change an order after placing it?",
          a: "Orders can be cancelled before they reach the 'Shipped' state directly from your Orders page or by contacting our customer care line immediately."
        }
      ]
    },
    {
      category: "Payments & M-Pesa",
      icon: CreditCard,
      items: [
        {
          q: "How does M-Pesa payment work on ZilaCart?",
          a: "During checkout, choose M-Pesa. You will receive an instant STK Push prompt on your mobile phone to enter your M-Pesa PIN securely. Once entered, your order confirms in seconds."
        },
        {
          q: "What other payment methods do you support?",
          a: "We accept Visa, Mastercard, American Express via Stripe, PayPal, and Cash on Delivery for eligible delivery zones in Nairobi."
        },
        {
          q: "Is it safe to pay online on ZilaCart?",
          a: "Yes. All card payments are processed using bank-grade 256-bit SSL encryption. We never store your full card details or M-Pesa PIN on our servers."
        }
      ]
    },
    {
      category: "Shipping & Delivery",
      icon: Truck,
      items: [
        {
          q: "What are your delivery timelines?",
          a: "Nairobi and environs orders typically arrive within 24 to 48 hours. Regional deliveries across all other 46 Kenyan counties take 2 to 4 business days depending on the courier."
        },
        {
          q: "How much does shipping cost?",
          a: "Shipping rates are calculated dynamically at checkout based on your delivery county and parcel weight. Many promotional items qualify for free or subsidized delivery."
        }
      ]
    },
    {
      category: "Returns & Refunds",
      icon: RotateCcw,
      items: [
        {
          q: "What is your return policy?",
          a: "ZilaCart offers a 7-day hassle-free return window on defective, incorrect, or damaged items. Products must be returned in their original packaging with tags intact."
        },
        {
          q: "How do I get refunded if an item is returned?",
          a: "Once the vendor or moderation team inspects and approves the returned item, your refund is credited directly to your original payment method (M-Pesa number or card) within 24–48 hours."
        }
      ]
    },
    {
      category: "Selling on ZilaCart",
      icon: Store,
      items: [
        {
          q: "How do I become a verified vendor?",
          a: "Click 'Become a Vendor' on our registration page or visit /vendor. Once registered, submit your business or national ID details for review. Approved vendors get access to inventory and analytics tools."
        },
        {
          q: "When do vendors get paid?",
          a: "Vendor balances are disbursed on a regular schedule directly to your verified M-Pesa paybill or bank account once order delivery is confirmed."
        }
      ]
    }
  ];

  const filteredFaqs = faqs.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="space-y-12 py-8 max-w-5xl mx-auto">
      {/* HERO BANNER */}
      <section className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
          <HelpCircle className="h-3.5 w-3.5" />
          ZilaCart Knowledge Base
        </div>
        <h1 className="text-4xl font-headline font-bold text-glow-primary">
          How Can We Help You?
        </h1>
        <p className="text-sm text-muted-foreground">
          Find answers to common questions about orders, delivery, M-Pesa payments, and returns.
        </p>

        {/* SEARCH BAR */}
        <div className="relative max-w-md mx-auto pt-2">
          <Input 
            placeholder="Search questions (e.g. M-Pesa, delivery, returns)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card border-primary/40 focus:border-primary rounded-full shadow-sm"
          />
          <Search className="absolute left-3.5 top-5 h-4 w-4 text-muted-foreground" />
        </div>
      </section>

      {/* FAQ ACCORDION CATEGORIES */}
      <section className="space-y-8">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((categoryGroup, index) => {
            const Icon = categoryGroup.icon;
            return (
              <Card key={index} className="bg-card border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-headline flex items-center gap-2.5 text-foreground">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span>{categoryGroup.category}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <Accordion type="single" collapsible className="w-full">
                    {categoryGroup.items.map((faq, i) => (
                      <AccordionItem key={i} value={`item-${index}-${i}`} className="border-border/60">
                        <AccordionTrigger className="text-left font-medium text-sm hover:text-primary py-3">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 pb-3">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <HelpCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-lg font-semibold">No answers match &quot;{searchQuery}&quot;</p>
            <p className="text-xs text-muted-foreground mt-1">Try searching for broader keywords or contact customer support.</p>
            <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="mt-4">
              Clear Search Filter
            </Button>
          </div>
        )}
      </section>

      {/* STILL NEED HELP? */}
      <section className="p-8 bg-card border border-primary/30 rounded-2xl shadow-md text-center space-y-3">
        <h3 className="text-2xl font-headline font-bold">Still have questions?</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Our Kenyan support team is available Monday to Saturday to assist with any order or vendor inquiries.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/contact" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Contact Support</span>
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/shipping" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span>View Shipping Policy</span>
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
