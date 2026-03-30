# 📚 Apnidukan API Documentation

Complete API reference for the multi-tenant SaaS platform.

---

## 🔐 Authentication

All protected routes require JWT token in header:
```javascript
Authorization: Bearer <your_access_token>
```

---

## 1️⃣ Authentication API (`/api/auth`)

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Rajesh Kumar",
  "email": "rajesh@example.com",
  "phone": "9876543210",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "65f12345...",
      "name": "Rajesh Kumar",
      "email": "rajesh@example.com",
      "role": "business_owner",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "rajesh@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "65f12345...",
      "name": "Rajesh Kumar",
      "email": "rajesh@example.com",
      "role": "business_owner"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "65f12345...",
    "name": "Rajesh Kumar",
    "email": "rajesh@example.com",
    "phone": "9876543210",
    "role": "business_owner",
    "isActive": true
  }
}
```

---

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 2️⃣ Business API (`/api/business`)

### Create Business
```http
POST /api/business
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Raj's Kirana Store",
  "businessType": "kirana",
  "description": "Your neighborhood grocery store with fresh products daily",
  "address": {
    "street": "123 Main Road",
    "area": "Andheri West",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400053",
    "coordinates": [72.8347, 19.1136]
  },
  "contact": {
    "phone": "9876543210",
    "whatsapp": "9876543210",
    "email": "contact@rajkirana.com"
  },
  "businessHours": {
    "monday": { "open": "08:00", "close": "22:00" },
    "tuesday": { "open": "08:00", "close": "22:00" },
    "sunday": { "closed": true }
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Business created successfully",
  "data": {
    "_id": "65f23456...",
    "owner": "65f12345...",
    "name": "Raj's Kirana Store",
    "slug": "raj-kirana-store",
    "businessType": "kirana",
    "address": { ... },
    "isActive": true,
    "isVerified": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Get Business by Slug (Public)
```http
GET /api/business/slug/raj-kirana-store
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "65f23456...",
    "name": "Raj's Kirana Store",
    "slug": "raj-kirana-store",
    "businessType": "kirana",
    "description": "Your neighborhood grocery store...",
    "address": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400053"
    },
    "contact": {
      "phone": "9876543210",
      "whatsapp": "9876543210"
    },
    "businessHours": { ... },
    "stats": {
      "totalListings": 25,
      "totalInquiries": 150
    },
    "isActive": true,
    "isVerified": true
  }
}
```

---

### Get All Businesses (Public with filters)
```http
GET /api/business?city=Mumbai&businessType=kirana&search=grocery&page=1&limit=10
```

**Query Parameters:**
- `city` - Filter by city
- `businessType` - Filter by business type
- `search` - Search in name/description
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f23456...",
      "name": "Raj's Kirana Store",
      "slug": "raj-kirana-store",
      "businessType": "kirana",
      "address": { "city": "Mumbai" },
      "isVerified": true
    },
    { ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

---

### Update Business
```http
PUT /api/business/65f23456...
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "description": "Updated description",
  "contact": {
    "phone": "9876543210",
    "email": "newemail@example.com"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Business updated successfully",
  "data": {
    "_id": "65f23456...",
    "name": "Raj's Kirana Store",
    "description": "Updated description",
    ...
  }
}
```

---

## 3️⃣ Listing API (`/api/listings`)

### Create Listing
```http
POST /api/listings
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "business": "65f23456...",
  "title": "Premium Basmati Rice 5kg",
  "description": "Premium quality basmati rice from India",
  "listingType": "product",
  "price": 450,
  "priceType": "fixed",
  "category": "65f34567...",
  "images": [
    "https://res.cloudinary.com/demo/image/upload/rice.jpg"
  ],
  "attributes": [
    { "name": "Brand", "value": "India Gate" },
    { "name": "Weight", "value": "5kg" },
    { "name": "Type", "value": "Basmati" }
  ],
  "stock": 100,
  "isFeatured": false
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Listing created successfully",
  "data": {
    "_id": "65f45678...",
    "business": "65f23456...",
    "title": "Premium Basmati Rice 5kg",
    "slug": "premium-basmati-rice-5kg",
    "listingType": "product",
    "price": 450,
    "stock": 100,
    "isActive": true,
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### Get Listings by Business (Public)
```http
GET /api/listings/business/65f23456...?page=1&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f45678...",
      "title": "Premium Basmati Rice 5kg",
      "slug": "premium-basmati-rice-5kg",
      "price": 450,
      "images": ["..."],
      "listingType": "product",
      "isFeatured": false,
      "stock": 100
    },
    { ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25
  }
}
```

---

### Search Listings (Public)
```http
GET /api/listings/search?q=rice&city=Mumbai&minPrice=100&maxPrice=500
```

**Query Parameters:**
- `q` - Search query (searches in title, description)
- `city` - Filter by business city
- `businessType` - Filter by business type
- `listingType` - Filter by listing type
- `category` - Filter by category ID
- `minPrice` / `maxPrice` - Price range
- `page` / `limit` - Pagination

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f45678...",
      "business": {
        "_id": "65f23456...",
        "name": "Raj's Kirana Store",
        "slug": "raj-kirana-store"
      },
      "title": "Premium Basmati Rice 5kg",
      "price": 450,
      "images": ["..."]
    },
    { ... }
  ]
}
```

---

### Get Featured Listings (Public)
```http
GET /api/listings/featured?city=Mumbai&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f45678...",
      "business": {
        "name": "Raj's Kirana Store",
        "slug": "raj-kirana-store"
      },
      "title": "Premium Basmati Rice 5kg",
      "price": 450,
      "isFeatured": true
    },
    { ... }
  ]
}
```

---

## 4️⃣ Inquiry API (`/api/inquiries`)

### Create Inquiry (Public)
```http
POST /api/inquiries
Content-Type: application/json

{
  "business": "65f23456...",
  "listing": "65f45678...",
  "customerName": "Priya Sharma",
  "customerPhone": "9123456789",
  "customerEmail": "priya@example.com",
  "message": "Is this product available for delivery today?",
  "type": "form"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Inquiry created successfully",
  "data": {
    "_id": "65f56789...",
    "business": "65f23456...",
    "listing": "65f45678...",
    "customerName": "Priya Sharma",
    "status": "new",
    "type": "form",
    "createdAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### Get Business Inquiries (Protected)
```http
GET /api/inquiries/business/65f23456...?status=new&page=1&limit=20
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f56789...",
      "listing": {
        "title": "Premium Basmati Rice 5kg"
      },
      "customerName": "Priya Sharma",
      "customerPhone": "9123456789",
      "message": "Is this product available...",
      "status": "new",
      "type": "form",
      "createdAt": "2024-01-15T12:00:00.000Z"
    },
    { ... }
  ]
}
```

---

### Update Inquiry Status
```http
PUT /api/inquiries/65f56789.../status
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "status": "contacted"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Inquiry status updated",
  "data": {
    "_id": "65f56789...",
    "status": "contacted",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
}
```

---

### Add Note to Inquiry
```http
POST /api/inquiries/65f56789.../notes
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "note": "Customer contacted via WhatsApp. Delivery scheduled for tomorrow."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Note added successfully",
  "data": {
    "_id": "65f56789...",
    "notes": [
      {
        "note": "Customer contacted via WhatsApp...",
        "createdAt": "2024-01-15T15:00:00.000Z"
      }
    ]
  }
}
```

---

## 5️⃣ Booking API (`/api/bookings`)

### Create Booking Slot (Protected)
```http
POST /api/bookings
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "business": "65f23456...",
  "date": "2024-01-20",
  "startTime": "10:00",
  "endTime": "11:00"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Booking slot created",
  "data": {
    "_id": "65f67890...",
    "business": "65f23456...",
    "date": "2024-01-20",
    "startTime": "10:00",
    "endTime": "11:00",
    "isBooked": false
  }
}
```

---

### Get Available Slots (Public)
```http
GET /api/bookings/available/65f23456...?date=2024-01-20
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f67890...",
      "date": "2024-01-20",
      "startTime": "10:00",
      "endTime": "11:00",
      "isBooked": false
    },
    {
      "_id": "65f67891...",
      "date": "2024-01-20",
      "startTime": "11:00",
      "endTime": "12:00",
      "isBooked": false
    }
  ]
}
```

---

### Book a Slot (Public)
```http
POST /api/bookings/65f67890.../book
Content-Type: application/json

{
  "customerName": "Amit Patel",
  "customerPhone": "9876543210",
  "customerEmail": "amit@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Slot booked successfully",
  "data": {
    "_id": "65f67890...",
    "date": "2024-01-20",
    "startTime": "10:00",
    "endTime": "11:00",
    "isBooked": true,
    "customerName": "Amit Patel",
    "customerPhone": "9876543210"
  }
}
```

---

## 6️⃣ Category API (`/api/categories`)

### Get All Categories (Public)
```http
GET /api/categories
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f78901...",
      "name": "Grocery",
      "slug": "grocery",
      "parent": null
    },
    {
      "_id": "65f78902...",
      "name": "Rice & Flour",
      "slug": "rice-flour",
      "parent": "65f78901..."
    }
  ]
}
```

---

### Get Category Tree (Public)
```http
GET /api/categories/tree
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f78901...",
      "name": "Grocery",
      "slug": "grocery",
      "children": [
        {
          "_id": "65f78902...",
          "name": "Rice & Flour",
          "slug": "rice-flour",
          "children": []
        }
      ]
    }
  ]
}
```

---

### Create Category (Admin Only)
```http
POST /api/categories
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Organic Products",
  "parent": "65f78901..."
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "65f78903...",
    "name": "Organic Products",
    "slug": "organic-products",
    "parent": "65f78901..."
  }
}
```

---

## 7️⃣ Plan API (`/api/plans`)

### Get All Plans (Public)
```http
GET /api/plans
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f89012...",
      "name": "Free",
      "slug": "free",
      "price": 0,
      "durationInDays": 30,
      "features": {
        "maxListings": 10,
        "bookingEnabled": false,
        "featuredListings": 0
      }
    },
    {
      "_id": "65f89013...",
      "name": "Starter",
      "slug": "starter",
      "price": 199,
      "durationInDays": 30,
      "features": {
        "maxListings": 50,
        "bookingEnabled": true,
        "featuredListings": 3,
        "analytics": true
      },
      "isPopular": true
    }
  ]
}
```

---

### Subscribe to Plan (Protected)
```http
POST /api/plans/65f89013.../subscribe
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "businessId": "65f23456..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully subscribed to plan",
  "data": {
    "business": {
      "_id": "65f23456...",
      "plan": "65f89013...",
      "planExpiry": "2024-02-15T00:00:00.000Z"
    }
  }
}
```

---

## 📊 Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### Forbidden (403)
```json
{
  "success": false,
  "message": "You don't have permission to perform this action"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### Rate Limit (429)
```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 🚀 Rate Limiting

- **Default:** 100 requests per 15 minutes per IP
- **Headers returned:**
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## 🔍 Multi-Tenant Patterns

### Pattern 1: Slug-based Resolution
```javascript
// Frontend passes business slug
GET /api/business/slug/raj-kirana-store

// Get all listings for that business
GET /api/listings/business/{businessId}
```

### Pattern 2: Owner-based Operations
```javascript
// Owner creates listing for their business
POST /api/listings
Headers: Authorization: Bearer <token>
Body: { business: "ownedBusinessId", ... }

// System verifies ownership before allowing
```

### Pattern 3: Public Discovery
```javascript
// Anyone can search across all businesses
GET /api/listings/search?q=rice&city=Mumbai

// Results include business information
```

---

## 📝 Common Workflows

### Complete Business Onboarding Flow

```javascript
// 1. Register user
POST /api/auth/register
{ name, email, phone, password }

// 2. Create business
POST /api/business
Headers: Authorization: Bearer <token>
{ name, businessType, address, contact }

// 3. Subscribe to plan (optional)
POST /api/plans/{planId}/subscribe
{ businessId }

// 4. Create categories (admin) or use existing

// 5. Create listings
POST /api/listings
{ business, title, listingType, price, category, ... }
```

### Customer Discovery Flow

```javascript
// 1. Search businesses
GET /api/business?city=Mumbai&businessType=kirana

// 2. View business details
GET /api/business/slug/{slug}

// 3. Browse listings
GET /api/listings/business/{businessId}

// 4. Submit inquiry
POST /api/inquiries
{ business, listing, customerName, customerPhone, message }
```

---

**🎉 API Documentation Complete!**

For additional support, refer to [README.md](README.md) or create an issue.
