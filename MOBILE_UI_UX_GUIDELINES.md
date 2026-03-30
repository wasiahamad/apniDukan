# Mobile UI/UX Guidelines (Apnidukan React Native)

This document defines the UI and UX system for the Apnidukan mobile app.

It is focused on practical implementation so your app can look polished, modern, and consistent from day one.

---

## 1. Product Experience Direction

### Core experience goals
- Fast local discovery for customers
- Low-friction business management for dukandar users
- Trust-first interface for payments, bookings, and support

### Design personality
- Tone: warm, local, reliable, premium-but-affordable
- Feel: clean blocks, soft corners, strong contrast, clear hierarchy
- Avoid: generic template look, over-decorated gradients, random icon styles

---

## 2. Visual Design System

## 2.1 Color Tokens

Use a warm local-commerce palette (no purple bias):

- Brand Primary: `#D74E09` (orange rust)
- Brand Primary Dark: `#B53F06`
- Accent: `#0F766E` (teal)
- Success: `#15803D`
- Warning: `#B45309`
- Error: `#B91C1C`
- Surface: `#FFFDF8`
- Card: `#FFFFFF`
- Text Primary: `#1F2937`
- Text Secondary: `#6B7280`
- Border: `#E5E7EB`

Use semantic tokens in code:
- `bgPrimary`, `textPrimary`, `surfaceCard`, `statusSuccess`, etc.

Do not hardcode color literals in component files.

## 2.2 Typography

Avoid default system stack as primary brand type.

Recommended:
- Headings: Sora (600/700)
- Body: Manrope (400/500/600)

Scale:
- Display: 34/40
- H1: 28/34
- H2: 22/28
- H3: 18/24
- Body L: 16/24
- Body M: 14/20
- Caption: 12/16

Rules:
- Max 2 font families
- No more than 4 weight levels
- Use letter spacing only for labels or tiny meta text

## 2.3 Spacing and Layout

Use 4-point base grid:
- `4, 8, 12, 16, 20, 24, 32, 40`

Safe layout defaults:
- Screen horizontal padding: 16
- Card padding: 14 or 16
- Section gap: 20
- Input height: 48
- Button height: 48 (large: 52)

## 2.4 Radius and Elevation

- Chip radius: 999
- Input radius: 12
- Card radius: 16
- Modal radius: 20
- Bottom sheet top radius: 24

Shadow style:
- Keep subtle shadows and prefer layered depth with borders + soft shadow

---

## 3. Interaction Design

## 3.1 Motion principles
- Motion should guide, not distract
- Use 150-280ms for most transitions
- Prefer spring for card/sheet movement

Recommended libs:
- `react-native-reanimated`
- `react-native-gesture-handler`
- `moti` (optional)

Animation usage:
- Screen entry fade + slight upward translate
- List cards stagger (40ms delay steps)
- Button press scale to 0.98 with haptic feedback
- Bottom sheet drag with spring settle

## 3.2 Micro-interactions
- Loading skeleton for all list views
- Pull to refresh on data screens
- Success toast + check icon after important actions
- Inline error text below fields (not only toast)

## 3.3 Haptics
Use haptics for:
- Successful submit
- Booking confirmation
- Payment success
- Long press actions

---

## 4. UX Architecture by Role

## 4.1 Customer UX

Main nav (bottom tabs):
1. Home
2. Explore
3. Bookings
4. Profile

Critical flows:
- Home -> city/category -> shop list -> shop detail -> inquiry/booking
- Search -> filter -> result list -> detail

UX rules:
- Show city context at top on all discovery screens
- Keep filters sticky and visible
- Minimize deep nesting; max 3 levels before detail page

## 4.2 Business Owner UX

Main nav (bottom tabs):
1. Dashboard
2. Listings
3. Bookings
4. Inbox
5. Account

Critical flows:
- Login -> business selector -> dashboard KPIs
- Add listing -> upload images -> publish
- Inquiry status update in 2 taps

UX rules:
- Highlight action shortcuts on dashboard
- Keep all high-frequency actions reachable within 1-2 taps
- Show suspended-mode banner with support quick action

---

## 5. Screen-Level UI Specifications

## 5.1 Splash and Auth

Splash:
- Brand mark center
- Subtle animated gradient wash background
- Version text at bottom

Login/Register:
- Large title + trust text
- Inputs with clear labels (not placeholder-only)
- Strong primary CTA
- Secondary CTA as text button
- Social login buttons if enabled

## 5.2 Home Screen (Customer)

Sections order:
1. Location header
2. Search bar
3. Category pills
4. Featured shops carousel
5. Nearby shops list

Card design:
- Shop image top
- Name, category, rating, area
- Open/Closed status badge
- CTA: View Shop

## 5.3 Business Detail Screen

Top:
- Hero image gallery
- Shop name, rating, open state

Middle:
- Tabs: Products/Services, About, Reviews

Bottom sticky action bar:
- WhatsApp
- Call
- Book Now

## 5.4 Owner Dashboard

Top cards:
- Total inquiries
- Total bookings
- Conversion trend

Quick action row:
- Add listing
- Add slot
- Share shop
- Raise support ticket

Recent activity feed:
- Latest inquiries and bookings with status chips

---

## 6. Component Library Standards

Build reusable RN components before screen implementation.

Core components:
- `AppHeader`
- `PrimaryButton`, `SecondaryButton`, `GhostButton`
- `TextField`, `PhoneField`, `SearchField`
- `ShopCard`, `ListingCard`, `StatCard`
- `StatusChip`
- `AppBottomSheet`
- `EmptyState`
- `ErrorState`
- `SkeletonBlock`

Rules:
- Every component supports loading/disabled states
- Every interactive component supports accessibility label
- Keep variant props consistent (`size`, `tone`, `state`)

---

## 7. Accessibility Requirements

Minimum requirements:
- Touch target >= 44x44
- Color contrast >= WCAG AA
- Support dynamic type scaling
- All icons with accessible labels where actionable
- Focus order logical for screen readers

Language support:
- Plan for Hindi + English content rendering
- Avoid text clipping with longer Hindi strings

---

## 8. Empty, Loading, and Error States

Every major screen must define:
- Initial loading state
- Empty state with action
- Retry state for failed API call

Examples:
- No shops found -> show edit filters CTA
- No bookings -> show create booking prompt
- API failure -> retry button + support link

---

## 9. Design-to-Code Tokens (Starter)

Create `src/theme/tokens.ts`:

```ts
export const colors = {
  primary: '#D74E09',
  primaryDark: '#B53F06',
  accent: '#0F766E',
  success: '#15803D',
  warning: '#B45309',
  error: '#B91C1C',
  surface: '#FFFDF8',
  card: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};
```

---

## 10. Implementation Checklist

1. Setup fonts and tokens before screens
2. Build component library with Storybook-like preview screen
3. Implement auth flow UI
4. Implement customer home + business detail
5. Implement owner dashboard + listing flow
6. Add loading/empty/error states on each screen
7. Add motion and haptics polish pass
8. Run accessibility and device-size QA pass

---

## 11. Device QA Matrix

Must test on:
- Android small screen (5.5")
- Android large screen (6.7")
- iPhone standard (6.1")
- iPhone compact width

Orientation:
- Portrait primary
- Landscape support optional for detail screens

---

## 12. Recommended UI Packages

```bash
npm install react-native-svg react-native-safe-area-context
npm install react-native-reanimated react-native-gesture-handler
npm install @gorhom/bottom-sheet
npm install react-native-toast-message
npx expo install expo-haptics expo-linear-gradient
```

---

## 13. Final UX Quality Bar

Your mobile app should pass this check:
- Can a new user find and contact a shop in under 30 seconds?
- Can a dukandar add a listing in under 90 seconds?
- Are all critical actions visible without hunting in deep menus?
- Does the app feel fast, friendly, and trustworthy on low-end devices?

If yes, your UI/UX is ready for MVP launch.
