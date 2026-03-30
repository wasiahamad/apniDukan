

# 🏪 Local Business Discovery Platform — Demo Website Plan

## Brand & Theme
- **Primary:** #1DBF73 (green) | **Secondary:** #FF8A00 (orange) | **Accent:** #2563EB (blue)
- **Style:** Clean, modern, mobile-first, Indian local business friendly
- **Background:** #F9FAFB | **Text:** #1F2937

---

## 📦 Mock Data Layer
All data will live in local JSON/TS files covering: cities (Delhi, Mumbai, Bangalore, Jaipur, Pune), categories (Salon, Restaurant, Grocery, Tailor, Gym, etc.), shops (~15-20 demo shops with WhatsApp numbers, ratings, coordinates, products/services), and pricing plans (Free, Pro, Premium).

---

## 🧩 Global Components

### Header
- Logo + nav links: Home, Cities, Categories, Pricing, For Business, Contact
- CTA button: "Apni Dukaan Banaye" → navigates to /for-business
- Mobile hamburger menu

### Footer
- Company links (About, Privacy, Terms)
- Auto-generated city & category lists from mock data
- Social media links

---

## 📄 Pages

### 1. Home Page (`/`)
- **Hero Section** — headline, subheadline, two CTAs ("Nearby Shops" → city selector, "Apni Dukaan Banaye" → /for-business), hero illustration
- **How It Works** — 3-step visual flow with icons
- **Featured Shops** — carousel/grid of 6 demo shop cards with image, name, category, city, WhatsApp button
- **Browse by Category** — icon grid linking to category pages
- **Browse by City** — city cards with shop count, linking to city pages
- **Pricing Preview** — 3 plan cards (Free/Pro/Premium)
- **CTA Banner** — motivational banner for business owners

### 2. City Page (`/:city` e.g. `/delhi`)
- City header with name and shop count
- Grid of all shops in that city
- Category filter chips
- Each shop card links to its public page

### 3. City + Category Page (`/:city/:category` e.g. `/delhi/salon`)
- Filtered shop listing for that city + category combo
- **Working filters:** Area dropdown, Open Now toggle, Rating sort
- Shop cards with quick-action buttons (WhatsApp, Call)

### 4. Business Public Page (`/:shopSlug` e.g. `/sharma-salon-delhi`)
- **Shop Header** — cover image, logo, name, category, rating
- **Quick Actions** — WhatsApp (opens `wa.me/`), Call (`tel:`), Directions (Google Maps link)
- **Business Info** — address, hours, weekly off, payment methods
- **Products/Services** — grid with name, price, image, "Order on WhatsApp" button
- **About** — business description
- **Location Map** — embedded static map placeholder with lat/lng link

### 5. Pricing Page (`/pricing`)
- 3 pricing plan cards with feature lists and CTA buttons
- CTAs navigate to /for-business

### 6. For Business Page (`/for-business`)
- **Pain Points** section — common problems local businesses face
- **Solution** section — how the platform solves each problem
- **Earnings Example** — calculation showing potential ROI
- **CTA** — "Register Your Shop" button (demo navigation)

### 7. Contact Page (`/contact`)
- Support WhatsApp, email, office address
- Simple contact form (demo only, shows success toast on submit)

### 8. Static Pages
- `/about` — company story and mission
- `/privacy-policy` — placeholder privacy policy
- `/terms` — placeholder terms of service

---

## ⚙️ Key Functional Behaviors
- **Dynamic routing** from mock data — all city, category, and shop pages generated from data
- **Filters work** on demo data (area, open now, rating) with real-time filtering
- **WhatsApp buttons** open `https://wa.me/{number}?text=...`
- **Call buttons** use `tel:{number}`
- **Map buttons** open Google Maps with coordinates
- **Mobile-first responsive** design across all pages
- **Smooth navigation** with React Router
- **Toast notifications** for demo actions (form submit, CTA clicks)

---

## 🎨 Design Approach
- Card-based layouts with subtle shadows and rounded corners
- Green (#1DBF73) for primary actions, Orange (#FF8A00) for secondary/highlight
- Hindi-English mixed copy for authenticity (headlines in Hinglish)
- Trust signals: ratings, "Verified" badges, shop count stats
- Responsive grid: 1 column mobile → 2-3 columns tablet → 4 columns desktop

