# 🚀 Apnidukan Backend - Multi-tenant SaaS Platform

> **MERN Stack Backend** - Universal business management system supporting multiple business types with slug-based routing

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Models](#database-models)
- [API Endpoints](#api-endpoints)
- [Multi-Tenant Design](#multi-tenant-design)
- [Authentication](#authentication)
- [Running the Server](#running-the-server)

---

## 🎯 Overview

This backend provides a **clean, scalable, multi-tenant SaaS architecture** that supports:

✅ **Multiple Business Types:** Kirana, Clothing, Restaurant, Coaching, Medical, Rental, Services  
✅ **Universal Listing Model:** Replaces hardcoded Product model  
✅ **Slug-based Routing:** Ready for subdomain support  
✅ **Lightweight Inquiry System:** No heavy order logic  
✅ **Booking System:** For appointment-based businesses  
✅ **Subscription Plans:** Feature-based access control  
✅ **Single User Model:** Unified authentication  
✅ **Centralized Categories:** No duplication

---

## 🏗 Architecture

```
User → Owns Business → Has Listings → Receives Inquiries
                     ↘ Has Bookings
                     ↘ Subscribes to Plan
```

### Key Design Principles

1. **Multi-tenant scoped:** Every query filtered by business ID
2. **No hardcoded logic:** Dynamic based on businessType and listingType
3. **Flexible attributes:** No rigid product fields
4. **Clean separation:** Models, Controllers, Routes, Middleware

---

## 💻 Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js (18+) |
| **Framework** | Express.js |
| **Database** | MongoDB (+ Mongoose ODM) |
| **Authentication** | JWT (Access + Refresh tokens) |
| **Security** | Helmet, CORS, Rate Limiting, Mongo Sanitize |
| **Validation** | Mongoose built-in validators |

---

## 📦 Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values
nano .env

# Seed database (optional)
npm run seed

# Start development server
npm run dev
```

---

## 🔐 Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGO_URI=mongodb://localhost:27017/apnidukan

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRE=30d

# CORS
CLIENT_URL=http://localhost:5173

# Cloudinary (for images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🗃 Database Models

### 1️⃣ **User** (Unified account system)
```javascript
{
  name, email, phone, password, 
  role: ["admin", "business_owner", "staff"],
  isActive
}
```

### 2️⃣ **Business** (Multi-tenant core)
```javascript
{
  owner: ref(User),
  name, slug (unique, indexed),
  businessType: ["kirana", "clothing", "restaurant", ...],
  address: { city, state, ... },
  plan: ref(Plan),
  isActive, isVerified
}
```

### 3️⃣ **Listing** (Universal - replaces Product)
```javascript
{
  business: ref(Business),
  title, description, images,
  listingType: ["product", "service", "course", "food", "rental"],
  price, priceType,
  category: ref(Category),
  attributes: [{ name, value }], // Dynamic!
  stock (optional), isFeatured
}
```

### 4️⃣ **Inquiry** (Lightweight - replaces Order)
```javascript
{
  business: ref(Business),
  listing: ref(Listing) (optional),
  customerName, customerPhone, message,
  type: ["whatsapp", "call", "form"],
  status: ["new", "contacted", ...]
}
```

### 5️⃣ **BookingSlot** (For appointments)
```javascript
{
  business: ref(Business),
  date, startTime, endTime,
  isBooked, customerName, customerPhone
}
```

### 6️⃣ **Category** (Centralized)
```javascript
{
  name, slug,
  parent: ref(Category) (optional)
}
```

### 7️⃣ **Plan** (Subscription)
```javascript
{
  name, price, durationInDays,
  features: {
    maxListings, bookingEnabled, 
    featuredEnabled, customDomain, ...
  }
}
```

---

## 🛣 API Endpoints

### Authentication
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login user
GET    /api/auth/me            - Get current user (protected)
PUT    /api/auth/profile       - Update profile (protected)
POST   /api/auth/refresh       - Refresh access token
```

### Business
```
POST   /api/business           - Create business (protected)
GET    /api/business/slug/:slug - Get business by slug (public)
GET    /api/business/:id       - Get business by ID (public)
GET    /api/business           - Get all businesses (public, with filters)
GET    /api/business/my/businesses - Get my businesses (protected)
PUT    /api/business/:id       - Update business (protected, owner)
DELETE /api/business/:id       - Delete business (protected, owner)
GET    /api/business/:id/stats - Get business stats (protected)
```

### Listings
```
POST   /api/listings           - Create listing (protected)
GET    /api/listings/business/:businessId - Get listings by business (public)
GET    /api/listings/:id       - Get single listing (public)
PUT    /api/listings/:id       - Update listing (protected, owner)
DELETE /api/listings/:id       - Delete listing (protected, owner)
GET    /api/listings/search    - Search listings (public)
GET    /api/listings/featured  - Get featured listings (public)
```

### Inquiries
```
POST   /api/inquiries          - Create inquiry (public)
GET    /api/inquiries/business/:businessId - Get inquiries (protected, owner)
GET    /api/inquiries/:id      - Get single inquiry (protected, owner)
PUT    /api/inquiries/:id/status - Update inquiry status (protected, owner)
POST   /api/inquiries/:id/notes - Add note to inquiry (protected, owner)
GET    /api/inquiries/business/:businessId/stats - Get inquiry stats
```

### Bookings
```
POST   /api/bookings           - Create booking slot (protected, owner)
POST   /api/bookings/bulk      - Create bulk slots (protected, owner)
GET    /api/bookings/available/:businessId - Get available slots (public)
POST   /api/bookings/:id/book  - Book a slot (public)
POST   /api/bookings/:id/cancel - Cancel booking (protected, owner)
GET    /api/bookings/business/:businessId - Get business bookings (protected)
PUT    /api/bookings/:id/status - Update booking status (protected)
```

### Categories
```
GET    /api/categories         - Get all categories (public)
GET    /api/categories/tree    - Get category tree (public)
GET    /api/categories/:id     - Get single category (public)
POST   /api/categories         - Create category (admin only)
PUT    /api/categories/:id     - Update category (admin only)
DELETE /api/categories/:id     - Delete category (admin only)
```

### Plans
```
GET    /api/plans              - Get all plans (public)
GET    /api/plans/:id          - Get single plan (public)
POST   /api/plans/:id/subscribe - Subscribe to plan (protected)
POST   /api/plans              - Create plan (admin only)
PUT    /api/plans/:id          - Update plan (admin only)
DELETE /api/plans/:id          - Delete plan (admin only)
```

---

## 🔒 Authentication

### JWT-based authentication with access and refresh tokens

**Login Flow:**
```javascript
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Protected Route Access:**
```javascript
// Add token to header
Authorization: Bearer <accessToken>
```

---

## 🏃 Running the Server

### Development
```bash
npm run dev     # Uses nodemon for auto-reload
```

### Production
```bash
npm start       # Standard Node.js server
```

### Seed Database
```bash
npm run seed    # Populates sample data
```

---

## 🔍 Multi-Tenant Design

### How It Works

1. **Slug-based Business Resolution**
   ```
   GET /api/business/slug/raj-kirana-store
   → Returns business data
   ```

2. **Scoped Queries**
   ```javascript
   // All listings for a business
   Listing.find({ business: businessId, isActive: true })
   ```

3. **Ownership Verification**
   ```javascript
   if (business.owner.toString() !== req.user._id.toString()) {
     return res.status(403).json({ message: 'Not authorized' })
   }
   ```

4. **Future Subdomain Support**
   ```
   https://raj-kirana-store.apnidukan.com
   → Resolve business from subdomain
   → Serve listings dynamically
   ```

---

## 📝 Development Notes

### Adding New Business Type

No schema changes required! Just add to enum:

```javascript
// In Business model
businessType: {
  enum: ['kirana', 'clothing', ..., 'your-new-type']
}
```

### Adding New Listing Type

```javascript
// In Listing model
listingType: {
  enum: ['product', 'service', ..., 'your-new-type']
}
```

### Dynamic Attributes

```javascript
// Store any attributes dynamically
attributes: [
  { name: "Brand", value: "Nike" },
  { name: "Size", value: "XL" },
  { name: "Material", value: "Cotton" }
]
```

---

## 🐛 Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB (Linux/Mac)
sudo systemctl start mongod

# Start MongoDB (Windows)
net start MongoDB
```

### Port Already in Use
```bash
# Change PORT in .env file
PORT=5001
```

### JWT Secret Error
```bash
# Generate strong secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 📄 License

MIT License - See LICENSE file

---

## 👨‍💻 Contributors

Built with ❤️ for scalable multi-tenant SaaS architecture

---

**🎉 Ready to scale!**
