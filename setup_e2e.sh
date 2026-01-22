#!/bin/bash
# Quick setup script for E2E test accounts

echo "🔧 Setting up E2E test accounts..."
echo ""

# Check if Firebase key exists
if [ ! -f "serviceAccountKey.json" ]; then
    echo "❌ serviceAccountKey.json not found!"
    exit 1
fi

echo "✅ Firebase credentials found"
echo ""

# Run Python setup
python << 'EOF'
import sys
from pathlib import Path
from datetime import datetime

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ firebase-admin not installed. Installing...")
    import subprocess
    subprocess.run(["pip", "install", "-q", "firebase-admin"])
    import firebase_admin
    from firebase_admin import credentials, firestore

project_root = Path.cwd()
service_account_key = project_root / "serviceAccountKey.json"

try:
    app = firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate(str(service_account_key))
    app = firebase_admin.initialize_app(cred)

db = firestore.client()

# Test accounts with their UIDs
accounts = [
    ("customer_user_id_1", "customer1@zilacart.com", "Test Customer", "customer"),
    ("vendor_user_id_1", "vendor1@zilacart.com", "Test Vendor", "vendor"),
    ("admin_user_id", "admin@zilacart.com", "Test Admin", "admin"),
]

print("=" * 60)
print("SETTING UP E2E TEST ACCOUNTS IN FIRESTORE")
print("=" * 60)
print()

for uid, email, name, role in accounts:
    print(f"📝 {email}")
    
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    
    if user_doc.exists():
        data = user_doc.to_dict()
        print(f"  ✅ EXISTS - Role: {data.get('role', 'N/A')} | Status: {data.get('status', 'N/A')}")
    else:
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
        print(f"  ✅ CREATED - Role: {role} | Status: active")
    print()

print("=" * 60)
print("✅ ALL ACCOUNTS READY")
print("=" * 60)
EOF

echo ""
echo "🚀 Ready to run E2E tests:"
echo "   pytest tests/test_complete_user_journeys_v2.py -v"
