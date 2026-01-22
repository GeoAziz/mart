#!/usr/bin/env python3
"""
Quick test: Check if Firebase users exist and have proper Firestore profiles
"""
import sys
from pathlib import Path

# Add project to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth
except ImportError:
    print("❌ firebase-admin not installed. Run: pip install firebase-admin")
    sys.exit(1)

project_root = Path(__file__).parent.parent
service_account_key = project_root / "serviceAccountKey.json"

if not service_account_key.exists():
    print(f"❌ No serviceAccountKey.json found at {service_account_key}")
    sys.exit(1)

print("🔍 Checking Firebase Setup...\n")

try:
    app = firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate(str(service_account_key))
    app = firebase_admin.initialize_app(cred)

db = firestore.client()
auth_client = auth.Client(app)

# Test accounts
test_emails = [
    "customer1@zilacart.com",
    "vendor1@zilacart.com", 
    "admin@zilacart.com"
]

print("=" * 60)
print("CHECKING FIREBASE AUTH & FIRESTORE")
print("=" * 60)

for email in test_emails:
    print(f"\n📧 {email}")
    
    # Check if user exists in Firebase Auth
    try:
        user = auth_client.get_user_by_email(email)
        print(f"  ✅ Firebase Auth: EXISTS (UID: {user.uid})")
        uid = user.uid
        
        # Check if profile exists in Firestore
        user_doc = db.collection("users").document(uid).get()
        if user_doc.exists():
            data = user_doc.to_dict()
            print(f"  ✅ Firestore Profile: EXISTS")
            print(f"     - Role: {data.get('role', 'N/A')}")
            print(f"     - Status: {data.get('status', 'N/A')}")
            print(f"     - Name: {data.get('fullName', 'N/A')}")
        else:
            print(f"  ❌ Firestore Profile: MISSING")
            print(f"     Creating profile now...")
            db.collection("users").document(uid).set({
                "uid": uid,
                "email": email,
                "fullName": email.split("@")[0],
                "role": "admin" if "admin" in email else ("vendor" if "vendor" in email else "customer"),
                "status": "active",
                "createdAt": firestore.SERVER_TIMESTAMP,
            })
            print(f"  ✅ Profile created!")
    except Exception as e:
        print(f"  ❌ Firebase Auth: NOT FOUND")
        print(f"     Error: {str(e)}")

print("\n" + "=" * 60)
print("✅ Check complete!")
print("=" * 60)
