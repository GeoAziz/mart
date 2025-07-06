# ZilaCart - Login Credentials

This file contains all the login credentials for testing different user roles in the ZilaCart application.

## 🔐 Authentication Credentials

### 👑 Admin Access
```
Email: admin@zilacart.com
Password: password123
Role: Admin
Redirect: /admin
Access: Full system administration
```

### 🏪 Vendor Access
```
Email: vendor1@zilacart.com
Password: password123
Role: Vendor
Redirect: /vendor
Store: TechHub Electronics

Email: vendor2@zilacart.com
Password: password123
Role: Vendor
Redirect: /vendor
Store: Fashion Forward

Email: vendor3@zilacart.com
Password: password123
Role: Vendor
Redirect: /vendor
Store: Home & Garden Plus

Email: vendor4@zilacart.com
Password: password123
Role: Vendor
Redirect: /vendor
Store: Sports & Outdoors
```

### 👤 Customer Access
```
Email: customer1@zilacart.com
Password: password123
Role: Customer
Redirect: /account

Email: customer2@zilacart.com
Password: password123
Role: Customer
Redirect: /account

...continuing through...

Email: customer15@zilacart.com
Password: password123
Role: Customer
Redirect: /account
```

## 🚀 Quick Login Guide

### For Development Testing:
1. **Admin Testing**: Use `admin@zilacart.com` to test admin features
2. **Vendor Testing**: Use `vendor1@zilacart.com` to test vendor dashboard
3. **Customer Testing**: Use `customer1@zilacart.com` to test customer experience

### Login Process:
1. Navigate to `/auth/login`
2. Enter email and password from above
3. System automatically redirects based on user role:
   - **Admin** → `/admin` dashboard
   - **Vendor** → `/vendor` dashboard  
   - **Customer** → `/account` dashboard

## 🎯 Role-Based Features

### Admin Can Access:
- ✅ Admin dashboard (`/admin`)
- ✅ Vendor dashboard (`/vendor`) 
- ✅ Customer dashboard (`/account`)
- ✅ All system management features

### Vendor Can Access:
- ✅ Vendor dashboard (`/vendor`)
- ✅ Product management
- ✅ Order management
- ✅ Store analytics
- ✅ Customer messaging

### Customer Can Access:
- ✅ Customer dashboard (`/account`)
- ✅ Shopping cart & checkout
- ✅ Order tracking
- ✅ Wishlist management
- ✅ Address book

## 🔄 Auto-Redirect System

The application automatically redirects users after login based on their role:
- Uses `AuthContext` for role detection
- Prevents unauthorized access to restricted areas
- Maintains proper user experience flow

## 📝 Notes for Development

- All passwords are set to `password123` for easy testing
- Vendor accounts have associated stores with products
- Customer accounts have sample orders and wishlists
- Admin account has full system privileges

## 🛡️ Security Notice

**⚠️ IMPORTANT:** These are development/testing credentials only. 
- Never use these in production
- Change all passwords before deploying
- Implement proper password policies for production use

---

**Ready to test your vendor dashboard with `vendor1@zilacart.com`!** 🚀