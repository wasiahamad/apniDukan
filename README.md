# 🏪 Apnidukan Platform - Project Documentation

> **Complete local business digital transformation platform dengan 3 interconnected applications**

---

## 📖 Overview

**Apnidukan** ek complete ecosystem hai jo local businesses ko online presence dene aur customers ko nearby services discover karne mein help karta hai.

### **Platform Components:**

| Project | Purpose | Users | Tech Stack |
|---------|---------|-------|------------|
| **Local Connect Hub** | Public discovery platform | Customers | React + TypeScript + Tailwind |
| **Local Boost** | Business owner dashboard | Shop Owners | React + TypeScript + Tailwind |
| **ShopSpark Admin** | Platform management | Platform Admins | React + TypeScript + Tailwind |

---

## 🎯 Project Goals

### **Problem Statement:**
- Local businesses ko online presence ki zaroorat hai but resources nahi hote
- Customers ko nearby trustworthy services dhoondhne mein difficulty
- Complicated e-commerce platforms expensive aur difficult

### **Solution:**
- **₹199/month se** professional shop webpage
- WhatsApp-based ordering (simple & familiar)
- No technical knowledge required
- Instant setup, instant results

---

## 📚 Documentation Files

### **1. [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md)**
Complete project documentation including:
- ✅ Project objectives & goals
- ✅ Complete data models & schemas
- ✅ User workflows for all 3 platforms
- ✅ Database design & tables
- ✅ Technology stack details
- ✅ Business model & revenue streams
- ✅ Future roadmap
- ✅ Deployment guide

**Yeh file padho agar aapko chahiye:**
> Complete understanding of what data is needed, how models work, business logic, and overall architecture

### **2. [TECHNICAL_WORKFLOWS.md](./TECHNICAL_WORKFLOWS.md)**
Technical implementation details:
- ✅ System architecture diagrams
- ✅ Authentication flows (OTP, JWT)
- ✅ Shop onboarding process (step-by-step)
- ✅ Order management lifecycle
- ✅ Analytics tracking system
- ✅ Payment integration (Razorpay)
- ✅ WhatsApp Business API integration
- ✅ Search & discovery implementation

**Yeh file padho agar aapko chahiye:**
> Technical implementation details, API flows, integration patterns, and production-ready workflows

---

## 🚀 Quick Start

### **Prerequisites:**
```bash
Node.js 18+
npm or bun
PostgreSQL (for production)
```

### **Installation:**

```bash
# Local Connect Hub (Customer Platform)
cd local-connect-hub-main
npm install
npm run dev
# Opens at http://localhost:5173

# Local Boost (Business Owner Dashboard)
cd local-boost-main
npm install
npm run dev
# Opens at http://localhost:5174

# ShopSpark Admin (Admin Panel)
cd shopspark-admin-main
npm install
npm run dev
# Opens at http://localhost:5175
```

### **Demo Credentials:**

**Admin Panel Login:**
```
Email: admin@localbooster.in
Password: admin123
```

---

## 📊 Data Models Summary

### **Core Entities:**

```typescript
// Main data structures used across platform

Users → Shops → Products
                ↓
              Orders → Invoices
                ↓
          Analytics Events

Cities ← Shops → Categories
         ↓
    Subscriptions → Payments
```

### **Key Tables:**
1. **users** - Platform users (owners, admins)
2. **shops** - Business profiles
3. **products** - Shop inventory
4. **orders** - Customer orders
5. **categories** - Business categories
6. **cities** - Geographic locations
7. **subscription_plans** - Pricing plans
8. **analytics_events** - Tracking data

**Complete schema:** See [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md#-required-data-for-production-backend-models)

---

## 🔄 Complete User Journey

### **Customer Journey (Local Connect Hub):**
```
1. Homepage → Select City (Delhi)
2. Browse Categories → Select (Salon)
3. View Shop List → Apply Filters
4. Open Shop Page → View Products/Services
5. Click "Order on WhatsApp"
6. WhatsApp opens → Send message
7. Shop confirms → Order delivered
```

### **Shop Owner Journey (Local Boost):**
```
1. Sign Up → Enter Phone
2. OTP Verification
3. Onboarding Form (Business details)
4. Add Products
5. Select Subscription Plan
6. Payment
7. Shop Goes Live
8. Receive Orders → Manage Dashboard
```

### **Admin Journey (ShopSpark Admin):**
```
1. Admin Login
2. Dashboard Overview
3. Manage Shops → Approve/Suspend
4. Monitor Orders
5. Handle Support Tickets
6. View Analytics
7. Manage Subscriptions
```

---

## 💻 Technology Stack

### **Frontend (All 3 Projects):**
- **Framework:** React 18.3.1
- **Language:** TypeScript 5.8.3
- **Build:** Vite 5.4.19
- **Styling:** Tailwind CSS 3.4.17
- **UI Components:** shadcn/ui (Radix UI)
- **Routing:** React Router DOM 6.30.1
- **State:** TanStack Query 5.83.0
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts 2.15.4
- **Animations:** Framer Motion 12.34.0

### **Backend (Recommended):**
- **Runtime:** Node.js / Bun
- **Framework:** Express / Fastify
- **Database:** PostgreSQL 15+
- **ORM:** Prisma / Drizzle
- **Auth:** JWT + OTP
- **Cache:** Redis
- **Storage:** AWS S3 / Cloudinary
- **Payment:** Razorpay / Stripe
- **SMS/WhatsApp:** Twilio / MSG91

---

## 📁 Project Structure

```
Apnidukan/
├── local-connect-hub-main/     # Customer discovery platform
│   ├── src/
│   │   ├── pages/             # Route pages
│   │   ├── components/        # Reusable components
│   │   ├── data/             # Mock data & types
│   │   └── hooks/            # Custom hooks
│   └── package.json
│
├── local-boost-main/          # Business owner dashboard
│   ├── src/
│   │   ├── pages/            # Dashboard pages
│   │   ├── components/       # UI components
│   │   └── data/             # Mock data
│   └── package.json
│
├── shopspark-admin-main/      # Platform admin panel
│   ├── src/
│   │   ├── pages/            # Admin pages
│   │   ├── components/       # Admin components
│   │   ├── contexts/         # Auth context
│   │   └── lib/              # Mock data
│   └── package.json
│
├── COMPLETE_DOCUMENTATION.md   # Complete project docs
├── TECHNICAL_WORKFLOWS.md      # Technical workflows
└── README.md                   # This file
```

---

## 🔑 Key Features

### **Local Connect Hub (Customer Platform):**
- 🏙️ City-based shop discovery
- 🔍 Category filtering
- ⭐ Shop ratings & reviews
- 📱 WhatsApp ordering
- 📍 Location-based search
- 🎨 Responsive design

### **Local Boost (Business Dashboard):**
- 📊 Analytics dashboard
- 🛍️ Product management
- 📦 Order tracking
- 🎨 Branding customization
- 📈 Performance metrics
- 💳 Subscription management

### **ShopSpark Admin (Admin Panel):**
- 🏪 Shop management
- 📋 Order monitoring
- 💰 Subscription tracking
- 🎫 Support tickets
- 🚚 Delivery partners
- 📊 Platform analytics

---

## 🔐 Security Features

- ✅ OTP-based authentication
- ✅ JWT token management
- ✅ Input validation (Zod)
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ HTTPS/SSL mandatory
- ✅ Rate limiting
- ✅ CORS configuration

---

## 💰 Business Model

### **Revenue Streams:**

**Subscription Plans:**
- **Starter:** ₹199/month (5 products)
- **Pro:** ₹499/month (Unlimited products) 🔥 Most Popular
- **Business:** ₹999/month (Multi-location)
- **Enterprise:** ₹4,999/month (Custom)

**Additional Services:**
- Custom development
- Premium listings
- Digital marketing
- Photography services

**Projected Revenue (100 shops):**
> ₹57,400/month = ₹6.88 Lakhs/year

---

## 📈 Future Roadmap

### **Phase 1 - MVP (Current):**
- ✅ Basic shop profiles
- ✅ Product listings
- ✅ WhatsApp integration
- ✅ Basic analytics

### **Phase 2 - Next 3 Months:**
- 🔄 Online payments
- 🔄 Real-time order tracking
- 🔄 Customer reviews
- 🔄 SMS notifications

### **Phase 3 - 6 Months:**
- 📱 Mobile apps (React Native)
- 🤖 WhatsApp chatbot
- 🚚 Delivery partner app
- 📊 AI insights

### **Phase 4 - 1 Year:**
- 🌐 Multi-city expansion
- 🔗 Third-party integrations
- 📈 Marketing automation
- 🎁 Referral program

---

## 🛠️ Development Guide

### **For New Developers:**

1. **Start here:**
   - Read this README completely
   - Understand the 3 project structure
   - Review [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md)

2. **Understand flows:**
   - Read [TECHNICAL_WORKFLOWS.md](./TECHNICAL_WORKFLOWS.md)
   - Study authentication flow
   - Understand order lifecycle

3. **Setup locally:**
   - Install all 3 projects
   - Run development servers
   - Explore UI & features

4. **Code exploration:**
   - Start with `App.tsx` in each project
   - Check routing configuration
   - Review mock data files
   - Understand component structure

### **API Development:**
- See API endpoint list in [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md#-api-endpoints-required)
- Follow REST conventions
- Use TypeScript for type safety
- Implement proper error handling

### **Database Setup:**
- See complete schema in [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md#-required-data-for-production-backend-models)
- Use migrations for schema changes
- Seed database with test data
- Setup proper indexes

---

## 📞 Support & Contact

### **For Questions:**
- 📧 Technical: tech@apnidukan.com
- 💼 Business: business@apnidukan.com
- 🆘 Support: support@apnidukan.com

### **Resources:**
- 📖 Complete Docs: [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md)
- 🔧 Technical Guide: [TECHNICAL_WORKFLOWS.md](./TECHNICAL_WORKFLOWS.md)
- 🎨 Design System: Component documentation in each project

---

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### **Coding Standards:**
- Write TypeScript with strict mode
- Follow existing code style
- Add comments for complex logic
- Write tests for new features
- Update documentation

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🙏 Acknowledgments

- **shadcn/ui** - For beautiful UI components
- **Radix UI** - For accessible primitives
- **Tailwind CSS** - For utility-first styling
- **React Team** - For amazing framework
- **Lovable.dev** - For development platform

---

## 📊 Project Status

| Component | Status | Version | Last Updated |
|-----------|--------|---------|--------------|
| Local Connect Hub | ✅ Active | 1.0.0 | Feb 2026 |
| Local Boost | ✅ Active | 1.0.0 | Feb 2026 |
| ShopSpark Admin | ✅ Active | 1.0.0 | Feb 2026 |
| Documentation | ✅ Complete | 1.0 | Feb 26, 2026 |

---

## 🎯 Success Metrics

### **Target KPIs:**
- 📈 100 active shops in 3 months
- 💰 ₹5 Lakh MRR in 6 months
- ⭐ 4.5+ average shop rating
- 📱 10,000+ monthly active users
- 🔄 <5% monthly churn rate

---

## ⚡ Quick Links

- 📖 [Complete Documentation](./COMPLETE_DOCUMENTATION.md)
- 🔧 [Technical Workflows](./TECHNICAL_WORKFLOWS.md)
- 🚀 [Deployment Guide](./COMPLETE_DOCUMENTATION.md#-deployment-guide)
- 💾 [Database Schema](./COMPLETE_DOCUMENTATION.md#-required-data-for-production-backend-models)
- 🔌 [API Reference](./COMPLETE_DOCUMENTATION.md#-api-endpoints-required)

---

**Made with ❤️ for local businesses across India**

*Last Updated: February 26, 2026*
