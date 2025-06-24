
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2, ShoppingCart, Loader2 } from 'lucide-react'; // Added Loader2
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface CartDrawerContentProps {
  onClose: () => void;
}

const CartDrawerContent: React.FC<CartDrawerContentProps> = ({ onClose }) => {
  const { cart, updateCartItemQuantity, removeCartItem, isCartLoading, isCartSaving, currentUser } = useAuth();

  const handleQuantityChange = async (productId: string, currentQuantity: number, amount: number) => {
    const newQuantity = Math.max(1, currentQuantity + amount);
    if (newQuantity !== currentQuantity) {
      await updateCartItemQuantity(productId, newQuantity);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (isCartLoading && currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg font-semibold text-foreground">Loading Your Cart...</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-grow p-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold text-foreground">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mb-4">Looks like you haven't added anything yet.</p>
            <Button onClick={onClose} asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/products">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map(item => (
              <div key={item.productId} className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border border-border/50">
                <Image 
                  src={item.imageUrl || 'https://placehold.co/80x80/cccccc/E0E0E0?text=No+Image'} 
                  alt={item.name} 
                  width={64} 
                  height={64} 
                  className="rounded object-cover" 
                  data-ai-hint={item.dataAiHint || 'product image'}
                />
                <div className="flex-grow">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">KSh {item.price.toLocaleString()}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleQuantityChange(item.productId, item.quantity, -1)} 
                      className="h-6 w-6"
                      disabled={isCartSaving}
                    >
                      <Minus size={12}/>
                    </Button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleQuantityChange(item.productId, item.quantity, 1)} 
                      className="h-6 w-6"
                      disabled={isCartSaving}
                    >
                      <Plus size={12}/>
                    </Button>
                  </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold text-primary">KSh {(item.price * item.quantity).toLocaleString()}</p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeCartItem(item.productId)} 
                      className="text-destructive hover:text-destructive/80 h-7 w-7 mt-1" 
                      aria-label="Remove item"
                      disabled={isCartSaving}
                    >
                      <Trash2 size={16}/>
                    </Button>
                </div>
              </div>
            ))}
             {isCartSaving && (
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating cart...
              </div>
            )}
          </div>
        )}
      </ScrollArea>
      {cart.length > 0 && (
        <div className="p-4 border-t border-border space-y-3 bg-card">
          <div className="flex justify-between text-md font-medium text-foreground">
            <span>Subtotal:</span>
            <span>KSh {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
          <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</p>
          <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground animate-pulse-glow" onClick={onClose} asChild>
            <Link href="/checkout">
              Proceed to Checkout
            </Link>
          </Button>
          <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={onClose} asChild>
            <Link href="/cart">
              View Full Cart
            </Link>
          </Button>
        </div>
      )}
    </>
  );
};

export default CartDrawerContent;
