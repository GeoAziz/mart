
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Package, Truck, CheckCircle, Circle, HelpCircle, FileText, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface OrderStatusStep {
  name: string;
  icon: React.ElementType;
  date?: string;
  completed: boolean;
  current: boolean;
}

interface OrderDetails {
  id: string;
  customerName: string;
  estimatedDelivery: string;
  items: Array<{ name: string; quantity: number; imageUrl: string; dataAiHint: string }>;
  statusHistory: OrderStatusStep[];
  currentStatusText: string;
}

const placeholderOrder: OrderDetails = {
  id: 'ZLC-123456789',
  customerName: 'Aisha Wanjiru',
  estimatedDelivery: 'July 28, 2024',
  items: [
    { name: 'Quantum Entanglement Communicator', quantity: 1, imageUrl: 'https://placehold.co/80x80/FF00FF/FFFFFF?text=Item1', dataAiHint: "communication device" },
    { name: 'Cryo-Sleep Pod Chamber', quantity: 1, imageUrl: 'https://placehold.co/80x80/00FFFF/000000?text=Item2', dataAiHint: "sleep pod" },
  ],
  statusHistory: [
    { name: 'Ordered', icon: FileText, date: 'July 20, 2024', completed: true, current: false },
    { name: 'Processing', icon: Loader2, date: 'July 21, 2024', completed: true, current: false },
    { name: 'Shipped', icon: Truck, date: 'July 22, 2024', completed: true, current: true },
    { name: 'Out for Delivery', icon: Package, completed: false, current: false },
    { name: 'Delivered', icon: CheckCircle, completed: false, current: false },
  ],
  currentStatusText: 'Your order is on its way!',
};

export default function OrderTrackingPage() {
  const [orderId, setOrderId] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrackOrder = async () => {
    if (!orderId.trim()) {
      setError('Please enter an Order ID.');
      setSearchedOrder(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setSearchedOrder(null);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (orderId.trim().toUpperCase() === 'ZLC-123456789') {
      setSearchedOrder(placeholderOrder);
    } else {
      setError(`Order ID "${orderId}" not found. Please check the ID and try again.`);
    }
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-headline font-bold text-glow-primary">Track Your Order</h1>
        <p className="text-lg text-muted-foreground mt-2">Enter your order ID to see its current status.</p>
      </div>

      <Card className="w-full max-w-md mx-auto mb-12 bg-card border-primary shadow-xl glow-edge-primary">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-glow-accent">Enter Order ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="orderId" className="mb-1 block">Order ID</Label>
            <Input
              id="orderId"
              type="text"
              placeholder="e.g., ZLC-123456789"
              value={orderId}
              onChange={(e) => {
                setOrderId(e.target.value);
                if (error) setError(null); // Clear error when user types
              }}
              className="bg-input border-primary focus:ring-accent"
            />
          </div>
          {error && (
            <Alert variant="destructive" className="bg-destructive/20 border-destructive/50">
              <HelpCircle className="h-4 w-4 !text-destructive-foreground" />
              <AlertTitle className="text-destructive-foreground">Error</AlertTitle>
              <AlertDescription className="text-destructive-foreground/80">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleTrackOrder} disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground animate-pulse-glow">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tracking...
              </>
            ) : (
              'Track Order'
            )}
          </Button>
        </CardFooter>
      </Card>

      {searchedOrder && (
        <Card className="w-full max-w-3xl mx-auto bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-glow-primary">Order Details: {searchedOrder.id}</CardTitle>
            <CardDescription className="text-muted-foreground">
              Hello {searchedOrder.customerName}, here's the latest on your order. Estimated delivery: {searchedOrder.estimatedDelivery}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-glow-accent">Items in this Order</h3>
              <div className="space-y-3">
                {searchedOrder.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border border-border/50">
                    <img src={item.imageUrl} alt={item.name} width={60} height={60} className="rounded object-cover" data-ai-hint={item.dataAiHint} />
                    <div className="flex-grow">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4 text-glow-accent">Order Status: <span className="text-primary">{searchedOrder.currentStatusText}</span></h3>
              <div className="relative space-y-8 ">
                {searchedOrder.statusHistory.map((step, index) => (
                  <div key={step.name} className="flex items-start">
                    <div className="flex flex-col items-center mr-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step.completed ? 'border-primary bg-primary/20 text-primary' : 'border-muted-foreground text-muted-foreground'}`}>
                        <step.icon className={`h-5 w-5 ${step.completed && step.current ? 'animate-pulse' : ''} ${step.name === 'Processing' && step.completed && step.current ? 'animate-spin': ''}`} />
                      </div>
                      {index < searchedOrder.statusHistory.length - 1 && (
                        <div className={`w-0.5 h-12 mt-1 ${step.completed ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                      )}
                    </div>
                    <div>
                      <p className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>{step.name}</p>
                      {step.date && <p className="text-xs text-muted-foreground">{step.date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
