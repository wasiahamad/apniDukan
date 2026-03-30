# 🔄 Technical Workflows & Data Flow

> **Detailed technical workflows, data models, and integration patterns for Apnidukan Platform**

---

## 📐 System Architecture

### **High-Level Architecture:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │
│  │ Local Connect  │  │  Local Boost   │  │ ShopSpark Admin│      │
│  │  Hub (React)   │  │  (React)       │  │   (React)      │      │
│  └────────────────┘  └────────────────┘  └────────────────┘      │
│          ↓                   ↓                     ↓               │
└──────────┼───────────────────┼─────────────────────┼───────────────┘
           │                   │                     │
           └───────────────────┴─────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY                                │
│                    (Load Balancer + NGINX)                          │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Auth       │  │   Shop       │  │   Order      │            │
│  │   Service    │  │   Service    │  │   Service    │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Analytics   │  │  Payment     │  │  WhatsApp    │            │
│  │   Service    │  │   Service    │  │   Service    │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  PostgreSQL  │  │    Redis     │  │     S3       │            │
│  │  (Primary)   │  │   (Cache)    │  │  (Storage)   │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Twilio/    │  │   Razorpay/  │  │   Google     │            │
│  │   MSG91      │  │   Stripe     │  │   Maps       │            │
│  │   (OTP/SMS)  │  │  (Payment)   │  │   (Maps)     │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### **OTP-Based Login (Shop Owner):**

```
┌─────────────────────────────────────────────────────────────────┐
│                    OTP LOGIN WORKFLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. User enters phone number
   ├─> Frontend validates format
   └─> POST /api/auth/send-otp
       {
         "phone": "+919876543210"
       }

2. Backend processes request
   ├─> Check if user exists in database
   ├─> Generate 6-digit OTP
   ├─> Store OTP in Redis (expiry: 5 minutes)
   │   Key: "otp:+919876543210"
   │   Value: "123456"
   ├─> Send OTP via SMS (Twilio/MSG91)
   └─> Response:
       {
         "success": true,
         "message": "OTP sent to +919876543210",
         "expires_in": 300
       }

3. User enters OTP
   └─> POST /api/auth/verify-otp
       {
         "phone": "+919876543210",
         "otp": "123456"
       }

4. Backend verifies OTP
   ├─> Get OTP from Redis
   ├─> Compare with user input
   ├─> If valid:
   │   ├─> Delete OTP from Redis
   │   ├─> Generate JWT access token (expiry: 1 hour)
   │   ├─> Generate refresh token (expiry: 30 days)
   │   ├─> Store refresh token in database
   │   └─> Return tokens:
   │       {
   │         "access_token": "eyJhbGc...",
   │         "refresh_token": "dGhpc2lz...",
   │         "user": {
   │           "id": "uuid",
   │           "phone": "+919876543210",
   │           "role": "shop_owner"
   │         }
   │       }
   └─> If invalid:
       └─> Return error (401 Unauthorized)

5. Frontend stores tokens
   ├─> Save access_token in memory/context
   ├─> Save refresh_token in httpOnly cookie
   └─> Redirect to dashboard

6. Subsequent API calls
   ├─> Include access_token in header:
   │   Authorization: Bearer eyJhbGc...
   ├─> Backend middleware validates token
   ├─> Extract user info from token
   └─> Process request

7. Token refresh (when access_token expires)
   ├─> POST /api/auth/refresh
   ├─> Include refresh_token
   ├─> Backend validates refresh_token
   ├─> Generate new access_token
   └─> Return new tokens
```

### **Admin Login (Email/Password):**

```
1. Admin enters credentials
   └─> POST /api/auth/admin-login
       {
         "email": "admin@localbooster.in",
         "password": "admin123"
       }

2. Backend validates
   ├─> Hash password
   ├─> Compare with stored hash
   ├─> Generate JWT tokens
   └─> Return tokens + user info

3. Store tokens
   └─> Redirect to admin dashboard
```

---

## 🏪 Shop Creation & Onboarding Flow

### **Complete Shop Onboarding Process:**

```
┌─────────────────────────────────────────────────────────────────┐
│              SHOP ONBOARDING DETAILED FLOW                      │
└─────────────────────────────────────────────────────────────────┘

STEP 1: USER REGISTRATION
──────────────────────────
Frontend (Local Boost):
├─> User clicks "Start Free Trial"
├─> Enters phone number
└─> OTP verification (see auth flow above)

Database State:
users table:
{
  id: "user-uuid-123",
  phone: "+919876543210",
  role: "shop_owner",
  status: "active",
  created_at: "2026-02-26T10:00:00Z"
}

STEP 2: BUSINESS INFORMATION
──────────────────────────────
Frontend Form:
├─> Shop Name: "Ram Kirana Store"
├─> Category: "Grocery & General Store" (dropdown)
├─> Description: "Your trusted neighborhood..."
├─> WhatsApp Number: "+919876543210"
├─> Phone: "+919876543210"
└─> Email: "ram@kiranstore.com"

POST /api/shops
{
  "user_id": "user-uuid-123",
  "shop_name": "Ram Kirana Store",
  "category_id": "cat-uuid-grocery",
  "description": "Your trusted neighborhood...",
  "whatsapp": "+919876543210",
  "phone": "+919876543210",
  "email": "ram@kiranstore.com"
}

Backend Processing:
├─> Validate data (Zod schema)
├─> Generate unique slug: "ram-kirana-store"
├─> Check slug uniqueness
├─> If duplicate, append number: "ram-kirana-store-2"
├─> Create shop record
└─> Return shop_id

Database State:
shops table:
{
  id: "shop-uuid-456",
  user_id: "user-uuid-123",
  shop_name: "Ram Kirana Store",
  slug: "ram-kirana-store",
  category_id: "cat-uuid-grocery",
  status: "inactive", // Pending admin approval
  created_at: "2026-02-26T10:05:00Z"
}

STEP 3: LOCATION SETUP
──────────────────────
Frontend:
├─> Address: "Shop No. 12, Main Market Road"
├─> City: "Jaipur" (dropdown)
├─> Area: "Malviya Nagar"
├─> Pincode: "302017"
└─> Map picker (optional)

PUT /api/shops/:shop_id/location
{
  "address": "Shop No. 12, Main Market Road",
  "city_id": "city-uuid-jaipur",
  "area": "Malviya Nagar",
  "pincode": "302017",
  "latitude": 26.8509,
  "longitude": 75.8069
}

Backend:
├─> Geocode address (Google Maps API)
├─> Update shop record
└─> Return success

STEP 4: BUSINESS HOURS
──────────────────────
Frontend:
├─> Opening Time: "08:00"
├─> Closing Time: "21:00"
└─> Weekly Off: ["Sunday"]

PUT /api/shops/:shop_id/timings
{
  "opening_time": "08:00:00",
  "closing_time": "21:00:00",
  "weekly_off": ["Sunday"]
}

STEP 5: BRANDING (Optional)
────────────────────────────
Frontend:
├─> Logo upload
├─> Cover image upload
└─> Theme color picker

Process:
1. User selects image
2. Frontend validates (size, format)
3. Upload to S3/Cloudinary
   POST /api/upload
   Content-Type: multipart/form-data
   
4. Backend:
   ├─> Validate file
   ├─> Generate unique filename
   ├─> Upload to S3
   ├─> Return URL
   
5. Update shop:
   PUT /api/shops/:shop_id/branding
   {
     "logo_url": "https://s3.../logo.jpg",
     "cover_image_url": "https://s3.../cover.jpg",
     "theme_color": "#1DBF73"
   }

STEP 6: ADD PRODUCTS
────────────────────
Frontend:
├─> Product form with multiple entries
└─> Bulk upload option

POST /api/shops/:shop_id/products
[
  {
    "product_name": "Tata Salt",
    "price": 28,
    "original_price": 32,
    "category": "Grocery",
    "unit": "1 kg",
    "availability_status": true
  },
  ...
]

Backend:
├─> Validate each product
├─> Insert products in batch
└─> Return created products

STEP 7: SUBSCRIPTION SELECTION
───────────────────────────────
Frontend:
├─> Display available plans
├─> User selects plan (e.g., "Pro")
└─> Payment processing

Flow:
1. Select Plan
   POST /api/subscriptions/select
   {
     "shop_id": "shop-uuid-456",
     "plan_id": "plan-uuid-pro",
     "billing_cycle": "monthly"
   }

2. Backend creates payment order
   └─> Razorpay/Stripe integration
       {
         "order_id": "order_xyz123",
         "amount": 49900, // ₹499 in paise
         "currency": "INR"
       }

3. Frontend opens payment gateway
   └─> User completes payment

4. Payment callback
   POST /api/subscriptions/verify-payment
   {
     "order_id": "order_xyz123",
     "payment_id": "pay_abc456",
     "signature": "sha256_hash"
   }

5. Backend verifies payment
   ├─> Validate signature
   ├─> Activate subscription
   ├─> Generate invoice
   └─> Send confirmation email

Database State:
shops table:
{
  ...
  subscription_plan_id: "plan-uuid-pro",
  subscription_expiry: "2026-03-26",
  status: "active" // Now active
}

invoices table:
{
  id: "inv-uuid-789",
  invoice_number: "INV-2026-001",
  shop_id: "shop-uuid-456",
  amount: 499,
  payment_status: "paid",
  invoice_date: "2026-02-26"
}

STEP 8: SUBDOMAIN ASSIGNMENT
─────────────────────────────
Backend (Admin Panel):
├─> Admin reviews new shop
├─> Assigns subdomain: "ram-kirana-store.localbooster.in"
├─> Configures DNS
├─> Issues SSL certificate (Let's Encrypt)
└─> Marks as verified

STEP 9: GO LIVE
───────────────
├─> Shop appears on Local Connect Hub
├─> Customers can discover
├─> Orders start coming
└─> Analytics tracking begins
```

---

## 🛒 Order Management Flow

### **End-to-End Order Process:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORDER LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: CUSTOMER DISCOVERY
────────────────────────────
Customer on Local Connect Hub:
1. Searches for "grocery in Jaipur"
2. Filters by area: "Malviya Nagar"
3. Finds "Ram Kirana Store"
4. Clicks to view shop page

GET /api/public/shops/ram-kirana-store
Response:
{
  "shop": {
    "id": "shop-uuid-456",
    "name": "Ram Kirana Store",
    "products": [...],
    "whatsapp": "+919876543210",
    ...
  }
}

PHASE 2: PRODUCT SELECTION
───────────────────────────
Customer:
1. Views products
2. Clicks "Order on WhatsApp" for:
   - Tata Salt (₹28)
   - Aashirvaad Atta (₹320)
   - Fortune Oil (₹185)

Frontend:
├─> Constructs WhatsApp message:
│   "Hello! I want to order:
│   1. Tata Salt - ₹28
│   2. Aashirvaad Atta - ₹320
│   3. Fortune Oil - ₹185
│   Total: ₹533
│   
│   Name: Priya Sharma
│   Address: ..."
│
└─> Opens WhatsApp:
    window.open('https://wa.me/919876543210?text=' + encodedMessage)

Analytics Event Tracking:
POST /api/analytics/track
{
  "shop_id": "shop-uuid-456",
  "event_type": "whatsapp_click",
  "device_type": "mobile",
  "timestamp": "2026-02-26T11:00:00Z"
}

PHASE 3: SHOP OWNER RECEIVES ORDER
───────────────────────────────────
WhatsApp Message arrives:
├─> Shop owner sees order details
├─> Confirms with customer
└─> Agrees on delivery time

Shop Owner (Local Boost Dashboard):
1. Logs into dashboard
2. Clicks "Add Order" (manual entry)
   OR
3. Future: Automated webhook from WhatsApp Business API

POST /api/orders
{
  "shop_id": "shop-uuid-456",
  "customer_name": "Priya Sharma",
  "customer_phone": "+919999000001",
  "items": [
    {
      "product_id": "prod-uuid-1",
      "product_name": "Tata Salt",
      "quantity": 1,
      "price": 28
    },
    {
      "product_id": "prod-uuid-2",
      "product_name": "Aashirvaad Atta",
      "quantity": 1,
      "price": 320
    },
    {
      "product_id": "prod-uuid-3",
      "product_name": "Fortune Oil",
      "quantity": 1,
      "price": 185
    }
  ],
  "subtotal": 533,
  "delivery_charges": 0,
  "total": 533,
  "source": "whatsapp",
  "status": "pending"
}

Backend:
├─> Validate order data
├─> Generate order number: "ORD-00001"
├─> Insert into orders table
├─> Send confirmation notification
└─> Return order details

Database State:
orders table:
{
  id: "order-uuid-101",
  order_number: "ORD-00001",
  shop_id: "shop-uuid-456",
  customer_name: "Priya Sharma",
  customer_phone: "+919999000001",
  items: [{...}, {...}, {...}],
  total: 533,
  status: "pending",
  source: "whatsapp",
  created_at: "2026-02-26T11:05:00Z"
}

PHASE 4: ORDER CONFIRMATION
────────────────────────────
Shop Owner Dashboard:
1. Views order in "Pending" tab
2. Clicks "Confirm Order"

PATCH /api/orders/order-uuid-101/status
{
  "status": "confirmed",
  "estimated_delivery": "2026-02-26T14:00:00Z"
}

Backend:
├─> Update order status
├─> Send SMS to customer:
│   "Your order ORD-00001 is confirmed!
│   Estimated delivery: 2:00 PM"
└─> Notification to admin panel

Optional: Assign Delivery Partner
POST /api/orders/order-uuid-101/assign-delivery
{
  "delivery_partner_id": "del-uuid-001"
}

PHASE 5: PREPARATION & DELIVERY
────────────────────────────────
Shop Owner:
├─> Prepares order
├─> Packs items
└─> Hands to delivery partner OR delivers self

Updates status:
PATCH /api/orders/order-uuid-101/status
{
  "status": "out_for_delivery"
}

Delivery Partner (if assigned):
├─> Picks up order
├─> Navigates to customer
└─> Delivers order

PHASE 6: ORDER COMPLETION
──────────────────────────
After delivery:
PATCH /api/orders/order-uuid-101/status
{
  "status": "delivered",
  "delivered_at": "2026-02-26T14:15:00Z"
}

Backend:
├─> Update order
├─> Send completion SMS
├─> Request review (optional)
│   "Thank you for ordering! Rate your experience: [link]"
└─> Update shop analytics

Optional: Customer Review
POST /api/reviews
{
  "shop_id": "shop-uuid-456",
  "order_id": "order-uuid-101",
  "rating": 5,
  "comment": "Great service, quick delivery!"
}

ALTERNATIVE: ORDER CANCELLATION
────────────────────────────────
If customer/shop cancels:
PATCH /api/orders/order-uuid-101/status
{
  "status": "cancelled",
  "cancel_reason": "Customer unavailable"
}

Backend:
├─> Update order
├─> Send notification
├─> Update inventory (if applicable)
└─> Refund (if paid online)
```

---

## 📊 Analytics Tracking System

### **Event Tracking Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                  ANALYTICS EVENT FLOW                           │
└─────────────────────────────────────────────────────────────────┘

FRONTEND TRACKING:
──────────────────
Every user action triggers an event:

1. Page View Event
   ├─> User visits shop page: /shop/ram-kirana-store
   └─> Frontend sends:
       POST /api/analytics/track
       {
         "shop_id": "shop-uuid-456",
         "event_type": "page_view",
         "device_type": "mobile", // from user agent
         "ip_address": "103.x.x.x",
         "referrer": "https://google.com",
         "timestamp": "2026-02-26T12:00:00Z"
       }

2. WhatsApp Click Event
   └─> POST /api/analytics/track
       {
         "event_type": "whatsapp_click",
         ...
       }

3. Product View Event
   └─> POST /api/analytics/track
       {
         "event_type": "product_view",
         "product_id": "prod-uuid-1",
         ...
       }

BACKEND PROCESSING:
───────────────────
1. Receive event
2. Validate data
3. Enrich with metadata:
   ├─> Parse user agent → device type, browser
   ├─> GeoIP lookup → city, country
   └─> Session tracking

4. Insert into analytics_events table:
   {
     id: "event-uuid-xyz",
     shop_id: "shop-uuid-456",
     event_type: "page_view",
     device_type: "mobile",
     browser: "Chrome Mobile",
     os: "Android",
     city: "Jaipur",
     country: "India",
     ip_address: "103.x.x.x",
     created_at: "2026-02-26T12:00:00Z"
   }

5. Update aggregated counts (Redis cache):
   Key: "shop:shop-uuid-456:views:2026-02-26"
   INCR → 124

6. Update shop table (periodic batch update):
   UPDATE shops
   SET total_views = total_views + 1
   WHERE id = 'shop-uuid-456'

ANALYTICS QUERIES:
──────────────────
Shop Owner views dashboard:
GET /api/analytics/dashboard/shop-uuid-456?period=7days

Backend queries:
1. Total views (last 7 days):
   SELECT DATE(created_at) as date, COUNT(*) as views
   FROM analytics_events
   WHERE shop_id = 'shop-uuid-456'
     AND event_type = 'page_view'
     AND created_at >= NOW() - INTERVAL '7 days'
   GROUP BY DATE(created_at)
   ORDER BY date

2. Engagement metrics:
   SELECT 
     event_type,
     COUNT(*) as count
   FROM analytics_events
   WHERE shop_id = 'shop-uuid-456'
     AND created_at >= NOW() - INTERVAL '7 days'
   GROUP BY event_type

3. Device distribution:
   SELECT 
     device_type,
     COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
   FROM analytics_events
   WHERE shop_id = 'shop-uuid-456'
   GROUP BY device_type

4. Hourly activity:
   SELECT 
     EXTRACT(HOUR FROM created_at) as hour,
     COUNT(*) as views
   FROM analytics_events
   WHERE shop_id = 'shop-uuid-456'
     AND created_at >= NOW() - INTERVAL '24 hours'
   GROUP BY hour
   ORDER BY hour

Response:
{
  "period": "7days",
  "total_views": 847,
  "whatsapp_clicks": 132,
  "call_clicks": 45,
  "map_clicks": 67,
  "daily_breakdown": [
    {"date": "2026-02-20", "views": 98, "whatsapp": 15},
    {"date": "2026-02-21", "views": 112, "whatsapp": 18},
    ...
  ],
  "device_distribution": {
    "mobile": 78,
    "desktop": 22
  },
  "hourly_activity": [
    {"hour": 10, "views": 45},
    {"hour": 11, "views": 67},
    ...
  ]
}
```

---

## 💳 Payment & Subscription Flow

### **Subscription Payment Process:**

```
┌─────────────────────────────────────────────────────────────────┐
│              PAYMENT INTEGRATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

STEP 1: PLAN SELECTION
───────────────────────
Shop Owner (Local Boost):
├─> Navigates to /dashboard/subscription
├─> Views available plans
└─> Clicks "Upgrade to Pro"

Frontend:
POST /api/subscriptions/create-order
{
  "shop_id": "shop-uuid-456",
  "plan_id": "plan-uuid-pro",
  "billing_cycle": "monthly"
}

Backend:
1. Validate shop & plan
2. Calculate amount: ₹499
3. Create Razorpay order:
   
   const razorpay = new Razorpay({
     key_id: process.env.RAZORPAY_KEY_ID,
     key_secret: process.env.RAZORPAY_KEY_SECRET
   });
   
   const order = await razorpay.orders.create({
     amount: 49900, // paise
     currency: 'INR',
     receipt: 'order_rcpt_11',
     notes: {
       shop_id: 'shop-uuid-456',
       plan_id: 'plan-uuid-pro'
     }
   });

4. Store pending order in database:
   payment_orders table:
   {
     id: "payment-order-uuid",
     order_id: "order_xyz123", // Razorpay order ID
     shop_id: "shop-uuid-456",
     plan_id: "plan-uuid-pro",
     amount: 499,
     currency: "INR",
     status: "created",
     created_at: "2026-02-26T13:00:00Z"
   }

5. Return order details:
   {
     "order_id": "order_xyz123",
     "amount": 49900,
     "currency": "INR",
     "key": "rzp_live_xxxxxxxx"
   }

STEP 2: PAYMENT GATEWAY
────────────────────────
Frontend initializes Razorpay:

const options = {
  key: response.key,
  amount: response.amount,
  currency: response.currency,
  order_id: response.order_id,
  name: "Local Booster",
  description: "Pro Plan Subscription",
  image: "/logo.png",
  handler: function (response) {
    // Payment successful
    verifyPayment(response);
  },
  prefill: {
    name: "Ram Kumar",
    email: "ram@kiranstore.com",
    contact: "+919876543210"
  },
  theme: {
    color: "#1DBF73"
  }
};

const razorpay = new Razorpay(options);
razorpay.open();

Customer:
├─> Payment modal opens
├─> Enters card/UPI details
├─> Completes payment
└─> Gateway returns payment ID

STEP 3: PAYMENT VERIFICATION
─────────────────────────────
Frontend callback receives:
{
  razorpay_order_id: "order_xyz123",
  razorpay_payment_id: "pay_abc456",
  razorpay_signature: "sha256_hash_xyz"
}

POST /api/subscriptions/verify-payment
{
  "order_id": "order_xyz123",
  "payment_id": "pay_abc456",
  "signature": "sha256_hash_xyz"
}

Backend Verification:
1. Retrieve order from database
2. Verify signature:
   
   const crypto = require('crypto');
   const generated_signature = crypto
     .createHmac('sha256', razorpay_secret)
     .update(order_id + "|" + payment_id)
     .digest('hex');
   
   if (generated_signature === received_signature) {
     // Payment is authentic
   }

3. If verified:
   a) Update payment_orders table:
      {
        ...
        payment_id: "pay_abc456",
        status: "paid",
        paid_at: "2026-02-26T13:05:00Z"
      }
   
   b) Activate subscription:
      UPDATE shops
      SET subscription_plan_id = 'plan-uuid-pro',
          subscription_expiry = '2026-03-26',
          status = 'active'
      WHERE id = 'shop-uuid-456'
   
   c) Generate invoice:
      INSERT INTO invoices (
        invoice_number,
        shop_id,
        amount,
        payment_mode,
        payment_status,
        invoice_date
      ) VALUES (
        'INV-2026-0123',
        'shop-uuid-456',
        499,
        'Razorpay',
        'paid',
        '2026-02-26'
      )
   
   d) Send confirmation email:
      Subject: "Subscription Activated - Pro Plan"
      Body: "Your shop has been upgraded to Pro!
             Invoice: INV-2026-0123
             Valid till: 26 March 2026"
   
   e) Send webhook to admin panel
   
   f) Return success:
      {
        "success": true,
        "message": "Subscription activated",
        "invoice_id": "INV-2026-0123"
      }

STEP 4: POST-PAYMENT
────────────────────
Frontend:
├─> Shows success message
├─> Unlocks Pro features
└─> Redirects to dashboard

Shop Owner Dashboard now shows:
├─> Pro Plan badge
├─> Access to advanced features
├─> Subscription expiry date
└─> Download invoice button

AUTOMATIC RENEWAL (Future):
────────────────────────────
Scheduled Job (runs daily):
1. Query expiring subscriptions:
   SELECT * FROM shops
   WHERE subscription_expiry = CURRENT_DATE + INTERVAL '3 days'

2. Send reminder emails

3. On expiry date:
   ├─> Attempt auto-renewal (if enabled)
   ├─> Create Razorpay subscription
   ├─> Charge saved payment method
   └─> If failed:
       ├─> Send payment failed email
       ├─> Downgrade to free plan
       └─> Disable premium features
```

---

## 🔔 Notification System

### **Multi-Channel Notification Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│                  NOTIFICATION ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────┘

NOTIFICATION TYPES:
───────────────────
1. Transactional:
   - OTP verification
   - Order confirmation
   - Payment receipts
   - Subscription expiry

2. Promotional:
   - Feature announcements
   - Plan upgrades
   - Marketing campaigns

3. System:
   - Service updates
   - Maintenance windows
   - Security alerts

CHANNELS:
─────────
├─> SMS (Twilio/MSG91)
├─> Email (SendGrid/SES)
├─> WhatsApp (Business API)
├─> In-app notifications
└─> Push notifications (mobile app)

NOTIFICATION FLOW:
──────────────────
Trigger Event:
├─> Order confirmed
└─> Call notification service

Notification Service:
POST /api/notifications/send
{
  "type": "order_confirmed",
  "recipient": {
    "phone": "+919999000001",
    "email": "customer@example.com"
  },
  "data": {
    "order_id": "ORD-00001",
    "shop_name": "Ram Kirana Store",
    "total": 533
  },
  "channels": ["sms", "whatsapp"]
}

Backend Processing:
1. Validate notification request
2. Check user preferences:
   SELECT sms_enabled, email_enabled, whatsapp_enabled
   FROM user_notification_preferences
   WHERE user_id = 'xxx'

3. For each enabled channel:
   
   SMS Channel:
   ├─> Load template: "order_confirmed_sms"
   ├─> Populate variables:
   │   "Your order {{order_id}} from {{shop_name}} is confirmed!
   │   Total: ₹{{total}}"
   ├─> Send via Twilio:
   │   const message = await twilio.messages.create({
   │     body: populatedTemplate,
   │     from: '+1234567890',
   │     to: '+919999000001'
   │   });
   └─> Log notification:
       notifications_log table:
       {
         id: "notif-uuid-1",
         type: "order_confirmed",
         channel: "sms",
         recipient: "+919999000001",
         status: "sent",
         sent_at: "2026-02-26T14:00:00Z"
       }
   
   WhatsApp Channel:
   ├─> Use WhatsApp Business API
   ├─> Send template message
   └─> Log delivery status

4. Return response:
   {
     "success": true,
     "notifications_sent": [
       {"channel": "sms", "status": "sent"},
       {"channel": "whatsapp", "status": "sent"}
     ]
   }

NOTIFICATION TEMPLATES:
───────────────────────
templates table:
{
  id: "template-uuid",
  name: "order_confirmed",
  channel: "sms",
  language: "en",
  content: "Your order {{order_id}} from {{shop_name}} is confirmed! Total: ₹{{total}}. Expected delivery: {{delivery_time}}.",
  variables: ["order_id", "shop_name", "total", "delivery_time"],
  active: true
}

RETRY MECHANISM:
────────────────
If notification fails:
1. Log failure
2. Queue for retry (Redis queue)
3. Exponential backoff:
   - Retry 1: after 1 minute
   - Retry 2: after 5 minutes
   - Retry 3: after 15 minutes
4. After 3 failed attempts:
   └─> Mark as failed
   └─> Alert admin

UNSUBSCRIBE HANDLING:
─────────────────────
User can opt-out:
POST /api/notifications/preferences
{
  "user_id": "xxx",
  "sms_enabled": false,
  "email_enabled": true,
  "whatsapp_enabled": true
}

Respect preferences in all future notifications.
```

---

## 🔍 Search & Discovery

### **Search Implementation:**

```
┌─────────────────────────────────────────────────────────────────┐
│                   SEARCH ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────┘

USER SEARCH QUERY:
──────────────────
Local Connect Hub → Search bar:
"grocery in jaipur"

Frontend:
GET /api/search?q=grocery+in+jaipur

Backend Search Logic:
1. Parse query:
   ├─> Extract keywords: ["grocery", "jaipur"]
   ├─> Identify category: "grocery"
   └─> Identify location: "jaipur"

2. Build search query:
   SELECT s.*
   FROM shops s
   LEFT JOIN categories c ON s.category_id = c.id
   LEFT JOIN cities ct ON s.city_id = ct.id
   WHERE 
     (
       s.shop_name ILIKE '%grocery%' OR
       c.name ILIKE '%grocery%' OR
       s.description ILIKE '%grocery%'
     )
     AND ct.slug = 'jaipur'
     AND s.status = 'active'
   ORDER BY 
     s.verified DESC,
     s.rating DESC,
     s.total_views DESC
   LIMIT 20

3. Enhanced Search (with PostgreSQL Full-Text Search):
   -- Add tsvector column
   ALTER TABLE shops ADD COLUMN search_vector tsvector;
   
   -- Update search vector
   UPDATE shops
   SET search_vector = 
     setweight(to_tsvector('english', shop_name), 'A') ||
     setweight(to_tsvector('english', description), 'B');
   
   -- Create GIN index
   CREATE INDEX shops_search_idx ON shops USING GIN(search_vector);
   
   -- Search query
   SELECT s.*,
     ts_rank(s.search_vector, query) AS rank
   FROM shops s,
     to_tsquery('english', 'grocery') query
   WHERE s.search_vector @@ query
     AND s.city_id = 'city-uuid-jaipur'
   ORDER BY rank DESC, s.rating DESC
   LIMIT 20

4. Filter results:
   ├─> Apply filters (area, rating, open now)
   ├─> Calculate distance (if user location available)
   └─> Sort by relevance

AUTOCOMPLETE:
─────────────
As user types in search box:

GET /api/search/autocomplete?q=groc

Response:
{
  "suggestions": [
    {
      "type": "category",
      "text": "Grocery",
      "slug": "grocery"
    },
    {
      "type": "shop",
      "text": "FreshMart Grocery, Saket, Delhi",
      "slug": "freshmart-grocery-delhi"
    }
  ]
}

Implementation:
├─> Use Redis for caching popular searches
├─> Prefix search on shop names & categories
└─> Return top 5 suggestions

LOCATION-BASED SEARCH:
───────────────────────
If user shares location:

GET /api/search/nearby?lat=26.8509&lng=75.8069&radius=5

Backend:
1. Use PostGIS extension for geospatial queries:
   
   SELECT s.*,
     ST_Distance(
       ST_MakePoint(s.longitude, s.latitude)::geography,
       ST_MakePoint(75.8069, 26.8509)::geography
     ) / 1000 AS distance_km
   FROM shops s
   WHERE ST_DWithin(
     ST_MakePoint(s.longitude, s.latitude)::geography,
     ST_MakePoint(75.8069, 26.8509)::geography,
     5000 -- 5 km in meters
   )
   ORDER BY distance_km
   LIMIT 20

2. Return shops with distance:
   {
     "shops": [
       {
         "id": "...",
         "name": "Ram Kirana Store",
         "distance": "1.2 km",
         ...
       }
     ]
   }

SEARCH ANALYTICS:
─────────────────
Track search queries:
search_queries table:
{
  id: "search-uuid",
  query: "grocery in jaipur",
  user_location: "Jaipur",
  results_count: 8,
  clicked_shop_id: "shop-uuid-456",
  created_at: "2026-02-26T15:00:00Z"
}

Analyze popular searches for:
├─> SEO optimization
├─> Category suggestions
└─> Business insights
```

---

## 📱 WhatsApp Integration

### **WhatsApp Business API Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│              WHATSAPP BUSINESS INTEGRATION                      │
└─────────────────────────────────────────────────────────────────┘

SETUP (Shop Owner):
───────────────────
1. Shop owner connects WhatsApp Business number
2. Verifies number via OTP
3. Backend registers webhook with WhatsApp API

INCOMING MESSAGE (Customer to Shop):
────────────────────────────────────
Customer sends message on WhatsApp:
"I want to order Tata Salt and Atta"

WhatsApp → Webhook:
POST https://api.apnidukan.com/webhooks/whatsapp
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "919876543210",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "messages": [{
          "from": "919999000001",
          "id": "wamid.xxx",
          "timestamp": "1709030400",
          "text": {
            "body": "I want to order Tata Salt and Atta"
          },
          "type": "text"
        }]
      }
    }]
  }]
}

Backend Processing:
1. Verify webhook signature
2. Extract message details:
   ├─> From: +919999000001 (customer)
   ├─> To: +919876543210 (shop)
   └─> Message: "I want to order..."

3. Identify shop:
   SELECT id, shop_name
   FROM shops
   WHERE whatsapp = '+919876543210'

4. Parse message (NLP - future enhancement):
   ├─> Detect products mentioned
   ├─> Extract quantities
   └─> Calculate total

5. Create draft order:
   INSERT INTO orders (
     shop_id,
     customer_phone,
     message,
     status,
     source
   ) VALUES (
     'shop-uuid-456',
     '+919999000001',
     'I want to order Tata Salt and Atta',
     'pending',
     'whatsapp'
   )

6. Notify shop owner (in-app notification):
   POST /api/notifications/send
   {
     "type": "new_order_inquiry",
     "recipient": "shop-owner-user-id",
     "channel": "in_app"
   }

7. Auto-reply to customer (optional):
   POST https://graph.facebook.com/v17.0/PHONE_NUMBER_ID/messages
   {
     "messaging_product": "whatsapp",
     "to": "919999000001",
     "type": "text",
     "text": {
       "body": "Thank you for your message! Ram Kirana Store will confirm your order shortly. 🙏"
     }
   }

OUTGOING MESSAGE (Shop to Customer):
─────────────────────────────────────
Shop owner confirms order from dashboard:

Frontend:
PATCH /api/orders/order-uuid-101/confirm

Backend:
1. Update order status
2. Send WhatsApp message:
   
   POST https://graph.facebook.com/v17.0/PHONE_NUMBER_ID/messages
   {
     "messaging_product": "whatsapp",
     "to": "919999000001",
     "type": "template",
     "template": {
       "name": "order_confirmation",
       "language": {
         "code": "en"
       },
       "components": [{
         "type": "body",
         "parameters": [{
           "type": "text",
           "text": "ORD-00001"
         }, {
           "type": "text",
           "text": "₹533"
         }]
       }]
     }
   }

Template Message:
"✅ Your order *ORD-00001* is confirmed!
Total: *₹533*
Expected delivery: Today 5:00 PM
Thank you for choosing Ram Kirana Store! 🛒"

CATALOG INTEGRATION (Future):
──────────────────────────────
Upload shop catalog to WhatsApp:
POST https://graph.facebook.com/v17.0/CATALOG_ID/products
{
  "retailer_id": "prod-001",
  "name": "Tata Salt",
  "description": "Premium iodized salt",
  "image_url": "https://...",
  "price": 2800, // paise
  "currency": "INR",
  "availability": "in stock"
}

Customers can browse catalog in WhatsApp:
├─> View products
├─> Add to cart
└─> Place order directly

Shop receives order via webhook.
```

---

## 🎯 Conclusion

This document covers:
✅ Complete authentication flows
✅ Shop onboarding process
✅ Order lifecycle management
✅ Analytics tracking system
✅ Payment integration
✅ Notification architecture
✅ Search & discovery
✅ WhatsApp Business integration

Each workflow is production-ready and can be implemented step-by-step.

---

**Document Version:** 1.0  
**Last Updated:** February 26, 2026  
**Author:** Apnidukan Technical Team
