# Dukandar (Business-Owner) Referral Program — Rules & System (Hinglish)

Ye doc un owners/dukandaron ke liye hai jo dusre dukandar ko refer karte hain (owner → owner referral). Step-by-step, code-aligned, aur product + implementation notes ke saath.

**Short summary:**
- Har dukandar/owner ka ek `referralCode` ho sakta hai.
- Jab koi naya dukandar aapke code se sign up karta hai aur offer ki conditions puri hoti hain, referrer ko reward mil sakta hai.
- Rewards mostly "plan reward" hote hain (platform admin define karta hai) — jaise free Pro plan for N months, ya kisi aur duration ka upgrade.
- Reward flows offer-driven hain: `ReferralOffer` define karta hai thresholds, rewardPlan, rewardDuration, autoApprove, etc.

---

## 1) Core concepts (code se mapping)
- `ReferralCode`: code object linked to a `User` (owner).
- `ReferralOffer` (model): platform-level offer (rewardPlan, referralThreshold, valid windows, autoApprove, requiresFirstPaidPlan, etc.).
- `Referral`: record created when someone signs up with a referral code (status: pending/valid/invalid, isCountedInReward flag).
- `ReferralRewardRequest`: created when referrer has enough `valid` referrals and requests reward; can be auto-approved by offer or manually approved by admin.
- `applyRewardToUser()`: server-side function that applies reward (sets `plan` and `planExpiresAt` for the referrer's businesses based on `rewardPlan` and `rewardDuration`).

Files to see: `backend/services/referralService.js`, `backend/services/referralEligibilityService.js`, `backend/controllers/referralController.js`, `backend/models/ReferralOffer.js`, `backend/models/ReferralRewardRequest.js`.

---

## 2) Eligibility & Anti-abuse (Owner → Owner)
- Self-referral prevention: same user/email/phone blocked.
- Geo / City rules: `validateBusinessOwnerReferralEligibility()` enforces same city and distance <= `REFERRAL_MAX_DISTANCE_KM` (default 25km) between referrer shop and referred shop.
- Offer rules: only referrals attached to an active `ReferralOffer` count toward that offer's threshold.
- One-referrer-per-user: once referred, the first referral wins (idempotency).
- `offer.requiresFirstPaidPlan` prevents creators without paid shop from benefiting if configured.
- `offer.firstTimeOnly` can limit reward to first-time claimers.
- Pending/valid lifecycle: referrals are created as `pending`; must be `validated` to become `valid` (e.g., after checks/payment/time window) — validation logic lives in controllers/services.

---

## 3) Product flow (what happens, step-by-step)
1. Referrer (existing dukandar) gets/shares their `referralCode` (profile).
2. New owner signs up using that `referralCode` during onboarding.
   - Backend: `createReferralForSignup({ referredUser, referralCode, offerId, ipAddress, userAgent })` creates a `Referral` record with `status: 'pending'` and links `offer`.
   - Stats: referralCode stats updated (`totalReferrals`, `pendingReferrals`).
3. Validation & becoming `valid`
   - The platform validates the referred user's shop (city, location) using `referralEligibilityService` and other checks (e.g., not fraud).
   - Once validated (by admin or automatic checks), referral `status` becomes `valid` and counts toward `ReferralOffer` thresholds.
4. When referrer reaches `offer.referralThreshold` valid referrals, system (or referrer via dashboard) triggers `tryCreateRewardForOffer({ referrerId, offer })`.
   - This creates a `ReferralRewardRequest` linking referrals and snapshot counts.
   - If `offer.autoApprove` is true, request may be approved & fulfilled automatically.
5. Reward fulfillment
   - `applyRewardToUser({ userId, rewardPlan, rewardDuration })` grants `rewardPlan` to all businesses of referrer by extending/setting `plan` and `planExpiresAt`.
   - RewardRequest goes through `approve` → `fulfill` lifecycle (see `ReferralRewardRequest` model methods).
6. Notifications: welcome/reward emails are sent via `emailService` using referral templates.

---

## 4) Offer model — key fields (what product can configure)
- `offerName`: display name.
- `referralThreshold`: number of valid referrals required to request a reward.
- `rewardPlan`: which plan slug to grant as reward (e.g., `pro`, `enterprise`).
- `rewardDuration`: months to grant the plan.
- `requiresFirstPaidPlan`: only referrers with at least one paid plan qualify.
- `firstTimeOnly`: only allow first reward ever for a user.
- `autoApprove`: whether reward requests auto-approve and fulfill.
- `validFrom` / `validUntil`: offer window.
- `isActive` / `status`: administrative control.

---

## 5) APIs & Dashboard actions (where to integrate UX)
- Public / Owner endpoints (see `backend/routes/referralRoutes.js` and `backend/controllers/referralController.js`):
  - `GET /api/referrals/my` — fetch owner referral dashboard (active offer, stats, pending/approved requests).
  - `PUT /api/referrals/my/active-offer` — owner can select an active offer to participate in.
  - `POST /api/referrals/request-reward` — owner-initiated reward request (creates `ReferralRewardRequest`).
- Admin endpoints:
  - `POST /api/referrals/admin/offers` — create offer.
  - `PUT /api/referrals/admin/offers/:id/activate` — activate offer.
  - `GET /api/referrals/admin/reward-requests` — list reward requests.
  - `PUT /api/referrals/admin/reward-requests/:id/approve` — approve.
  - `PUT /api/referrals/admin/reward-requests/:id/fulfill` — fulfill and apply reward.

Note: exact route paths are in `backend/routes/referralRoutes.js` and `backend/controllers/referralController.js` — integrate these into Dukandar Dashboard UI (Referrals page already exists in frontend: `dukandarDashboard/src/pages/Referrals.tsx`).

---

## 6) Admin & automation options
- Auto-approve: For growth campaigns, set `offer.autoApprove = true` so rewards apply instantly when threshold met.
- Manual review: Admins can review `ReferralRewardRequest`s and approve/fulfill after fraud checks.
- Offer selection: Owners can pick an active offer (owner-level `activeReferralOffer`) or accept the platform's default active offer.
- Stats: Controllers expose counts for dashboard: total referrals, pending, valid, rewards requested/approved.

---

## 7) UX + communications
- Owner sees referral code in profile and a dashboard with:
  - Active offer details (threshold, reward plan, expires)
  - List of referred users (pending/valid)
  - Button to `Request Reward` when threshold reached (or auto triggers if autoApprove)
- Emails: `referral_welcome` (sent to referred user) and `referral_reward` (sent to referrer on reward) are used.

---

## 8) Example scenarios
1) Auto-reward campaign
- Offer: "Refer 3 owners, get Pro for 3 months", autoApprove=true.
- Referrer refers 3 valid owners who meet eligibility → system auto-creates & approves `ReferralRewardRequest` → `applyRewardToUser` grants Pro for 3 months.
2) Manual review campaign
- Offer: "Refer 5 owners, get Enterprise for 6 months", autoApprove=false.
- Referrer reaches 5 valid referrals → reward request created → Admin reviews fraud checks → approves & fulfills → reward applied.
3) Owner without paid plan
- If `offer.requiresFirstPaidPlan` is true and referrer never had paid plan → cannot claim reward until they have a paid plan.

---

## 9) Implementation tips (developer notes)
- To change reward type: update `offer.rewardPlan` and `rewardDuration` via admin APIs or seed data.
- To auto-grant only once per user: use `offer.firstTimeOnly` and `ReferralRewardRequest` checks.
- To change distance/city rule: edit `REFERRAL_MAX_DISTANCE_KM` env or `referralEligibilityService.js` logic.
- `applyRewardToUser` loops over all businesses of a user and sets `plan` and `planExpiresAt` — careful when multiple shops exist.
- Ensure `Referral` records set `isCountedInReward` when included in a `ReferralRewardRequest` to avoid double counting.

---

## 10) Checklist for product spec (ready-to-build)
- [ ] Decide reward types (plan upgrade vs wallet vs cash).
- [ ] Set default offers and campaign windows.
- [ ] Choose `autoApprove` vs manual review.
- [ ] Implement UI in `dukandarDashboard/src/pages/Referrals.tsx` for: code display, referral list, request reward flow, offer selection.
- [ ] Add admin pages to manage offers and review reward requests.
- [ ] Audit logs & notifications (email templates are ready).

---

Agar chaho, main `dukanadarDashboard` ke `Referrals.tsx` page ko tweak karke "Request Reward" button aur offer info show karne ka PR bana ke commit kar dunga. Chahiye?