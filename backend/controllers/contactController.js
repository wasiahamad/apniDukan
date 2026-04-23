import { ContactMessage, ContactSettings } from '../models/index.js';

const DEFAULT_SETTINGS = {
  whatsappNumber: '919876543210',
  email: 'support@publicdukan.in',
  officeAddress: '123, Startup Hub, Connaught Place, New Delhi - 110001',
};

const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const normalizeSettings = (doc) => {
  if (!doc) return { ...DEFAULT_SETTINGS };
  return {
    whatsappNumber: doc.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
    email: doc.email || DEFAULT_SETTINGS.email,
    officeAddress: doc.officeAddress || DEFAULT_SETTINGS.officeAddress,
  };
};

// @desc    Get public contact settings
// @route   GET /api/contact/settings
// @access  Public
export const getPublicContactSettings = async (req, res) => {
  try {
    const doc = await ContactSettings.findOne({ key: 'default' }).lean();
    res.status(200).json({
      success: true,
      data: normalizeSettings(doc),
    });
  } catch (error) {
    console.error('Get contact settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load contact settings',
    });
  }
};

// @desc    Submit contact message
// @route   POST /api/contact/messages
// @access  Public
export const createContactMessage = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const message = String(req.body?.message || '').trim();

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const created = await ContactMessage.create({
      name,
      email,
      message,
      metadata: {
        userAgent: req.get('user-agent') || undefined,
        ipAddress: req.ip || undefined,
        source: 'publicWebsite',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Message received',
      data: {
        _id: created._id,
        status: created.status,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    console.error('Create contact message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit message',
    });
  }
};

// @desc    Admin get contact settings
// @route   GET /api/contact/admin/settings
// @access  Private (admin)
export const adminGetContactSettings = async (req, res) => {
  try {
    const doc = await ContactSettings.findOne({ key: 'default' }).lean();
    res.status(200).json({
      success: true,
      data: normalizeSettings(doc),
    });
  } catch (error) {
    console.error('Admin get contact settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load contact settings',
    });
  }
};

// @desc    Admin update contact settings
// @route   PUT /api/contact/admin/settings
// @access  Private (admin)
export const adminUpdateContactSettings = async (req, res) => {
  try {
    const whatsappNumber = String(req.body?.whatsappNumber || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const officeAddress = String(req.body?.officeAddress || '').trim();

    const updated = await ContactSettings.findOneAndUpdate(
      { key: 'default' },
      {
        $set: {
          whatsappNumber,
          email,
          officeAddress,
          updatedBy: req.user?._id,
        },
      },
      { new: true, upsert: true }
    ).lean();

    res.status(200).json({
      success: true,
      message: 'Contact settings saved',
      data: normalizeSettings(updated),
    });
  } catch (error) {
    console.error('Admin update contact settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save contact settings',
    });
  }
};

// @desc    Admin list contact messages
// @route   GET /api/contact/admin/messages
// @access  Private (admin)
export const adminListContactMessages = async (req, res) => {
  try {
    const pageNum = Math.max(parsePositiveInt(req.query?.page, 1), 1);
    const limitNum = Math.min(Math.max(parsePositiveInt(req.query?.limit, 50), 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const status = String(req.query?.status || '').trim();
    const filter = status === 'open' || status === 'resolved' ? { status } : {};

    const [items, total] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ContactMessage.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        items,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('Admin list contact messages error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load messages',
    });
  }
};

// @desc    Admin get one contact message
// @route   GET /api/contact/admin/messages/:id
// @access  Private (admin)
export const adminGetContactMessage = async (req, res) => {
  try {
    const doc = await ContactMessage.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    console.error('Admin get contact message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load message',
    });
  }
};

// @desc    Admin update contact message (status/note)
// @route   PATCH /api/contact/admin/messages/:id
// @access  Private (admin)
export const adminUpdateContactMessage = async (req, res) => {
  try {
    const update = {};

    if (typeof req.body?.adminNote === 'string') {
      update.adminNote = String(req.body.adminNote || '').trim();
    }

    if (typeof req.body?.status === 'string') {
      const s = String(req.body.status).trim();
      if (s === 'open' || s === 'resolved') {
        update.status = s;
        update.resolvedAt = s === 'resolved' ? new Date() : null;
      }
    }

    const saved = await ContactMessage.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!saved) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Message updated',
      data: saved,
    });
  } catch (error) {
    console.error('Admin update contact message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update message',
    });
  }
};
