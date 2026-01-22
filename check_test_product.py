#!/usr/bin/env python3
"""
Check if test products exist in Firestore
"""
import sys
from pathlib import Path

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

TEST_PRODUCT_ID = "KRmdS9LCeZvURKx6NbvI"

print("\n" + "="*70)
print("🔍 CHECKING TEST PRODUCT")
print("="*70)

print(f"\n📝 Product ID: {TEST_PRODUCT_ID}")

try:
    # Try to get the product
    product_doc = db.collection("products").document(TEST_PRODUCT_ID).get()
    
    if product_doc.exists():
        data = product_doc.to_dict()
        print(f"\n✅ PRODUCT FOUND")
        print(f"   Name: {data.get('name', 'N/A')}")
        print(f"   Price: ${data.get('price', 'N/A')}")
        print(f"   Category: {data.get('category', 'N/A')}")
        print(f"   Stock: {data.get('stock', 'N/A')}")
        print(f"   Status: {data.get('status', 'N/A')}")
        print(f"   Image: {data.get('imageUrl', 'N/A')[:50]}...")
    else:
        print(f"\n❌ PRODUCT NOT FOUND in Firestore")
        print(f"   Collection: products")
        print(f"   Document: {TEST_PRODUCT_ID}")
        
        # Try to list available products
        print(f"\n🔍 Available products in database:")
        products = db.collection("products").limit(5).get()
        if products:
            for i, doc in enumerate(products, 1):
                data = doc.to_dict()
                print(f"   {i}. ID: {doc.id}")
                print(f"      Name: {data.get('name', 'N/A')}")
                print(f"      Price: ${data.get('price', 'N/A')}")
        else:
            print(f"   ⚠️  No products found in database!")
            
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "="*70)
