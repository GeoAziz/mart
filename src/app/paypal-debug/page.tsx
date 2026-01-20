'use client';

import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';

export default function PayPalDebugPage() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const [testResult, setTestResult] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    console.log('PayPal Client ID:', clientId);
    console.log('Client ID length:', clientId?.length);
  }, [clientId]);

  const testApiOrder = async () => {
    try {
      setTestResult('Testing order creation...');
      
      const response = await fetch('/api/payment/paypal/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 100,
          currency: 'KES',
        }),
      });

      const data = await response.json();
      console.log('API Response:', data);
      
      if (response.ok && data.id) {
        setTestResult(`SUCCESS: Order created with ID: ${data.id}, Amount: ${data.amount} ${data.currency}`);
        setOrderId(data.id);
      } else {
        setTestResult(`ERROR: ${data.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      setTestResult(`EXCEPTION: ${err.message}`);
    }
  };

  if (!clientId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">PayPal Debug Page</h1>
        <div className="bg-red-100 p-4 rounded">
          ERROR: NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">PayPal Debug Page</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Environment</h2>
        <p className="text-sm font-mono">Client ID: {clientId.substring(0, 20)}...{clientId.substring(clientId.length - 10)}</p>
        <p className="text-sm">Length: {clientId.length} characters</p>
      </div>

      <div className="mb-6">
        <button 
          onClick={testApiOrder}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test API Order Creation
        </button>
        {testResult && (
          <div className={`mt-2 p-3 rounded ${testResult.includes('SUCCESS') ? 'bg-green-100' : 'bg-red-100'}`}>
            {testResult}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="font-semibold mb-2">PayPal SDK Test (No Auth Required)</h2>
        <PayPalScriptProvider
          options={{
            clientId,
            currency: 'USD',
            intent: 'capture',
            components: 'buttons',
          }}
        >
          <PayPalButtonsTest />
        </PayPalScriptProvider>
      </div>
    </div>
  );
}

function PayPalButtonsTest() {
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer();
  const [status, setStatus] = useState<string>('');

  if (isPending) {
    return <div className="p-4 bg-yellow-100 rounded">Loading PayPal SDK...</div>;
  }

  if (isRejected) {
    return <div className="p-4 bg-red-100 rounded">ERROR: PayPal SDK failed to load</div>;
  }

  return (
    <div>
      <div className="p-2 bg-green-100 rounded mb-2">SDK Loaded Successfully</div>
      {status && <div className="p-2 bg-blue-100 rounded mb-2">{status}</div>}
      
      <PayPalButtons
        style={{ layout: 'vertical', height: 40 }}
        createOrder={async (data, actions) => {
          console.log('createOrder called');
          setStatus('Creating order via SDK...');
          
          // Use SDK's built-in order creation (bypasses our API)
          const orderId = await actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [
              {
                amount: {
                  currency_code: 'USD',
                  value: '1.00',
                },
                description: 'Debug Test Purchase',
              },
            ],
          });
          
          console.log('SDK Order created:', orderId);
          setStatus(`Order created: ${orderId}`);
          return orderId;
        }}
        onApprove={async (data, actions) => {
          console.log('onApprove called:', data);
          setStatus(`Payment approved! Order: ${data.orderID}`);
          
          // Capture the payment using SDK
          if (actions.order) {
            const details = await actions.order.capture();
            console.log('Captured:', details);
            setStatus(`Payment completed! Status: ${details.status}`);
          }
        }}
        onCancel={(data) => {
          console.log('Payment cancelled:', data);
          setStatus('Payment cancelled by user');
        }}
        onError={(err) => {
          console.error('PayPal error:', err);
          setStatus(`Error: ${err}`);
        }}
      />
    </div>
  );
}
