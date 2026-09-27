# 🚀 Pubudu Inventory & Website E-Commerce Backend API

This backend connects your **Inventory Manager** directly with your **Main Website (`ichouse.lk`)**.

---

## 🌟 Key Features & Automations

1. **⚡ Real-Time Stock Availability (`GET /api/products`)**:
   - Website visitors instantly see accurate live stock quantities (e.g., *"In Stock - 4 left"* or *"Sold Out"*).
2. **🛒 Automatic Stock Deduction on Checkout (`POST /api/orders/checkout`)**:
   - When a customer purchases on your website, it validates inventory and automatically deducts the quantity from Firebase Firestore.
3. **📊 Unified Sales & Profit Logging**:
   - Every online order is instantly logged under the product's sales history with channel `"Online - Website (ichouse.lk)"`, customer details, and payment tracking.
4. **🔄 Multi-Item Cart Support**:
   - Processes single items or multi-product shopping carts in a single atomic transaction.
5. **📈 Live Financial & Profit Analytics (`GET /api/analytics/summary`)**:
   - Provides live total sales revenue, Cost of Goods Sold (COGS), additional costs, net profits, and low-stock alerts.
6. **🔗 Universal E-Commerce Webhook (`POST /api/orders/webhook`)**:
   - Connects with WooCommerce, Shopify, or custom e-commerce cart webhooks.

---

## 🛠️ Quick Setup Guide

### Step 1: Download your Firebase Service Account Key (One-Time)
1. Open [Firebase Console](https://console.firebase.google.com/) and choose project **pubudu-inventry**.
2. Click the ⚙️ **Gear icon** (Project Settings) -> **Service accounts** tab.
3. Click **Generate new private key** and download the `.json` file.
4. Rename this file to `serviceAccountKey.json` and place it inside the `backend/` folder.

### Step 2: Install Dependencies & Run
In your terminal, navigate to the `backend` folder:
```bash
cd backend
npm install
npm start
```
Your backend will start running on **`http://localhost:5000`**.

---

## 🌐 Free 24/7 Cloud Deployment (Render.com / Railway)

To keep this backend running 24/7 online for your website:
1. Push your code to GitHub.
2. Go to [Render.com](https://render.com) (Free tier) -> Click **New +** -> **Web Service**.
3. Connect your GitHub repository and set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Under **Environment Variables**, add:
   - `PORT`: `5000`
   - `FIREBASE_PROJECT_ID`: `pubudu-inventry`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: *(Paste the full contents of your `serviceAccountKey.json`)*
5. Click **Deploy Web Service**. You will receive a live URL (e.g. `https://pubudu-inventory-api.onrender.com`).

---

## 💻 How to Use on your Website (`ichouse.lk`)

### 1. Include the Client SDK in your HTML:
Add this script to your website pages:
```html
<script>
  window.PUBUDU_API_URL = "https://your-api-url.onrender.com"; // Or http://localhost:5000
</script>
<script src="client-sdk.js"></script>
```

### 2. Show Live Stock on Product Pages:
```html
<div id="product-stock-badge"></div>

<script>
  // Replace 'FIRESTORE_ITEM_ID' with the product ID from your Inventory Manager
  PubuduStore.renderStockBadge('#product-stock-badge', 'FIRESTORE_ITEM_ID');
</script>
```

### 3. Process Automatic Checkout when Customer Clicks Buy:
```javascript
async function handleCustomerCheckout() {
  const orderResult = await PubuduStore.placeOrder({
    customerName: "Kasun Perera",
    customerPhone: "0771234567",
    customerAddress: "No. 45, Kandy Road, Weliweriya",
    paymentMethod: "Cash on Delivery (COD)", // or Bank Transfer, Card
    deliveryMethod: "Courier Service",
    items: [
      {
        itemId: "FIRESTORE_ITEM_ID", // Firestore document ID
        qty: 2,
        unitPrice: 1200
      }
    ]
  });

  if (orderResult.success) {
    alert("Order successful! Order ID: " + orderResult.order.orderId);
  } else {
    alert("Failed: " + orderResult.error);
  }
}
```

---

## 📡 API Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | Get list of all products with live stock status |
| `GET` | `/api/products/:id` | Get specific product detail and live stock count |
| `POST` | `/api/orders/checkout` | Process checkout and auto-deduct inventory |
| `POST` | `/api/orders/webhook` | Webhook listener for WooCommerce/Shopify orders |
| `GET` | `/api/analytics/summary` | Live financial metrics, COGS, net profit, low-stock alerts |
| `POST` | `/api/products` | Add new stock item to inventory |
