# 🏪 DUKANDAR (SHOPKEEPER) COMPLETE FLOW DOCUMENTATION

## Overview
Yeh document complete dukandar flow explain karta hai - registration se lekar dashboard tak. Multi-category support ke saath backend kaise determine karta hai ki kaunsa dashboard dikhana hai.

---

## 📋 Table of Contents
1. [User Registration & Authentication](#1-user-registration--authentication)
2. [Business Creation (Category Selection)](#2-business-creation-category-selection)
3. [Dashboard & Features (Category-Based)](#3-dashboard--features-category-based)
4. [Listing Management](#4-listing-management)
5. [Multi-Category Support](#5-multi-category-support)
6. [API Flow Diagram](#6-api-flow-diagram)

---

## 1. User Registration & Authentication

### Step 1.1: User Registration
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "Raj Kumar",
  "email": "raj@example.com",
  "phone": "9876543210",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "name": "Raj Kumar",
      "email": "raj@example.com",
      "phone": "9876543210",
      "role": "business_owner"  // auto-assigned
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Important Points:**
- Default role: `business_owner`
- User abhi tak koi business create nahi kiya
- Registration ke baad automatically login ho jata hai (tokens mil jate hain)

---

### Step 1.2: Login (Agar already registered hai)
**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "raj@example.com",
  "password": "password123"
}
```

**Response:** Same as registration (user + tokens)

---

## 2. Business Creation (Category Selection)

### Step 2.1: Fetch Available Categories
**Endpoint:** `GET /api/categories` 🔓 (Public - no token needed)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "69a1b1337e64da454d5fdfe4",
      "name": "Kirana & Grocery",
      "slug": "grocery",
      "description": "Daily essentials and food items",
      "image": "https://cloudinary.com/..."
    },
    {
      "_id": "69a1b1337e64da454d5fdfe5",
      "name": "Clothing & Fashion",
      "slug": "clothing"
    },
    {
      "_id": "69a1b1337e64da454d5fdfe6",
      "name": "Restaurant & Cafe",
      "slug": "restaurant"
    },
    {
      "_id": "69a1b1337e64da454d5fdfe7",
      "name": "Coaching & Education",
      "slug": "coaching"
    }
    // ... more categories
  ]
}
```

**Frontend Implementation:**
```javascript
// Fetch categories on business creation page
const categories = await fetch('/api/categories').then(r => r.json());

// Show dropdown/cards to user
<select name="category">
  {categories.data.map(cat => (
    <option value={cat._id}>{cat.name}</option>
  ))}
</select>
```

---

### Step 2.2: Create Business with Selected Category
**Endpoint:** `POST /api/business` 🔑 (Requires accessToken)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "Raj's Kirana Store",
  "category": "69a1b1337e64da454d5fdfe4",  // ← Category ID
  "phone": "9876543210",
  "whatsapp": "9876543210",
  "email": "raj@example.com",
  "address": {
    "street": "123 Main Road",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "description": "Fresh groceries daily",
  "logo": "https://cloudinary.com/...",     // optional
  "coverImage": "https://cloudinary.com/..." // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Business created successfully",
  "data": {
    "_id": "69a1bddc939eb5829a5a8912",
    "owner": "69a1b1327e64da454d5fdfdb",
    "name": "Raj's Kirana Store",
    "slug": "rajs-kirana-store",
    "category": {
      "_id": "69a1b1337e64da454d5fdfe4",
      "name": "Kirana & Grocery",
      "slug": "grocery"
    },
    "phone": "9876543210",
    "address": { ... },
    "isActive": true,
    "isVerified": false,  // Admin approval pending
    "stats": {
      "totalListings": 0,
      "totalInquiries": 0,
      "totalViews": 0
    }
  }
}
```

**Backend Validation:**
1. Check karta hai ki category ID valid hai ya nahi (DB mein exist karta hai)
2. User ke paas already business hai to error (Free plan = 1 business only)
3. Slug auto-generate hota hai business name se

---

## 3. Dashboard & Features (Category-Based)

### Step 3.1: Fetch My Business Details
**Endpoint:** `GET /api/business/my/businesses` 🔑

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Raj's Kirana Store",
      "category": {
        "_id": "69a1b1337e64da454d5fdfe4",
        "name": "Kirana & Grocery",
        "slug": "grocery"
      },
      "plan": {
        "name": "Starter",
        "features": {
          "maxListings": 50,
          "bookingEnabled": true,
          "featuredEnabled": true
        }
      },
      "stats": {
        "totalListings": 15,
        "totalInquiries": 23,
        "totalViews": 145
      }
    }
  ]
}
```

---

### Step 3.2: Frontend Dashboard Logic (Category-Based)

**Backend kategori ke basis pe frontend decide karta hai ki kaunsa dashboard dikhana hai:**

```javascript
// Frontend Dashboard Component
const Dashboard = () => {
  const [business, setBusiness] = useState(null);
  
  useEffect(() => {
    // Fetch business details
    fetch('/api/business/my/businesses', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    .then(r => r.json())
    .then(data => setBusiness(data.data[0]));
  }, []);
  
  // Category-based dashboard rendering
  const renderDashboard = () => {
    const categorySlug = business?.category?.slug;
    
    switch(categorySlug) {
      case 'grocery':
      case 'clothing':
      case 'electronics':
        // Product-based businesses
        return <ProductDashboard business={business} />;
        
      case 'restaurant':
      case 'cafe':
      case 'bakery':
        // Food & Menu-based businesses
        return <RestaurantDashboard business={business} />;
        
      case 'coaching':
      case 'school':
        // Education & Course-based
        return <EducationDashboard business={business} />;
        
      case 'salon':
      case 'gym':
      case 'medical':
        // Service & Booking-based
        return <ServiceDashboard business={business} />;
        
      case 'rental':
        // Property/Equipment rental
        return <RentalDashboard business={business} />;
        
      default:
        // Generic dashboard for all
        return <GenericDashboard business={business} />;
    }
  };
  
  return (
    <div>
      <Header business={business} />
      {renderDashboard()}
    </div>
  );
};
```

---

### Dashboard Types (Category-wise)

#### A) Product Dashboard (Kirana, Clothing, Electronics)
**Features:**
- ✅ Stock Management
- ✅ Price Management
- ✅ Inventory Tracking
- ✅ Product Categories
- ✅ Bulk Upload

**Listing Fields:**
```json
{
  "listingType": "product",
  "title": "Premium Basmati Rice 5kg",
  "price": 450,
  "priceType": "fixed",
  "stock": 100,
  "sku": "RICE-001",
  "attributes": [
    { "name": "Brand", "value": "India Gate" },
    { "name": "Weight", "value": "5kg" }
  ]
}
```

---

#### B) Restaurant Dashboard (Restaurant, Cafe, Bakery)
**Features:**
- ✅ Menu Management
- ✅ Table Booking
- ✅ Online Ordering
- ✅ Kitchen Display
- ✅ Special Offers

**Listing Fields:**
```json
{
  "listingType": "food",
  "title": "Paneer Butter Masala",
  "price": 220,
  "priceType": "fixed",
  "category": "Main Course",
  "attributes": [
    { "name": "Cuisine", "value": "North Indian" },
    { "name": "Spice Level", "value": "Medium" },
    { "name": "Serves", "value": "2 people" }
  ]
}
```

---

#### C) Service Dashboard (Salon, Gym, Medical)
**Features:**
- ✅ Appointment Booking
- ✅ Time Slot Management
- ✅ Staff Management
- ✅ Service Packages
- ✅ Customer History

**Listing Fields:**
```json
{
  "listingType": "service",
  "title": "Haircut & Styling",
  "price": 300,
  "priceType": "fixed",
  "duration": "45 mins",
  "attributes": [
    { "name": "Service By", "value": "Senior Stylist" },
    { "name": "Duration", "value": "45 minutes" }
  ]
}
```

---

#### D) Education Dashboard (Coaching, School)
**Features:**
- ✅ Course Management
- ✅ Batch Schedule
- ✅ Student Enrollment
- ✅ Fee Management
- ✅ Attendance Tracking

**Listing Fields:**
```json
{
  "listingType": "course",
  "title": "IIT-JEE Crash Course",
  "price": 25000,
  "priceType": "fixed",
  "duration": "3 months",
  "attributes": [
    { "name": "Batch Size", "value": "20 students" },
    { "name": "Duration", "value": "3 months" },
    { "name": "Classes", "value": "Mon-Sat" }
  ]
}
```

---

#### E) Rental Dashboard (Property, Equipment)
**Features:**
- ✅ Availability Calendar
- ✅ Booking Management
- ✅ Security Deposit
- ✅ Contract Management
- ✅ Maintenance Tracking

**Listing Fields:**
```json
{
  "listingType": "rental",
  "title": "2BHK Furnished Apartment",
  "price": 18000,
  "priceType": "monthly",
  "attributes": [
    { "name": "Type", "value": "Apartment" },
    { "name": "Bedrooms", "value": "2" },
    { "name": "Furnishing", "value": "Fully Furnished" }
  ]
}
```

---

## 4. Listing Management

### Step 4.1: Create Listing
**Endpoint:** `POST /api/listings` 🔑

**Request:**
```json
{
  "business": "69a1bddc939eb5829a5a8912",
  "title": "Premium Basmati Rice 5kg",
  "description": "High quality aged basmati rice",
  "listingType": "product",  // product|service|food|course|rental
  "price": 450,
  "priceType": "fixed",      // fixed|negotiable|on-request
  "category": "69a1b133...",  // Optional sub-category
  "images": ["url1", "url2"],
  "stock": 100,               // For products
  "sku": "RICE-001",          // For products
  "attributes": [
    { "name": "Brand", "value": "India Gate" },
    { "name": "Weight", "value": "5kg" }
  ]
}
```

**Backend Validation:**
1. Business ownership check (only owner can add)
2. Plan limit check (Free = 10 listings, Starter = 50)
3. Category validation (optional)

---

### Step 4.2: Get My Listings
**Endpoint:** `GET /api/listings/my/listings` 🔑

**Response:**
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "_id": "...",
        "title": "Premium Basmati Rice 5kg",
        "listingType": "product",
        "price": 450,
        "business": {
          "_id": "...",
          "name": "Raj's Kirana Store",
          "slug": "rajs-kirana-store"
        },
        "category": { "name": "Grocery", "slug": "grocery" },
        "stats": {
          "views": 145,
          "inquiries": 12
        }
      }
    ],
    "pagination": { "total": 15, "page": 1, "pages": 1 }
  }
}
```

---

## 5. Multi-Category Support

### Current Implementation
- ✅ Ek user ek business create kar sakta hai (Free/Starter plan)
- ✅ Business ek category select karta hai registration ke time
- ✅ Frontend usi category ke basis pe dashboard decide karta hai
- ❌ Same business multiple categories nahi rakh sakta (not needed for MVP)

### Future Enhancement (Optional)
Agar future mein chahiye to yeh add kar sakte hain:
```javascript
// Business model mein categories array
categories: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Category'
}]

// Frontend decides primary dashboard based on first category
// Shows "Switch View" button to toggle between dashboards
```

---

## 6. API Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    DUKANDAR COMPLETE FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. REGISTRATION & LOGIN
   ┌──────────────┐
   │   Frontend   │
   └──────┬───────┘
          │ POST /api/auth/register
          │ { name, email, phone, password }
          ▼
   ┌──────────────┐
   │   Backend    │  ✅ Create User (role: business_owner)
   │  (Auth API)  │  ✅ Return accessToken
   └──────┬───────┘
          │
          ▼
   ✅ User Logged In (has accessToken)


2. CATEGORY SELECTION & BUSINESS CREATION
   ┌──────────────┐
   │   Frontend   │
   └──────┬───────┘
          │ GET /api/categories (🔓 Public)
          ▼
   ┌──────────────┐
   │   Backend    │  ✅ Return all active categories
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │   Frontend   │  User selects category from dropdown
   │ (Create Biz) │  Fills business details
   └──────┬───────┘
          │ POST /api/business (🔑 Token required)
          │ { name, category: "categoryId", phone, address... }
          ▼
   ┌──────────────┐
   │   Backend    │  ✅ Validate category exists
   │  (Biz API)   │  ✅ Check user doesn't have existing business
   └──────┬───────┘  ✅ Create business with category ref
          │
          ▼
   ✅ Business Created (category saved in DB)


3. DASHBOARD LOADING (Category-Based)
   ┌──────────────┐
   │   Frontend   │
   │  (Dashboard) │
   └──────┬───────┘
          │ GET /api/business/my/businesses (🔑)
          ▼
   ┌──────────────┐
   │   Backend    │  ✅ Return business with populated category
   └──────┬───────┘
          │
          │ Response: { business, category: { slug, name } }
          ▼
   ┌──────────────┐
   │   Frontend   │  ✅ Read category.slug
   │  (Dashboard) │  ✅ Decide which dashboard to render:
   └──────────────┘     
          │
          ├─► If slug = "grocery" ────► Product Dashboard
          │                               (Stock, SKU, Inventory)
          │
          ├─► If slug = "restaurant" ─► Restaurant Dashboard
          │                               (Menu, Tables, Orders)
          │
          ├─► If slug = "salon" ──────► Service Dashboard
          │                               (Bookings, Appointments)
          │
          ├─► If slug = "coaching" ───► Education Dashboard
          │                               (Courses, Batches, Students)
          │
          └─► Else ───────────────────► Generic Dashboard


4. LISTING MANAGEMENT (Same for All Categories)
   ┌──────────────┐
   │   Frontend   │
   │  (Dashboard) │
   └──────┬───────┘
          │ POST /api/listings (🔑)
          │ { business, title, listingType, price... }
          ▼
   ┌──────────────┐
   │   Backend    │  ✅ Validate business ownership
   │ (Listing API)│  ✅ Check plan limits
   └──────┬───────┘  ✅ Create listing
          │
          ▼
   ✅ Listing Created


5. PUBLIC STOREFRONT (Customer View)
   ┌──────────────┐
   │   Customer   │
   │   Browser    │
   └──────┬───────┘
          │ GET /api/business/slug/rajs-kirana-store (🔓)
          ▼
   ┌──────────────┐
   │   Backend    │  ✅ Return business details with category
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │   Frontend   │  ✅ Render storefront based on category:
   │  (Storefront)│     - Product catalog for kirana
   └──────────────┘     - Menu for restaurant
                        - Service list for salon
                        - Course list for coaching
```

---

## 7. Key Points Summary

### ✅ Backend Responsibilities
1. **User Registration** → Assign `business_owner` role
2. **Category Management** → Admin creates categories, users select from list
3. **Business Creation** → Validate category, one business per user (Free plan)
4. **Listing Management** → Enforce plan limits, validate ownership
5. **Data Return** → Always populate `category` with `{ _id, name, slug }`

### ✅ Frontend Responsibilities
1. **Category Selection** → Fetch categories, show dropdown/cards to user
2. **Dashboard Logic** → Read `category.slug` and render appropriate dashboard
3. **Conditional Features** → Show/hide features based on category type
   - Products → Show Stock, SKU fields
   - Services → Show Duration, Booking slots
   - Food → Show Menu categories, Spice levels
   - Courses → Show Batch size, Duration
4. **Storefront** → Render customer-facing page based on category

---

## 8. Database Schema Summary

### User Model
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  password: String (hashed),
  role: "business_owner" | "admin",
  isActive: Boolean
}
```

### Business Model
```javascript
{
  _id: ObjectId,
  owner: ObjectId → User,
  name: String,
  slug: String (auto-generated),
  category: ObjectId → Category,  // ← KEY FIELD
  phone: String,
  address: { street, city, state, pincode },
  plan: ObjectId → Plan,
  isActive: Boolean,
  isVerified: Boolean,
  stats: { totalListings, totalInquiries, totalViews }
}
```

### Category Model
```javascript
{
  _id: ObjectId,
  name: String,
  slug: String,
  description: String,
  image: String,
  isActive: Boolean
}
```

### Listing Model
```javascript
{
  _id: ObjectId,
  business: ObjectId → Business,
  title: String,
  listingType: "product" | "service" | "food" | "course" | "rental",
  price: Number,
  priceType: "fixed" | "negotiable" | "on-request",
  category: ObjectId → Category (optional sub-category),
  attributes: [{ name, value }],  // Flexible for all types
  stock: Number,     // For products
  duration: String,  // For services/courses
  isActive: Boolean,
  stats: { views, inquiries, bookings }
}
```

---

## 9. Example API Call Sequence

```javascript
// STEP 1: Register
const registerRes = await fetch('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Raj Kumar',
    email: 'raj@example.com',
    phone: '9876543210',
    password: 'password123'
  })
});
const { data: { accessToken } } = await registerRes.json();

// STEP 2: Fetch Categories
const categoriesRes = await fetch('/api/categories');
const { data: categories } = await categoriesRes.json();
// User selects: category._id = "69a1b133..."

// STEP 3: Create Business
const businessRes = await fetch('/api/business', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Raj's Kirana Store",
    category: "69a1b133...",  // Selected category ID
    phone: "9876543210",
    address: { street: "123 Main", city: "Mumbai", state: "MH", pincode: "400001" }
  })
});
const { data: business } = await businessRes.json();

// STEP 4: Fetch My Business (Dashboard Load)
const myBusinessRes = await fetch('/api/business/my/businesses', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const { data: [myBusiness] } = await myBusinessRes.json();

// STEP 5: Decide Dashboard
const categorySlug = myBusiness.category.slug;
if (categorySlug === 'grocery') {
  renderProductDashboard();
} else if (categorySlug === 'restaurant') {
  renderRestaurantDashboard();
}
// ... etc

// STEP 6: Add Listing
const listingRes = await fetch('/api/listings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    business: business._id,
    title: "Premium Basmati Rice 5kg",
    listingType: "product",
    price: 450,
    priceType: "fixed",
    stock: 100,
    attributes: [
      { name: "Brand", value: "India Gate" },
      { name: "Weight", value: "5kg" }
    ]
  })
});
```

---

## 10. Common Questions & Answers

### Q1: Backend kaise decide karta hai ki kaunsa dashboard dikhana hai?
**A:** Backend sirf `category._id` return karta hai. Frontend `category.slug` read karke conditional rendering karta hai.

### Q2: Ek dukandar multiple categories select kar sakta hai?
**A:** Currently NO. Ek business = Ek category. Future mein enable kar sakte hain.

### Q3: Category change kar sakte hain baad mein?
**A:** YES. `PUT /api/business/:id` se update kar sakte hain (business owner/admin only).

### Q4: Product-based vs Service-based dashboard mein kya difference hai?
**A:** Frontend mein different UI components:
- Product: Stock, SKU, Inventory management
- Service: Booking calendar, time slots, duration
- Food: Menu sections, spice levels, serves
- Course: Batch schedules, student enrollment

Backend same `listings` API use karta hai, sirf `listingType` aur `attributes` different hote hain.

### Q5: Admin ko sabhi businesses dikhengi?
**A:** YES. `GET /api/business` (admin only) returns all businesses with category populated.

---

## 📞 Support
For any queries contact: dev@apnidukan.com

---

**Last Updated:** February 27, 2026  
**Version:** 1.0.0
