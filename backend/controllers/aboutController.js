import { AboutPage } from '../models/index.js';

const DEFAULT = {
  heading: 'About publicdukan 🇮🇳',
  intro:
    "publicdukan is India's growing local business discovery platform, built to bridge the gap between neighbourhood shops and digital-savvy customers.",
  cards: [
    { title: 'Our Mission', desc: 'Har local dukaan ko online laana — simple, fast, aur free.' },
    { title: 'Our Vision', desc: 'India ke 60 million+ small businesses ko digital banane ka sapna.' },
    { title: 'Our Impact', desc: '10,000+ shops across 5 cities, connecting lakhs of customers.' },
    { title: 'Our Promise', desc: 'Zero technical knowledge needed. 10 minute mein shop live.' },
  ],
  body:
    "We believe every chai wala, salon owner, kirana store, and tailor deserves the same digital tools as big brands. publicdukan makes it happen — with WhatsApp-first ordering, Google-friendly shop pages, and zero setup cost.",
  closing: "Built with ❤️ in India, for India's local heroes.",
};

const normalize = (doc) => {
  if (!doc) return { ...DEFAULT };
  const cards = Array.isArray(doc.cards) && doc.cards.length ? doc.cards : DEFAULT.cards;
  return {
    heading: doc.heading || DEFAULT.heading,
    intro: doc.intro || DEFAULT.intro,
    cards: cards.map((c) => ({ title: c?.title || '', desc: c?.desc || '' })).slice(0, 4),
    body: doc.body || DEFAULT.body,
    closing: doc.closing || DEFAULT.closing,
  };
};

// @desc    Get public about page content
// @route   GET /api/about
// @access  Public
export const getAboutPage = async (req, res) => {
  try {
    const doc = await AboutPage.findOne({ key: 'default' }).lean();
    res.status(200).json({ success: true, data: normalize(doc) });
  } catch (error) {
    console.error('Get about page error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to load about content' });
  }
};

// @desc    Admin get about page content
// @route   GET /api/about/admin
// @access  Private (admin)
export const adminGetAboutPage = async (req, res) => {
  try {
    const doc = await AboutPage.findOne({ key: 'default' }).lean();
    res.status(200).json({ success: true, data: normalize(doc) });
  } catch (error) {
    console.error('Admin get about page error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to load about content' });
  }
};

// @desc    Admin update about page content
// @route   PUT /api/about/admin
// @access  Private (admin)
export const adminUpdateAboutPage = async (req, res) => {
  try {
    const heading = String(req.body?.heading || '').trim();
    const intro = String(req.body?.intro || '').trim();
    const body = String(req.body?.body || '').trim();
    const closing = String(req.body?.closing || '').trim();

    const cardsRaw = Array.isArray(req.body?.cards) ? req.body.cards : [];
    const cards = cardsRaw
      .slice(0, 4)
      .map((c) => ({
        title: String(c?.title || '').trim(),
        desc: String(c?.desc || '').trim(),
      }));

    const saved = await AboutPage.findOneAndUpdate(
      { key: 'default' },
      {
        $set: {
          heading,
          intro,
          body,
          closing,
          cards,
          updatedBy: req.user?._id,
        },
      },
      { new: true, upsert: true }
    ).lean();

    res.status(200).json({
      success: true,
      message: 'About page saved',
      data: normalize(saved),
    });
  } catch (error) {
    console.error('Admin update about page error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to save about content' });
  }
};
