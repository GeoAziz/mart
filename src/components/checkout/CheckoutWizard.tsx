

'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, CreditCard, MapPin, Package, ShoppingBag, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const steps = [
  { id: 'address', name: 'Delivery Address', icon: <MapPin className="h-5 w-5" /> },
  { id: 'payment', name: 'Payment Method', icon: <CreditCard className="h-5 w-5" /> },
  { id: 'summary', name: 'Order Summary', icon: <ShoppingBag className="h-5 w-5" /> },
];

const addressSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  address: z.string().min(5, { message: "Street address is required." }),
  city: z.string().min(2, { message: "City is required." }),
  postalCode: z.string().optional(),
  phone: z.string().min(10, { message: "Phone number must be valid." }).regex(/^\+?[0-9\s-()]{10,}$/, { message: "Invalid phone number format."}),
  saveAddress: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;


const CheckoutWizard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('mpesa');

  const { cart, clearCart, currentUser, userProfile, appliedPromotion } = useAuth();
  const router = useRouter();

  const methods = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    mode: 'onChange', 
    defaultValues: {
      fullName: userProfile?.fullName || '',
      address: '',
      city: '',
      postalCode: '',
      phone: '',
      saveAddress: false,
    }
  });
  const { control, handleSubmit, formState: { errors, isValid } } = methods;

  useEffect(() => {
    if (currentUser && cart.length === 0 && !isPlacingOrder && !orderPlaced) {
       router.replace('/products');
    }
  }, [cart, currentUser, isPlacingOrder, orderPlaced, router]);


  const progressValue = ((currentStep + 1) / steps.length) * 100;

  const handleNextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const onAddressSubmit = (data: AddressFormData) => {
    console.log('Address Data:', data);
    handleNextStep();
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = appliedPromotion?.discountAmount || 0;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const shippingCost = subtotalAfterDiscount > 5000 ? 0 : 500; 
  const tax = subtotalAfterDiscount * 0.16; 
  const total = subtotalAfterDiscount + shippingCost + tax;

  const handlePlaceOrder = async () => {
    if (!currentUser || !userProfile) {
        router.push('/auth/login?redirect=/checkout');
        return;
    }
    setIsPlacingOrder(true);
    
    const orderPayload = {
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      shippingAddress: methods.getValues(),
      paymentMethod: selectedPaymentMethod,
      promotionCode: appliedPromotion?.code,
    };

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place order.');
      }
      
      const createdOrder = await response.json();
      await clearCart();
      setPlacedOrderId(createdOrder.id);
      setOrderPlaced(true);
    } catch (error) {
      console.error('Error placing order:', error);
      alert(`Error placing order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (orderPlaced) {
    return (
      <Card className="w-full max-w-2xl mx-auto p-8 text-center bg-card border-primary shadow-2xl glow-edge-primary overflow-hidden">
        <div className="relative">
            {[...Array(30)].map((_,i) => ( 
                <div key={i} className="absolute w-2 h-2 rounded-full animate-confetti-burst" style={{
                    background: `hsl(${Math.random()*360}, 100%, ${50 + Math.random()*20}%)`, 
                    left: `${Math.random()*100}%`,
                    top: `${Math.random()*50 - 25}%`, 
                    animationDelay: `${Math.random()*0.3}s`, 
                    animationDuration: `${0.7 + Math.random()*0.8}s`, 
                    transform: `scale(${0.5 + Math.random() * 0.8}) rotate(${Math.random() * 360}deg)` 
                }}></div>
            ))}
        </div>
        <CheckCircle className="h-20 w-20 text-green-400 mx-auto mb-6 animate-bounce relative z-10" /> 
        <h2 className="text-3xl font-bold font-headline mb-4 text-glow-primary relative z-10">Order Placed Successfully!</h2>
        <p className="text-lg text-muted-foreground mb-6 relative z-10">Thank you for your purchase. Your order ID is <span className="font-semibold text-primary">{placedOrderId}</span>.</p>
        <p className="text-muted-foreground mb-8 relative z-10">You will receive an email confirmation shortly. You can track your order in your account dashboard.</p>
        <div className="flex justify-center space-x-4 relative z-10">
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary">
                <Link href="/account/orders">Track Order</Link>
            </Button>
            <Button variant="outline" asChild className="border-accent text-accent hover:bg-accent hover:text-accent-foreground glow-edge-accent">
                <Link href="/products">Continue Shopping</Link>
            </Button>
        </div>
      </Card>
    );
  }


  return (
    <FormProvider {...methods}>
      <Card className="w-full max-w-3xl mx-auto shadow-2xl bg-card border-border">
        <CardHeader className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                  <div key={step.id} className={`flex items-center ${index <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                      <div className={`mr-2 p-2 rounded-full border-2 ${index <= currentStep ? 'border-primary bg-primary/20' : 'border-muted-foreground'}`}>
                          {step.icon}
                      </div>
                      <span className="font-medium hidden sm:inline">{step.name}</span>
                  </div>
              ))}
          </div>
          <Progress value={progressValue} className="w-full h-2 [&>div]:bg-primary" />
          <CardTitle className="text-2xl font-headline mt-4 text-glow-accent">{steps[currentStep].name}</CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {currentStep === 0 && (
            <form onSubmit={handleSubmit(onAddressSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Controller
                  name="fullName"
                  control={control}
                  render={({ field }) => <Input id="fullName" placeholder="e.g., Jomo Kenyatta" {...field} className={`bg-input border-primary focus:ring-accent ${errors.fullName ? 'border-destructive focus:ring-destructive' : ''}`} />}
                />
                {errors.fullName && <p className="text-xs text-destructive mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.fullName.message}</p>}
              </div>
              <div>
                <Label htmlFor="address">Street Address</Label>
                 <Controller
                  name="address"
                  control={control}
                  render={({ field }) => <Input id="address" placeholder="e.g., Uhuru Highway, Apt 4B" {...field} className={`bg-input border-primary focus:ring-accent ${errors.address ? 'border-destructive focus:ring-destructive' : ''}`}/>}
                />
                {errors.address && <p className="text-xs text-destructive mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.address.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City/Town</Label>
                  <Controller
                    name="city"
                    control={control}
                    render={({ field }) => <Input id="city" placeholder="e.g., Nairobi" {...field} className={`bg-input border-primary focus:ring-accent ${errors.city ? 'border-destructive focus:ring-destructive' : ''}`}/>}
                  />
                  {errors.city && <p className="text-xs text-destructive mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.city.message}</p>}
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal Code (Optional)</Label>
                   <Controller
                    name="postalCode"
                    control={control}
                    render={({ field }) => <Input id="postalCode" placeholder="e.g., 00100" {...field} className={`bg-input border-primary focus:ring-accent ${errors.postalCode ? 'border-destructive focus:ring-destructive' : ''}`}/>}
                  />
                  {errors.postalCode && <p className="text-xs text-destructive mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.postalCode.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => <Input id="phone" type="tel" placeholder="e.g., +254 7XX XXX XXX" {...field} className={`bg-input border-primary focus:ring-accent ${errors.phone ? 'border-destructive focus:ring-destructive' : ''}`}/>}
                />
                {errors.phone && <p className="text-xs text-destructive mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.phone.message}</p>}
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Controller
                  name="saveAddress"
                  control={control}
                  render={({ field }) => (
                    <Checkbox 
                      id="saveAddress" 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                      className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                  )}
                />
                <Label htmlFor="saveAddress" className="text-sm font-normal text-muted-foreground">Save this address for future orders</Label>
              </div>
            </form>
          )}

          {currentStep === 1 && (
            <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} className="space-y-4">
              <Label className="text-lg font-medium">Select Payment Method</Label>
              <div className="p-4 border border-border rounded-md hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <Label htmlFor="mpesa" className="flex items-center cursor-pointer">
                  <RadioGroupItem value="mpesa" id="mpesa" className="mr-3 border-primary text-primary focus:ring-primary"/>
                  <div className="flex-grow">
                    <span className="font-semibold">M-Pesa</span>
                    <p className="text-xs text-muted-foreground">Pay securely with M-Pesa.</p>
                  </div>
                  <img src="https://placehold.co/40x25.png" alt="M-Pesa Logo" className="ml-auto h-6" data-ai-hint="mpesa logo"/>
                </Label>
              </div>
              <div className="p-4 border border-border rounded-md hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <Label htmlFor="card" className="flex items-center cursor-pointer">
                  <RadioGroupItem value="card" id="card" className="mr-3 border-primary text-primary focus:ring-primary"/>
                  <div className="flex-grow">
                    <span className="font-semibold">Credit/Debit Card</span>
                    <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex.</p>
                  </div>
                  <CreditCard className="ml-auto h-6 w-6 text-blue-500"/>
                </Label>
              </div>
              <div className="p-4 border border-border rounded-md hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <Label htmlFor="cod" className="flex items-center cursor-pointer">
                  <RadioGroupItem value="cod" id="cod" className="mr-3 border-primary text-primary focus:ring-primary"/>
                  <div className="flex-grow">
                    <span className="font-semibold">Cash on Delivery</span>
                    <p className="text-xs text-muted-foreground">Pay when your order arrives.</p>
                  </div>
                  <Package className="ml-auto h-6 w-6 text-orange-500"/>
                </Label>
              </div>
            </RadioGroup>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-glow-primary">Review Your Order</h3>
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  </div>
                  <p className="font-medium">KSh {(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
              <Separator className="my-3 border-border/50"/>
              <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between"><span>Subtotal:</span> <span>KSh {subtotal.toLocaleString()}</span></div>
                  {appliedPromotion && (
                    <div className="flex justify-between text-green-400">
                        <span>Discount ({appliedPromotion.code}):</span>
                        <span>-KSh {discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  )}
                  <div className="flex justify-between"><span>Shipping:</span> <span>KSh {shippingCost.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Tax (VAT 16%):</span> <span>KSh {tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
              </div>
              <Separator className="my-3 border-border/50"/>
              <div className="flex justify-between text-xl font-bold text-foreground">
                  <span>Total:</span> <span>KSh {total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md flex items-start space-x-2 text-green-300 text-sm">
                  <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0"/>
                  <p>All transactions are secure and encrypted. Your personal data is protected.</p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-6 flex justify-between border-t border-border">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 0 || isPlacingOrder} className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            Back
          </Button>
          {currentStep === 0 && (
             <Button onClick={handleSubmit(onAddressSubmit)} disabled={!isValid || Object.keys(errors).length > 0} className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary">Next</Button>
          )}
          {currentStep === 1 && (
            <Button onClick={handleNextStep} className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary">Next</Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button onClick={handlePlaceOrder} disabled={isPlacingOrder || cart.length === 0} className="bg-green-500 hover:bg-green-600 text-white animate-pulse-glow">
              {isPlacingOrder ? (
                  <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                  </>
              ) : "Place Order"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </FormProvider>
  );
};

export default CheckoutWizard;
