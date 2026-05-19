# Customer Referral Program — Rules & Commission (Hinglish)

Ye doc **customers** ke liye hai (dukandar/owner nahi) — kaise customer referral work karta hai, kon eligible hai, aur commission (7%) kaise milta/credit hota hai. Simple aur step-by-step.

**Short summary:**
- Customer apna unique referral code share karta hai.
- Jab koi naya `business_owner` (dukandar) us code se sign up karta hai aur plan purchase karta hai, toh customer ko commission milega.
- Commission = plan price ka fixed percent (system me default **5%**, par aapne bola 7% — doc me example 7% ke saath diya gaya).
- Commission wallet credit ke roop me add hota hai (backend me `walletBalance`).

---

## 1) Terms & Eligibility (Kaun eligible hai)

- Referrer: `User` jiska role `customer` aur jiska `referralCode` active ho.
- Referred: naya account jiska role `business_owner` (dukandar) jo signup ke waqt referral code use kare.
- Self-referral allowed nahi: agar referrer aur referred same user/email/phone ho to ignore.
- City / Distance rule: referrer aur referred ka distance limit (default 25km) check hota hai — agar referrer shop/position se zyada door ho to commission nahi milega. (Env: `REFERRAL_MAX_DISTANCE_KM`, default 25)
- Plan payment required: commission tabhi generate hota hai jab referred owner plan buy kare **aur payment amount > 0**.

Note: System me additional offer-based rules ho sakte hain (active CustomerReferralOffer) jo commission percent ya threshold override karti hain.

---

## 2) Technical flow (Backend implementation se aligned)

1. Customer gets/refers code
   - System ensures har customer ka `ReferralCode` record hota hai (`ReferralCode` model).
   - Email/SMS welcome templates available hain.

2. Referred owner signup
   - During signup/signup flow, agar `referralCode` diye gaya ho to backend `createCustomerReferralForSignup()` call karke `CustomerReferral` record create karta hai with status `pending`.
   - Agar koi existing referral record ho to pehle wale ko respect kiya jata hai (first referrer wins).

3. Referred owner purchase/activate plan
   - Jab referred owner plan purchase complete hota hai, backend `processCustomerReferralCommission({ referredOwnerId, planId, planPrice })` call karta hai.
   - Ye function active customer-referral-offer dekh ke `commissionPercent` decide karta hai (agar offer nahi, default `DEFAULT_COMMISSION_PERCENT` use hota hai).

4. Eligibility checks in `processCustomerReferralCommission`
   - `planPrice` > 0 required.
   - Referred user must have `referredBy` set (linked to customer) and be `business_owner`.
   - Referrer must be `customer` and `isActive`.
   - Referrer must have `referralCode`.
   - Distance check: referrer currentLocation aur referred business location ke beech distance <= `REFERRAL_MAX_DISTANCE_KM`.
   - Ensure Commission not already credited for same referral (idempotency check using `WalletTransaction`).

5. Commission creation & wallet credit
   - Commission = round2((planPrice * commissionPercent) / 100).
   - Wallet: `User.walletBalance` increment hota hai by commission; `WalletTransaction` record create hota hai (source: `referral`, type: `credit`).
   - `CustomerReferral` status set to `rewarded`, `commissionEarned`, `commissionPercent`, `planId`, `rewardedAt` set.

---

## 3) Rules you asked (7% commission example)

Aapne bola: “customer apne code se jb kisi dukandar ko signup krta hai or uske plan ka usko 7% milta hai” — isko yaha clear steps me dikhaya gaya hai.

- Commission percent: 7% (example)
- Calculation: `commission = round2(planPrice * 7 / 100)`
- Example: agar dukandar ne `INR 499` ka plan liya -> commission = 499 * 0.07 = 34.93 -> rounded 34.93
- Payment type: immediate wallet credit on plan activation (subject to all eligibility checks).

Edge cases:
- Agar planPrice = 0 (free plan) -> commission = 0 (no reward).
- Agar commission already credited (duplicate txn) -> system skip karega.
- Agar distance check fails -> no commission.

---

## 4) Admin / Offer overrides

- Platform admin can create `CustomerReferralOffer` to change `commissionPercent` or add thresholds/time windows.
- Commission logic uses `CustomerReferralOffer.getActiveOffer()` first; agar present to uska `commissionPercent` use hota hai, warna default value use hota hai (`DEFAULT_COMMISSION_PERCENT` in code).
- Admin can also view customer referral metrics & create/activate/close customer referral offers via admin routes (see: `/api/customer-referrals/admin/...`).

---

## 5) Security & Anti-abuse

- Self-referral checks (same email/phone/id) block reward.
- One-time reward per referred owner by default — duplicate rewards prevented by checking existing `WalletTransaction` with `source: 'referral'` and `referenceId`.
- Geo-distance check prevents wide-area gaming.
- Admin reviews: reward requests/metrics available for audit.

---

## 6) UX notes (Customer experience)

- Customer gets a referral code (visible in profile/email).
- When their friend/dukandar signs up using that code, customer sees referral status `pending`.
- After dukandar makes first paying purchase and all checks pass, customer receives a notification (email `referral_reward` template) and wallet credited.
- Customer can view wallet balance and withdraw/use as per platform wallet rules (see `WalletTransaction` controller/flows).

---

## 7) Example scenarios

1) Simple
- Customer A refers.
- Dukandar B signs up using code and buys Pro plan INR 499.
- Commission @7% = 34.93 -> Customer A wallet credited INR 34.93.

2) Distance fail
- Customer A is >25km from Dukandar B location -> no reward credited.

3) Free plan
- Dukandar B selects Free plan (price 0) -> no commission.

4) Admin-offer override
- Admin has active `CustomerReferralOffer` with commissionPercent=10 -> commission = planPrice * 10% instead of default.

---

## 8) Implementation pointers (agar aap change karna chahen)

- Change default commission: update `DEFAULT_COMMISSION_PERCENT` in `backend/services/customerReferralEarningsService.js` (currently 5). For 7% change to 7.
- To force 7% always: create/activate `CustomerReferralOffer` with `commissionPercent: 7` and set as active via admin API.
- Distance limit: change `REFERRAL_MAX_DISTANCE_KM` env var.
- To make reward delayed (e.g., after 7 days of active plan), add delay logic before `processCustomerReferralCommission` or mark pending and process after condition met.

---

## 9) Short checklist for product spec (ready-to-share)

- [ ] Commission percent: 7%
- [ ] Condition: referred owner must complete paid plan purchase
- [ ] Geo restriction: `REFERRAL_MAX_DISTANCE_KM = 25` (configurable)
- [ ] Reward type: instant wallet credit
- [ ] Prevent abuse: self-referral detection + txn idempotency
- [ ] Admin: ability to override percent via `CustomerReferralOffer`

---

Agar chaho, main isko repo me `CUSTOMER_REFERRAL.md` file ke alawa ek short `one-page` PDF/summary ya ek table-format comparison (Free/Starter/Pro commission examples) bhi bana doon. Kya chahoge?