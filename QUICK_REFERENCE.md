# ⚡ Quick Reference Guide - Apnidukan Platform

> **Rapid reference for developers - Key models, APIs, and workflows**

---

## 🎯 Platform Summary in 30 Seconds

```
3 Applications = 1 Ecosystem

Local Connect Hub    →  Customers discover local shops
Local Boost          →  Shop owners manage their business
ShopSpark Admin      →  Admins manage the platform

Technology: React + TypeScript + Tailwind CSS
Backend: Node.js + PostgreSQL + Redis
Integrations: Razorpay + WhatsApp + SMS
```

---

## 📊 Core Data Models (Quick View)

### **User**
```typescript
{
  id: UUID
  phone: string (unique)
  email?: string
  role: 'shop_owner' | 'admin' | 'support'
  status: 'active' | 'suspended'
}
```

### **Shop**
```typescript
{
  id: UUID
  user_id: UUID
  shop_name: string
  slug: string (unique)
  category_id: UUID
  city_id: UUID
  
  // Contact
  whatsapp: string
  phone: string
  
  // Location
  address: string
  latitude: decimal
  longitude: decimal
  
  // Metrics
  rating: decimal
  total_views: int
  
  // Subscription
  subscription_plan_id: UUID
  subscription_expiry: date
  status: 'active' | 'inactive' | 'suspended'
}
```

### **Product**
```typescript
{
  id: UUID
  shop_id: UUID
  product_name: string
  price: decimal
  availability_status: boolean
  product_image_url: string
}
```

### **Order**
```typescript
{
  id: UUID
  order_number: string (e.g., "ORD-00001")
  shop_id: UUID
  customer_name: string
  customer_phone: string
  items: JSONB (array of products)
  total: decimal
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled'
  source: 'whatsapp' | 'website'
}
```

---

## 🔌 Essential API Endpoints

### **Authentication**
```http
POST   /api/auth/send-otp
POST   /api/auth/verify-otp
POST   /api/auth/refresh
GET    /api/auth/me
```

### **Shops**
```http
GET    /api/shops                    # List (with filters)
GET    /api/shops/:id                # Get one
POST   /api/shops                    # Create
PUT    /api/shops/:id                # Update
DELETE /api/shops/:id                # Delete
```

### **Products**
```http
GET    /api/shops/:shopId/products   # List
POST   /api/shops/:shopId/products   # Create
PUT    /api/products/:id             # Update
DELETE /api/products/:id             # Delete
```

### **Orders**
```http
GET    /api/orders                   # List
POST   /api/orders                   # Create
PATCH  /api/orders/:id/status        # Update status
```

### **Analytics**
```http
GET    /api/analytics/dashboard/:shopId?period=7days
POST   /api/analytics/track
```

### **Public (No Auth)**
```http
GET    /api/public/cities
GET    /api/public/categories
GET    /api/public/shops
GET    /api/public/shops/:slug
```

---

## 🔐 Authentication Flow (Quick)

```javascript
// Step 1: Send OTP
POST /api/auth/send-otp
{ "phone": "+919876543210" }
→ OTP sent via SMS

// Step 2: Verify OTP
POST /api/auth/verify-otp
{ "phone": "+919876543210", "otp": "123456" }
→ Returns { access_token, refresh_token, user }

// Step 3: Use token in headers
Authorization: Bearer <access_token>
```

---

## 🏪 Shop Creation (Quick)

```javascript
// 1. Create shop
POST /api/shops
{
  "user_id": "xxx",
  "shop_name": "Ram Kirana Store",
  "category_id": "grocery-uuid",
  "city_id": "jaipur-uuid",
  "whatsapp": "+919876543210",
  "address": "Shop 12, Market Road"
}

// 2. Add products
POST /api/shops/:shopId/products
[
  {
    "product_name": "Tata Salt",
    "price": 28,
    "availability_status": true
  },
  ...
]

// 3. Activate subscription
POST /api/subscriptions/create-order
{
  "shop_id": "xxx",
  "plan_id": "pro-plan-uuid"
}

// 4. Shop is live!
```

---

## 📦 Order Flow (Quick)

```javascript
// Customer clicks WhatsApp button
// → WhatsApp opens with pre-filled message

// Shop owner receives message
// → Manually creates order in dashboard

POST /api/orders
{
  "shop_id": "xxx",
  "customer_name": "Priya Sharma",
  "customer_phone": "+919999000001",
  "items": [{...}],
  "total": 533,
  "source": "whatsapp",
  "status": "pending"
}

// Confirm order
PATCH /api/orders/:orderId/status
{ "status": "confirmed" }

// Mark delivered
PATCH /api/orders/:orderId/status
{ "status": "delivered" }
```

---

## 💳 Payment Integration (Quick)

```javascript
// 1. Create Razorpay order
const razorpay = new Razorpay({...});
const order = await razorpay.orders.create({
  amount: 49900, // ₹499 in paise
  currency: 'INR'
});

// 2. Send to frontend
res.json({ order_id: order.id, amount: order.amount });

// 3. Frontend opens Razorpay
const options = {
  key: 'rzp_xxx',
  amount: response.amount,
  order_id: response.order_id,
  handler: (response) => {
    verifyPayment(response);
  }
};
new Razorpay(options).open();

// 4. Verify signature
const generated_signature = crypto
  .createHmac('sha256', secret)
  .update(order_id + "|" + payment_id)
  .digest('hex');

if (generated_signature === received_signature) {
  // Payment verified ✅
  activateSubscription();
}
```

---

## 📊 Analytics Tracking (Quick)

```javascript
// Track event
POST /api/analytics/track
{
  "shop_id": "xxx",
  "event_type": "page_view", // or whatsapp_click, call_click
  "device_type": "mobile",
  "timestamp": "2026-02-26T10:00:00Z"
}

// Get dashboard stats
GET /api/analytics/dashboard/:shopId?period=7days

// Response
{
  "total_views": 847,
  "whatsapp_clicks": 132,
  "call_clicks": 45,
  "daily_breakdown": [...],
  "device_distribution": {...}
}
```

---

## 🔍 Search Implementation (Quick)

```javascript
// Basic search
GET /api/search?q=grocery+in+jaipur

// PostgreSQL full-text search
SELECT s.*,
  ts_rank(s.search_vector, query) AS rank
FROM shops s,
  to_tsquery('english', 'grocery') query
WHERE s.search_vector @@ query
  AND s.city_id = 'jaipur-uuid'
ORDER BY rank DESC

// Nearby search (PostGIS)
SELECT s.*,
  ST_Distance(
    ST_MakePoint(s.longitude, s.latitude)::geography,
    ST_MakePoint(75.8069, 26.8509)::geography
  ) / 1000 AS distance_km
FROM shops s
WHERE ST_DWithin(
  ST_MakePoint(s.longitude, s.latitude)::geography,
  ST_MakePoint(75.8069, 26.8509)::geography,
  5000 -- 5 km radius
)
ORDER BY distance_km
```

---

## 📱 WhatsApp Integration (Quick)

```javascript
// Customer clicks WhatsApp button
const message = `Hello! I want to order:
1. Tata Salt - ₹28
2. Atta - ₹320
Total: ₹348`;

const url = `https://wa.me/919876543210?text=${encodeURIComponent(message)}`;
window.open(url);

// WhatsApp webhook (incoming message)
POST /webhooks/whatsapp
{
  "messages": [{
    "from": "919999000001",
    "text": { "body": "I want to order..." }
  }]
}

// Backend creates draft order
// Notifies shop owner
// Sends auto-reply to customer
```

---

## 🗄️ Database Indexes (Important)

```sql
-- Shops
CREATE INDEX idx_shops_city ON shops(city_id);
CREATE INDEX idx_shops_category ON shops(category_id);
CREATE INDEX idx_shops_slug ON shops(slug);
CREATE INDEX idx_shops_status ON shops(status);
CREATE INDEXGIN idx_shops_search ON shops USING GIN(search_vector);

-- Products
CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_availability ON products(availability_status);

-- Orders
CREATE INDEX idx_orders_shop ON orders(shop_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Analytics
CREATE INDEX idx_analytics_shop_date ON analytics_events(shop_id, created_at DESC);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
```

---

## 🔒 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/apnidukan

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=30d

# SMS/OTP
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# Payment
RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_SECRET=xxx_secret

# WhatsApp
WHATSAPP_API_KEY=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx

# AWS S3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=apnidukan-media
AWS_REGION=ap-south-1

# Redis
REDIS_URL=redis://localhost:6379

# Frontend URLs
FRONTEND_URL=https://apnidukan.com
DASHBOARD_URL=https://dashboard.apnidukan.com
ADMIN_URL=https://admin.apnidukan.com
```

---

## 🚀 Deployment Checklist

### **Frontend (Vercel/Netlify)**
```bash
# Build
npm run build

# Environment variables
VITE_API_URL=https://api.apnidukan.com
VITE_RAZORPAY_KEY=rzp_xxx

# Deploy
vercel --prod
```

### **Backend (Railway/Fly.io)**
```bash
# Run migrations
npx prisma migrate deploy

# Seed database
npm run seed

# Start server
npm run start
```

### **Database (Supabase/RDS)**
- Setup PostgreSQL
- Run migrations
- Create indexes
- Setup backups

### **Redis (Upstash/ElastiCache)**
- Setup Redis instance
- Configure cache policies
- Monitor memory usage

---

## 📱 Frontend Routes Summary

### **Local Connect Hub**
```
/                       Home page
/:city                  City page
/:city/:category        Filtered shops
/:shopSlug              Shop detail page
/pricing                Pricing page
/for-business           Business signup
/about                  About page
/contact                Contact page
```

### **Local Boost**
```
/                       Landing page
/login                  Login/OTP
/otp-verification       OTP verify
/onboarding             First-time setup
/dashboard              Main dashboard
/dashboard/products     Product management
/dashboard/analytics    Analytics
/dashboard/subscription Subscription
/shop/:slug             Public shop view
```

### **ShopSpark Admin**
```
/                       Dashboard
/login                  Admin login
/shops                  Shop listing
/shops/:id              Shop details
/orders                 Orders
/subscriptions          Subscriptions
/support                Support tickets
/analytics              Platform analytics
```

---

## 🧪 Testing Quick Commands

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test
npm run test -- ProductCard.test.tsx

# E2E tests (if configured)
npm run test:e2e
```

---

## 🐛 Common Debugging

### **Issue: CORS Error**
```javascript
// Backend: Add CORS middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://apnidukan.com'],
  credentials: true
}));
```

### **Issue: JWT Expired**
```javascript
// Frontend: Implement token refresh
if (error.status === 401) {
  const newToken = await refreshToken();
  retry(request, newToken);
}
```

### **Issue: Image Upload Fails**
```javascript
// Check file size
if (file.size > 5 * 1024 * 1024) {
  throw new Error('File too large (max 5MB)');
}

// Validate file type
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
if (!allowedTypes.includes(file.type)) {
  throw new Error('Invalid file type');
}
```

---

## 📊 Performance Tips

### **Database**
- Use indexes on frequently queried columns
- Implement pagination (limit 20-50 items)
- Use database connection pooling
- Cache frequent queries in Redis

### **Frontend**
- Lazy load images
- Code splitting (React.lazy)
- Memoize expensive computations
- Use virtual scrolling for long lists

### **API**
- Implement rate limiting
- Use CDN for static assets
- Compress responses (gzip)
- Implement caching headers

---

## 🔗 Useful Links

- **Complete Documentation:** [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md)
- **Technical Workflows:** [TECHNICAL_WORKFLOWS.md](./TECHNICAL_WORKFLOWS.md)
- **Main README:** [README.md](./README.md)

---

## 💡 Pro Tips

1. **Always validate input** - Use Zod schemas
2. **Log everything** - Use structured logging (Winston/Pino)
3. **Monitor errors** - Integrate Sentry
4. **Cache aggressively** - Use Redis for hot data
5. **Test payments** - Use Razorpay test mode
6. **Version your API** - `/api/v1/...`
7. **Document as you code** - Update docs with changes
8. **Use transactions** - For critical operations
9. **Implement retries** - For external API calls
10. **Monitor performance** - Use APM tools

---

**Quick Reference v1.0** | *Last Updated: Feb 26, 2026*
