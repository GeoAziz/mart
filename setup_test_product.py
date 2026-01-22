#!/usr/bin/env python3
"""
Setup test product data for E2E testing
Either use an existing product or create one
"""
import sys
from pathlib import Path
from datetime import datetime

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("Installing firebase-admin...")
    import subprocess
    subprocess.run(["pip", "install", "-q", "firebase-admin"])
    import firebase_admin
    from firebase_admin import credentials, firestore

project_root = Path(__file__).parent
service_account_key = project_root / "serviceAccountKey.json"

if not service_account_key.exists():
    print(f"❌ serviceAccountKey.json not found")
    sys.exit(1)

try:
    app = firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate(str(service_account_key))
    app = firebase_admin.initialize_app(cred)

db = firestore.client()

print("\n" + "="*70)
print("🔍 FINDING/CREATING TEST PRODUCT")
print("="*70)

# First try to find any existing product
print("\n1️⃣ Searching for existing products...")
try:
    products_ref = db.collection("products")
    products_query = products_ref.limit(5)
    docs = list(products_query.stream())
    
    if docs:
        print(f"   ✅ Found {len(docs)} product(s):\n")
        for i, doc in enumerate(docs, 1):
            prod_id = doc.id
            data = doc.to_dict()
            name = data.get('name', 'Unknown')
            print(f"   {i}. ID: {prod_id}")
            print(f"      Name: {name}")
            print(f"      Price: ${data.get('price', 'N/A')}")
            print(f"      Status: {data.get('status', 'N/A')}\n")
        
        # Use first product
        first_product_id = docs[0].id
        print(f"   ✅ USING FIRST PRODUCT: {first_product_id}")
        print(f"\n   ⚠️  UPDATE: tests/test_complete_user_journeys_v2.py")
        print(f"      Change line 52:")
        print(f"      TEST_PRODUCT_ID = \"{first_product_id}\"")
        
    else:
        print(f"   ⚠️  No products found, creating test product...")
        
        # Create a test product
        test_product = {
            "name": "E2E Test Product",
            "description": "Test product for E2E testing",
            "price": 99.99,
            "category": "Electronics",
            "stock": 100,
            "status": "active",
            "vendorId": "vendor_user_id_1",
            "imageUrl": "https://via.placeholder.com/300x300?text=Test+Product",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "rating": 4.5,
            "reviews": 10,
        }
        
        # Add to Firestore
        doc_ref = db.collection("products").document()
        doc_ref.set(test_product)
        product_id = doc_ref.id
        
        print(f"\n   ✅ CREATED TEST PRODUCT")
        print(f"      ID: {product_id}")
        print(f"      Name: {test_product['name']}")
        print(f"      Price: ${test_product['price']}")
        
        print(f"\n   ⚠️  UPDATE: tests/test_complete_user_journeys_v2.py")
        print(f"      Change line 52:")
        print(f"      TEST_PRODUCT_ID = \"{product_id}\"")

except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "="*70)
print("✅ Next: Update the test file with the product ID")
print("="*70 + "\n")
