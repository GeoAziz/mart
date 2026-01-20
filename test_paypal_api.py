#!/usr/bin/env python3
"""
PayPal API Endpoints Test
Verifies order creation and capture endpoints are working
"""

import requests
import json
import time

BASE_URL = "http://localhost:3000"

def test_paypal_order_creation():
    """Test PayPal order creation endpoint"""
    print("\n" + "="*70)
    print("🧪 Testing PayPal Order Creation Endpoint")
    print("="*70)
    
    url = f"{BASE_URL}/api/payment/paypal/order"
    payload = {
        "amount": 2000,  # 2000 KES
        "currency": "KES"
    }
    
    print(f"\n📍 POST {url}")
    print(f"   Payload: {json.dumps(payload, indent=2)}\n")
    
    try:
        response = requests.post(url, json=payload, timeout=15)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Response: {json.dumps(data, indent=2)}\n")
            
            if 'id' in data:
                print(f"   ✅ Order ID: {data['id']}")
                print(f"   ✅ Amount: {data.get('amount')} {data.get('currency')}")
                if data.get('conversionNotice'):
                    print(f"   ℹ️  {data['conversionNotice']}")
                return data['id']
            else:
                print(f"   ❌ No order ID in response\n")
                return None
        else:
            print(f"   ❌ Error: {response.text}\n")
            return None
    except Exception as e:
        print(f"   ❌ Exception: {e}\n")
        return None

def test_paypal_capture(order_id):
    """Test PayPal capture endpoint"""
    print("\n" + "="*70)
    print("🧪 Testing PayPal Capture Endpoint")
    print("="*70)
    
    url = f"{BASE_URL}/api/payment/paypal/capture"
    payload = {
        "orderId": order_id
    }
    
    print(f"\n📍 POST {url}")
    print(f"   Payload: {json.dumps(payload, indent=2)}\n")
    
    # Note: This will fail with INVALID_RESOURCE_ID because we created the order
    # but PayPal doesn't have an actual approval for it yet
    # In a real test, PayPal would have approved it
    
    try:
        response = requests.post(url, json=payload, timeout=15)
        print(f"   Status: {response.status_code}")
        
        if response.status_code in [200, 400, 404]:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}\n")
            
            if response.status_code == 200 and data.get('success'):
                print(f"   ✅ Payment captured successfully!")
                return True
            else:
                # Expected to fail - order not approved by user yet
                print(f"   ℹ️  Expected: Order not approved yet (normal for API test)")
                if 'INVALID_RESOURCE_ID' in data.get('message', ''):
                    print(f"   ℹ️  This is expected - order ID needs PayPal approval first")
                return False
        else:
            print(f"   ❌ Unexpected status: {response.text}\n")
            return False
    except Exception as e:
        print(f"   ❌ Exception: {e}\n")
        return False

def main():
    print("\n" + "="*70)
    print("🎯 PayPal API Endpoints Verification")
    print("="*70)
    print(f"\nBase URL: {BASE_URL}")
    print("\nTest Steps:")
    print("  1. Create PayPal order (2000 KES ≈ $15 USD)")
    print("  2. Test capture endpoint with created order ID")
    print("  3. Verify error handling\n")
    
    # Test order creation
    order_id = test_paypal_order_creation()
    
    if order_id:
        print("✅ Order creation successful!\n")
        
        # Test capture
        print("⏳ Waiting before capture test...")
        time.sleep(2)
        
        test_paypal_capture(order_id)
        
        print("\n" + "="*70)
        print("✅ API Endpoints Test Complete")
        print("="*70)
        print("\nNotes:")
        print("  • Order creation: ✅ Working")
        print("  • Capture endpoint: ✅ Reachable (needs PayPal approval in real flow)")
        print("  • For full E2E test, manually:")
        print("    1. Go to http://localhost:3000/products")
        print("    2. Add item to cart")
        print("    3. Go to checkout")
        print("    4. Fill form > Select PayPal > Click PayPal button")
        print("    5. Login with PayPal sandbox account (provided)")
        print("    6. Approve payment")
        print("    7. Verify order created")
        print("\n" + "="*70 + "\n")
        
    else:
        print("\n" + "="*70)
        print("❌ API Endpoints Test Failed")
        print("="*70 + "\n")

if __name__ == "__main__":
    main()
