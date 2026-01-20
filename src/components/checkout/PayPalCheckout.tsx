'use client';

import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Loader2, AlertCircle } from 'lucide-react';

interface PayPalCheckoutProps {
  total: number;
  currentUser: any;
  handlePayPalApprove: (orderId: string) => Promise<void>;
}

export function PayPalCheckout({ total, currentUser, handlePayPalApprove }: PayPalCheckoutProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
        PayPal is not configured. Please contact support.
      </div>
    );
  }

  // Add timestamp to bust SDK cache
  const sdkTimestamp = Date.now();
  console.log('[PayPal] Initializing SDK with Client ID:', clientId.substring(0, 20) + '...');

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: 'USD',
        intent: 'capture',
        components: 'buttons',
        debug: true,
        'data-csp-nonce': sdkTimestamp.toString(),
      }}
    >
      <PayPalButtonsComponent total={total} currentUser={currentUser} handlePayPalApprove={handlePayPalApprove} />
    </PayPalScriptProvider>
  );
}

function PayPalButtonsComponent({ total, currentUser, handlePayPalApprove }: PayPalCheckoutProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isRejected) {
      setError('Failed to load PayPal SDK');
      console.error('[PayPal] SDK Rejected');
    }
  }, [isRejected]);

  if (isRejected) {
    return (
      <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
        <AlertCircle className="h-5 w-5" />
        <div>
          <p className="font-semibold">Failed to load PayPal</p>
          <p className="text-xs">Please refresh the page and try again</p>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-8 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading PayPal...</span>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}
      
      <div className="p-4 border border-border/50 rounded-lg bg-card/50">
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'paypal',
            height: 45,
          }}
          forceReRender={[total]}
          createOrder={async (data: Record<string, unknown>, actions: any) => {
            console.log('[PayPal] Creating order for amount:', total);
            setError(null);
            setIsProcessing(true);

            try {
              if (!currentUser) {
                setIsProcessing(false);
                throw new Error('User not authenticated');
              }

              if (total <= 0) {
                setIsProcessing(false);
                throw new Error('Order total must be greater than 0');
              }

              // Convert KES to USD (rate: 129 KES = 1 USD)
              const usdAmount = (total / 129).toFixed(2);
              
              console.log('[PayPal] Creating order via SDK. KES:', total, '-> USD:', usdAmount);

              // Use SDK's built-in order creation - more reliable than server-side
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
              });

              console.log('[PayPal] Order Created via SDK:', orderId);
              setIsProcessing(false);
              return orderId;
            } catch (err: any) {
              const message = err?.message || 'Failed to create order';
              console.error('[PayPal] Error creating order:', message);
              setError(message);
              setIsProcessing(false);
              throw err;
            }
          }}
          onApprove={async (data: { orderID: string; payerID?: string }, actions: any) => {
            console.log('[PayPal] Payment Approved. OrderID:', data.orderID, 'PayerID:', data.payerID);
            setError(null);
            setIsProcessing(true);

            try {
              // Use SDK's built-in capture - more reliable
              console.log('[PayPal] Capturing payment via SDK...');
              const captureResult = await actions.order.capture();
              console.log('[PayPal] Capture result:', captureResult);

              if (captureResult.status === 'COMPLETED') {
                console.log('[PayPal] Payment captured successfully');
                await handlePayPalApprove(data.orderID);
                console.log('[PayPal] Order completed');
              } else {
                throw new Error(`Unexpected capture status: ${captureResult.status}`);
              }
              
              setIsProcessing(false);
              return;
            } catch (err: any) {
              const message = err?.message || 'Payment processing failed';
              console.error('[PayPal] Approval error:', message, err);
              setError(message);
              setIsProcessing(false);
              return Promise.resolve();
            }
          }}
          onCancel={(data: Record<string, unknown>) => {
            console.log('[PayPal] Payment cancelled by user');
            setError('Payment cancelled. Please try again.');
            setIsProcessing(false);
          }}
          onError={(err: any) => {
            const message = err?.message || 'PayPal error occurred';
            console.error('[PayPal] Error:', message);
            setError(message);
            setIsProcessing(false);
          }}
          disabled={isProcessing}
        />
      </div>
    </>
  );
}
