# GA4 Custom Dimensions & Metrics Setup Guide

To view multi-vendor attributes, payment methods, and synthetic traffic flags in Google Analytics 4 Explorations and Looker Studio dashboards, register the following parameters as **Custom Definitions** in the GA4 Console.

---

## 1. Where to Register in GA4
1. Open [Google Analytics](https://analytics.google.com/) and select property **`mart-ke` (`558077199`)**.
2. Navigate to: **Admin (⚙️ bottom left)** → **Data display** → **Custom definitions**.
3. Under the **Custom dimensions** tab, click **Create custom dimension**.

---

## 2. Dimensions to Create

| Dimension Name | Scope | Description | Event/Item Parameter |
| :--- | :--- | :--- | :--- |
| **Payment Method** | `Event` | Payment provider used at checkout | `payment_method` |
| **Shipping County** | `Event` | Delivery destination county (e.g. Nairobi, Mombasa) | `shipping_county` |
| **Traffic Type** | `Event` | Distinguishes synthetic simulation traffic from real users | `traffic_type` |
| **Is Synthetic** | `Event` | Flag for test data (`1` for simulated, empty for live) | `is_synthetic` |
| **Vendor ID** | `Item` | Multi-vendor seller ID for item attribution | `vendor_id` |

---

## 3. Filtering Synthetic Traffic in Reports
Once `traffic_type` and `is_synthetic` are registered:
* In **GA4 Explore** or **Looker Studio**, add a dimension filter:
  ```
  Exclude: Traffic Type = 'simulated'
  ```
  This ensures that daily automated CI/CD simulations and load tests do not skew your real customer conversion rate, average order value (AOV), or marketing acquisition metrics.

