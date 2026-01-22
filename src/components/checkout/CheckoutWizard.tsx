'use client';

import { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer, FUNDING } from '@paypal/react-paypal-js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
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
import { CheckCircle, CreditCard, MapPin, Package, ShoppingBag, ShieldCheck, AlertCircle, Loader2, Check } from 'lucide-react';
import { Separator } from '../ui/separator';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^(\+254|254|0)?[17]\d{8}$/, {
      message: "Invalid Kenyan phone number. Use format: +254712345678, 0712345678, or 712345678"
    })
    .transform(val => {
      // Normalize to international format (+254)
      const cleaned = val.trim().replace(/\s/g, '');
      if (cleaned.startsWith('0')) {
        return '+254' + cleaned.slice(1);
      }
      if (cleaned.startsWith('254')) {
        return '+' + cleaned;
      }
      if (!cleaned.startsWith('+')) {
        return '+254' + cleaned;
      }
      return cleaned;
    }),
  saveAddress: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;


const CheckoutWizard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('mpesa');
  const [paypalSdkError, setPaypalSdkError] = useState<string | null>(null);

  const { cart, clearCart, currentUser, userProfile, appliedPromotion } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

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

  // Stripe publishable key (replace with your actual key or use env variable)
  const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_123');

  // Stripe payment handler
  const StripeCheckoutForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const [stripeError, setStripeError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleStripeSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;
      setProcessing(true);
      setStripeError(null);
      try {
        if (!currentUser) throw new Error('User not authenticated');
        const token = await currentUser.getIdToken();
        // Create payment intent on backend
        const intentRes = await fetch('/api/payment/stripe/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ amount: Math.round(total * 100), currency: 'KES' })
        });
        const { clientSecret } = await intentRes.json();
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement)!,
          },
        });
        if (result.error) {
          setStripeError(result.error.message || 'Payment failed');
          toast({
            title: 'Payment Failed',
            description: result.error.message || 'Your payment could not be processed. Please try again.',
            variant: 'destructive',
          });
        } else if (result.paymentIntent?.status === 'succeeded') {
          await handlePlaceOrder('card');
        }
      } catch (err: any) {
        setStripeError(err.message || 'Stripe error');
      } finally {
        setProcessing(false);
      }
    };
    return (
      <form onSubmit={handleStripeSubmit} className="space-y-4">
        <CardElement className="p-3 border rounded-md bg-background" />
        {stripeError && <div className="text-destructive text-sm">{stripeError}</div>}
        <Button type="submit" disabled={processing} className="bg-primary text-primary-foreground w-full">{processing ? 'Processing...' : 'Pay with Card'}</Button>
      </form>
    );
  };

  // Loading overlay component
  const PaymentLoadingOverlay = ({ show, message }: { show: boolean; message: string }) => {
    if (!show) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
        <Card className="p-8 max-w-md mx-4 bg-card border-primary shadow-2xl">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl font-semibold text-center mb-2">{message}</p>
          <p className="text-sm text-muted-foreground text-center">
            Please do not close this window or press the back button
          </p>
        </Card>
      </div>
    );
  };

  // PayPal payment handler
  const handlePayPalApprove = async (orderId: string) => {
    await handlePlaceOrder('paypal', orderId);
  };

  // Unified place order handler
  const handlePlaceOrder = async (methodOverride?: string, paypalOrderId?: string) => {
    if (!currentUser || !userProfile) {
      router.push('/auth/login?redirect=/checkout');
      return;
    }
    setIsPlacingOrder(true);
    const orderPayload = {
      items: cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
      shippingAddress: methods.getValues(),
      paymentMethod: methodOverride || selectedPaymentMethod,
      promotionCode: appliedPromotion?.code,
      paypalOrderId,
    };
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(orderPayload)
      });
      
      // Parse response text first to handle errors properly
      const responseText = await response.text();
      let createdOrder;
      
      try {
        createdOrder = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', responseText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        throw new Error(createdOrder?.message || 'Failed to place order.');
      }

      // Only clear cart after confirming the order was created successfully
      // For payment methods that require upfront payment (card/paypal), 
      // payment is already verified at this point
      // For COD/M-Pesa, order creation confirms the transaction
      if (createdOrder && createdOrder.id) {
        await clearCart();
        setPlacedOrderId(createdOrder.id);
        setOrderPlaced(true);
      } else {
        throw new Error('Order was not created successfully');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Order Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (orderPlaced) {
    return (
      <Card className="w-full max-w-2xl mx-auto p-8 text-center bg-card border-primary shadow-2xl glow-edge-primary overflow-hidden">
        <div className="relative">
            {[...Array(30)].map((_,i) => ( 
                <div
                  key={i}
                  className="confetti-burst"
                  style={{
                    // Set CSS variables for dynamic styling
                    // @ts-ignore
                    '--confetti-bg': `hsl(${Math.random()*360}, 100%, ${50 + Math.random()*20}%)`,
                    '--confetti-left': `${Math.random()*100}%`,
                    '--confetti-top': `${Math.random()*50 - 25}%`,
                    '--confetti-delay': `${Math.random()*0.3}s`,
                    '--confetti-duration': `${0.7 + Math.random()*0.8}s`,
                    '--confetti-transform': `scale(${0.5 + Math.random() * 0.8}) rotate(${Math.random() * 360}deg)`
                  } as React.CSSProperties}
                ></div>
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
                      <div className={`mr-2 p-2 rounded-full border-2 relative ${index <= currentStep ? 'border-primary bg-primary/20' : 'border-muted-foreground'}`}>
                          {index < currentStep ? (
                            <Check className="h-5 w-5 text-primary" />
                          ) : (
                            step.icon
                          )}
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
            <form id="address-form" onSubmit={handleSubmit(onAddressSubmit)} className="space-y-4">
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
            <>
              <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} className="space-y-4">
                {/* M-Pesa - STK Push Coming Soon */}
                <div className="p-4 border border-border rounded-md hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10 relative">
                  <Label htmlFor="mpesa" className="flex items-center cursor-pointer">
                    <RadioGroupItem value="mpesa" id="mpesa" className="mr-3 border-primary text-primary focus:ring-primary"/>
                    <div className="flex-grow">
                      <span className="font-semibold">M-Pesa</span>
                      <p className="text-xs text-muted-foreground">Pay securely with M-Pesa. <span className="text-amber-500 font-medium">(STK Push coming soon - manual payment for now)</span></p>
                    </div>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/512px-M-PESA_LOGO-01.svg.png" alt="M-Pesa Logo" className="ml-auto h-6" />
                  </Label>
                </div>
                {/* Credit/Debit Card (Stripe) */}
                <div className="p-4 border border-border rounded-md hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                  <Label htmlFor="card" className="flex items-center cursor-pointer">
                    <RadioGroupItem value="card" id="card" className="mr-3 border-primary text-primary focus:ring-primary"/>
                    <div className="flex-grow">
                      <span className="font-semibold">Credit/Debit Card</span>
                      <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex. Powered by Stripe.</p>
                    </div>
                    <img src="https://cdn.worldvectorlogo.com/logos/stripe-3.svg" alt="Stripe Logo" className="ml-auto h-6 payment-logo-stripe" />
                  </Label>
                </div>
                {/* PayPal */}
                <div className="p-4 border border-border rounded-md hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                  <Label htmlFor="paypal" className="flex items-center cursor-pointer">
                    <RadioGroupItem value="paypal" id="paypal" className="mr-3 border-primary text-primary focus:ring-primary"/>
                    <div className="flex-grow">
                      <span className="font-semibold">PayPal</span>
                      <p className="text-xs text-muted-foreground">Pay securely with your PayPal account.</p>
                    </div>
                    <img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="PayPal Logo" className="ml-auto h-6" />
                  </Label>
                </div>
                {/* Cash on Delivery */}
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
              {/* M-Pesa instructions when selected */}
              {selectedPaymentMethod === 'mpesa' && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-md">
                  <p className="text-sm text-green-400 font-medium mb-2">M-Pesa Payment Instructions:</p>
                  <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Go to M-Pesa on your phone</li>
                    <li>Select &quot;Lipa na M-Pesa&quot; → &quot;Pay Bill&quot;</li>
                    <li>Enter Business Number: <span className="font-mono text-primary">123456</span></li>
                    <li>Enter Account Number: Your order ID (shown after placing order)</li>
                    <li>Enter Amount: KSh {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</li>
                    <li>Enter your M-Pesa PIN and confirm</li>
                  </ol>
                  <p className="text-xs text-amber-500 mt-2">Note: Your order will be processed once payment is confirmed.</p>
                </div>
              )}
            </>
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

        <CardFooter className="p-6 flex justify-between items-center border-t border-border">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 0 || isPlacingOrder} 
            className={cn(
              "border-accent text-accent font-semibold px-6 min-w-[100px]",
              "hover:bg-accent hover:text-accent-foreground",
              "disabled:border-muted disabled:text-muted-foreground disabled:opacity-70 disabled:cursor-not-allowed"
            )}
          >
            Back
          </Button>
          
          {/* Next button for step 0 (Address) - triggers form submit */}
          {currentStep === 0 && (
            <Button 
              type="submit" 
              form="address-form"
              disabled={!isValid || Object.keys(errors).length > 0} 
              className={cn(
                "bg-primary text-primary-foreground font-semibold px-6 min-w-[100px]",
                "hover:bg-primary/90",
                "disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70 disabled:cursor-not-allowed",
                isValid && Object.keys(errors).length === 0 && "glow-edge-primary"
              )}
            >
              Next
            </Button>
          )}
          
          {/* Next button for step 1 (Payment Method) */}
          {currentStep === 1 && (
            <Button
              onClick={() => {
                if (selectedPaymentMethod) handleNextStep();
              }}
              disabled={!selectedPaymentMethod}
              className={cn(
                "bg-primary text-primary-foreground font-semibold px-6 min-w-[100px]",
                "hover:bg-primary/90",
                "disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70 disabled:cursor-not-allowed",
                selectedPaymentMethod && "glow-edge-primary"
              )}
            >
              Next
            </Button>
          )}
          
          {/* Place Order / Payment buttons for step 2 (Summary) */}
          {currentStep === steps.length - 1 && (
            <div className="flex-1 ml-4">
              {selectedPaymentMethod === 'card' && (
                <Elements stripe={stripePromise}>
                  <StripeCheckoutForm />
                </Elements>
              )}
              {selectedPaymentMethod === 'paypal' && (
                <PayPalScriptProvider
                  options={{
                    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
                    currency: 'USD',
                    intent: 'capture',
                    components: 'buttons',
                    'disable-funding': 'card,credit,paylater,venmo',
                  }}
                >
                  <PayPalCheckoutWithConversion
                    total={total}
                    currentUser={currentUser}
                    setPaypalSdkError={setPaypalSdkError}
                    handlePayPalApprove={handlePayPalApprove}
                  />
                </PayPalScriptProvider>
              )}
              {(selectedPaymentMethod !== 'card' && selectedPaymentMethod !== 'paypal') && (
                <Button 
                  onClick={() => handlePlaceOrder()} 
                  disabled={isPlacingOrder || cart.length === 0} 
                  className={cn(
                    "bg-green-500 text-white font-semibold w-full",
                    "hover:bg-green-600",
                    "disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70 disabled:cursor-not-allowed",
                    !isPlacingOrder && cart.length > 0 && "animate-pulse-glow glow-edge-primary"
                  )}
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : "Place Order"}
                </Button>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
      
      {/* Add loading overlay */}
      <PaymentLoadingOverlay 
        show={isPlacingOrder} 
        message={selectedPaymentMethod === 'card' ? 'Processing Payment...' : 'Creating Your Order...'}
      />

      {/* Mobile Sticky Footer - Only show on payment/summary steps */}
      {currentStep >= 1 && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden z-50 p-4 bg-card/95 backdrop-blur border-t border-border shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="text-lg font-bold text-glow-primary">
              KSh {total.toLocaleString()}
            </span>
          </div>
          {currentStep === steps.length - 1 ? (
            <div className="w-full">
              {selectedPaymentMethod === 'mpesa' && (
                <Button 
                  className="w-full h-12 text-base glow-edge-primary"
                  onClick={handleSubmit(handlePlaceOrder)}
                  disabled={isPlacingOrder}
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="mr-2 h-5 w-5" />
                      Place Order
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <Button 
              className="w-full h-12 text-base"
              onClick={handleNextStep}
              disabled={currentStep === 0 && !isValid}
            >
              Continue to {steps[currentStep + 1]?.name}
            </Button>
          )}
        </div>
      )}
    </FormProvider>
  );
};


// Enhanced PayPal checkout component - ONLY shows PayPal button (no debit/credit card)
function PayPalCheckoutWithConversion({ total, currentUser, setPaypalSdkError, handlePayPalApprove }: {
  total: number;
  currentUser: any;
  setPaypalSdkError: (error: string | null) => void;
  handlePayPalApprove: (orderId: string) => Promise<void>;
}) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversionInfo, setConversionInfo] = useState<string | null>(null);
  const { toast } = useToast();

  // Convert KES to USD (rate: 129 KES = 1 USD)
  const KES_TO_USD_RATE = 129;
  const usdAmount = (total / KES_TO_USD_RATE).toFixed(2);

  useEffect(() => {
    if (isRejected) {
      setPaypalSdkError('Failed to load PayPal. Please check your connection or try again.');
    }
  }, [isRejected, setPaypalSdkError]);

  // Show conversion info
  useEffect(() => {
    setConversionInfo(`KSh ${total.toLocaleString()} ≈ $${usdAmount} USD`);
  }, [total, usdAmount]);

  if (isRejected) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Failed to load PayPal</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Please refresh the page and try again, or choose a different payment method.
        </p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading PayPal...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Currency conversion notice */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-400 flex items-center gap-2">
          <span className="font-medium">💱 Currency Conversion:</span>
          {conversionInfo}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PayPal will charge in USD. Your bank may apply additional conversion fees.
        </p>
      </div>

      {/* Error display */}
      {paypalError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-start gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">{paypalError}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Please try again or choose a different payment method.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PayPal Button - ONLY PayPal funding source */}
      <div className="rounded-lg border border-border/50 bg-card/50 p-4">
        <PayPalButtons
          fundingSource={FUNDING.PAYPAL}
          style={{
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'pay',
            height: 50,
            tagline: false,
          }}
          forceReRender={[total, usdAmount]}
          createOrder={async (_data: Record<string, unknown>, actions: any) => {
            console.log('[PayPal] Creating order. KES:', total, '-> USD:', usdAmount);
            setPaypalError(null);
            setIsProcessing(true);

            try {
              if (!currentUser) {
                throw new Error('Please log in to complete your purchase');
              }

              if (parseFloat(usdAmount) < 0.01) {
                throw new Error('Order total is too small for PayPal (minimum $0.01)');
              }

              // Use PayPal SDK to create order directly (more reliable)
              const orderId = await actions.order.create({
                intent: 'CAPTURE',
                purchase_units: [
                  {
                    amount: {
                      currency_code: 'USD',
                      value: usdAmount,
                    },
                    description: 'ZilaCart Purchase',
                  },
                ],
                application_context: {
                  brand_name: 'ZilaCart',
                  shipping_preference: 'NO_SHIPPING',
                  user_action: 'PAY_NOW',
                },
              });

              console.log('[PayPal] Order created successfully:', orderId);
              setIsProcessing(false);
              return orderId;
            } catch (err: any) {
              const message = err?.message || 'Failed to create PayPal order';
              console.error('[PayPal] Create order error:', message);
              setPaypalError(message);
              setIsProcessing(false);
              throw err;
            }
          }}
          onApprove={async (data: { orderID: string }, actions: any) => {
            console.log('[PayPal] Payment approved. OrderID:', data.orderID);
            setPaypalError(null);
            setIsProcessing(true);

            try {
              // IMPORTANT: Capture the payment using PayPal SDK
              console.log('[PayPal] Capturing payment...');
              const captureResult = await actions.order?.capture();
              
              if (!captureResult || captureResult.status !== 'COMPLETED') {
                throw new Error(`Payment capture failed: ${captureResult?.status || 'Unknown error'}`);
              }

              console.log('[PayPal] Payment captured successfully:', captureResult.id);
              
              // Now create the order in our system
              toast({
                title: 'Payment Successful!',
                description: 'Your PayPal payment was processed. Creating your order...',
              });

              await handlePayPalApprove(data.orderID);
              
            } catch (err: any) {
              const message = err?.message || 'Payment processing failed';
              console.error('[PayPal] Capture/approve error:', message, err);
              setPaypalError(message);
              toast({
                title: 'Payment Failed',
                description: message,
                variant: 'destructive',
              });
            } finally {
              setIsProcessing(false);
            }
          }}
          onCancel={() => {
            console.log('[PayPal] Payment cancelled by user');
            setPaypalError('Payment was cancelled. You can try again when ready.');
            setIsProcessing(false);
          }}
          onError={(err: unknown) => {
            const message = err instanceof Error ? err.message : 'An error occurred with PayPal';
            console.error('[PayPal] Error:', message);
            setPaypalError(message);
            setPaypalSdkError(message);
            setIsProcessing(false);
          }}
          disabled={isProcessing}
        />
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-2 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Processing your payment...</span>
        </div>
      )}
    </div>
  );
}

export default CheckoutWizard;
