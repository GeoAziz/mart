'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  Send,
  Loader2,
  ShoppingCart,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import type { Product, CommerceMindShoppingInterpretation } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  interpretation?: CommerceMindShoppingInterpretation;
  products?: Product[];
  clarificationOptions?: string[];
  isFallback?: boolean;
}

export function CommerceMindConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addItemToCart } = useAuth();
  const { toast } = useToast();

  // Initialize fresh session when drawer opens
  useEffect(() => {
    if (isOpen && !sessionId) {
      const newSess = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setSessionId(newSess);
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: 'Jambo! I am your CommerceMind shopping concierge. You can search in English, Swahili, or Sheng (e.g. "Natafuta leather jacket under 5k", "Sneakers size 43"). How can I help you today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          clarificationOptions: ['Fashion under 4k', 'Men shoes size 42', 'Smartphones under 20k'],
        },
      ]);
    }
  }, [isOpen, sessionId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /**
   * Submit query to Concierge Chat API
   */
  const handleSendMessage = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          sessionId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to get recommendations (HTTP ${res.status})`);
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        sender: 'assistant',
        text: data.explanation || 'Here are the options I found for you:',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        interpretation: data.interpretation,
        products: data.products || [],
        clarificationOptions: data.clarificationOptions || [],
        isFallback: data.isFallback,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: `Pole! We experienced a temporary issue: ${errMsg}. Please try asking in a slightly different way.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Atomic Pre-Cart Revalidation and Add to Cart
   */
  const handleAddToCart = async (product: Product) => {
    setAddingProductId(product.id);
    try {
      // Revalidate price and stock atomically
      const revalRes = await fetch('/api/cart/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          expectedPrice: product.price,
          quantity: 1,
        }),
      });

      const revalData = await revalRes.json();

      if (!revalRes.ok || !revalData.isEligible) {
        toast({
          title: 'Item Unavailable',
          description: revalData.message || 'Product is currently not available.',
          variant: 'destructive',
        });
        return;
      }

      if (revalData.priceChanged) {
        toast({
          title: 'Price Updated',
          description: `Price changed to KES ${revalData.currentPrice}. Added to your cart.`,
          variant: 'default',
        });
      }

      // Add to user cart
      await addItemToCart(
        {
          id: product.id,
          name: product.name,
          price: revalData.currentPrice,
          imageUrl: product.imageUrl,
          dataAiHint: product.dataAiHint,
        },
        1
      );
      toast({
        title: 'Added to Cart!',
        description: `${product.name} (KES ${revalData.currentPrice}) has been added to your shopping cart.`,
      });
    } catch (err: unknown) {
      console.error('Cart add error:', err);
      toast({
        title: 'Could Not Add to Cart',
        description: 'An unexpected error occurred while adding this item.',
        variant: 'destructive',
      });
    } finally {
      setAddingProductId(null);
    }
  };

  const handleResetConversation = () => {
    const freshSession = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setSessionId(freshSession);
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'assistant',
        text: 'Session reset! How can I assist your shopping search?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        clarificationOptions: ['Fashion', 'Footwear', 'Electronics under 15k'],
      },
    ]);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-indigo-500/40 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium shadow-sm transition-all"
          data-testid="concierge-trigger-button"
        >
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          <span className="hidden sm:inline">AI Shopping Concierge</span>
          <span className="sm:hidden">Concierge</span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full bg-background"
        data-testid="concierge-drawer"
      >
        {/* Drawer Header */}
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-indigo-500/10 via-background to-purple-500/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold leading-tight">
                  CommerceMind Concierge
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  100% Live Inventory Grounded • Sheng / Swahili / English
                </SheetDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleResetConversation}
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-muted/60 text-foreground border rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <span
                  className={`block text-[10px] mt-1 ${
                    msg.sender === 'user' ? 'text-indigo-200' : 'text-muted-foreground'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>

              {/* Clarification Chips */}
              {msg.clarificationOptions && msg.clarificationOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pl-1">
                  {msg.clarificationOptions.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(opt)}
                      className="px-2.5 py-1 text-xs font-medium rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Product Recommendation Cards */}
              {msg.products && msg.products.length > 0 && (
                <div className="w-full mt-3 space-y-2">
                  {msg.isFallback && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-md border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Showing closest catalog matches from traditional search.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2">
                    {msg.products.map((prod) => (
                      <Card
                        key={prod.id}
                        className="border overflow-hidden shadow-xs hover:border-indigo-500/40 transition-colors"
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={prod.imageUrl || 'https://placehold.co/100x100?text=Item'}
                            alt={prod.name}
                            className="w-16 h-16 object-cover rounded-md bg-muted shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold truncate text-foreground">
                              {prod.name}
                            </h4>
                            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                              KES {prod.price.toLocaleString()}
                            </p>
                            <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                In Stock ({prod.stock})
                              </Badge>
                              {prod.category && (
                                <span className="truncate">{prod.category}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(prod)}
                            disabled={addingProductId === prod.id}
                            className="h-8 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                          >
                            {addingProductId === prod.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Add
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted/30 rounded-xl w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Searching real in-stock inventory...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 border-t bg-background shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(query);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Natafuta black sneakers size 42 under 4k"
              className="text-xs focus-visible:ring-indigo-500"
              disabled={isLoading}
              data-testid="concierge-chat-input"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !query.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-3 shrink-0"
              data-testid="concierge-send-button"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
          <div className="flex justify-between items-center mt-2 px-1 text-[11px] text-muted-foreground">
            <span>Inventory refreshed in real time.</span>
            <Link
              href={`/products?search=${encodeURIComponent(query || 'popular')}`}
              className="hover:underline flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400"
            >
              Standard search <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}