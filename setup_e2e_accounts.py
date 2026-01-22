#!/usr/bin/env python3
"""
Setup test accounts properly in Firestore
Run this BEFORE running E2E tests
"""
import sys
from pathlib import Path
from datetime import datetime

try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth
except ImportError:
    print("❌ firebase-admin not installed")
    sys.exit(1)

project_root = Path(__file__).parent.parent
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
auth_client = auth.Client(app)

# Known test account UIDs (from Firebase)
test_accounts = [
    {
        "uid": "customer_user_id_1",
        "email": "customer1@zilacart.com",
        "name": "Test Customer",
        "role": "customer"
    },
    {
        "uid": "vendor_user_id_1",
        "email": "vendor1@zilacart.com",
        "name": "Test Vendor",
        "role": "vendor"
    },
    {
        "uid": "admin_user_id",
        "email": "admin@zilacart.com",
        "name": "Test Admin",
        "role": "admin"
    }
]

print("\n" + "="*70)
print("🔧 SETTING UP E2E TEST ACCOUNTS")
print("="*70)

for account in test_accounts:
    uid = account["uid"]
    email = account["email"]
    name = account["name"]
    role = account["role"]
    
    print(f"\n📝 {email}")
    
    # Create or verify Firestore profile
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    
    if user_doc.exists():
        data = user_doc.to_dict()
        print(f"  ✅ Profile exists in Firestore")
        print(f"     Role: {data.get('role')} | Status: {data.get('status')}")
    else:
        print(f"  ⚠️  Profile missing, creating now...")
        user_ref.set({
            "uid": uid,
            "email": email,
            "fullName": name,
            "displayName": name,
            "role": role,
            "status": "active",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        })
        print(f"  ✅ Profile created with role={role}, status=active")

print("\n" + "="*70)
print("✅ TEST ACCOUNT SETUP COMPLETE")
print("="*70)
print("\n💡 Test credentials:")
for acc in test_accounts:
    print(f"   • {acc['email']} / password123 (role: {acc['role']})")

print("\n🚀 Ready to run E2E tests!")
print("   pytest tests/test_complete_user_journeys_v2.py -v\n")
