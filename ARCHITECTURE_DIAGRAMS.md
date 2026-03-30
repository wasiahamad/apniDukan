# 📐 Visual Architecture & Diagrams

> **Visual representation of system architecture, data flows, and relationships**

---

## 🏗️ System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          APNIDUKAN ECOSYSTEM                               │
│                      (3 Applications, 1 Platform)                          │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
         ┌───────────────────────────────────────────────────┐
         │              USERS / ACTORS                        │
         └───────────────────────────────────────────────────┘
                  │                │                │
         ┌────────┴────────┐      │      ┌────────┴────────┐
         │                 │      │      │                 │
         ▼                 ▼      ▼      ▼                 ▼
    Customers        Shop Owners        Platform Admins
    (Browse &        (Manage           (Manage
     Order)          Business)         Platform)
         │                 │                     │
         │                 │                     │
         ▼                 ▼                     ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ LOCAL CONNECT   │ │  LOCAL BOOST    │ │ SHOPSPARK ADMIN │
│     HUB         │ │   (Dashboard)   │ │  (Admin Panel)  │
│                 │ │                 │ │                 │
│ - Browse Shops  │ │ - Add Products  │ │ - Manage Shops  │
│ - View Products │ │ - Track Orders  │ │ - View Orders   │
│ - WhatsApp Order│ │ - Analytics     │ │ - Subscriptions │
│ - City Search   │ │ - Subscription  │ │ - Support       │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                    │
         └───────────────────┴────────────────────┘
                             │
                             ▼
         ┌───────────────────────────────────────────┐
         │         API GATEWAY (NGINX)               │
         │    - Load Balancing                       │
         │    - Rate Limiting                        │
         │    - SSL Termination                      │
         └───────────────────┬───────────────────────┘
                             │
                             ▼
         ┌───────────────────────────────────────────┐
         │      REST API BACKEND (Node.js)           │
         │                                           │
         │  ┌────────────┐  ┌────────────┐          │
         │  │   Auth     │  │   Shops    │          │
         │  │  Service   │  │  Service   │          │
         │  └────────────┘  └────────────┘          │
         │                                           │
         │  ┌────────────┐  ┌────────────┐          │
         │  │   Orders   │  │ Analytics  │          │
         │  │  Service   │  │  Service   │          │
         │  └────────────┘  └────────────┘          │
         │                                           │
         │  ┌────────────┐  ┌────────────┐          │
         │  │  Payment   │  │ WhatsApp   │          │
         │  │  Service   │  │  Service   │          │
         │  └────────────┘  └────────────┘          │
         └───────────────────┬───────────────────────┘
                             │
                             ▼
         ┌───────────────────────────────────────────┐
         │         DATA PERSISTENCE LAYER            │
         │                                           │
         │  ┌──────────────────────────────────┐    │
         │  │   PostgreSQL (Primary DB)        │    │
         │  │   - Users, Shops, Products       │    │
         │  │   - Orders, Analytics            │    │
         │  │   - Invoices, Reviews            │    │
         │  └──────────────────────────────────┘    │
         │                                           │
         │  ┌──────────────────────────────────┐    │
         │  │   Redis (Cache & Sessions)       │    │
         │  │   - Session storage              │    │
         │  │   - OTP storage                  │    │
         │  │   - Analytics cache              │    │
         │  └──────────────────────────────────┘    │
         │                                           │
         │  ┌──────────────────────────────────┐    │
         │  │   AWS S3 (File Storage)          │    │
         │  │   - Product images               │    │
         │  │   - Shop logos/covers            │    │
         │  │   - Documents                    │    │
         │  └──────────────────────────────────┘    │
         └───────────────────┬───────────────────────┘
                             │
                             ▼
         ┌───────────────────────────────────────────┐
         │       EXTERNAL SERVICES                   │
         │                                           │
         │  ┌───────────┐  ┌───────────┐            │
         │  │  Twilio   │  │ Razorpay  │            │
         │  │  (SMS/    │  │ (Payment) │            │
         │  │  WhatsApp)│  │           │            │
         │  └───────────┘  └───────────┘            │
         │                                           │
         │  ┌───────────┐  ┌───────────┐            │
         │  │  Google   │  │  SendGrid │            │
         │  │  Maps     │  │  (Email)  │            │
         │  └───────────┘  └───────────┘            │
         └───────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### **1. Customer Order Flow**

```
    CUSTOMER                LOCAL CONNECT HUB         SHOP OWNER
       │                            │                      │
       │  1. Browse Shops           │                      │
       ├──────────────────────────►│                      │
       │                            │                      │
       │  2. View Products          │                      │
       ├──────────────────────────►│                      │
       │                            │                      │
       │  3. Click WhatsApp Order   │                      │
       ├──────────────────────────►│                      │
       │                            │                      │
       │                            │  4. Analytics        │
       │                            │     Tracking         │
       │                            ├─────────────────────►│
       │                            │                      │
       │  5. WhatsApp Opens         │                      │
       │  (Pre-filled message)      │                      │
       │◄───────────────────────────┤                      │
       │                            │                      │
       │  6. Send Message via WhatsApp                     │
       ├──────────────────────────────────────────────────►│
       │                            │                      │
       │                            │  7. Shop Owner       │
       │                            │     Logs Order       │
       │                            │  ┌───────────────┐   │
       │                            │  │ Local Boost   │   │
       │                            │  │ Dashboard     │   │
       │                            │  └───────────────┘   │
       │                            │◄─────────────────────┤
       │                            │                      │
       │  8. Order Confirmation                            │
       │  (WhatsApp/SMS)            │                      │
       │◄──────────────────────────────────────────────────┤
       │                            │                      │
       │  9. Order Delivered        │                      │
       │◄──────────────────────────────────────────────────┤
       │                            │                      │
       │  10. Review Request        │                      │
       │◄──────────────────────────────────────────────────┤
       │                            │                      │
```

### **2. Shop Onboarding Flow**

```
   SHOP OWNER              LOCAL BOOST             BACKEND             ADMIN PANEL
       │                        │                      │                    │
       │  1. Sign Up            │                      │                    │
       ├───────────────────────►│                      │                    │
       │                        │                      │                    │
       │                        │  2. Send OTP         │                    │
       │                        ├─────────────────────►│                    │
       │                        │                      │                    │
       │  3. Enter OTP          │                      │                    │
       ├───────────────────────►│  4. Verify OTP       │                    │
       │                        ├─────────────────────►│                    │
       │                        │◄─────────────────────┤                    │
       │                        │  5. JWT Tokens       │                    │
       │◄───────────────────────┤                      │                    │
       │                        │                      │                    │
       │  6. Business Info      │                      │                    │
       ├───────────────────────►│  7. Create Shop      │                    │
       │                        ├─────────────────────►│                    │
       │                        │◄─────────────────────┤                    │
       │                        │  8. Shop Created     │                    │
       │◄───────────────────────┤                      │                    │
       │                        │                      │                    │
       │  9. Add Products       │                      │                    │
       ├───────────────────────►│  10. Save Products   │                    │
       │                        ├─────────────────────►│                    │
       │                        │                      │                    │
       │  11. Select Plan       │                      │                    │
       ├───────────────────────►│  12. Create Payment  │                    │
       │                        ├─────────────────────►│                    │
       │                        │◄─────────────────────┤                    │
       │                        │  13. Order Details   │                    │
       │◄───────────────────────┤                      │                    │
       │                        │                      │                    │
       │  14. Complete Payment  │                      │                    │
       ├───────────────────────►│  15. Verify Payment  │                    │
       │                        ├─────────────────────►│                    │
       │                        │                      │  16. Notify Admin  │
       │                        │                      ├───────────────────►│
       │                        │                      │                    │
       │                        │                      │  17. Approve &     │
       │                        │                      │      Assign Domain │
       │                        │                      │◄───────────────────┤
       │                        │◄─────────────────────┤                    │
       │  18. Shop Live!        │                      │                    │
       │◄───────────────────────┤                      │                    │
       │                        │                      │                    │
```

### **3. Payment Processing Flow**

```
   SHOP OWNER          LOCAL BOOST          BACKEND          RAZORPAY
       │                    │                   │                │
       │  1. Click Upgrade  │                   │                │
       ├───────────────────►│                   │                │
       │                    │  2. Create Order  │                │
       │                    ├──────────────────►│                │
       │                    │                   │  3. Create     │
       │                    │                   │     Razorpay   │
       │                    │                   │     Order      │
       │                    │                   ├───────────────►│
       │                    │                   │◄───────────────┤
       │                    │                   │  4. Order ID   │
       │                    │◄──────────────────┤                │
       │                    │  5. Order Details │                │
       │◄───────────────────┤                   │                │
       │                    │                   │                │
       │  6. Payment Modal  │                   │                │
       │    Opens           │                   │                │
       │                    │                   │                │
       │  7. Enter Card/UPI                                      │
       │                    │                   │                │
       │  8. Pay                                                 │
       ├────────────────────────────────────────────────────────►│
       │                    │                   │◄───────────────┤
       │                    │                   │  9. Payment    │
       │                    │                   │     Success    │
       │◄───────────────────┤◄──────────────────┤                │
       │  10. Success       │  11. Verify       │                │
       │      Callback      │      Signature    │                │
       ├───────────────────►│                   │                │
       │                    ├──────────────────►│                │
       │                    │                   │  12. Activate  │
       │                    │                   │      Sub       │
       │                    │                   │                │
       │                    │◄──────────────────┤                │
       │◄───────────────────┤  13. Confirmation │                │
       │  14. Upgrade       │      + Invoice    │                │
       │      Complete!     │                   │                │
       │                    │                   │                │
```

---

## 🗂️ Database Schema Relationships

```
                         ┌──────────────┐
                         │    cities    │
                         ├──────────────┤
                         │ id (PK)      │
                         │ name         │
                         │ slug         │
                         └──────┬───────┘
                                │
                                │ 1:N
                                │
         ┌──────────────────────┼──────────────────┐
         │                      │                  │
         │                      ▼                  │
         │              ┌──────────────┐           │
         │              │    shops     │           │
         │              ├──────────────┤           │
         │              │ id (PK)      │           │
         │              │ user_id (FK) │───┐       │
         │              │ city_id (FK) │───┘       │
         │              │ category_id  │           │
         │              │ shop_name    │           │
         │              │ slug         │           │
         │              └──────┬───────┘           │
         │                     │                   │
         │         ┌───────────┼───────────┐       │
         │         │           │           │       │
         │    1:N  ▼      1:N  ▼      1:N  ▼       │
         │  ┌───────────┐ ┌─────────┐ ┌─────────┐ │
         │  │ products  │ │ orders  │ │analytics│ │
         │  ├───────────┤ ├─────────┤ ├─────────┤ │
         │  │ id (PK)   │ │ id (PK) │ │ id (PK) │ │
         │  │ shop_id───┼─┤shop_id──┼─┤shop_id──┤ │
         │  │ name      │ │ customer│ │event    │ │
         │  │ price     │ │ items   │ │type     │ │
         │  │ image     │ │ total   │ │datetime │ │
         │  └───────────┘ └─────────┘ └─────────┘ │
         │                     │                   │
         │                     │                   │
         │                     ▼                   │
         │              ┌─────────────┐            │
         │              │  invoices   │            │
         │              ├─────────────┤            │
         │              │ id (PK)     │            │
         │              │ shop_id(FK) │────────────┘
         │              │ order_id(FK)│
         │              │ amount      │
         │              │ status      │
         │              └─────────────┘
         │
         │
┌────────┴────────┐
│     users       │
├─────────────────┤
│ id (PK)         │
│ phone (UNIQUE)  │
│ email           │
│ role            │
└─────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────┐
│ support_tickets │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ shop_id (FK)    │
│ issue_type      │
│ status          │
└─────────────────┘


┌────────────────────┐
│subscription_plans  │
├────────────────────┤
│ id (PK)            │
│ name               │
│ price              │
│ features (JSONB)   │
└──────┬─────────────┘
       │
       │ 1:N
       │
       ▼
┌────────────────────┐
│   shops            │
│ subscription_plan  │
│ subscription_expiry│
└────────────────────┘
```

---

## 🔐 Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                          │
└─────────────────────────────────────────────────────────────────┘

SHOP OWNER LOGIN:
─────────────────

   User                Frontend            Backend            Redis         SMS Gateway
    │                     │                   │                │                │
    │  1. Enter Phone     │                   │                │                │
    ├────────────────────►│                   │                │                │
    │                     │  2. POST /send-otp│                │                │
    │                     ├──────────────────►│                │                │
    │                     │                   │  3. Generate   │                │
    │                     │                   │     6-digit    │                │
    │                     │                   │     OTP        │                │
    │                     │                   │                │                │
    │                     │                   │  4. Store OTP  │                │
    │                     │                   ├───────────────►│                │
    │                     │                   │  (5 min TTL)   │                │
    │                     │                   │                │                │
    │                     │                   │  5. Send SMS   │                │
    │                     │                   ├────────────────────────────────►│
    │                     │◄──────────────────┤                │                │
    │◄────────────────────┤  6. Success       │                │                │
    │  7. OTP sent        │                   │                │                │
    │                     │                   │                │                │
    │  8. SMS Received    │                   │                │                │
    │◄────────────────────────────────────────────────────────────────────────┤
    │  "Your OTP: 123456"│                   │                │                │
    │                     │                   │                │                │
    │  9. Enter OTP       │                   │                │                │
    ├────────────────────►│                   │                │                │
    │                     │  10. POST         │                │                │
    │                     │      /verify-otp  │                │                │
    │                     ├──────────────────►│                │                │
    │                     │                   │  11. Get OTP   │                │
    │                     │                   ├───────────────►│                │
    │                     │                   │◄───────────────┤                │
    │                     │                   │  12. Compare   │                │
    │                     │                   │                │                │
    │                     │                   │  13. Delete    │                │
    │                     │                   ├───────────────►│                │
    │                     │                   │                │                │
    │                     │                   │  14. Generate  │                │
    │                     │                   │      JWT       │                │
    │                     │◄──────────────────┤  - Access      │                │
    │◄────────────────────┤  15. Tokens       │  - Refresh     │                │
    │  16. Login Success  │     + User        │                │                │
    │                     │                   │                │                │
    │  17. Store tokens   │                   │                │                │
    │      in memory      │                   │                │                │
    │                     │                   │                │                │
    │  18. Redirect to    │                   │                │                │
    │      Dashboard      │                   │                │                │
    │                     │                   │                │                │

SUBSEQUENT REQUESTS:
────────────────────

    │  Request with JWT   │                   │                │                │
    ├────────────────────►│                   │                │                │
    │  Header:            │  Verify JWT       │                │                │
    │  Authorization:     ├──────────────────►│                │                │
    │  Bearer eyJhbGc...  │                   │  Decode &      │                │
    │                     │                   │  Validate      │                │
    │                     │◄──────────────────┤                │                │
    │◄────────────────────┤  Response         │                │                │
    │                     │                   │                │                │

TOKEN REFRESH:
──────────────

    │  Access Token       │                   │                │                │
    │  Expired (401)      │                   │                │                │
    │◄────────────────────┤                   │                │                │
    │                     │                   │                │                │
    │  POST /refresh      │                   │                │                │
    ├────────────────────►│                   │                │                │
    │  refresh_token      ├──────────────────►│                │                │
    │                     │                   │  Validate      │                │
    │                     │                   │  Refresh Token │                │
    │                     │◄──────────────────┤                │                │
    │◄────────────────────┤  New Access Token │                │                │
    │  Continue           │                   │                │                │
    │                     │                   │                │                │
```

---

## 📊 Analytics Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANALYTICS PIPELINE                           │
└─────────────────────────────────────────────────────────────────┘

   USER ACTION         FRONTEND          BACKEND          DATABASE       REDIS CACHE
       │                  │                 │                 │                │
       │  1. View Shop    │                 │                 │                │
       │     Page         │                 │                 │                │
       ├─────────────────►│                 │                 │                │
       │                  │  2. Track Event │                 │                │
       │                  │  POST /track    │                 │                │
       │                  ├────────────────►│                 │                │
       │                  │                 │  3. Parse       │                │
       │                  │                 │     User Agent  │                │
       │                  │                 │                 │                │
       │                  │                 │  4. GeoIP       │                │
       │                  │                 │     Lookup      │                │
       │                  │                 │                 │                │
       │                  │                 │  5. Insert      │                │
       │                  │                 │     Event       │                │
       │                  │                 ├────────────────►│                │
       │                  │                 │                 │                │
       │                  │                 │  6. INCR        │                │
       │                  │                 │     Counter     │                │
       │                  │                 ├─────────────────────────────────►│
       │                  │                 │  shop:123:      │                │
       │                  │                 │  views:today    │                │
       │                  │◄────────────────┤                 │                │
       │◄─────────────────┤  7. Success     │                 │                │
       │                  │                 │                 │                │

   DASHBOARD VIEW:
   ──────────────

       │  Request         │                 │                 │                │
       │  Analytics       │                 │                 │                │
       ├─────────────────►│                 │                 │                │
       │                  │  GET /analytics │                 │                │
       │                  ├────────────────►│                 │                │
       │                  │                 │  Check Cache    │                │
       │                  │                 ├─────────────────────────────────►│
       │                  │                 │◄─────────────────────────────────┤
       │                  │                 │  Cache MISS     │                │
       │                  │                 │                 │                │
       │                  │                 │  Query DB       │                │
       │                  │                 ├────────────────►│                │
       │                  │                 │◄────────────────┤                │
       │                  │                 │  Data           │                │
       │                  │                 │                 │                │
       │                  │                 │  Cache Result   │                │
       │                  │                 ├─────────────────────────────────►│
       │                  │                 │  (TTL: 5 min)   │                │
       │                  │◄────────────────┤                 │                │
       │◄─────────────────┤  Analytics Data │                 │                │
       │  Display Charts  │                 │                 │                │
       │                  │                 │                 │                │
```

---

## 🏪 Shop Discovery Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 SHOP DISCOVERY PROCESS                          │
└─────────────────────────────────────────────────────────────────┘

   CUSTOMER         LOCAL CONNECT HUB      BACKEND         DATABASE
      │                    │                   │                │
      │  1. Land on        │                   │                │
      │     Homepage       │                   │                │
      ├───────────────────►│                   │                │
      │                    │  2. Load Cities   │                │
      │                    ├──────────────────►│                │
      │                    │                   ├───────────────►│
      │                    │                   │◄───────────────┤
      │◄───────────────────┤◄──────────────────┤                │
      │  3. Display Cities │                   │                │
      │                    │                   │                │
      │  4. Select City    │                   │                │
      │     "Jaipur"       │                   │                │
      ├───────────────────►│                   │                │
      │                    │  5. GET /jaipur   │                │
      │                    ├──────────────────►│                │
      │                    │                   │  6. Query Shops│
      │                    │                   │     WHERE      │
      │                    │                   │     city="JPR" │
      │                    │                   ├───────────────►│
      │                    │                   │◄───────────────┤
      │◄───────────────────┤◄──────────────────┤  7. Shops Data │
      │  8. Display Shops  │                   │                │
      │                    │                   │                │
      │  9. Filter by      │                   │                │
      │     Category       │                   │                │
      │     "Salon"        │                   │                │
      ├───────────────────►│                   │                │
      │                    │  10. GET /jaipur/ │                │
      │                    │      salon        │                │
      │                    ├──────────────────►│                │
      │                    │                   │  11. Query     │
      │                    │                   │      WHERE     │
      │                    │                   │      city &    │
      │                    │                   │      category  │
      │                    │                   ├───────────────►│
      │                    │                   │◄───────────────┤
      │◄───────────────────┤◄──────────────────┤  12. Filtered  │
      │  13. Display       │                   │      Results   │
      │      Filtered      │                   │                │
      │                    │                   │                │
      │  14. Click Shop    │                   │                │
      ├───────────────────►│                   │                │
      │                    │  15. GET /shop/   │                │
      │                    │      sharma-salon │                │
      │                    ├──────────────────►│                │
      │                    │                   │  16. GET Shop  │
      │                    │                   │      Details + │
      │                    │                   │      Products  │
      │                    │                   ├───────────────►│
      │                    │                   │◄───────────────┤
      │◄───────────────────┤◄──────────────────┤                │
      │  17. Shop Page     │                   │                │
      │                    │                   │                │
```

---

## 💳 Subscription Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│              SUBSCRIPTION LIFECYCLE                             │
└─────────────────────────────────────────────────────────────────┘

        TRIAL           ACTIVE          EXPIRING        EXPIRED
         │                │                │               │
         │                │                │               │
    ┌────▼────┐      ┌────▼────┐      ┌────▼────┐   ┌────▼────┐
    │ Day 0-7 │      │ Day 8+  │      │ Last 7  │   │ After   │
    │         │      │         │      │  Days   │   │ Expiry  │
    │ - Free  │─────►│ - Paid  │─────►│         │──►│         │
    │ - Basic │      │ - Full  │      │ - Send  │   │ - Lock  │
    │   Access│      │   Access│      │   Remind│   │   Shop  │
    │         │      │         │      │         │   │ - Send  │
    └─────────┘      └─────────┘      └─────────┘   │   Email │
         │                │                            └─────────┘
         │                │                                 │
         │                │  Payment                        │
         │                │  Made                           │
         │                │  ┌────────┐                     │
         │                └─►│ RENEW  │                     │
         │                   └────────┘                     │
         │                        │                         │
         │                        └────────────────────────►│
         │                                                  │
         └──────────────────────────────────────────────────┘
                              Upgrade/Downgrade
```

---

## 🔔 Notification System

```
┌─────────────────────────────────────────────────────────────────┐
│               NOTIFICATION ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────┘

   EVENT TRIGGER       NOTIFICATION SERVICE       CHANNELS
        │                      │                      │
        │  Order Confirmed     │                      │
        ├─────────────────────►│                      │
        │                      │  1. Get User Prefs   │
        │                      │     (SMS? Email?)    │
        │                      │                      │
        │                      │  2. Load Template    │
        │                      │                      │
        │                      │  3. Populate Data    │
        │                      │                      │
        │                      ├──────────────────────┼─► SMS (Twilio)
        │                      │  "Order ORD-001      │   ✓ Sent
        │                      │   confirmed!"        │
        │                      │                      │
        │                      ├──────────────────────┼─► WhatsApp
        │                      │  "✅ Your order..."  │   ✓ Delivered
        │                      │                      │
        │                      ├──────────────────────┼─► Email
        │                      │  Subject: Order...   │   ✓ Sent
        │                      │                      │
        │                      ├──────────────────────┼─► In-App
        │                      │  Push notification   │   ✓ Delivered
        │                      │                      │
        │                      │  4. Log All          │
        │                      │     Notifications    │
        │◄─────────────────────┤                      │
        │  Success Response    │                      │
        │                      │                      │
```

---

## 📱 WhatsApp Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              WHATSAPP BUSINESS INTEGRATION                      │
└─────────────────────────────────────────────────────────────────┘

   CUSTOMER         WHATSAPP         WEBHOOK          BACKEND
      │                │                │                 │
      │  1. Send       │                │                 │
      │     Message    │                │                 │
      ├───────────────►│                │                 │
      │  "I want to    │  2. Webhook    │                 │
      │   order..."    │     Notification│                │
      │                ├───────────────►│                 │
      │                │                │  3. Process     │
      │                │                ├────────────────►│
      │                │                │                 │
      │                │                │  4. Identify    │
      │                │                │     Shop        │
      │                │                │                 │
      │                │                │  5. Create      │
      │                │                │     Draft Order │
      │                │                │                 │
      │                │                │  6. Notify      │
      │                │                │     Shop Owner  │
      │                │◄───────────────┤                 │
      │  7. Auto-Reply │                │                 │
      │  "Thank you!"  │                │                 │
      │◄───────────────┤                │                 │
      │                │                │                 │

   SHOP CONFIRMS ORDER IN DASHBOARD
      │                │                │                 │
      │                │                │  8. Send        │
      │                │                │     Confirmation│
      │                │◄───────────────────────────────┤
      │  9. Template   │                │                 │
      │     Message    │                │                 │
      │  "Order ORD-001│                │                 │
      │   confirmed!"  │                │                 │
      │◄───────────────┤                │                 │
      │                │                │                 │
```

---

**Visual Architecture v1.0** | *Created: Feb 26, 2026*

---

## 📚 Additional Resources

For detailed technical implementations, refer to:
- [Complete Documentation](./COMPLETE_DOCUMENTATION.md)
- [Technical Workflows](./TECHNICAL_WORKFLOWS.md)
- [Quick Reference](./QUICK_REFERENCE.md)
- [Main README](./README.md)
