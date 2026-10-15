'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle2, 
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ContactPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name, email address, and message.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    // Simulate API contact submission
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setSubmitted(true);
    toast({
      title: "Message Sent",
      description: "Thank you for reaching out! Our Nairobi support team will reply within 24 hours.",
    });
  };

  return (
    <div className="space-y-12 py-8 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
          <MessageSquare className="h-3.5 w-3.5" />
          Customer Support & Inquiries
        </div>
        <h1 className="text-4xl font-headline font-bold text-glow-primary">
          We&apos;re Here to Help
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Have questions about an order, seller onboarding, or M-Pesa payments? Reach out to our customer care team or check our Help Center.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* CONTACT INFO TILES */}
        <div className="space-y-4 md:col-span-1">
          <Card className="bg-card border-border shadow-sm p-5 space-y-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-lg w-fit">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Phone & WhatsApp Support</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Monday to Saturday: 8:00 AM – 8:00 PM EAT</p>
              <p className="text-sm font-semibold text-primary mt-2">+254 (0) 700 123 456</p>
            </div>
          </Card>

          <Card className="bg-card border-border shadow-sm p-5 space-y-3">
            <div className="p-2.5 bg-accent/10 text-accent rounded-lg w-fit">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Email Inquiries</h3>
              <p className="text-xs text-muted-foreground mt-0.5">24/7 inbox monitoring with swift responses</p>
              <p className="text-sm font-semibold text-foreground mt-2">support@zilacart.co.ke</p>
            </div>
          </Card>

          <Card className="bg-card border-border shadow-sm p-5 space-y-3">
            <div className="p-2.5 bg-muted rounded-lg w-fit text-foreground">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Headquarters</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Kilimani Business Hub, Argwings Kodhek Rd</p>
              <p className="text-xs font-medium text-foreground mt-1">Nairobi, Kenya</p>
            </div>
          </Card>

          <div className="p-4 bg-muted/40 rounded-xl border border-border/60 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>Looking for quick answers?</span>
            </div>
            <p>Check order tracking, delivery timelines, and return policies in our FAQ.</p>
            <Button variant="link" asChild className="p-0 h-auto text-primary text-xs">
              <Link href="/help">Visit Help Center &rarr;</Link>
            </Button>
          </div>
        </div>

        {/* INQUIRY FORM */}
        <div className="md:col-span-2">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-glow-accent">Send Us a Message</CardTitle>
              <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                Fill out the form below and a representative will contact you via email or phone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
                  <h3 className="text-2xl font-semibold font-headline">Thank You!</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Your inquiry has been received. Our team typically responds within 2–4 business hours during Kenyan business hours.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
                    }}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-name">Full Name *</Label>
                      <Input 
                        id="contact-name"
                        placeholder="e.g. Wanjiku Kamau"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-email">Email Address *</Label>
                      <Input 
                        id="contact-email"
                        type="email"
                        placeholder="wanjiku@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-phone">Phone / M-Pesa Number</Label>
                      <Input 
                        id="contact-phone"
                        type="tel"
                        placeholder="0712 345 678"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-subject">Inquiry Type</Label>
                      <Input 
                        id="contact-subject"
                        placeholder="e.g. Order Tracking / Vendor Signup"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="contact-message">Message Details *</Label>
                    <Textarea 
                      id="contact-message"
                      rows={5}
                      placeholder="Please describe how we can assist you..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-2"
                    disabled={isSubmitting}
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSubmitting ? "Sending..." : "Submit Inquiry"}</span>
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
