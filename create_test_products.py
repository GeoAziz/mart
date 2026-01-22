#!/usr/bin/env python3
"""
Create test products in Firestore
Run this once to setup test data for E2E tests
"""
from datetime import datetime

# Check if Firebase admin is available
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except:
    import subprocess
    import sys
    print("Installing firebase-admin...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "firebase-admin"])
    import firebase_admin
    from firebase_admin import credentials, firestore

from pathlib import Path

# Get service account key
key_path = Path(__file__).parent / "serviceAccountKey.json"
if not key_path.exists():
    print(f"❌ Cannot find {key_path}")
    exit(1)

print("\n" + "="*70)
print("🛍️  CREATING TEST PRODUCTS IN FIRESTORE")
print("="*70 + "\n")

# Initialize Firebase
try:
    app = firebase_admin.get_app()
    print("✅ Using existing Firebase app")
except ValueError:
    print("🔧 Initializing Firebase...")
    cred = credentials.Certificate(str(key_path))
    app = firebase_admin.initialize_app(cred)
    print("✅ Firebase initialized")

db = firestore.client()

# Test products
products = [
    {
        "name": "Premium Laptop",
        "description": "High-performance laptop perfect for development",
        "price": 1299.99,
        "category": "Electronics",
        "stock": 50,
        "status": "active",
        "vendorId": "vendor_user_id_1",
        "imageUrl": "https://via.placeholder.com/300x300?text=Laptop",
        "rating": 4.8,
        "reviews": 42,
    },
    {
        "name": "Smartphone Pro",
        "description": "Latest smartphone with advanced features",
        "price": 999.99,
        "category": "Electronics",
        "stock": 100,
        "status": "active",
        "vendorId": "vendor_user_id_1",
        "imageUrl": "https://via.placeholder.com/300x300?text=Phone",
        "rating": 4.6,
        "reviews": 187,
    },
    {
        "name": "Wireless Headphones",
        "description": "Premium noise-cancelling headphones",
        "price": 249.99,
        "category": "Electronics",
        "stock": 75,
        "status": "active",
        "vendorId": "vendor_user_id_1",
        "imageUrl": "https://via.placeholder.com/300x300?text=Headphones",
        "rating": 4.5,
        "reviews": 93,
    }
]

print("📝 Adding products to Firestore...\n")

product_ids = []
for i, product in enumerate(products, 1):
    try:
        # Add timestamps
        product["createdAt"] = datetime.utcnow()
        product["updatedAt"] = datetime.utcnow()
        
        # Add to Firestore
        doc_ref = db.collection("products").add(product)
        doc_id = doc_ref[1].id
        product_ids.append(doc_id)
        
        print(f"   {i}. ✅ {product['name']}")
        print(f"      ID: {doc_id}")
        print(f"      Price: ${product['price']}")
        print()
    except Exception as e:
        print(f"   {i}. ❌ {product['name']}: {str(e)}\n")

print("="*70)
if product_ids:
    print(f"✅ CREATED {len(product_ids)} PRODUCTS")
    print("\n📝 Test data is ready!")
    print("   Products will now show up in the products page")
    print("   E2E tests can click on them and navigate to details\n")
else:
    print("❌ No products were created")

print("="*70 + "\n")
