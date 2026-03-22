#!/usr/bin/env python3
"""
PayPal Credential Verification Test
Verifies that PayPal credentials are valid and can authenticate
"""

import os
import sys
import requests
import json
from base64 import b64encode

# Get credentials from environment - MUST be set before running
CLIENT_ID = os.getenv('PAYPAL_CLIENT_ID')
CLIENT_SECRET = os.getenv('PAYPAL_CLIENT_SECRET')
MODE = os.getenv('PAYPAL_MODE', 'sandbox')

# Validate credentials are provided
if not CLIENT_ID or not CLIENT_SECRET:
    print('❌ ERROR: PayPal credentials not configured')
    print('   Set these environment variables from your PayPal Developer account:')
    print('   - PAYPAL_CLIENT_ID')
    print('   - PAYPAL_CLIENT_SECRET')
    print('   Get credentials from: https://developer.paypal.com/dashboard/')
    print('   Never commit real credentials to version control!')
    sys.exit(1)

PAYPAL_API_BASE = {
    'sandbox': 'https://api-m.sandbox.paypal.com',
    'live': 'https://api-m.paypal.com'
}

def test_oauth():
    """Test OAuth2 token generation"""
    print("\n" + "="*70)
    print("🔐 Testing PayPal OAuth2 Authentication")
    print("="*70)
    
    base_url = PAYPAL_API_BASE[MODE]
    auth_string = b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
    
    print(f"\nMode: {MODE}")
    print(f"Base URL: {base_url}")
    print(f"Client ID (first 20 chars): {CLIENT_ID[:20]}...")
    print(f"Client Secret (first 20 chars): {CLIENT_SECRET[:20]}...")
    
    try:
        response = requests.post(
            f"{base_url}/v1/oauth2/token",
            headers={
                'Authorization': f'Basic {auth_string}',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data='grant_type=client_credentials',
            timeout=10
        )
        
        print(f"\n📡 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token', '')
            print(f"✅ OAuth SUCCESS!")
            print(f"   Access Token (first 30 chars): {token[:30]}...")
            print(f"   Token Type: {data.get('token_type')}")
            print(f"   Expires In: {data.get('expires_in')} seconds")
            return token
        else:
            print(f"❌ OAuth FAILED")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return None

def test_create_order(token):
    """Test creating a simple PayPal order"""
    print("\n" + "="*70)
    print("📦 Testing PayPal Order Creation")
    print("="*70)
    
    if not token:
        print("⚠️  Skipping - no valid token")
        return None
    
    base_url = PAYPAL_API_BASE[MODE]
    
    order_payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "amount": {
                    "currency_code": "USD",
                    "value": "15.50"
                }
            }
        ],
        "application_context": {
            "shipping_preference": "NO_SHIPPING",
            "user_action": "PAY_NOW",
            "return_url": "http://localhost:3000/checkout",
            "cancel_url": "http://localhost:3000/checkout",
        }
    }
    
    try:
        response = requests.post(
            f"{base_url}/v2/checkout/orders",
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            json=order_payload,
            timeout=10
        )
        
        print(f"\n📡 Response Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            order_id = data.get('id', '')
            print(f"✅ Order Creation SUCCESS!")
            print(f"   Order ID: {order_id}")
            print(f"   Status: {data.get('status')}")
            return order_id
        else:
            print(f"❌ Order Creation FAILED")
            print(f"   Response Status: {response.status_code}")
            print(f"   Response: {json.dumps(response.json(), indent=2)}")
            return None
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return None

def main():
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*15 + "PAYPAL CREDENTIAL VERIFICATION" + " "*21 + "║")
    print("╚" + "="*68 + "╝")
    
    # Test 1: OAuth
    token = test_oauth()
    
    # Test 2: Create Order
    if token:
        order_id = test_create_order(token)
        
        if order_id:
            print("\n" + "="*70)
            print("✅ ALL TESTS PASSED!")
            print("="*70)
            print("\n✓ Credentials are valid")
            print("✓ OAuth authentication works")
            print("✓ Order creation works")
            print("\nYour PayPal setup is configured correctly!")
        else:
            print("\n" + "="*70)
            print("⚠️  OAuth works but order creation failed")
            print("="*70)
    else:
        print("\n" + "="*70)
        print("❌ OAuth authentication failed")
        print("="*70)
        print("\n⚠️  Possible causes:")
        print("   1. Invalid CLIENT_ID in .env")
        print("   2. Invalid CLIENT_SECRET in .env")
        print("   3. PayPal API is down")
        print("   4. Network connectivity issue")

if __name__ == "__main__":
    main()
