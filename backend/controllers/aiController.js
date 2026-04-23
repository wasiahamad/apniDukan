import { Business } from '../models/index.js';
import mongoose from 'mongoose';
import { enforceDailyAiLimit, getClientIdentifier } from '../services/aiUsageService.js';
import {
  runCustomerChatAgent,
  runDukandarGenerateAgent,
  runBusinessInsightsAgent,
  runBusinessProfileDescriptionAgent,
  runWhyChooseUsAgent,
  runBrandingSuggestionAgent,
} from '../services/aiAgentsService.js';
import { canUseFeature, getEffectiveEntitlementsForBusiness } from '../services/entitlementsService.js';

const badRequest = (res, message) => {
  return res.status(400).json({ success: false, message: message || 'Validation failed' });
};

const limitExceeded = (res, message) => {
  return res.status(429).json({ success: false, message: message || 'Daily AI limit reached. Upgrade your plan for more usage.' });
};

const featureNotAllowed = (res, message) => {
  return res.status(403).json({ success: false, message: message || 'This AI feature is not available for your current plan.' });
};

// POST /api/ai/chat (public)
export const chat = async (req, res) => {
  try {
    const businessId = req.body?.businessId;
    const userMessage = req.body?.userMessage;

    if (!businessId) return badRequest(res, 'businessId is required');
    if (!mongoose.Types.ObjectId.isValid(String(businessId))) {
      return badRequest(res, 'businessId is invalid');
    }
    if (!userMessage || !String(userMessage).trim()) return badRequest(res, 'userMessage is required');

    const business = await Business.findById(businessId)
      .select('isActive plan planExpiresAt featureOverrides businessType')
      .populate('plan', 'features')
      .lean();
    if (!business || business.isActive === false) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (!canUseFeature(entitlements.features, 'aiCustomerChatEnabled')) {
      return featureNotAllowed(res, 'AI chat is not available for this shop plan.');
    }

    const { actorType, identifier } = getClientIdentifier(req);
    const usage = await enforceDailyAiLimit({ actorType, identifier, user: null, action: 'chat' });

    if (!usage.allowed) return limitExceeded(res, usage.error);

    const out = await runCustomerChatAgent({ businessId, userMessage });
    if (!out.ok) return res.status(404).json({ error: out.error || 'Business not found' });

    return res.status(200).json({ reply: out.reply });
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(200).json({
      reply: 'Haan ji, aap WhatsApp/call pe contact kar lo. Main details confirm karke help kar dunga.',
    });
  }
};

// POST /api/ai/generate (business_owner)
export const generate = async (req, res) => {
  try {
    const user = req.user;

    const modeRaw = String(req.body?.mode || 'listing').trim().toLowerCase();
    const mode = ['listing', 'business_description', 'why_choose_us', 'branding'].includes(modeRaw) ? modeRaw : 'listing';

    const title = req.body?.title;
    const businessType = req.body?.businessType;
    const businessIdForAdmin = req.body?.businessId;

    if (mode === 'listing') {
      if (!title || !String(title).trim()) return badRequest(res, 'title is required');
    }

    if (user?.role !== 'admin') {
      const business = await Business.findOne({ owner: user._id, isActive: true })
        .select('name address businessType plan planExpiresAt featureOverrides')
        .populate('plan', 'features')
        .populate('businessType', 'name')
        .lean();
      if (!business) return badRequest(res, 'No active business found for this account');

      const entitlements = await getEffectiveEntitlementsForBusiness(business);
      if (!canUseFeature(entitlements.features, 'aiDukandarAgentEnabled')) {
        return featureNotAllowed(res, 'AI tools are not available for your current plan.');
      }
    }

    const usage = await enforceDailyAiLimit({ actorType: 'user', identifier: String(user._id), user, action: 'generate' });
    if (!usage.allowed) return limitExceeded(res, usage.error);

    let businessCtx = null;
    if (user?.role === 'admin' && businessIdForAdmin) {
      if (!mongoose.Types.ObjectId.isValid(String(businessIdForAdmin))) {
        return badRequest(res, 'businessId is invalid');
      }
      businessCtx = await Business.findById(businessIdForAdmin)
        .select('name address businessType')
        .populate('businessType', 'name')
        .lean();
      if (!businessCtx) return badRequest(res, 'Business not found');
    } else if (user?.role !== 'admin' && mode !== 'listing') {
      businessCtx = await Business.findOne({ owner: user._id, isActive: true })
        .select('name address businessType')
        .populate('businessType', 'name')
        .lean();
    }

    if (mode === 'listing') {
      const out = await runDukandarGenerateAgent({ title, businessType });
      if (!out.ok) {
        return res.status(503).json({ success: false, message: out.error || 'AI service is unavailable. Please try again.' });
      }
      return res.status(200).json({ success: true, data: out.data });
    }

    if (!businessCtx) {
      return badRequest(res, 'No business context found');
    }

    const businessName = businessCtx?.name;
    const businessTypeName = businessCtx?.businessType?.name || businessType;
    const city = businessCtx?.address?.city;
    const state = businessCtx?.address?.state;

    if (mode === 'business_description') {
      const out = await runBusinessProfileDescriptionAgent({ businessName, businessTypeName, city, state });
      if (!out.ok) {
        return res.status(503).json({ success: false, message: out.error || 'AI service is unavailable. Please try again.', code: out.code || 'AI_ERROR' });
      }
      return res.status(200).json({ success: true, data: out.data });
    }

    if (mode === 'why_choose_us') {
      const out = await runWhyChooseUsAgent({ businessName, businessTypeName, city, state, maxCards: req.body?.maxCards });
      if (!out.ok) {
        return res.status(503).json({ success: false, message: out.error || 'AI service is unavailable. Please try again.', code: out.code || 'AI_ERROR' });
      }
      return res.status(200).json({ success: true, data: out.data });
    }

    if (mode === 'branding') {
      const out = await runBrandingSuggestionAgent({ businessTypeName });
      if (!out.ok) {
        return res.status(503).json({ success: false, message: out.error || 'AI service is unavailable. Please try again.', code: out.code || 'AI_ERROR' });
      }
      return res.status(200).json({ success: true, data: out.data });
    }

    return badRequest(res, 'Unsupported mode');
  } catch (error) {
    console.error('AI generate error:', error);

    return res.status(503).json({
      success: false,
      message: error?.message || 'AI service is unavailable. Please try again.',
      code: error?.code || 'AI_ERROR',
    });
  }
};

// POST /api/ai/insights (business_owner)
export const insights = async (req, res) => {
  try {
    const user = req.user;
    let businessId = req.body?.businessId;

    let businessForEntitlements = null;

    if (user.role !== 'admin') {
      businessForEntitlements = await Business.findOne({ owner: user._id, isActive: true })
        .select('_id plan planExpiresAt featureOverrides businessType')
        .populate('plan', 'features')
        .lean();
      if (!businessForEntitlements) return badRequest(res, 'No active business found for this account');
      businessId = businessForEntitlements._id;
    } else {
      if (!businessId) return badRequest(res, 'businessId is required');
    }

    if (user.role !== 'admin') {
      const entitlements = await getEffectiveEntitlementsForBusiness(businessForEntitlements);
      if (!canUseFeature(entitlements.features, 'aiDukandarAgentEnabled')) {
        return featureNotAllowed(res, 'AI tools are not available for your current plan.');
      }
    }

    const usage = await enforceDailyAiLimit({ actorType: 'user', identifier: String(user._id), user, action: 'insights' });
    if (!usage.allowed) return limitExceeded(res, usage.error);

    const out = await runBusinessInsightsAgent({ businessId });
    if (!out.ok) return res.status(404).json({ error: out.error || 'Business not found' });

    return res.status(200).json(out.data);
  } catch (error) {
    console.error('AI insights error:', error);
    // Failsafe: don't break API
    return res.status(200).json({
      businessId: String(req.body?.businessId || ''),
      date: new Date().toISOString().slice(0, 10),
      summary_hi: 'Aaj ka summary abhi generate nahi ho paaya. Thodi der baad try karein.',
      insights: [],
      suggestions: [],
      important: false,
    });
  }
};
