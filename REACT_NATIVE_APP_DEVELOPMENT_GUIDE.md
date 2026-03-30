# React Native App Development Guide (Apnidukan)

This guide is for building a mobile app in React Native using the existing Apnidukan backend.

It is written for practical implementation so you can directly start development.

UI/UX companion guide:
- [MOBILE_UI_UX_GUIDELINES.md](MOBILE_UI_UX_GUIDELINES.md)

---

## 1. Goal

You already have:
- Backend API in [backend](backend)
- Web apps for customer, business owner, and admin

Now you want:
- A React Native mobile app that consumes the same backend APIs

Recommended approach:
- Phase 1: Customer + Business Owner app in one codebase (role-based)
- Phase 2: Admin operations in web only (or separate RN app if required)

---

## 2. Existing System Snapshot

Backend base modules available:
- Auth: `/api/auth`
- Business: `/api/business`
- Business Types: `/api/business-types`
- Listings: `/api/listings`
- Inquiries: `/api/inquiries`
- Categories: `/api/categories`
- Bookings: `/api/bookings`
- Plans: `/api/plans`
- Payments: `/api/payments`
- Upload: `/api/upload`
- Referrals: `/api/referrals`
- Social: `/api/social`
- Orders: `/api/orders`
- Support: `/api/support`
- Invoices: `/api/invoices`
- Health: `/api/health`

Reference files:
- [backend/routes/index.js](backend/routes/index.js)
- [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md)
- [backend/README.md](backend/README.md)

---

## 3. React Native Tech Stack (Recommended)

Use Expo for faster development and OTA updates.

Core stack:
- React Native + Expo
- TypeScript
- React Navigation
- TanStack Query (API caching + async state)
- Zustand or Redux Toolkit (global app state)
- Axios (API client)
- React Hook Form + Zod (forms + validation)
- Secure token storage: `expo-secure-store`
- Image handling: `expo-image-picker`
- Push notifications: `expo-notifications`

Optional:
- Sentry for crash monitoring
- Firebase analytics/events

---

## 4. Suggested App Architecture

Single app with role-based navigation.

```text
src/
  api/
    client.ts
    auth.api.ts
    business.api.ts
    listings.api.ts
    bookings.api.ts
    referrals.api.ts
    support.api.ts
  store/
    auth.store.ts
    app.store.ts
  navigation/
    RootNavigator.tsx
    AuthNavigator.tsx
    CustomerNavigator.tsx
    OwnerNavigator.tsx
  screens/
    auth/
    customer/
    owner/
    shared/
  components/
  hooks/
  utils/
  types/
```

Navigation flow:
1. Splash
2. Auth check (token + `/api/auth/me`)
3. Route by role

Role mapping from backend:
- `business_owner` -> Owner app flow
- non-owner/public -> Customer flow
- admin -> usually web panel (recommended)

---

## 5. Environment Configuration

Create `.env` in RN project:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_SERVER_IP:5000
EXPO_PUBLIC_UPLOAD_BASE_URL=http://YOUR_SERVER_IP:5000
```

Notes:
- Android emulator localhost mapping may require `10.0.2.2`
- Physical device must use LAN/public server IP
- Ensure backend CORS allows mobile origin strategy

---

## 6. API Client Standard

Implement one shared Axios client:
- Base URL from env
- Request interceptor: attach Bearer access token
- Response interceptor: if 401, call refresh endpoint and retry
- If refresh fails, logout user and clear secure storage

Token strategy:
- Store access + refresh token in `expo-secure-store`
- Keep user profile in memory store
- Re-validate session on app start with `/api/auth/me`

---

## 7. Authentication Flow (RN)

Primary endpoints:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `PUT /api/auth/profile`

Flow:
1. User login/register
2. Save tokens securely
3. Fetch profile (`/api/auth/me`)
4. Route to role navigator
5. Auto refresh on token expiry

Social login:
- Use backend social auth endpoints under `/api/social` and `/api/auth/social/*` where configured
- Keep one unified auth store regardless of auth provider

---

## 8. Feature to API Mapping

### Customer Side

- Home discovery
  - `GET /api/business`
  - `GET /api/categories`
  - `GET /api/business-types`
- Shop details
  - `GET /api/business/slug/:slug`
  - `GET /api/listings/business/:businessId`
- Inquiry or contact
  - `POST /api/inquiries`
- Booking
  - `GET /api/bookings/available/:businessId`
  - `POST /api/bookings/:id/book`

### Business Owner Side

- My businesses
  - `GET /api/business/my/businesses`
  - `POST /api/business`
  - `PUT /api/business/:id`
- Listing management
  - `POST /api/listings`
  - `PUT /api/listings/:id`
  - `DELETE /api/listings/:id`
- Inquiries dashboard
  - `GET /api/inquiries/business/:businessId`
  - `PUT /api/inquiries/:id/status`
- Bookings management
  - `POST /api/bookings`
  - `POST /api/bookings/bulk`
  - `GET /api/bookings/business/:businessId`
  - `PUT /api/bookings/:id/status`
- Subscriptions and payments
  - `GET /api/plans`
  - `POST /api/payments/*`
- Referral and rewards
  - `/api/referrals/*`
- Support and invoices
  - `/api/support/*`
  - `/api/invoices/*`

Always cross-check exact request/response schema from:
- [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md)

---

## 9. Screen Blueprint

### Shared
- SplashScreen
- LoginScreen
- RegisterScreen
- ProfileScreen
- NotificationCenter

### Customer
- HomeScreen
- CategoryShopsScreen
- BusinessDetailScreen
- ListingDetailScreen
- BookingSlotsScreen
- InquiryFormScreen

### Business Owner
- OwnerDashboardScreen
- MyBusinessesScreen
- CreateEditBusinessScreen
- ListingsScreen
- CreateEditListingScreen
- InquiriesScreen
- BookingsScreen
- PlansScreen
- ReferralScreen
- SupportScreen
- InvoicesScreen

---

## 10. File Upload Strategy

For business/listing images:
- Pick image using `expo-image-picker`
- Build `FormData` with image file
- Send multipart request to `/api/upload/*` or endpoint accepting images
- Store and render returned URL

Validation checklist:
- Max file size
- File type allow-list
- Retry on network failure

---

## 11. Payments in React Native

Backend already has payment module under `/api/payments`.

Recommended:
- Keep payment order creation on backend
- In RN app, use provider SDK/WebView flow as required
- On success, verify payment with backend endpoint
- Do not trust client-side payment status without server verification

---

## 12. Error Handling and Security

Must implement:
- Global API error parser
- Network offline handling and retry UI
- Secure token storage only
- Logout on refresh token invalid
- Rate-limit and suspicious error fallback messages

Recommended response model handling:
- `success` boolean
- `message` string
- `data` payload
- `pagination` if list endpoint

---

## 13. Development Plan (Practical Milestones)

### Milestone 1: Foundation (2-3 days)
- Create Expo TypeScript app
- Setup navigation, query client, axios client
- Add secure token storage
- Implement auth screens

### Milestone 2: Customer Core (3-5 days)
- Business list + filters
- Business details + listings
- Inquiry submit
- Booking flow

### Milestone 3: Owner Core (5-7 days)
- Owner dashboard
- Business create/update
- Listing CRUD
- Inquiry and booking management

### Milestone 4: Revenue Features (3-4 days)
- Plans page
- Payments integration
- Referral module
- Invoices

### Milestone 5: Stabilization (3-5 days)
- Error states
- Offline support
- Performance optimization
- QA and release build

---

## 14. Testing Checklist

Functional:
- Auth login/refresh/logout
- Role-based route protection
- Business/listing CRUD
- Booking create and status updates
- Inquiry lifecycle
- Payment success/failure/verification

Technical:
- Slow network behavior
- Token expiry mid-session
- App restart session restore
- Android + iOS compatibility

---

## 15. Release Readiness

Before production:
- API base URL points to production backend
- SSL enabled
- Push notification keys configured
- Crash monitoring enabled
- Privacy policy and terms linked in app
- Proper app icons/splash/screenshots

---

## 16. Quick Start Commands (React Native)

```bash
npx create-expo-app apnidukan-mobile -t expo-template-blank-typescript
cd apnidukan-mobile
npm install @react-navigation/native @react-navigation/native-stack
npm install @tanstack/react-query axios zustand
npm install react-hook-form zod @hookform/resolvers
npx expo install expo-secure-store expo-image-picker expo-notifications
npx expo start
```

---

## 17. Important Notes from Current Backend Behavior

- Auth uses unified user model and `business_owner` role for dukandar flows
- Suspended dukandar may still access support flow, so app should show restricted mode state gracefully
- Referral reward lifecycle includes request and admin approval states; do not assume instant reward activation in UI

---

## 18. Next Implementation Order (If You Want Fast MVP)

1. Auth + token refresh
2. Business discovery list
3. Business detail + listing detail
4. Owner business management
5. Inquiry + booking
6. Plans + payment
7. Referral + support + invoice

This sequence gives the fastest usable mobile product while preserving future scalability.
