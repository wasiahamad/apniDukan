# Changelog

All notable changes to the Apnidukan Backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2024-01-15

### 🎉 Initial Release

Complete multi-tenant SaaS backend built with MERN stack supporting diverse business types with universal, flexible architecture.

### ✨ Added

#### Core Models (7 total)
- **User Model** - Unified account system with role-based access (admin, business_owner, staff)
- **Business Model** - Multi-tenant core entity with slug-based routing, 15 business types supported
- **Listing Model** - Universal flexible model replacing rigid Product structure
- **Category Model** - Hierarchical taxonomy with parent-child relationships
- **Inquiry Model** - Lightweight tracking system (WhatsApp, Call, Form)
- **BookingSlot Model** - Appointment scheduling for service-based businesses
- **Plan Model** - Subscription/feature control with granular permissions

#### API Endpoints (50+ total)
- **Authentication API** (6 endpoints)
  - Register, Login, Get Profile, Update Profile, Refresh Token, Logout
  - JWT-based with access + refresh token pattern
  
- **Business API** (8 endpoints)
  - CRUD operations with slug-based public access
  - Ownership verification and statistics
  
- **Listing API** (7 endpoints)
  - Universal listing management with search, filters, featured listings
  - Multi-tenant scoped queries
  
- **Inquiry API** (7 endpoints)
  - Public inquiry creation with protected owner management
  - Status tracking and notes
  
- **Booking API** (8 endpoints)
  - Slot creation, availability checking, booking, cancellation
  
- **Category API** (7 endpoints)
  - Hierarchical category management with tree structure
  - Admin-only mutations
  
- **Plan API** (7 endpoints)
  - Plan management and subscription assignment

#### Security Features
- JWT authentication with bcrypt password hashing (10 salt rounds)
- Helmet security headers
- MongoDB query sanitization (NoSQL injection prevention)
- Rate limiting (100 requests per 15 minutes per IP)
- CORS configuration
- Input validation with express-validator
- Role-based authorization middleware

#### Infrastructure
- Express.js 4.18.2 server with ES6 modules
- MongoDB with Mongoose 8.0.3 ODM
- Centralized error handling with custom error classes
- Winston logger for production logging
- Morgan HTTP request logger
- Multer + Cloudinary integration for file uploads
- Database connection with graceful shutdown

#### Developer Experience
- Complete environment configuration template
- Database seeding script with sample data
- PM2 ecosystem configuration for production
- Comprehensive documentation:
  - README.md - Project overview and architecture
  - API_DOCUMENTATION.md - Complete API reference with examples
  - DEPLOYMENT.md - Production deployment guide
  - QUICKSTART.md - 5-minute setup guide
  - CHANGELOG.md - Version history
- Postman collection for API testing
- .gitignore configured for Node.js projects

#### Multi-Tenant Features
- Business-scoped queries throughout all models
- Slug-based unique identification for subdomain support
- Ownership verification on all protected routes
- Proper MongoDB indexing for multi-tenant performance
- Dynamic attributes for flexible data models

#### Business Type Support
- Kirana Stores
- Clothing/Fashion
- Restaurants
- Coaching Centers
- Medical Stores
- Salon & Spa
- Rental Properties
- Services
- Electronics
- Furniture
- Books & Stationery
- Toys & Games
- Sports Equipment
- Pet Supplies
- Home Decor

#### Subscription Plans
- Free Plan (10 listings, 30 days)
- Starter Plan (₹199, 50 listings, booking, analytics)
- Pro Plan (₹499, 200 listings, custom domain, priority support)
- Enterprise Plan (₹999, unlimited everything, API access)

### 🔧 Configuration
- Node.js 18+ required
- MongoDB as primary database
- Environment-based configuration (development/production)
- Configurable JWT expiry times
- Customizable rate limits
- CORS whitelist configuration

### 📦 Dependencies
**Core:**
- express (4.18.2)
- mongoose (8.0.3)
- dotenv (16.3.1)

**Authentication:**
- bcryptjs (2.4.3)
- jsonwebtoken (9.0.2)

**Security:**
- helmet (7.1.0)
- cors (2.8.5)
- express-mongo-sanitize (2.2.0)
- express-rate-limit (7.1.5)

**Utilities:**
- slugify (1.6.6)
- morgan (1.10.0)
- winston (3.11.0)
- multer (1.4.5-lts.1)
- cloudinary (1.41.1)
- express-validator (7.0.1)

**Development:**
- nodemon (3.0.2)

### 🎯 Design Principles
- **Multi-tenant first** - Every query scoped by business
- **Universal models** - No business-type-specific hardcoding
- **Flexible attributes** - Dynamic properties without schema changes
- **Clean architecture** - Proper separation of concerns (MVC)
- **API-first design** - RESTful endpoints with consistent responses
- **Security by default** - JWT, validation, sanitization, rate limiting
- **Production-ready** - PM2, logging, error handling, monitoring

### 📊 Performance Optimizations
- Compound indexes on frequently queried fields
- Text indexes for search functionality
- 2dsphere indexes for geo-spatial queries
- Lean queries where appropriate
- Pagination on all list endpoints
- Database connection pooling

### 🔐 Security Best Practices
- Password hashing with bcrypt (10 rounds)
- JWT tokens with configurable expiry
- Refresh token rotation
- MongoDB query sanitization
- Rate limiting per IP address
- Helmet security headers
- CORS whitelist configuration
- Input validation on all endpoints
- Role-based access control

---

## [Unreleased]

### 🚀 Planned Features
- File upload compression and optimization
- Redis caching for frequently accessed data
- WebSocket support for real-time notifications
- Email notification system (SendGrid/AWS SES)
- SMS notifications via Twilio
- Payment gateway integration (Razorpay/Stripe)
- Advanced analytics and reporting
- Automated backups
- Multi-language support
- GraphQL API option
- OpenAPI/Swagger documentation generation
- Automated testing suite (Jest + Supertest)
- Performance monitoring (New Relic/DataDog)
- Error tracking (Sentry)

---

## Version Format

**MAJOR.MINOR.PATCH**

- **MAJOR:** Incompatible API changes
- **MINOR:** Backward-compatible functionality additions
- **PATCH:** Backward-compatible bug fixes

---

## Release Notes

### v1.0.0 - Initial Release
This is the first production-ready release of the Apnidukan Backend. The system has been architected from the ground up as a scalable multi-tenant SaaS platform that eliminates the limitations of hardcoded business-specific logic found in traditional e-commerce systems.

**Key Achievement:** Universal Listing model that supports products, services, courses, food items, and rental properties without requiring schema modifications.

**Migration from Previous System:**
- ✅ Removed duplicated Product and Vendor models
- ✅ Eliminated business-type-specific field coupling
- ✅ Consolidated authentication into single User model
- ✅ Replaced complex Order system with lightweight Inquiry tracking
- ✅ Added proper multi-tenant isolation
- ✅ Implemented slug-based routing for subdomain support

**Production Readiness:**
- Complete error handling and logging
- Security hardening (JWT, sanitization, rate limiting)
- Performance optimization (indexing, pagination)
- Comprehensive documentation
- Deployment guides for multiple platforms
- PM2 process management configuration
- Database seeding for quick setup

---

## Support

For questions, issues, or feature requests:
- Create an issue in the repository
- Check documentation in [README.md](README.md)
- Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- Follow [QUICKSTART.md](QUICKSTART.md) for setup help

---

**Semantic Versioning:** This project follows [semver.org](https://semver.org/)
