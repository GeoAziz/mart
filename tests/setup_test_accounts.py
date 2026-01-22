#!/usr/bin/env python3
"""
Setup test user accounts in Firebase Firestore.
This ensures test accounts exist with proper user profiles.
"""

import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from pathlib import Path
from datetime import datetime
import time

# Find the serviceAccountKey.json
project_root = Path(__file__).parent.parent
service_account_key = project_root / "serviceAccountKey.json"

if not service_account_key.exists():
    print(f"❌ serviceAccountKey.json not found at {service_account_key}")
    print("   Please ensure the Firebase service account key is in the project root.")
    exit(1)

print(f"✅ Found service account key: {service_account_key}")

# Initialize Firebase
try:
    app = firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate(str(service_account_key))
    app = firebase_admin.initialize_app(cred)

db = firestore.client()
auth_client = auth.Client(app)

# Test accounts to create
TEST_ACCOUNTS = [
    {
        "email": "customer1@zilacart.com",
        "password": "password123",
        "displayName": "Test Customer",
        "role": "customer",
        "status": "active"
    },
    {
        "email": "vendor1@zilacart.com",
        "password": "password123",
        "displayName": "Test Vendor",
        "role": "vendor",
        "status": "active"
    },
    {
        "email": "admin@zilacart.com",
        "password": "password123",
        "displayName": "Test Admin",
        "role": "admin",
        "status": "active"
    }
]

def create_test_account(account_info: dict):
    """Create a test account in Firebase Auth and Firestore."""
    email = account_info["email"]
    password = account_info["password"]
    display_name = account_info["displayName"]
    role = account_info["role"]
    status = account_info["status"]
    
    try:
        # Check if user already exists
        try:
            user = auth_client.get_user_by_email(email)
            print(f"  ℹ️  User {email} already exists (UID: {user.uid})")
            uid = user.uid
        except:
            # Create new user
            user = auth_client.create_user(email=email, password=password, display_name=display_name)
            print(f"  ✅ Created Firebase Auth user: {email}")
            uid = user.uid
        
        # Now ensure user profile exists in Firestore
        user_doc_ref = db.collection("users").document(uid)
        user_doc = user_doc_ref.get()
        
        if user_doc.exists():
            print(f"  ℹ️  Firestore profile already exists for {email}")
        else:
            # Create user profile in Firestore
            user_doc_ref.set({
                "uid": uid,
                "email": email,
                "fullName": display_name,
                "role": role,
                "status": status,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow(),
            })
            print(f"  ✅ Created Firestore profile for {email} with role={role}")
        
        return True, uid
        
    except Exception as e:
        print(f"  ❌ Error creating account {email}: {str(e)}")
        return False, None

def main():
    print("="*60)
    print("🔧 SETTING UP TEST ACCOUNTS")
    print("="*60)
    
    success_count = 0
    accounts = []
    
    for account in TEST_ACCOUNTS:
        print(f"\n📝 Processing {account['email']}...")
        success, uid = create_test_account(account)
        if success:
            success_count += 1
            accounts.append({
                "email": account["email"],
                "uid": uid,
                "role": account["role"],
                "password": account["password"]
            })
    
    print("\n" + "="*60)
    print(f"✅ Setup Complete: {success_count}/{len(TEST_ACCOUNTS)} accounts ready")
    print("="*60)
    
    print("\n📋 Test Accounts Ready:")
    for acc in accounts:
        print(f"  • {acc['email']} (role: {acc['role']}, password: {acc['password']})")
    
    print("\n💡 Next: Run the E2E tests!")
    print("   pytest tests/test_complete_user_journeys_v2.py -v")
    
    return success_count == len(TEST_ACCOUNTS)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
