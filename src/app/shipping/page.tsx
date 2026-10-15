import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  RotateCcw, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  PhoneCall
} from 'lucide-react';
import Link from 'next/link';

export default function ShippingPage() {
  const deliveryZones = [
    {
      region: "Nairobi Metropolitan Area",
      timeline: "24 – 48 Hours",
      notes: "Express door-to-door delivery across Westlands, Kilimani, Karen, CBD, Eastlands, Kiambu, and Machakos fringes."
    },
    {
      region: "Major Regional Hubs (Mombasa, Kisumu, Nakuru, Eldoret)",
      timeline: "2 – 3 Business Days",
      notes: "Handled through vetted regional courier partners with active parcel tracking."
    },
    {
      region: "Upcountry & Other Counties",
      timeline: "3 – 5 Business Days",
      notes: "Doorstep delivery or regional pickup depot options available across all 47 counties."
    }
  ];

  const returnRules = [
    {
      title: "7-Day Return Guarantee",
      desc: "If an item arrives damaged, defective, or significantly different from its catalog description, notify us within 7 calendar days of receipt."
    },
    {
      title: "Condition Requirements",
      desc: "Returned products must be unused, unwashed, in their original packaging, with all vendor tags and documentation intact."
    },
    {
      title: "Fast Refund Turnaround",
      desc: "Once the item is received and inspected at our dispatch hub, refunds are credited back to your original M-Pesa number or card within 24 to 48 hours."
    },
    {
      title: "Non-Returnable Goods",
      desc: "Due to health and hygiene regulations, intimate apparel, unsealed cosmetics, perishable groceries, and custom personalized goods cannot be returned unless defective on arrival."
    }
  ];

  return (
    <div className="space-y-12 py-8 max-w-5xl mx-auto">
      {/* HEADER */}
      <section className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
          <Truck className="h-3.5 w-3.5" />
          Logistics & Buyer Protection
        </div>
        <h1 className="text-4xl font-headline font-bold text-glow-primary">
          Shipping & Returns Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Clear, transparent guidelines on how your orders are packaged, dispatched, delivered, and refunded across Kenya.
        </p>
      </section>

      {/* DELIVERY TIMELINES */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-headline font-semibold text-foreground">Delivery Timelines & Rates</h2>
            <p className="text-xs text-muted-foreground">Standard dispatch operates Monday through Saturday</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {deliveryZones.map((zone, i) => (
            <Card key={i} className="bg-card border-border shadow-sm flex flex-col justify-between p-5">
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Zone {i + 1}</span>
                <h3 className="font-semibold text-foreground text-base">{zone.region}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">{zone.notes}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Estimated Time:</span>
                <span className="font-bold text-foreground">{zone.timeline}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* DOORSTEP INSPECTION & VERIFICATION */}
      <section className="p-6 bg-muted/40 rounded-2xl border border-border/60 flex flex-col md:flex-row items-center gap-6">
        <div className="p-4 bg-primary/10 text-primary rounded-2xl shrink-0">
          <ShieldCheck className="h-10 w-10" />
        </div>
        <div className="space-y-1.5 flex-1 text-center md:text-left">
          <h3 className="text-lg font-semibold font-headline text-foreground">Doorstep Verification</h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            We encourage all buyers to inspect their parcel outer seals before signing with the delivery rider. If a parcel arrives visibly damaged or tampered with, you may reject receipt immediately at zero cost.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0 hover:border-primary">
          <Link href="/track-order">Track an Order</Link>
        </Button>
      </section>

      {/* RETURNS & REFUNDS POLICY */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-accent/10 text-accent rounded-lg">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-headline font-semibold text-foreground">Return & Refund Guidelines</h2>
            <p className="text-xs text-muted-foreground">Simple 4-step process for order returns</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {returnRules.map((rule, idx) => (
            <Card key={idx} className="bg-card border-border p-5 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                <h3 className="font-semibold text-sm text-foreground">{rule.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">{rule.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW TO INITIATE A RETURN */}
      <section className="p-8 bg-card rounded-2xl border border-border shadow-sm space-y-4">
        <h3 className="text-xl font-headline font-semibold text-foreground">How to Request a Return or Refund</h3>
        <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          <li>Log in to your ZilaCart account and visit <strong>My Orders</strong> (<Link href="/account/orders" className="text-primary hover:underline">/account/orders</Link>).</li>
          <li>Locate the delivered order and click into the order details.</li>
          <li>Select <strong>Request Refund / Return</strong> and specify your reason along with a photo of the damaged item.</li>
          <li>Our customer protection team will review your request within 24 hours and arrange for courier pickup.</li>
        </ol>
        <div className="pt-2 flex flex-wrap gap-3">
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/account/orders">Go to My Orders</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/contact" className="flex items-center gap-1.5">
              <PhoneCall className="h-3.5 w-3.5" />
              <span>Contact Returns Desk</span>
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
