#!/usr/bin/env python3
"""
Test the auth API directly to see what's happening
"""
import requests
import json

BASE_URL = "http://localhost:3000"

print("🔍 Testing Frontend Auth Flow Directly\n")

# First check if the page loads
print("1️⃣ Checking if login page loads...")
try:
    resp = requests.get(f"{BASE_URL}/auth/login")
    if resp.status_code == 200:
        print(f"   ✅ Login page loads (status: {resp.status_code})")
    else:
        print(f"   ⚠️  Status: {resp.status_code}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Check if there's an auth API endpoint
print("\n2️⃣ Checking for auth API endpoints...")
endpoints = [
    ("/api/auth/login", "POST"),
    ("/api/users/me", "GET"),
    ("/api/auth/logout", "POST"),
]

for endpoint, method in endpoints:
    try:
        if method == "GET":
            resp = requests.get(f"{BASE_URL}{endpoint}")
        else:
            resp = requests.post(f"{BASE_URL}{endpoint}")
        print(f"   {method} {endpoint}: {resp.status_code}")
    except:
        print(f"   {method} {endpoint}: NOT FOUND")

print("\n3️⃣ Testing HTML for form structure...")
try:
    resp = requests.get(f"{BASE_URL}/auth/login")
    html = resp.text
    
    checks = [
        ('id="email"' in html, "Email input with id='email'"),
        ('id="password"' in html, "Password input with id='password'"),
        ('<form' in html, "Form element"),
        ('type="submit"' in html or 'button' in html, "Submit button"),
    ]
    
    for check, label in checks:
        status = "✅" if check else "❌"
        print(f"   {status} {label}")
        
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n✅ Frontend tests complete")
