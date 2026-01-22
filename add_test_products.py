#!/usr/bin/env python3
"""
Create test products for E2E testing
"""
import sys
import os
sys.path.insert(0, '/mnt/devmandrive/projects/mart')

# Use requests to create products via API (simpler than Firebase SDK)
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:3000"

print("\n" + "="*70)
print("🛍️  CREATING TEST PRODUCTS")
print("="*70)

# Test products to create
test_products = [
    {
        "name": "Test Laptop",
        "description": "High-performance laptop for testing",
        "price": 1299.99,
        "category": "Electronics",
        "stock": 50,
    },
    {
        "name": "Test Phone",
        "description": "Smartphone for E2E testing",
        "price": 799.99,
        "category": "Electronics",
        "stock": 100,
    },
    {
        "name": "Test Headphones",
        "description": "Wireless headphones for testing",
        "price": 199.99,
        "category": "Electronics",
        "stock": 75,
    }
]

print("\n📝 Note: Products must be created via backend/database directly")
print("   Run this Python code to add to Firestore:\n")

print("""
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Add test products
test_products = [
    {
        "name": "Test Laptop",
        "description": "High-performance laptop for testing",
        "price": 1299.99,
        "category": "Electronics",
        "stock": 50,
        "status": "active",
        "vendorId": "vendor_user_id_1",
        "imageUrl": "https://via.placeholder.com/300x300?text=Laptop",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    },
    {
        "name": "Test Phone",
        "description": "Smartphone for E2E testing",
        "price": 799.99,
        "category": "Electronics",
        "stock": 100,
        "status": "active",
        "vendorId": "vendor_user_id_1",
        "imageUrl": "https://via.placeholder.com/300x300?text=Phone",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    },
    {
        "name": "Test Headphones",
        "description": "Wireless headphones for testing",
        "price": 199.99,
        "category": "Electronics",
        "stock": 75,
        "status": "active",
        "vendorId": "vendor_user_id_1",
        "imageUrl": "https://via.placeholder.com/300x300?text=Headphones",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
]

for product in test_products:
    db.collection("products").add(product)
    print(f"✅ Created: {product['name']}")
""")

print("\n" + "="*70)
print("⚠️  ACTION REQUIRED:")
print("="*70)
print("\n1. Open Firebase Console")
print("2. Go to Firestore Database")
print("3. Create a 'products' collection if it doesn't exist")
print("4. Add documents with the structure above")
print("\nOR run the Python code in the Firebase console...")
print("="*70 + "\n")
