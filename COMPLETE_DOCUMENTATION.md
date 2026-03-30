# 📚 Apnidukan - Complete Project Documentation

> **Complete documentation for all three projects: Local Boost, Local Connect Hub, and ShopSpark Admin**

---

## 🎯 Project Overview & Ecosystem

Ye teen projects ek complete **Local Business Digital Platform** banate hain jo small local businesses ko online laane mein help karta hai.

### **Ecosystem Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    APNIDUKAN ECOSYSTEM                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────┐ │
│  │ Local Connect    │  │  Local Boost     │  │ ShopSpark│ │
│  │  Hub (Public)    │  │ (Business Owner) │  │  Admin   │ │
│  └──────────────────┘  └──────────────────┘  └──────────┘ │
│         ↓                      ↓                     ↓      │
│    Customers            Shop Owners            Platform    │
│  Discovery Site         Dashboard              Admin       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Project 1: LOCAL CONNECT HUB (Public Platform)

### **🎯 Goal & Objective:**

**Main Goal:** Customers ko unke city/area mein local businesses discover karne ka platform dena

**Key Objectives:**
- Local shops ko online visibility dena
- Customers ko nearby services dhoondhne mein help karna
- WhatsApp-based ordering ko promote karna
- Trust build karna through ratings aur verified badges

### **👥 Target Users:**
- **Primary:** End customers jo local services dhoondhte hain
- Local business ki zaroorat wale log (salon, grocery, restaurants, etc.)

---

### **📊 Data Models & Structure:**

#### **1. City Model**
```typescript
interface City {
  id: string;              // Unique identifier
  name: string;            // City name (Delhi, Mumbai, etc.)
  slug: string;            // URL-friendly name (delhi, mumbai)
  totalShops: number;      // Is city mein kitne shops hain
  image: string;           // City ka image URL
}
```

**Example Data:**
```json
{
  "id": "1",
  "name": "Delhi",
  "slug": "delhi",
  "totalShops": 8,
  "image": "https://..."
}
```

#### **2. Category Model**
```typescript
interface Category {
  id: string;              // Unique identifier
  name: string;            // Category name (Salon, Restaurant, etc.)
  slug: string;            // URL-friendly name
  icon: string;            // Emoji/icon for display
}
```

**Example Categories:**
- Salon (✂️)
- Restaurant (🍽️)
- Grocery (🛒)
- Tailor (🧵)
- Gym (💪)
- Medical (🏥)
- Electronics (📱)
- Bakery (🍰)

#### **3. Product/Service Model**
```typescript
interface Product {
  id: string;              // Unique identifier
  name: string;            // Product/service name
  price: number;           // Price in INR
  image: string;           // Product image
  description?: string;    // Product description (optional)
  duration?: string;       // Service duration (optional, for services)
  type?: "product" | "service"; // Type classification
}
```

#### **4. Time Slot Model** (For Service Bookings)
```typescript
interface TimeSlot {
  start: string;           // Start time (e.g., "10:00")
  end: string;             // End time (e.g., "11:00")
  busy: boolean;           // Slot available hai ya nahi
}
```

#### **5. Shop Model** (Main Data Structure)
```typescript
interface Shop {
  // Basic Info
  id: string;
  name: string;                 // Shop ka naam
  slug: string;                 // URL-friendly name
  
  // Classification
  category: string;             // Category name
  categorySlug: string;         // Category URL slug
  city: string;                 // City name
  citySlug: string;             // City URL slug
  
  // Location
  area: string;                 // Specific area
  address: string;              // Full address
  latitude: number;             // GPS coordinate
  longitude: number;            // GPS coordinate
  
  // Contact
  whatsapp: string;             // WhatsApp number
  phone: string;                // Phone number
  
  // Business Details
  description: string;          // Business description
  isOpen: boolean;              // Currently open hai ya nahi
  openingTime: string;          // Opening time
  closingTime: string;          // Closing time
  weeklyOff: string;            // Weekly off day
  
  // Trust Indicators
  rating: number;               // Average rating (0-5)
  reviewCount: number;          // Total reviews
  verified: boolean;            // Verified badge
  
  // Visual
  coverImage: string;           // Cover photo
  logo: string;                 // Logo
  
  // Features
  paymentMethods: string[];     // ["Cash", "UPI", "Card"]
  products: Product[];          // Products/services array
  timeSlots?: TimeSlot[];       // Booking slots (optional)
}
```

---

### **🔄 Complete Workflow:**

#### **User Journey:**

```
1. HOME PAGE
   ↓
   User Options:
   a) Browse by City → Select City
   b) Browse by Category → Select Category
   c) Featured Shops → Direct to Shop
   ↓
2. CITY PAGE (/delhi)
   - Saare Delhi ke shops dikhte hain
   - Category filter available
   ↓
3. CITY + CATEGORY PAGE (/delhi/salon)
   - Delhi ke sirf Salon shops
   - Filters: Area, Open Now, Rating
   ↓
4. SHOP PUBLIC PAGE (/sharma-salon-delhi)
   - Shop ki complete details
   - Products/Services with prices
   - Quick Actions:
     * WhatsApp Order Button → wa.me/number
     * Call Button → tel:number
     * Directions → Google Maps
   ↓
5. USER ACTION
   - WhatsApp par message bheja
   - Order place kiya
   - Directions liye
```

#### **Technical Flow:**

```javascript
// Route Resolution Example
URL: /delhi/salon

1. App.tsx routes ko match karta hai
2. CityCategoryPage component load hota hai
3. useParams se city="delhi", category="salon" milta hai
4. mockData.ts se shops filter hote hain:
   shops.filter(s => s.citySlug === "delhi" && s.categorySlug === "salon")
5. Filtered shops render hote hain
```

---

### **💻 Technical Stack:**

```json
{
  "Framework": "React 18.3.1",
  "Build Tool": "Vite 5.4.19",
  "Language": "TypeScript 5.8.3",
  "Routing": "React Router DOM 6.30.1",
  "UI Components": "shadcn/ui (Radix UI)",
  "Styling": "Tailwind CSS 3.4.17",
  "Animations": "Framer Motion 12.34.0",
  "State Management": "React Query (TanStack Query) 5.83.0",
  "Forms": "React Hook Form 7.61.1 + Zod 3.25.76",
  "Icons": "Lucide React 0.462.0"
}
```

---

### **📁 Directory Structure:**

```
local-connect-hub-main/
│
├── src/
│   ├── components/          # Reusable components
│   │   ├── Header.tsx       # Top navigation
│   │   ├── Footer.tsx       # Footer with links
│   │   ├── Layout.tsx       # Main layout wrapper
│   │   ├── ShopCard.tsx     # Shop display card
│   │   ├── GlobalSearch.tsx # Search functionality
│   │   └── ui/              # shadcn UI components
│   │
│   ├── pages/               # Route pages
│   │   ├── Index.tsx        # Home page
│   │   ├── CityPage.tsx     # City listing
│   │   ├── CityCategoryPage.tsx  # Filtered by category
│   │   ├── ShopPage.tsx     # Individual shop page
│   │   ├── PricingPage.tsx  # Pricing plans
│   │   ├── ForBusinessPage.tsx  # Business onboarding
│   │   └── ...
│   │
│   ├── data/
│   │   └── mockData.ts      # All demo data
│   │
│   ├── hooks/
│   │   └── useUserLocation.tsx  # Location detection
│   │
│   ├── lib/
│   │   └── utils.ts         # Helper functions
│   │
│   └── App.tsx              # Router configuration
│
├── public/                  # Static assets
└── package.json
```

---

### **🎨 Design System:**

**Colors:**
- Primary: `#1DBF73` (Green) - Main CTAs
- Secondary: `#FF8A00` (Orange) - Highlights
- Accent: `#2563EB` (Blue) - Links
- Background: `#F9FAFB`
- Text: `#1F2937`

**Key Features:**
- Mobile-first responsive design
- Card-based layouts
- Smooth animations with Framer Motion
- Trust indicators (ratings, verified badges)
- WhatsApp integration

---

## 📦 Project 2: LOCAL BOOST (Business Owner Dashboard)

### **🎯 Goal & Objective:**

**Main Goal:** Shop owners ko unki online presence manage karne ka complete dashboard dena

**Key Objectives:**
- Shop ki public profile manage karna
- Products/services add/edit karna
- Orders track karna
- Analytics dekhna (views, clicks, engagement)
- Branding customize karna
- Subscription manage karna

### **👥 Target Users:**
- Local business owners
- Shop managers
- Kirana stores, salons, restaurants ke malik

---

### **📊 Data Models & Structure:**

#### **1. Shop Data Model**
```typescript
interface ShopData {
  // Basic Info
  shop_name: string;           // Shop ka naam
  slug: string;                // URL slug
  category: string;            // Business category
  description: string;         // Business description
  
  // Contact
  whatsapp_number: string;     // WhatsApp for orders
  call_number: string;         // Phone number
  email: string;               // Email
  
  // Location
  address: string;             // Full address
  city: string;                // City
  area: string;                // Area/locality
  pincode: string;             // PIN code
  
  // Timings
  opening_time: string;        // Opening time (HH:MM)
  closing_time: string;        // Closing time (HH:MM)
  weekly_off: string[];        // ["Sunday"]
  
  // Metrics
  rating: number;              // Average rating
  reviews_count: number;       // Total reviews
  total_views: number;         // Profile views
  whatsapp_clicks: number;     // WhatsApp button clicks
  call_clicks: number;         // Call button clicks
  map_clicks: number;          // Map/directions clicks
  
  // Branding
  logo: string;                // Logo URL
  cover_image: string;         // Cover image URL
  theme_color: string;         // Brand color
  
  // Subscription
  subscription_plan: string;   // "Starter" | "Pro" | "Business"
  subscription_expiry: string; // Expiry date
}
```

#### **2. Product Model**
```typescript
interface Product {
  product_id: string;          // Unique ID
  product_name: string;        // Product name
  price: number;               // Current price
  original_price?: number;     // MRP (optional)
  product_image: string;       // Image URL/emoji
  category: string;            // Product category
  availability_status: boolean;// In stock ya nahi
  description?: string;        // Description (optional)
  unit?: string;               // Unit (kg, L, pc, etc.)
  badge?: string;              // "Bestseller", "Popular", etc.
}
```

#### **3. Order Model**
```typescript
interface Order {
  order_id: string;            // Unique order ID
  customer_name: string;       // Customer ka naam
  items: string[];             // Order items array
  total: number;               // Total amount
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  date: string;                // Order date
  whatsapp: string;            // Customer WhatsApp
}
```

#### **4. Analytics Data**
```typescript
// Daily Views/Engagement
interface DailyMetric {
  date: string;                // Date
  views: number;               // Page views
  whatsapp: number;            // WhatsApp clicks
  calls: number;               // Call clicks
}

// Hourly Activity
interface HourlyActivity {
  hour: string;                // "10:00"
  views: number;               // Views in that hour
}

// Device Distribution
interface DeviceData {
  name: "Mobile" | "Desktop";
  value: number;               // Percentage
  fill: string;                // Chart color
}
```

#### **5. Subscription Plan Model**
```typescript
interface SubscriptionPlan {
  name: string;                // Plan name
  price: number;               // Monthly price
  features: string[];          // Feature list
  popular?: boolean;           // Highlight as popular
}
```

**Available Plans:**
```json
[
  {
    "name": "Starter",
    "price": 199,
    "features": [
      "Basic Shop Page",
      "5 Products",
      "WhatsApp Button",
      "Monthly Analytics"
    ]
  },
  {
    "name": "Pro",
    "price": 499,
    "features": [
      "Custom Branding",
      "Unlimited Products",
      "Priority Support",
      "Detailed Analytics",
      "Custom Domain"
    ],
    "popular": true
  },
  {
    "name": "Business",
    "price": 999,
    "features": [
      "Everything in Pro",
      "Multiple Locations",
      "Team Access",
      "API Access",
      "Dedicated Manager"
    ]
  }
]
```

#### **6. Invoice Model**
```typescript
interface Invoice {
  invoice_id: string;          // Invoice number
  amount: number;              // Amount paid
  date: string;                // Payment date
  status: "paid" | "pending" | "overdue";
}
```

#### **7. Support Ticket Model**
```typescript
interface SupportTicket {
  ticket_id: string;           // Ticket ID
  issue_type: string;          // "Billing", "Technical", etc.
  message: string;             // Issue description
  status: "open" | "resolved";
  date: string;                // Created date
  response?: string;           // Admin response (optional)
}
```

---

### **🔄 Complete Workflow:**

#### **User Journey (Shop Owner):**

```
1. LOGIN PAGE
   - OTP-based authentication
   - Phone number entry → OTP verification
   ↓
2. ONBOARDING (First Time)
   - Business details form
   - Contact information
   - Location setup
   - Category selection
   ↓
3. DASHBOARD (Main Page)
   - Quick stats overview
   - Recent orders
   - Performance graphs
   - Quick actions
   ↓
4. FEATURE ACCESS
   a) BUSINESS PROFILE
      - Edit shop details
      - Update contact info
      - Manage timings
      
   b) BRANDING
      - Upload logo/cover
      - Choose theme color
      - Preview shop page
      
   c) PRODUCTS
      - Add new products
      - Edit prices
      - Mark availability
      - Categorize items
      
   d) LOCATION
      - Update address
      - Set delivery radius
      - Map location
      
   e) WHATSAPP SETTINGS
      - Link WhatsApp Business
      - Auto-reply messages
      - Quick responses
      
   f) ANALYTICS
      - View graphs
      - Track engagement
      - Download reports
      
   g) SUBSCRIPTION
      - View current plan
      - Upgrade/downgrade
      - Payment history
      
   h) SETTINGS
      - Account settings
      - Notifications
      - Privacy
```

#### **Order Management Flow:**

```
CUSTOMER PLACES ORDER (via WhatsApp)
   ↓
ORDER APPEARS IN DASHBOARD (Pending status)
   ↓
SHOP OWNER CONFIRMS ORDER
   ↓
STATUS UPDATED TO "Confirmed"
   ↓
ORDER DELIVERED
   ↓
STATUS UPDATED TO "Delivered"
```

---

### **📁 Directory Structure:**

```
local-boost-main/
│
├── src/
│   ├── components/
│   │   ├── DashboardLayout.tsx  # Dashboard wrapper with sidebar
│   │   ├── NavLink.tsx          # Navigation links
│   │   └── ui/                  # shadcn components
│   │
│   ├── pages/
│   │   ├── Index.tsx            # Landing page
│   │   ├── Login.tsx            # Login page
│   │   ├── OTPVerification.tsx  # OTP verification
│   │   ├── Onboarding.tsx       # First-time setup
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── BusinessProfile.tsx  # Profile management
│   │   ├── Branding.tsx         # Branding setup
│   │   ├── Products.tsx         # Product management
│   │   ├── LocationPage.tsx     # Location settings
│   │   ├── WhatsAppSettings.tsx # WhatsApp integration
│   │   ├── Analytics.tsx        # Analytics dashboard
│   │   ├── Subscription.tsx     # Subscription management
│   │   ├── Invoices.tsx         # Payment history
│   │   ├── Support.tsx          # Support tickets
│   │   ├── SettingsPage.tsx     # General settings
│   │   └── PublicShop.tsx       # Public-facing shop page
│   │
│   ├── data/
│   │   └── mockData.ts          # Mock data
│   │
│   └── App.tsx
│
└── package.json
```

---

### **🎨 Dashboard Features:**

**1. Analytics Dashboard:**
- **Page Views Tracking:** Daily, weekly, monthly views
- **Engagement Metrics:** WhatsApp clicks, call clicks, map clicks
- **Charts:** Line charts, pie charts, bar charts
- **Device Distribution:** Mobile vs Desktop traffic
- **Hourly Activity:** Peak hours analysis

**2. Product Management:**
- Bulk product upload
- Image upload support
- Price management (with discount pricing)
- Availability toggle
- Category organization
- Search and filter

**3. Branding Tools:**
- Logo uploader
- Cover image uploader
- Theme color picker
- Preview mode
- Custom domain support (Pro plan)

---

## 📦 Project 3: SHOPSPARK ADMIN (Super Admin Panel)

### **🎯 Goal & Objective:**

**Main Goal:** Platform administrators ko complete control panel dena to manage all shops, orders, subscriptions, and platform operations

**Key Objectives:**
- All shops ko manage karna
- Orders monitor karna
- Subscriptions handle karna
- Support tickets resolve karna
- Delivery partners manage karna
- Analytics track karna
- Platform health monitoring

### **👥 Target Users:**
- Super Admins
- Platform Operations Team
- Support Executives

---

### **📊 Data Models & Structure:**

#### **1. Shop Model (Admin View)**
```typescript
interface Shop {
  // Identification
  id: string;                     // SHOP-0001 format
  businessName: string;           // Business naam
  ownerName: string;              // Owner ka naam
  
  // Contact
  phone: string;                  // Phone number
  email: string;                  // Email
  
  // Location
  address: string;                // Full address
  city: string;                   // City
  pincode: string;                // PIN code
  
  // Business Details
  category: string;               // Category
  services: string[];             // Services offered
  workingHours: string;           // Working hours
  deliveryAvailable: boolean;     // Delivery available hai?
  paymentModes: string[];         // Payment methods
  
  // Platform Details
  subscriptionPlan: string;       // Current plan
  status: "active" | "suspended" | "inactive";
  subdomain: string;              // shop1.localbooster.in
  customDomain?: string;          // www.shop1.com
  sslStatus: "active" | "pending" | "expired";
  googleIndexing: "indexed" | "pending" | "not_indexed";
  
  // Meta
  createdDate: string;            // Account creation date
  assignedExecutive?: string;     // Support executive assigned
}
```

#### **2. Order Model (Admin View)**
```typescript
interface Order {
  id: string;                     // ORD-00001 format
  shopId: string;                 // Shop reference
  shopName: string;               // Shop name
  
  // Customer Details
  customerName: string;           // Customer naam
  customerPhone: string;          // Customer contact
  
  // Order Details
  items: string[];                // Order items
  amount: number;                 // Total amount
  source: "whatsapp" | "website"; // Order kahan se aayi
  status: "new" | "confirmed" | "out_for_delivery" | "delivered" | "cancelled";
  
  // Meta
  createdDate: string;            // Order date
  cancelReason?: string;          // Cancellation reason (if cancelled)
}
```

#### **3. Subscription Plan Model**
```typescript
interface SubscriptionPlan {
  id: string;                     // plan-1
  name: string;                   // Plan name
  price: number;                  // Monthly price
  billingCycle: "monthly" | "quarterly" | "yearly";
  features: string[];             // Feature list
}
```

**Available Plans:**
```json
[
  {
    "id": "plan-1",
    "name": "Starter",
    "price": 499,
    "billingCycle": "monthly",
    "features": [
      "Basic Website",
      "5 Products",
      "WhatsApp Orders",
      "Email Support"
    ]
  },
  {
    "id": "plan-2",
    "name": "Growth",
    "price": 999,
    "billingCycle": "monthly",
    "features": [
      "Custom Website",
      "50 Products",
      "WhatsApp + Web Orders",
      "Priority Support",
      "Basic Analytics"
    ]
  },
  {
    "id": "plan-3",
    "name": "Pro",
    "price": 1999,
    "billingCycle": "monthly",
    "features": [
      "Custom Domain",
      "Unlimited Products",
      "All Order Channels",
      "Delivery Management",
      "Advanced Analytics",
      "Phone Support"
    ]
  },
  {
    "id": "plan-4",
    "name": "Enterprise",
    "price": 4999,
    "billingCycle": "monthly",
    "features": [
      "Everything in Pro",
      "Multiple Locations",
      "API Access",
      "Dedicated Account Manager",
      "Custom Integrations",
      "SLA Guarantee"
    ]
  }
]
```

#### **4. Invoice Model**
```typescript
interface Invoice {
  id: string;                     // INV-00001
  shopId: string;                 // Shop reference
  shopName: string;               // Shop name
  amount: number;                 // Invoice amount
  paymentMode: string;            // "UPI", "Bank Transfer", etc.
  paymentStatus: "paid" | "pending" | "overdue";
  invoiceDate: string;            // Invoice date
}
```

#### **5. Support Ticket Model**
```typescript
interface SupportTicket {
  id: string;                     // TKT-0001
  shopId: string;                 // Shop reference
  shopName: string;               // Shop name
  issueType: string;              // Issue category
  message: string;                // Issue description
  status: "open" | "in_progress" | "resolved" | "closed";
  assignedExecutive: string;      // Assigned to whom
  createdDate: string;            // Ticket creation date
}
```

**Common Issue Types:**
- Website Down
- Payment Issue
- Order Problem
- Domain Setup
- Login Issue
- Technical Support
- Billing Query

#### **6. Delivery Partner Model**
```typescript
interface DeliveryPartner {
  id: string;                     // DEL-001
  name: string;                   // Partner name
  phone: string;                  // Contact number
  area: string;                   // Assigned area
  assignedOrders: number;         // Current order count
  status: "available" | "busy" | "offline";
}
```

#### **7. Dashboard Stats Model**
```typescript
interface DashboardStats {
  totalShops: number;             // Total registered shops
  activeShops: number;            // Currently active
  inactiveShops: number;          // Inactive/suspended
  totalOrders: number;            // All-time orders
  todaysOrders: number;           // Orders today
  totalRevenue: number;           // Total revenue earned
  expiringSubscriptions: number;  // Expiring soon count
  pendingTickets: number;         // Open tickets
}
```

---

### **🔄 Complete Workflow:**

#### **Admin User Journey:**

```
1. LOGIN PAGE
   - Email/password authentication
   - Demo credentials:
     * admin@localbooster.in / admin123 (Super Admin)
     * ops@localbooster.in / ops123 (Admin)
     * support@localbooster.in / support123 (Support)
   ↓
2. DASHBOARD
   - Platform overview
   - Quick stats
   - Recent activity
   - Alerts/notifications
   ↓
3. SHOP MANAGEMENT
   a) VIEW ALL SHOPS
      - List with filters
      - Search by name/city/category
      - Status filtering
      
   b) SHOP PROFILE VIEW
      - Complete shop details
      - Subscription info
      - Order history
      - Analytics
      - Action buttons (suspend, activate)
      
   c) ADD NEW SHOP
      - Create shop account
      - Assign credentials
      - Set subscription
   ↓
4. ORDER MANAGEMENT
   - View all orders
   - Filter by status/source
   - Assign delivery partners
   - Track deliveries
   - Export reports
   ↓
5. SUBSCRIPTION MANAGEMENT
   - View all active subscriptions
   - Expiring subscriptions
   - Upgrade/downgrade shops
   - Payment tracking
   ↓
6. SUBDOMAIN MANAGEMENT
   - Assign subdomains (shop.localbooster.in)
   - Custom domain setup
   - SSL certificate management
   - Google indexing status
   ↓
7. DELIVERY MANAGEMENT
   - Manage delivery partners
   - Assign orders
   - Track partner availability
   - Performance metrics
   ↓
8. SUPPORT TICKET SYSTEM
   - View all tickets
   - Assign to executives
   - Respond to queries
   - Close resolved issues
   ↓
9. ANALYTICS & REPORTS
   - Platform-wide analytics
   - Revenue reports
   - Shop performance
   - Weekly reports
   - Export capabilities
   ↓
10. AUDIT LOGS
    - Track all admin actions
    - User activity logs
    - System changes
    - Security monitoring
   ↓
11. SETTINGS
    - Platform settings
    - User management
    - API configurations
    - Email templates
```

---

### **📁 Directory Structure:**

```
shopspark-admin-main/
│
├── src/
│   ├── components/
│   │   ├── AdminLayout.tsx      # Main layout with sidebar
│   │   ├── AdminSidebar.tsx     # Navigation sidebar
│   │   ├── StatCard.tsx         # Stat display card
│   │   ├── StatusBadge.tsx      # Status indicator
│   │   ├── NotificationsPanel.tsx  # Notifications
│   │   ├── ThemeToggle.tsx      # Dark/light mode
│   │   └── ui/                  # shadcn components
│   │
│   ├── pages/
│   │   ├── Login.tsx            # Admin login
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── Shops.tsx            # Shop listing
│   │   ├── ShopProfile.tsx      # Individual shop view
│   │   ├── Orders.tsx           # Order management
│   │   ├── Delivery.tsx         # Delivery management
│   │   ├── Subscriptions.tsx    # Subscription management
│   │   ├── Subdomains.tsx       # Domain management
│   │   ├── Referrals.tsx        # Referral program
│   │   ├── Analytics.tsx        # Analytics dashboard
│   │   ├── WeeklyReports.tsx    # Weekly reports
│   │   ├── Support.tsx          # Support tickets
│   │   ├── AuditLogs.tsx        # Audit logs
│   │   └── Settings.tsx         # System settings
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication context
│   │
│   ├── lib/
│   │   └── mock-data.ts         # Mock data
│   │
│   └── App.tsx
│
└── package.json
```

---

### **🔑 Authentication System:**

#### **Demo Users:**
```typescript
const DEMO_USERS = [
  {
    email: "admin@localbooster.in",
    password: "admin123",
    name: "Super Admin",
    role: "super_admin"
  },
  {
    email: "ops@localbooster.in",
    password: "ops123",
    name: "Admin User",
    role: "admin"
  },
  {
    email: "support@localbooster.in",
    password: "support123",
    name: "Support Exec",
    role: "support"
  }
];
```

#### **Role-Based Access:**
- **Super Admin:** Full access to all features
- **Admin:** Shop management, orders, subscriptions
- **Support:** Support tickets, basic shop info (read-only)

---

## 🔄 Complete Ecosystem Data Flow

### **1. Shop Onboarding Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│                   SHOP ONBOARDING PROCESS                   │
└─────────────────────────────────────────────────────────────┘

Step 1: Shop Owner discovers platform
   → Visits Local Connect Hub (public site)
   → Clicks "Apni Dukaan Banaye"
   → Lands on Local Boost

Step 2: Registration
   → Enters phone number
   → Receives OTP
   → Verifies OTP
   → Account created

Step 3: Onboarding
   → Fills business details
   → Selects category
   → Adds location
   → Uploads logo
   → Adds first products
   → Selects subscription plan

Step 4: Admin Approval (ShopSpark Admin)
   → Admin reviews shop
   → Assigns subdomain
   → Activates account
   → Shop goes live

Step 5: Shop is Live
   → Appears on Local Connect Hub
   → Customers can discover
   → Orders start coming
```

### **2. Order Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│                      ORDER LIFECYCLE                        │
└─────────────────────────────────────────────────────────────┘

Customer Journey:
1. Customer finds shop on Local Connect Hub
2. Clicks product → WhatsApp button
3. WhatsApp opens with pre-filled message
4. Customer sends message to shop
5. Shop owner receives order on WhatsApp

Shop Owner Dashboard:
6. Order logged in Local Boost dashboard (manual/automated)
7. Owner sees "Pending" order
8. Owner confirms order → Status: "Confirmed"
9. Owner prepares order
10. Order delivered → Status: "Delivered"

Admin Monitoring (ShopSpark):
11. Admin can see all orders
12. Can assign delivery partners
13. Can track order metrics
14. Can generate reports
```

### **3. Payment/Subscription Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│                   SUBSCRIPTION LIFECYCLE                    │
└─────────────────────────────────────────────────────────────┘

1. Shop Owner selects plan (Local Boost)
   ↓
2. Payment gateway (Razorpay/Stripe integration)
   ↓
3. Payment successful
   ↓
4. Invoice generated (ShopSpark Admin)
   ↓
5. Subscription activated
   ↓
6. Features unlocked based on plan
   ↓
7. Expiry reminders (before 7 days, 3 days, 1 day)
   ↓
8. Renewal or downgrade
```

---

## 📊 Required Data for Production (Backend Models)

### **Database Schema Requirements:**

#### **1. Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  role ENUM('shop_owner', 'admin', 'support') DEFAULT 'shop_owner',
  status ENUM('active', 'suspended', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **2. Shops Table**
```sql
CREATE TABLE shops (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  shop_name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  category_id UUID REFERENCES categories(id),
  description TEXT,
  
  -- Contact
  whatsapp VARCHAR(15),
  phone VARCHAR(15),
  email VARCHAR(255),
  
  -- Location
  address TEXT,
  city_id UUID REFERENCES cities(id),
  area VARCHAR(255),
  pincode VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Timings
  opening_time TIME,
  closing_time TIME,
  weekly_off JSONB, -- ["Sunday"]
  
  -- Branding
  logo_url TEXT,
  cover_image_url TEXT,
  theme_color VARCHAR(7),
  
  -- Metrics
  rating DECIMAL(2, 1) DEFAULT 0,
  review_count INT DEFAULT 0,
  total_views INT DEFAULT 0,
  whatsapp_clicks INT DEFAULT 0,
  call_clicks INT DEFAULT 0,
  map_clicks INT DEFAULT 0,
  
  -- Platform
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  subscription_expiry DATE,
  subdomain VARCHAR(255) UNIQUE,
  custom_domain VARCHAR(255),
  ssl_status ENUM('active', 'pending', 'expired'),
  google_indexing ENUM('indexed', 'pending', 'not_indexed'),
  verified BOOLEAN DEFAULT false,
  status ENUM('active', 'suspended', 'inactive') DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **3. Categories Table**
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **4. Cities Table**
```sql
CREATE TABLE cities (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  state VARCHAR(100),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **5. Products Table**
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  product_image_url TEXT,
  category VARCHAR(100),
  unit VARCHAR(50),
  badge VARCHAR(50),
  availability_status BOOLEAN DEFAULT true,
  type ENUM('product', 'service') DEFAULT 'product',
  duration VARCHAR(50), -- for services
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **6. Orders Table**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  shop_id UUID REFERENCES shops(id),
  
  -- Customer
  customer_name VARCHAR(255),
  customer_phone VARCHAR(15),
  customer_address TEXT,
  
  -- Order Details
  items JSONB NOT NULL, -- Array of products
  subtotal DECIMAL(10, 2),
  delivery_charges DECIMAL(10, 2),
  total DECIMAL(10, 2) NOT NULL,
  
  -- Status
  status ENUM('pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled') DEFAULT 'pending',
  source ENUM('whatsapp', 'website', 'phone') DEFAULT 'whatsapp',
  
  -- Delivery
  delivery_partner_id UUID REFERENCES delivery_partners(id),
  delivery_time TIMESTAMP,
  
  -- Meta
  cancel_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **7. Subscription Plans Table**
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  billing_cycle ENUM('monthly', 'quarterly', 'yearly') DEFAULT 'monthly',
  features JSONB NOT NULL, -- Array of features
  max_products INT,
  custom_domain BOOLEAN DEFAULT false,
  priority_support BOOLEAN DEFAULT false,
  api_access BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **8. Invoices Table**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  shop_id UUID REFERENCES shops(id),
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_mode VARCHAR(50),
  payment_status ENUM('paid', 'pending', 'overdue') DEFAULT 'pending',
  invoice_date DATE NOT NULL,
  due_date DATE,
  payment_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **9. Support Tickets Table**
```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  shop_id UUID REFERENCES shops(id),
  user_id UUID REFERENCES users(id),
  issue_type VARCHAR(100),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id),
  response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **10. Analytics Events Table**
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  event_type ENUM('page_view', 'whatsapp_click', 'call_click', 'map_click', 'product_view'),
  device_type ENUM('mobile', 'desktop', 'tablet'),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **11. Delivery Partners Table**
```sql
CREATE TABLE delivery_partners (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(255),
  area VARCHAR(255),
  city_id UUID REFERENCES cities(id),
  vehicle_type VARCHAR(50),
  status ENUM('available', 'busy', 'offline') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **12. Reviews Table**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(15),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  verified_purchase BOOLEAN DEFAULT false,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Technology Stack Summary

### **Frontend (All 3 Projects):**
```json
{
  "Framework": "React 18.3.1",
  "Build Tool": "Vite 5.4.19",
  "Language": "TypeScript 5.8.3",
  "Routing": "React Router DOM 6.30.1",
  "UI Library": "shadcn/ui (Radix UI primitives)",
  "Styling": "Tailwind CSS 3.4.17",
  "Animations": "Framer Motion 12.34.0",
  "State Management": "@tanstack/react-query 5.83.0",
  "Form Handling": "React Hook Form 7.61.1",
  "Validation": "Zod 3.25.76",
  "Icons": "Lucide React 0.462.0",
  "Charts": "Recharts 2.15.4",
  "Toasts": "Sonner 1.7.4",
  "Date Handling": "date-fns 3.6.0"
}
```

### **Recommended Backend Stack:**
```json
{
  "Runtime": "Node.js 18+ / Bun",
  "Framework": "Express.js / Fastify / NestJS",
  "Database": "PostgreSQL 15+",
  "ORM": "Prisma / Drizzle ORM",
  "Authentication": "JWT + OTP (via Twilio/MSG91)",
  "File Storage": "AWS S3 / Cloudinary",
  "Payment Gateway": "Razorpay / Stripe",
  "Email Service": "SendGrid / Amazon SES",
  "SMS/WhatsApp": "Twilio / MSG91 / WATI",
  "Caching": "Redis",
  "Search": "Elasticsearch (optional)",
  "Monitoring": "Sentry / New Relic"
}
```

---

## 📝 API Endpoints Required

### **Authentication APIs:**
```
POST   /api/auth/send-otp          # Send OTP to phone
POST   /api/auth/verify-otp        # Verify OTP
POST   /api/auth/login             # Login with credentials
POST   /api/auth/logout            # Logout
GET    /api/auth/me                # Get current user
```

### **Shop APIs:**
```
GET    /api/shops                  # List all shops (with filters)
GET    /api/shops/:id              # Get shop by ID
GET    /api/shops/slug/:slug       # Get shop by slug
POST   /api/shops                  # Create new shop
PUT    /api/shops/:id              # Update shop
DELETE /api/shops/:id              # Delete shop
PATCH  /api/shops/:id/status       # Update shop status
```

### **Product APIs:**
```
GET    /api/shops/:shopId/products      # Get shop products
POST   /api/shops/:shopId/products      # Add product
PUT    /api/products/:id                # Update product
DELETE /api/products/:id                # Delete product
PATCH  /api/products/:id/availability   # Toggle availability
```

### **Order APIs:**
```
GET    /api/orders                 # List orders (admin/shop owner)
GET    /api/orders/:id             # Get order details
POST   /api/orders                 # Create order
PATCH  /api/orders/:id/status      # Update order status
DELETE /api/orders/:id             # Cancel order
```

### **Analytics APIs:**
```
GET    /api/analytics/views/:shopId          # Get view analytics
GET    /api/analytics/engagement/:shopId     # Get engagement metrics
POST   /api/analytics/track                  # Track event
GET    /api/analytics/dashboard/:shopId      # Dashboard stats
```

### **Subscription APIs:**
```
GET    /api/subscriptions                # List all subscriptions
GET    /api/subscriptions/:shopId        # Get shop subscription
POST   /api/subscriptions                # Create subscription
PUT    /api/subscriptions/:id            # Update subscription
POST   /api/subscriptions/payment        # Process payment
```

### **Support APIs:**
```
GET    /api/tickets                      # List tickets
GET    /api/tickets/:id                  # Get ticket
POST   /api/tickets                      # Create ticket
PUT    /api/tickets/:id                  # Update ticket
POST   /api/tickets/:id/response         # Add response
```

### **Public APIs (No Auth):**
```
GET    /api/public/cities                # Get all cities
GET    /api/public/categories            # Get all categories
GET    /api/public/shops                 # Search shops
GET    /api/public/shops/:slug           # Get shop details
POST   /api/public/contact               # Contact form
```

---

## 🎯 Business Model & Revenue Streams

### **1. Subscription Revenue:**
```
Starter Plan: ₹199/month
Pro Plan: ₹499/month (Most Popular)
Business Plan: ₹999/month
Enterprise: ₹4,999/month

Projected Monthly Revenue (100 shops):
- 40 shops @ ₹199 = ₹7,960
- 45 shops @ ₹499 = ₹22,455
- 12 shops @ ₹999 = ₹11,988
- 3 shops @ ₹4,999 = ₹14,997
----------------------------------
Total: ₹57,400/month = ₹6.88 Lakhs/year
```

### **2. Additional Revenue:**
- **Custom Development:** ₹5,000-50,000 per project
- **Premium Listing:** ₹999/month (featured placement)
- **WhatsApp Business API Setup:** ₹2,999 one-time
- **Photography Service:** ₹1,999/shop
- **Digital Marketing:** ₹3,999-9,999/month

### **3. Commission Model (Future):**
- 2-5% commission on orders placed through platform
- Delivery service fees
- Payment gateway margins

---

## 🔒 Security Considerations

### **1. Authentication:**
- OTP-based login for shop owners
- JWT tokens with short expiry
- Refresh token mechanism
- Rate limiting on OTP requests

### **2. Data Protection:**
- HTTPS/SSL mandatory
- Password hashing (bcrypt/argon2)
- Sensitive data encryption at rest
- Regular backups

### **3. API Security:**
- CORS configuration
- API rate limiting
- Input validation (Zod schemas)
- SQL injection prevention (ORM)
- XSS protection

### **4. Privacy:**
- GDPR/India Data Privacy compliance
- Customer data encryption
- PII masking in logs
- Data retention policies

---

## 📈 Future Enhancements

### **Phase 1 (Current):**
✅ Basic shop profiles
✅ Product listings
✅ WhatsApp integration
✅ Basic analytics

### **Phase 2 (Next 3 months):**
- 🔄 Online payment integration
- 🔄 Real-time order tracking
- 🔄 Customer reviews & ratings
- 🔄 SMS notifications
- 🔄 Advanced analytics

### **Phase 3 (6 months):**
- 📱 Mobile apps (React Native)
- 🤖 WhatsApp chatbot
- 🚚 Delivery partner app
- 📊 AI-powered insights
- 💳 Loyalty programs

### **Phase 4 (1 year):**
- 🌐 Multi-city expansion
- 🔗 Third-party integrations (Zomato, Swiggy)
- 📈 Marketing automation
- 🎁 Referral program
- 🏪 Franchise model

---

## 🚀 Deployment Guide

### **1. Frontend Deployment (Vercel/Netlify):**

```bash
# Local Connect Hub
cd local-connect-hub-main
npm install
npm run build
# Deploy dist/ folder

# Local Boost
cd local-boost-main
npm install
npm run build
# Deploy dist/ folder

# ShopSpark Admin
cd shopspark-admin-main
npm install
npm run build
# Deploy dist/ folder
```

### **2. Environment Variables:**

**Local Connect Hub (.env):**
```env
VITE_API_URL=https://api.apnidukan.com
VITE_GOOGLE_MAPS_KEY=your_key
```

**Local Boost (.env):**
```env
VITE_API_URL=https://api.apnidukan.com
VITE_WHATSAPP_API_KEY=your_key
```

**ShopSpark Admin (.env):**
```env
VITE_API_URL=https://api.apnidukan.com
VITE_AUTH_SECRET=your_secret
```

### **3. Backend Deployment (Railway/Fly.io/AWS):**
```bash
# Install dependencies
npm install

# Run migrations
npx prisma migrate deploy

# Seed database
npm run seed

# Start production server
npm run start
```

---

## 📞 Support & Maintenance

### **Monitoring:**
- Uptime monitoring (UptimeRobot)
- Error tracking (Sentry)
- Performance monitoring (New Relic)
- Log management (Papertrail)

### **Backup Strategy:**
- Daily database backups
- Weekly full backups
- 30-day retention
- Offsite storage (S3)

### **Update Schedule:**
- Security patches: Immediate
- Bug fixes: Weekly
- Features: Bi-weekly
- Major updates: Monthly

---

## 📚 Resources & Documentation

### **Design Resources:**
- Figma mockups
- Brand guidelines
- Icon library
- Component documentation

### **Developer Documentation:**
- API documentation (Swagger/OpenAPI)
- Database schema diagrams
- Deployment guides
- Contributing guidelines

### **User Documentation:**
- Shop owner tutorials
- Video guides
- FAQ section
- Troubleshooting guides

---

## 🎓 Learning Path for Development

### **For Frontend Developers:**
1. ✅ React fundamentals
2. ✅ TypeScript basics
3. ✅ Tailwind CSS
4. ✅ React Router
5. ✅ Form handling (React Hook Form)
6. ✅ API integration (React Query)
7. ✅ State management
8. ✅ shadcn/ui components

### **For Backend Developers:**
1. 📚 Node.js/Express
2. 📚 PostgreSQL
3. 📚 Prisma ORM
4. 📚 Authentication (JWT, OTP)
5. 📚 RESTful API design
6. 📚 Payment gateway integration
7. 📚 WhatsApp Business API
8. 📚 Cloud deployment

---

## 📊 Success Metrics (KPIs)

### **Shop Owner Metrics:**
- Active shops count
- Subscription conversion rate
- Average revenue per shop (ARPU)
- Churn rate
- Shop retention rate

### **Customer Metrics:**
- Total orders
- Order conversion rate
- Average order value
- Customer acquisition cost
- Customer lifetime value

### **Platform Metrics:**
- Monthly active users
- Page views
- Click-through rate (WhatsApp/Call)
- Mobile vs Desktop ratio
- Session duration

---

## 🏁 Conclusion

Ye complete ecosystem **local businesses ko digital transformation** provide karta hai with:

### **Value Propositions:**

**For Shop Owners:**
✅ Professional online presence
✅ Easy product management
✅ Direct customer connection via WhatsApp
✅ Analytics & insights
✅ Affordable pricing
✅ No technical knowledge required

**For Customers:**
✅ Easy discovery of local shops
✅ Compare products & prices
✅ Direct communication with shops
✅ Verified business information
✅ Location-based search

**For Platform Owner:**
✅ Scalable SaaS model
✅ Recurring revenue
✅ Low maintenance overhead
✅ Easy expansion to new cities
✅ Multiple revenue streams

---

## 📝 Next Steps

### **Immediate:**
1. ✅ Setup backend infrastructure
2. ✅ Database design & migration
3. ✅ API development
4. ✅ Authentication implementation

### **Short-term (1 month):**
1. 🔲 Connect frontend with backend
2. 🔲 Payment gateway integration
3. 🔲 WhatsApp Business API setup
4. 🔲 Admin panel testing

### **Medium-term (3 months):**
1. 🔲 Beta launch with 10-20 shops
2. 🔲 Collect feedback
3. 🔲 Iterate and improve
4. 🔲 Marketing & growth

### **Long-term (6 months):**
1. 🔲 Scale to 100+ shops
2. 🔲 Multi-city expansion
3. 🔲 Mobile app development
4. 🔲 Partnership & integrations

---

**Document Version:** 1.0  
**Last Updated:** February 26, 2026  
**Author:** Apnidukan Development Team  

---

*Is documentation ko regularly update karna hai jaise features add hote hain aur platform evolve hota hai.*
