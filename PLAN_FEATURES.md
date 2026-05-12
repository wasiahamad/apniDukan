# Plan Features & Entitlements (Hinglish Documentation)

Ye document **subscription plan features** (feature flags) aur **entitlements** ke behavior ko explain karta hai — kaunse plan me kya unlock hota hai, expiry/suspension me kya hota hai, aur kiski kya responsibility hai.

## 1) TL;DR (1-minute summary)

- Har business ke liye **effective entitlements** nikalte hain: `plan + defaults + business overrides`.
- Agar **plan active nahi** hai (`planExpiresAt` past), system **sab monetized features disable** kar deta hai (mostly `false`, counts `0`).
- Dashboard me kuch routes/menus **feature flags** se hide/disable hote hain; backend me protected endpoints ke liye middleware 403 de deta hai.

**Core source of truth**:
- Backend calculation: `backend/services/entitlementsService.js`
- Backend enforcement (403): `backend/middleware/entitlements.js`
- Dashboard gating UI: `dukandarDashboard/src/components/RequireFeature.tsx`
- Dashboard layout access modes: `dukandarDashboard/src/components/DashboardLayout.tsx`

---

## 2) Key Concepts (Important terms)

### 2.1 Plan
Plan ek DB document hota hai (Mongoose model), jisme:
- `name`, `slug`, `price`, `durationInDays`, `billingCycle`, etc.
- `features` object: yahi feature flags/limits define karta hai.

### 2.2 Business Entitlements (Effective Entitlements)
Business ke liye effective entitlements ka matlab:

1) **Plan active hai?**
- `planIsActive = business.plan exists AND business.planExpiresAt future`

2) **Plan active hai to:**
- `features = DEFAULT_FEATURES + plan.features + business.featureOverrides`
- Extra rule: booking ke liye business type ka default bhi apply hota hai (details below)

3) **Plan inactive hai to:**
- `features = INACTIVE_PLAN_FEATURES` (mostly all off)

### 2.3 Defaults vs Inactive Defaults
- `DEFAULT_FEATURES`: agar plan me naya key missing ho (older plans), to default se inherit ho jata hai.
- `INACTIVE_PLAN_FEATURES`: subscription expire hote hi strict disable set.

### 2.4 Business Overrides
Admin per-business `featureOverrides` set kar sakta hai.
- Missing key = inherit from plan
- Key present = override plan value

### 2.5 Booking Special Rule (BusinessType)
Agar business ne `featureOverrides.bookingEnabled` explicitly set nahi kiya, to booking access:
- `features.bookingEnabled (from plan)` AND `businessType.defaultBookingEnabled`

Iska matlab: plan me booking on ho sakta hai, but agar business type booking allow nahi karta, to booking effectively off ho jayega.

---

## 3) Responsibility (Kaun kya karta hai?)

### 3.1 Admin Responsibilities
- Plans create/update/delete (pricing, duration, feature flags)
- Per-business overrides set karna (special cases)
- Business suspension (`isActive=false`) / verification (`isVerified=false`) decisions
- Support-only mode scenarios me user ko guide karna

### 3.2 Dukandar (Business Owner) Responsibilities
- Plan purchase/renew time par payment + verification complete karna
- Plan expiry se pehle renew/upgrade
- Feature expectations ko plan page se match karna (kya on/off hai)
- If feature disabled: upgrade/renew flow follow karna

### 3.3 System Responsibilities (Backend + Dashboard)
- Effective entitlements compute karna consistently
- Expiry/suspension/verification rules enforce karna
- Feature-gated pages ko UI me hide/guard karna
- Protected APIs ko backend middleware se block karna

---

## 4) Account/Access Modes (Dashboard behavior)

Dashboard me 3 special states hain (in addition to “normal active”):

1) **Suspended** (business `isActive=false`)
- Access: mostly limited to Dashboard + Settings (support-only style)
- Note: Support page/tickets ka access allow rehta hai

2) **Verification Pending** (business `isVerified=false`)
- Access: limited until admin verification

3) **Subscription Expired** (`planExpiresAt` past)
- Access: Dashboard + Subscription + Settings (and Support) only
- Baaki feature pages blocked

Note: Ye UI-level UX convenience hai; backend still planIsActive checks lagata hai.

---

## 5) Feature Keys Reference (Har feature ka meaning)

Neeche “feature key” ka matlab aur expected behavior:

### Limits / Counts

#### `maxListings: number`
- Listings ki max allowed count.
- Special: **`< 0` = unlimited** (e.g., `-1`).
- Inactive plan: `0` (listing add not allowed)

#### `maxFeaturedListings: number`
- Featured listings ki max allowed count.
- Usually `featuredEnabled=true` ke saath relevant.
- Special: `< 0` unlimited.

### Shop / Public Presence

#### `publicShopEnabled: boolean`
- Customer-facing public shop publish kar sakte ho ya nahi.
- Dashboard me “View Shop” link isi se enable/disable hota hai.
- Inactive plan: `false`

#### `customDomain: boolean`
- Custom domain mapping allow/not.

#### `removeWatermark: boolean`
- Branding watermark removal.

#### `seoTools: boolean`
- SEO tools (metadata, indexing helpers, etc.)

### Commerce / Operations

#### `ordersEnabled: boolean`
- Orders module access.

#### `inquiriesEnabled: boolean`
- Inquiries/leads module access.

#### `bookingEnabled: boolean`
- Bookings module access.
- BusinessType rule applies (see section 2.5).

#### `offersEnabled: boolean`
- Public shop par offers/discount banners.

### Engagement / Growth

#### `storiesEnabled: boolean`
- Stories & Reels module access.

#### `listingStoriesEnabled: boolean`
- Existing listings ko story/reel me “attach/link” karna.

#### `ratingsEnabled: boolean`
- Ratings module access.

#### `referralsEnabled: boolean`
- Referrals page/module.

### Analytics / Integrations

#### `analyticsEnabled: boolean`
- Analytics dashboard access.

#### `whatsappIntegration: boolean`
- WhatsApp integration features.

#### `whatsappSettingsEnabled: boolean`
- WhatsApp settings page access.

#### `apiAccess: boolean`
- API access for integrations.

### Support / Service Level

#### `prioritySupport: boolean`
- Priority support eligibility.

#### `supportTicketsEnabled: boolean`
- Support tickets module.
- Note (Dashboard): Agar account **suspended** ho, UI `supportTicketsEnabled` ko bypass karke **support page ko allow** karta hai (so dukandar support raise kar sake).

### AI Modules

#### `aiCustomerChatEnabled: boolean`
- Public shop pages par customer-facing AI chat.

#### `aiDukandarAgentEnabled: boolean`
- Dashboard tools/assistant (AI) for dukandar.

---

## 6) Modules Deep Dive (Features ke andar kya-kya hai + kaise kaam karega?)

Is section me main har major feature ko **module** ki tarah explain kar raha hoon:
- Dukandar ko UI me kya dikhega
- Backend me kaunse endpoints/flows chalenge
- Entitlement checks kaha-kaha apply hote hain
- Dependencies (ek feature dusre pe depend)

### 6.1 Dashboard me feature gating ka “real” behavior
Dashboard me 2 tarah se gating hoti hai:

1) **Menu hide/show (Sidebar)**
- Sidebar me items `features[key]` se filter hote hain.

2) **Route guard (RequireFeature wrapper)**
- Routes `RequireFeature(feature="...")` wrapper me hote hain.
- Feature off ho to “Upgrade required” card show hota hai.

3) **Support-only mode (Suspended/Unverified/Expired)**
- In states me limited routes allow hote hain (Dashboard/Subscription/Settings/Support).

### 6.2 `publicShopEnabled` (Public Shop / Shop Subdomain)
**Kya-kya aata hai:**
- Customer-facing public shop accessible hona
- Public shop pages ke related public APIs ka accessible hona (offers/reviews etc.)

**Kaise kaam karega:**
- Dashboard header/sidebar me “View Shop” tabhi enable hota hai jab `publicShopEnabled === true`.
- Public endpoints (example: reviews/offers) `publicShopEnabled` off hone par **404 / shop hidden** behavior de sakte hain.

**Dependency:**
- Ratings (`ratingsEnabled`) aur Offers (`offersEnabled`) public shop experience ko affect karte hain.

### 6.3 `maxListings` + `featuredEnabled` + `maxFeaturedListings` (Listings limits)
**Kya-kya aata hai:**
- Listing count limit (`maxListings`)
- Featured listing toggles (`featuredEnabled`) + featured limit (`maxFeaturedListings`)

**Kaise kaam karega:**
- `maxListings = 0` => listing add practically block (plan inactive me ye hota hai).
- `< 0` => unlimited.

### 6.4 `bookingEnabled` (Bookings / Slots)
**Kya-kya aata hai:**
- Slot timings/templates (recurring timings)
- Slots create (single/bulk)
- Owner bookings list + stats
- Customer booking flow

**Backend routes (Base: `/api/bookings`)**
- Public:
	- `GET /available/:businessId`, `GET /available/slug/:slug`
	- `GET /slots/slug/:slug`
	- `POST /book/slug/:slug`, `POST /:id/book` (customer)
- Protected:
	- `POST /templates/replace`, `GET /templates/business/:businessId`
	- `POST /`, `POST /bulk`
	- `GET /my`, `GET /business/:businessId`, `GET /business/:businessId/stats`
	- `POST /:id/cancel`, `PUT /:id/status`

**Entitlement checks (important):**
- Booking routes file me `requireOwnerFeature('bookingEnabled')` nahi laga, but controller ke andar strict checks hain:
	- `entitlements.features.bookingEnabled === true`
	- `entitlements.planIsActive === true` (warna 403 “renew to use bookings”)

**Extra permissions:**
- Timings change karne ke liye owner ko allow tabhi jab:
	- businessType allow kare (`ownerCanEditBookingTimings`), **ya**
	- admin ne business pe override enable kiya ho (`bookingTimingsOverrideEnabled`).

**Dependency:**
- BusinessType default booking rule (section 2.5) apply hota hai.

### 6.5 `offersEnabled` (Offers / Discounts)
**Kya-kya aata hai:**
- Dashboard Offers module
- Listings me discount price support (e.g. `oldPrice` style fields)
- Public shop par offers show/hide behavior

**Backend enforcement (Base: `/api/offers`)**
- Owner routes feature gated hain:
	- `GET /my`, `POST /`, `PUT /:id`, `DELETE /:id` => `requireOwnerFeature('offersEnabled')`

**Public behavior:**
- Public shop par, agar shop active hai but offers disabled hain, system offers ko **empty list** return kar sakta hai (shop hidden nahi hota, only offers hide hote hain).

### 6.6 `storiesEnabled` + `listingStoriesEnabled` (Stories/Reels)
**Kya-kya aata hai:**
- Direct story/reel upload (image/video)
- Listing se story create (auto-link)
- Views tracking + viewers list
- Update/delete story

**Backend routes:**
- `POST /api/story` => requires `storiesEnabled`
- `POST /api/stories/from-listing` => requires `storiesEnabled` + `listingStoriesEnabled`
- `GET /api/stories` (public feed)
- `PATCH /api/stories/:id`, `DELETE /api/stories/:id` (owner writes)
- `POST /api/stories/:id/view`, `GET /api/stories/:id/viewers`

**Kaise kaam karega (writes):**
- Story create/update/delete me verification gate bhi hota hai: `requireVerifiedBusinessOwnerForWrites`.
- Upload rules:
	- image/video only
	- max ~25MB

**Dependency:**
- Listing se story create karne ke liye `listingStoriesEnabled` ke saath `storiesEnabled` bhi required hai.

### 6.7 `ordersEnabled` (Orders)
**Kya-kya aata hai:**
- Public storefront order create
- Owner orders list + summary
- Order status update
- Customer “my orders”

**Backend routes (Base: `/api/orders`)**
- Public:
	- `POST /public`
	- `GET /public/business/:businessId/count`
- Customer:
	- `GET /me`
- Owner (feature gated):
	- `GET /my/summary`, `GET /my`, `PATCH /:id/status` => `requireOwnerFeature('ordersEnabled')`

### 6.8 `inquiriesEnabled` (Inquiries / Leads)
**Kya-kya aata hai:**
- Public inquiry create (lead form)
- Owner inquiries list + stats
- Status update, notes, delete

**Backend routes (Base: `/api/inquiries`)**
- Public: `POST /`
- Owner/Protected (feature gated):
	- `GET /business/:businessId`, `GET /business/:businessId/stats`
	- `GET /:id`, `PUT /:id/status`, `POST /:id/notes`, `DELETE /:id`

**Kaise kaam karega:**
- BusinessId-based routes `requireBusinessFeatureByIdParam(..., 'inquiriesEnabled')` se check karte hain.

### 6.9 `ratingsEnabled` (Ratings / Reviews)
**Kya-kya aata hai:**
- Public reviews list + summary (avg rating)
- Customer review create
- Dukandar dashboard Ratings page access

**Backend routes (Base: `/api/reviews`)**
- `GET /business/:slug/summary`
- `GET /business/:slug`
- `POST /business/:slug` (customer)

**Kaise kaam karega:**
- Public side par shop access ke saath ratings check bhi hota hai:
	- `publicShopEnabled === true` AND `ratingsEnabled === true`
	- warna 404 (public me hide)

### 6.10 `locationEnabled` (Location)
**Kya-kya aata hai:**
- Owner business location save/update
- Location-based discovery/nearby experiences enable

**Backend route:**
- `PUT /api/business/location` => `requireOwnerFeature('locationEnabled')`

### 6.11 `invoicesEnabled` (Invoices)
**Kya-kya aata hai:**
- Invoice list, detail, PDF download

**Backend routes (Base: `/api/invoices`)**
- `GET /` (owner) => `requireOwnerFeature('invoicesEnabled')`
- `GET /:id`, `GET /:id/pdf` (owner/admin) => `requireOwnerFeature('invoicesEnabled')`

### 6.12 `referralsEnabled` (Referrals)
**Kya-kya aata hai:**
- Referral stats + history
- Active offer selection
- Reward request
- Admin management for offers/rewards

**Owner routes (Base: `/api/referrals`)** (feature gated)
- `GET /my/stats`, `GET /my/history`
- `PUT /my/active-offer`
- `POST /` (create referral)
- `POST /request-reward`

### 6.13 `brandingEnabled`, `whatsappSettingsEnabled`, `analyticsEnabled`
**Kya-kya aata hai:**
- Branding page, WhatsApp settings page, Analytics page access

**Kaise kaam karega:**
- Ye mostly dashboard routing level par `RequireFeature(feature="...")` wrapper se protected hain.

### 6.14 AI Flags (`aiCustomerChatEnabled`, `aiDukandarAgentEnabled`)
**Kya-kya aata hai:**
- Customer-facing AI chat on public shop
- Dukandar-facing AI tools

**Kaise kaam karega:**
- Backend AI controllers/services in flags ko check karke AI flows allow/disallow karte hain.

---

## 7) Plan-wise Example Matrix (Seed Default Plans)

Ye “sample seed plans” backend seed script se aate hain. Real production me plans DB me change ho sakte hain.

Source: `backend/scripts/seed.js`

### 6.1 Free (`slug: free`)
- `price: 0`
- `maxListings: 10`
- `bookingEnabled: false`
- `featuredEnabled: false`, `maxFeaturedListings: 0`
- `analyticsEnabled: false`
- `customDomain: false`
- `prioritySupport: false`
- `whatsappIntegration: true`
- `removeWatermark: false`
- `seoTools: false`
- `apiAccess: false`

### 6.2 Starter (`slug: starter`)
- `price: 199`
- `maxListings: 50`
- `bookingEnabled: true`
- `featuredEnabled: true`, `maxFeaturedListings: 3`
- `analyticsEnabled: true`
- `customDomain: false`
- `prioritySupport: false`
- `whatsappIntegration: true`
- `seoTools: true`
- `apiAccess: false`

### 6.3 Pro (`slug: pro`)
- `price: 499`
- `maxListings: 200`
- `bookingEnabled: true`
- `featuredEnabled: true`, `maxFeaturedListings: 10`
- `customDomain: true`
- `analyticsEnabled: true`
- `prioritySupport: true`
- `whatsappIntegration: true`
- `removeWatermark: true`
- `seoTools: true`
- `apiAccess: true`

### 6.4 Enterprise (`slug: enterprise`)
- `price: 999`
- `maxListings: -1` (unlimited)
- `featuredEnabled: true`, `maxFeaturedListings: -1` (unlimited)
- Baaki: mostly Pro jaisa, plus unlimited limits.

**Important:** Seed plans me kuch naye keys define nahi kiye gaye (e.g. `publicShopEnabled`, `storiesEnabled`, etc.). Aise cases me `DEFAULT_FEATURES` values apply hoti hain.

---

## 8) How Gating Works (UI + API)

### 7.1 Backend Enforcement
- API routes jaha premium feature chahiye, waha middleware `requireOwnerFeature(featureKey)` lagta hai.
- If plan inactive => `403` “subscription expired”
- If feature off => `403` “feature not enabled”

### 7.2 Dashboard Enforcement
- Sidebar nav me features ke basis par menu items hide ho jate hain.
- Individual pages ke andar `RequireFeature` wrapper use karke “Upgrade required” card show hota hai.
- Subscription expired / suspended / verification pending me app “support-only mode” jaisa behave karti hai.

---

## 9) Adding a New Plan Feature (Developer Guide)

Agar aap naya feature flag add karna chahte ho (example: `couponsEnabled`):

1) Backend Plan schema me `features.couponsEnabled` add karo (default decide karo)
2) `DEFAULT_FEATURES` + `INACTIVE_PLAN_FEATURES` me key add karo
3) Dashboard types me `EntitlementFeatures` me key add karo
4) UI gating: nav item ya `RequireFeature feature="couponsEnabled"` use karo
5) Backend routes me jaha zarurat ho, `requireOwnerFeature("couponsEnabled")` add karo

---

## 10) Common Scenarios / FAQs

### “Plan active hai but bookings show nahi ho rahe”
- Check `bookingEnabled` in plan
- Check businessType `defaultBookingEnabled` (type based restriction)
- Check business `featureOverrides.bookingEnabled` (admin override)

### “Plan expire ke baad kuch pages open nahi ho rahe”
- Expected behavior: subscription expired => limited routes only
- Fix: renew/upgrade plan

### “Feature ON hai but UI still hide kar rahi”
- Dashboard entitlements refresh karo (logout/login or refresh)
- Check `businessApi.getEntitlements()` response
- Confirm backend entitlements merges are correct
