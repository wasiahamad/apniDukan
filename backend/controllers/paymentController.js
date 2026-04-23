import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Business, Plan, Referral, Invoice, InvoiceCounter, User } from '../models/index.js';
import { processReferralValidated } from '../services/referralService.js';
import { processCustomerReferralCommission } from '../services/customerReferralEarningsService.js';
import { calculatePlanExpiryDate } from '../services/subscriptionService.js';
import { validateBusinessOwnerReferralEligibility } from '../services/referralEligibilityService.js';
import { sendPlanActivatedEmails } from '../services/notificationEmailService.js';
import { sendEmailOnce } from '../services/emailService.js';

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

// @desc    Get Razorpay public key
// @route   GET /api/payments/razorpay/key
// @access  Public
export const getRazorpayKey = async (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID;

  if (!keyId) {
    return res.status(501).json({
      success: false,
      message: 'Razorpay is not configured',
    });
  }

  res.status(200).json({
    success: true,
    data: { keyId },
  });
};

// @desc    Create Razorpay order for plan purchase
// @route   POST /api/payments/razorpay/order
// @access  Private (business_owner)
export const createRazorpayOrder = async (req, res) => {
  try {
    const { planId, businessId } = req.body;

    if (!planId || !businessId) {
      return res.status(400).json({
        success: false,
        message: 'planId and businessId are required',
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    if (req.user.role !== 'admin' && plan.isPublic === false) {
      return res.status(403).json({
        success: false,
        message: 'This plan is not available for self-purchase',
      });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this business',
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(501).json({
        success: false,
        message: 'Razorpay is not configured',
      });
    }

    // Free plan shortcut
    if (!plan.price || plan.price <= 0) {
      return res.status(200).json({
        success: true,
        data: {
          isFree: true,
          plan,
          businessId,
        },
      });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(501).json({
        success: false,
        message: 'Razorpay is not configured',
      });
    }

    const amountInPaise = Math.round(plan.price * 100);
    // Razorpay: receipt length must be <= 40 chars.
    // Use short, unique receipt to avoid BAD_REQUEST_ERROR.
    const businessSuffix = String(businessId).slice(-6);
    const planSuffix = String(planId).slice(-6);
    const nonce = crypto.randomBytes(4).toString('hex');
    const receipt = `rcpt_${businessSuffix}_${planSuffix}_${nonce}`;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        planId: String(planId),
        businessId: String(businessId),
        userId: String(req.user._id),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        keyId,
        order,
        plan,
        businessId,
      },
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    // Razorpay client throws rich errors (e.g. { statusCode: 400, error: { description } })
    // Surface 4xx as-is so frontend can show the correct validation message.
    if (error?.statusCode && Number(error.statusCode) >= 400 && Number(error.statusCode) < 500) {
      return res.status(Number(error.statusCode)).json({
        success: false,
        message: error?.error?.description || error.message || 'Payment request rejected',
        error: error?.error,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Error creating payment order',
    });
  }
};

// @desc    Verify Razorpay payment and activate plan
// @route   POST /api/payments/razorpay/verify
// @access  Private (business_owner)
export const verifyRazorpayPaymentAndActivatePlan = async (req, res) => {
  try {
    const {
      planId,
      businessId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!planId || !businessId) {
      return res.status(400).json({
        success: false,
        message: 'planId and businessId are required',
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    if (req.user.role !== 'admin' && plan.isPublic === false) {
      return res.status(403).json({
        success: false,
        message: 'This plan is not available for self-purchase',
      });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this business',
      });
    }

    // Free plan: no Razorpay verification required
    if (!plan.price || plan.price <= 0) {
      const now = new Date();
      const base = business.planExpiresAt && new Date(business.planExpiresAt) > now ? new Date(business.planExpiresAt) : now;
      const expiryDate = calculatePlanExpiryDate({ plan, baseDate: base });

      business.plan = plan._id;
      business.planExpiresAt = expiryDate;
      await business.save();

      // Best-effort email notification
      sendPlanActivatedEmails({ businessId: business._id, planId: plan._id, expiresAt: expiryDate, paymentId: null }).catch(() => null);

      // Customer referral commission is only for paid plans; keep explicit.

      return res.status(200).json({
        success: true,
        message: 'Plan activated successfully',
        data: {
          business,
          plan,
          expiresAt: expiryDate,
        },
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay payment fields',
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(501).json({
        success: false,
        message: 'Razorpay is not configured',
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', keySecret).update(body).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    const now = new Date();
    const base = business.planExpiresAt && new Date(business.planExpiresAt) > now ? new Date(business.planExpiresAt) : now;
    const expiryDate = calculatePlanExpiryDate({ plan, baseDate: base });

    business.plan = plan._id;
    business.planExpiresAt = expiryDate;
    await business.save();

    // Create invoice (idempotent by Razorpay payment id)
    const existingInvoice = await Invoice.findOne({ 'payment.paymentId': razorpay_payment_id }).lean();
    if (!existingInvoice) {
      const now = new Date();
      const year = now.getFullYear();
      const counter = await InvoiceCounter.findOneAndUpdate(
        { year },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      const invoiceNumber = `INV-${year}-${String(counter.seq).padStart(4, '0')}`;

      let paymentDetails = null;
      try {
        const razorpay = getRazorpayClient();
        if (razorpay) {
          paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
        }
      } catch (e) {
        // Non-blocking: invoice can be created without extra gateway fields
      }

      await Invoice.create({
        invoiceNumber,
        business: business._id,
        owner: business.owner,
        planSnapshot: {
          planId: plan._id,
          name: plan.name,
          slug: plan.slug,
          price: plan.price,
          durationInDays: plan.durationInDays,
          ...(plan.billingCycle ? { billingCycle: plan.billingCycle } : {}),
          features: {
            maxListings: plan.features?.maxListings,
            bookingEnabled: plan.features?.bookingEnabled,
            featuredEnabled: plan.features?.featuredEnabled,
            maxFeaturedListings: plan.features?.maxFeaturedListings,
            customDomain: plan.features?.customDomain,
            analyticsEnabled: plan.features?.analyticsEnabled,
            prioritySupport: plan.features?.prioritySupport,
            whatsappIntegration: plan.features?.whatsappIntegration,
            removeWatermark: plan.features?.removeWatermark,
            seoTools: plan.features?.seoTools,
            apiAccess: plan.features?.apiAccess,
          },
        },
        periodStart: now,
        periodEnd: expiryDate,
        amount: plan.price,
        currency: 'INR',
        paymentProvider: 'razorpay',
        payment: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          method: paymentDetails?.method,
          status: paymentDetails?.status,
          email: paymentDetails?.email,
          contact: paymentDetails?.contact,
          vpa: paymentDetails?.vpa,
          bank: paymentDetails?.bank,
          wallet: paymentDetails?.wallet,
          cardNetwork: paymentDetails?.card?.network,
          cardLast4: paymentDetails?.card?.last4,
        },
        status: 'paid',
        issuedAt: now,
      });
    }

    // Referral validation: on first paid plan, pending referrals become valid.
    const referralNow = new Date();

    const referrals = await Referral.find({
      referredUser: req.user._id,
      referredUserHasPaidPlan: false,
      status: { $in: ['pending', 'valid'] },
    });

    for (const r of referrals) {
      // Enforce eligibility BEFORE marking valid.
      try {
        const eligibility = await validateBusinessOwnerReferralEligibility({
          referrerUserId: r.referrer,
          referredOwnerId: req.user._id,
          maxDistanceKm: Number(process.env.REFERRAL_MAX_DISTANCE_KM || 25),
        });

        if (!eligibility.ok) {
          // Mark invalid so it won't validate on payment.
          if (r.status === 'pending') {
            await r.markAsInvalid(eligibility.message || 'Referral is not eligible');
          }
          continue;
        }
      } catch (e) {
        console.warn('Referral eligibility validation failed:', e?.message || e);
        // If eligibility check fails unexpectedly, do NOT mark as valid.
        continue;
      }

      // Marks referral valid if it was pending.
      await r.updatePaymentStatus(true, referralNow);

      if (r.status === 'valid') {
        // Updates ReferralCode stats; reward request is created explicitly by dukandar.
        await processReferralValidated({ referral: r });
      }
    }

    // Customer referral commission: credit 5% to customer referrer (non-blocking)
    try {
      const commissionResult = await processCustomerReferralCommission({
        referredOwnerId: req.user._id,
        planId: plan._id,
        planPrice: plan.price,
      });

      if (commissionResult?.commission) {
        // Notify the customer referrer (if any)
        try {
          const referredOwner = await User.findById(req.user._id).select('_id name referredBy role');
          if (referredOwner?.role === 'business_owner' && referredOwner?.referredBy) {
            const referrer = await User.findById(referredOwner.referredBy).select('_id name email role isActive');
            if (referrer?.role === 'customer' && referrer?.isActive !== false && referrer?.email) {
              const key = `customer_referral_commission:${String(referrer._id)}:${String(req.user._id)}:${String(razorpay_payment_id)}`;
              await sendEmailOnce({
                dedupeKey: key,
                type: 'customer_referral_commission',
                to: referrer.email,
                userId: referrer._id,
                subject: 'You earned referral commission on ApniDukan',
                text: `Hi ${referrer.name || 'Customer'},\n\nYou earned ₹${Number(commissionResult.commission).toFixed(2)} referral commission.\n\nThanks for referring a dukandar!`,
                html: `
                  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                    <h2 style="margin:0 0 12px;">Referral reward</h2>
                    <p>You earned <strong>₹${Number(commissionResult.commission).toFixed(2)}</strong> referral commission.</p>
                    <p>Thanks for referring a dukandar!</p>
                  </div>
                `,
                meta: { paymentId: razorpay_payment_id, referredOwnerId: String(req.user._id) },
              });
            }
          }
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.warn('Customer referral commission processing failed:', e?.message || e);
    }

    // Best-effort plan activation email
    sendPlanActivatedEmails({
      businessId: business._id,
      planId: plan._id,
      expiresAt: expiryDate,
      paymentId: razorpay_payment_id,
    }).catch(() => null);

    res.status(200).json({
      success: true,
      message: 'Payment verified and plan activated',
      data: {
        business,
        plan,
        expiresAt: expiryDate,
        payment: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
        },
      },
    });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error verifying payment',
    });
  }
};

// @desc    Admin revenue summary (subscription invoices)
// @route   GET /api/payments/admin/revenue
// @access  Private (admin)
export const getAdminRevenueSummary = async (req, res) => {
  try {
    const now = new Date();
    const MS_DAY = 24 * 60 * 60 * 1000;
    const MS_WEEK = 7 * MS_DAY;

    const startCurrent = new Date(now.getTime() - 28 * MS_DAY);
    const startPrev = new Date(now.getTime() - 56 * MS_DAY);

    const totalAgg = await Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const totalRevenueAllTime = totalAgg?.[0]?.total || 0;
    const paidInvoicesAllTime = totalAgg?.[0]?.count || 0;

    const currentAgg = await Invoice.aggregate([
      { $match: { status: 'paid', issuedAt: { $gte: startCurrent } } },
      {
        $project: {
          amount: 1,
          weekIndex: {
            $floor: {
              $divide: [{ $subtract: ['$issuedAt', startCurrent] }, MS_WEEK],
            },
          },
        },
      },
      { $match: { weekIndex: { $gte: 0, $lte: 3 } } },
      { $group: { _id: '$weekIndex', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const prevAgg = await Invoice.aggregate([
      { $match: { status: 'paid', issuedAt: { $gte: startPrev, $lt: startCurrent } } },
      { $group: { _id: null, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const revenueLast4Weeks = currentAgg.reduce((sum, r) => sum + (r.revenue || 0), 0);
    const paidInvoicesLast4Weeks = currentAgg.reduce((sum, r) => sum + (r.count || 0), 0);
    const revenuePrev4Weeks = prevAgg?.[0]?.revenue || 0;
    const paidInvoicesPrev4Weeks = prevAgg?.[0]?.count || 0;

    const trendPct = revenuePrev4Weeks > 0 ? Math.round(((revenueLast4Weeks - revenuePrev4Weeks) / revenuePrev4Weeks) * 100) : null;

    const revenueByWeek = [0, 1, 2, 3].map((idx) => {
      const found = currentAgg.find((x) => x._id === idx);
      return { week: `W${idx + 1}`, revenue: found?.revenue || 0 };
    });

    res.status(200).json({
      success: true,
      data: {
        totalRevenueAllTime,
        paidInvoicesAllTime,
        revenueLast4Weeks,
        paidInvoicesLast4Weeks,
        revenuePrev4Weeks,
        paidInvoicesPrev4Weeks,
        trendPct,
        revenueByWeek,
      },
    });
  } catch (error) {
    console.error('Admin revenue summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching revenue summary',
    });
  }
};
