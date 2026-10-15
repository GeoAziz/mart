'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Check, 
  ShoppingBag, 
  ArrowRight, 
  Copy, 
  CheckCheck, 
  Truck, 
  ShieldCheck, 
  Calendar,
  CreditCard,
  Sparkles
} from 'lucide-react';

interface OrderSuccessExperienceProps {
  orderId: string;
  totalAmount?: number;
  paymentMethod?: string;
  customerEmail?: string;
  itemCount?: number;
}

export default function OrderSuccessExperience({
  orderId,
  totalAmount,
  paymentMethod = 'card',
  customerEmail,
  itemCount,
}: OrderSuccessExperienceProps) {
  const [copied, setCopied] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; color: string; duration: number }>>([]);

  useEffect(() => {
    // Generate celebratory glowing particle burst
    const colors = ['#10B981', '#06B6D4', '#6366F1', '#A855F7', '#34D399'];
    const p = Array.from({ length: 42 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 480,
      y: (Math.random() - 0.5) * 360 - 40,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 1.4 + 1.2,
    }));
    setParticles(p);
  }, []);

  const copyOrderId = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMethodLabel = (method: string) => {
    switch (method.toLowerCase()) {
      case 'card':
        return 'Credit / Debit Card';
      case 'paypal':
        return 'PayPal';
      case 'mpesa':
        return 'M-Pesa Express';
      default:
        return 'Cash On Delivery';
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto py-6 px-4">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 -top-12 bg-gradient-to-b from-emerald-500/15 via-cyan-500/10 to-transparent blur-3xl -z-10 pointer-events-none" />

      {/* Floating Animated Confetti/Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 flex items-center justify-center">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [1, 0.8, 0],
              scale: [0, 1.2, 0.4],
              x: p.x,
              y: p.y,
            }}
            transition={{
              duration: p.duration,
              ease: [0.25, 1, 0.5, 1],
            }}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 12px ${p.color}`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="relative overflow-hidden bg-card/90 backdrop-blur-xl border border-emerald-500/40 shadow-2xl shadow-emerald-500/10 rounded-3xl p-6 sm:p-10 text-center">
          {/* Top Decorative Pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Payment Verified & Confirmed
          </motion.div>

          {/* Animated Success Checkmark Ring */}
          <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
            {/* Pulsing Outer Rings */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.35, 1.45], opacity: [0.6, 0.2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-emerald-500/25"
            />
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.9, 1.2, 1.3], opacity: [0.7, 0.3, 0] }}
              transition={{ duration: 2, delay: 0.3, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-cyan-500/20"
            />

            {/* Glowing Core */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
              className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/40"
            >
              <motion.div
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
              >
                <Check className="w-10 h-10 text-slate-950 stroke-[3]" />
              </motion.div>
            </motion.div>
          </div>

          {/* Main Title & Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <h2 className="text-3xl sm:text-4xl font-headline font-extrabold tracking-tight text-foreground mb-3">
              Order Placed Successfully!
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              Thank you for shopping with ZilaCart. Your transaction has cleared and the seller is preparing your package.
            </p>
          </motion.div>

          {/* Order Details Bento Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="my-8 p-5 sm:p-6 rounded-2xl bg-muted/40 border border-border/80 text-left space-y-4"
          >
            {/* Order ID Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Order Tracking ID
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm sm:text-base font-bold text-primary selection:bg-primary/20">
                  {orderId}
                </span>
                <button
                  type="button"
                  onClick={copyOrderId}
                  className="p-1.5 hover:bg-background/80 rounded-md transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy Order ID"
                >
                  {copied ? (
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1 text-xs">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  Method
                </div>
                <div className="font-medium text-foreground truncate">
                  {getMethodLabel(paymentMethod)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1 text-xs">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  Delivery
                </div>
                <div className="font-medium text-foreground">
                  3 – 5 Business Days
                </div>
              </div>

              {totalAmount ? (
                <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-background/50 border border-border/50">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    Total Paid
                  </div>
                  <div className="font-bold text-foreground">
                    KSh {totalAmount.toLocaleString()}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Notification Alert */}
            <div className="flex items-start gap-2.5 pt-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span>
                A receipt confirmation email has been dispatched
                {customerEmail ? ` to ${customerEmail}` : ''}. You can track shipping updates directly in your dashboard.
              </span>
            </div>
          </motion.div>

          {/* Primary Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <Button
              asChild
              className="w-full sm:w-auto h-12 px-7 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl glow-edge-primary transition-all duration-300 group"
            >
              <Link href={`/track-order?orderId=${encodeURIComponent(orderId)}`}>
                <span>Track My Order</span>
                <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>

            <Button
              variant="outline"
              asChild
              className="w-full sm:w-auto h-12 px-6 border-border hover:bg-muted/60 text-foreground font-medium rounded-xl transition-colors"
            >
              <Link href="/products" className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                <span>Continue Shopping</span>
              </Link>
            </Button>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}

