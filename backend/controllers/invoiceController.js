import { Business, Invoice } from '../models/index.js';
import { streamInvoicePdf } from '../services/invoicePdfService.js';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    List invoices for current user (owner)
// @route   GET /api/invoices
// @access  Private (business_owner)
export const listMyInvoices = async (req, res) => {
  try {
    const { businessId } = req.query;

    const query = {
      owner: req.user._id,
    };

    if (businessId) query.business = businessId;

    const invoices = await Invoice.find(query)
      .sort({ issuedAt: -1, createdAt: -1 })
      .populate('business', 'name')
      .lean();

    return res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('List my invoices error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load invoices',
    });
  }
};

// @desc    Admin list invoices with filters
// @route   GET /api/invoices/admin
// @access  Private (admin)
export const adminListInvoices = async (req, res) => {
  try {
    const { search, status, businessId, from, to, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));

    const query = {};
    if (status) query.status = status;
    if (businessId) query.business = businessId;

    if (from || to) {
      query.issuedAt = {};
      if (from) query.issuedAt.$gte = new Date(from);
      if (to) query.issuedAt.$lte = new Date(to);
    }

    if (search) {
      const rx = new RegExp(escapeRegex(String(search)), 'i');
      const businesses = await Business.find({ name: rx }).select('_id').lean();
      const businessIds = businesses.map((b) => b._id);

      query.$or = [
        { invoiceNumber: rx },
        { 'payment.orderId': rx },
        { 'payment.paymentId': rx },
        ...(businessIds.length ? [{ business: { $in: businessIds } }] : []),
      ];
    }

    const [items, total] = await Promise.all([
      Invoice.find(query)
        .sort({ issuedAt: -1, createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('business', 'name')
        .populate('owner', 'email')
        .lean(),
      Invoice.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items,
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Admin list invoices error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load invoices',
    });
  }
};

// @desc    Get invoice by id (owner/admin)
// @route   GET /api/invoices/:id
// @access  Private (business_owner, admin)
export const getInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id)
      .populate('business', 'name owner email phone')
      .populate('owner', 'email')
      .lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (req.user.role !== 'admin' && String(invoice.owner?._id || invoice.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this invoice' });
    }

    return res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load invoice' });
  }
};

// @desc    Download invoice PDF (owner/admin)
// @route   GET /api/invoices/:id/pdf
// @access  Private (business_owner, admin)
export const downloadInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id)
      .populate('business', 'name owner email phone')
      .populate('owner', 'email')
      .lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (req.user.role !== 'admin' && String(invoice.owner?._id || invoice.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this invoice' });
    }

    return streamInvoicePdf(
      {
        invoice,
        business: invoice.business,
        owner: invoice.owner,
      },
      res
    );
  } catch (error) {
    console.error('Download invoice PDF error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate invoice PDF',
    });
  }
};
