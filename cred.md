# ZilaCart Test Credentials

Here are the test credentials for the various user roles available in the local database.

## 👑 Admin
Use the admin account to access the `/admin` portal (Dashboard, Inventory, User Management).
- **Email**: `admin@zilacart.io`
- **Password**: `password`

## 🏪 Vendors
There are 25 test vendors available. Use these accounts to access the `/vendor` portal (Dashboard, Manage Products, Orders).
- **Emails**: `vendor1@example.com` through `vendor25@example.com`
- **Password**: `password123`

## 🛒 Customers
There are 200 synthetic customers generated from the real catalog dataset. Use these accounts to simulate shopping, leaving reviews, and placing orders.
- **Emails**: `customer1@example.com` through `customer200@example.com`
- **Password**: `password123`

---

*Note: All of these accounts have been seeded into both Firebase Auth and Firestore with the appropriate custom claims (e.g., `role: 'vendor'` / `role: 'admin'`).*

