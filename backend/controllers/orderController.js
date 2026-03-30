import { Business, Listing, Order, OrderCounter } from '../models/index.js';
import { getEffectiveEntitlementsForBusiness } from '../services/entitlementsService.js';

const padOrder = (n) => String(n).padStart(3, '0');

const nextOrderNumber = async (businessId) => {
  const counter = await OrderCounter.findOneAndUpdate(
    { business: businessId },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const seq = counter.seq;
  return { orderNumber: seq, orderId: `ORD${padOrder(seq)}` };
};

const normalizePhone = (input) => (input || '').toString().replace(/[^0-9+]/g, '').trim();

const normalizeOptionLabel = (input) => (input || '').toString().trim();

const parseMaybePrice = (value) => {
  const raw = (value || '').toString().trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
};

const optionMatch = (a, b) => {
  const x = normalizeOptionLabel(a).toLowerCase();
  const y = normalizeOptionLabel(b).toLowerCase();
  if (!x || !y) return false;
  return x === y;
};

// @desc    Public: Create order from storefront
// @route   POST /api/orders/public
// @access  Public
export const createPublicOrder = async (req, res) => {
  try {
    const { businessId, items, source, customer } = req.body || {};

    if (!businessId) {
      return res.status(400).json({ success: false, message: 'businessId is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items are required' });
    }

    const business = await Business.findById(businessId)
      .populate('plan')
      .select('_id isActive isVerified owner plan planExpiresAt featureOverrides');
    if (!business || !business.isActive) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements?.features?.ordersEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Orders are not enabled for this business',
      });
    }

    // Build item list from listings to avoid price tampering
    const qtyByKey = new Map();
    const listingIdSet = new Set();
    items.forEach((it) => {
      const id = it?.listingId;
      const qty = Number(it?.quantity || 0);
      const optionLabel = normalizeOptionLabel(it?.pricingOptionLabel);
      if (!id || !Number.isFinite(qty) || qty <= 0) return;
      const key = `${String(id)}::${encodeURIComponent(optionLabel || '')}`;
      listingIdSet.add(String(id));
      qtyByKey.set(key, (qtyByKey.get(key) || 0) + qty);
    });

    const listingIds = Array.from(listingIdSet);
    const listings = await Listing.find({ _id: { $in: listingIds }, isActive: true }).select(
      '_id title price listingType pricingOptions attributes'
    );
    if (listings.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid items found' });
    }

    const listingById = new Map();
    listings.forEach((l) => listingById.set(String(l._id), l));

    const builtItems = [];
    let subtotal = 0;

    for (const [key, qty] of qtyByKey.entries()) {
      if (!qty || qty <= 0) continue;

      const sep = key.indexOf('::');
      const listingId = sep >= 0 ? key.slice(0, sep) : key;
      const enc = sep >= 0 ? key.slice(sep + 2) : '';
      const optionLabel = (() => {
        try {
          return decodeURIComponent(enc || '');
        } catch {
          return '';
        }
      })();

      const listing = listingById.get(String(listingId));
      if (!listing) continue;

      const options = Array.isArray(listing.pricingOptions) ? listing.pricingOptions : [];
      const hasOptions = options.length > 0;

      const legacyFoodOptions = (() => {
        if (listing.listingType !== 'food') return [];
        const attrs = Array.isArray(listing.attributes) ? listing.attributes : [];
        return attrs
          .map((a) => ({ label: (a?.name || '').toString().trim(), price: parseMaybePrice(a?.value) }))
          .filter((x) => x.label && x.price !== null)
          .map((x) => ({ label: x.label, price: x.price }));
      })();

      const hasLegacyFoodOptions = !hasOptions && legacyFoodOptions.length > 0;

      if ((hasOptions || hasLegacyFoodOptions) && !normalizeOptionLabel(optionLabel)) {
        return res.status(400).json({
          success: false,
          message: `pricingOptionLabel is required for: ${listing.title}`,
        });
      }

      let unitPrice = Number(listing.price || 0);
      let chosenLabel = '';

      if (hasOptions) {
        const found = options.find((o) => optionMatch(o?.label, optionLabel));
        if (!found) {
          return res.status(400).json({
            success: false,
            message: `Invalid pricing option for: ${listing.title}`,
          });
        }
        unitPrice = Number(found.price);
        chosenLabel = normalizeOptionLabel(found.label);
      } else if (hasLegacyFoodOptions) {
        const found = legacyFoodOptions.find((o) => optionMatch(o?.label, optionLabel));
        if (!found) {
          return res.status(400).json({
            success: false,
            message: `Invalid pricing option for: ${listing.title}`,
          });
        }
        unitPrice = Number(found.price);
        chosenLabel = normalizeOptionLabel(found.label);
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) unitPrice = 0;

      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;

      builtItems.push({
        listing: listing._id,
        pricingOptionLabel: chosenLabel || undefined,
        title: `${listing.title}${chosenLabel ? ` (${chosenLabel})` : ''}`,
        quantity: qty,
        unitPrice,
        lineTotal,
      });
    }

    if (builtItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid items found' });
    }

    const { orderNumber, orderId } = await nextOrderNumber(businessId);

    const customerName = (customer?.name || '').toString().trim() || 'Customer';
    const customerPhone = normalizePhone(customer?.phone);
    const customerAddress = (customer?.address || '').toString().trim();
    const customerNote = (customer?.note || '').toString().trim();

    const deliveryCharges = 0;
    const total = subtotal + deliveryCharges;

    const order = await Order.create({
      business: businessId,
      orderNumber,
      orderId,
      source: ['website', 'whatsapp', 'manual'].includes(source) ? source : 'website',
      status: 'pending',
      customer: {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        note: customerNote,
      },
      items: builtItems,
      subtotal,
      deliveryCharges,
      total,
    });

    const populated = await Order.findById(order._id)
      .populate('business', 'name slug whatsapp')
      .lean();

    res.status(201).json({ success: true, message: 'Order created', data: populated });
  } catch (error) {
    console.error('Create public order error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating order' });
  }
};

// @desc    Get my orders (owner)
// @route   GET /api/orders/my
// @access  Private (business_owner)
export const getMyOrders = async (req, res) => {
  try {
    // Find businesses owned by user
    const businesses = await Business.find({ owner: req.user._id }).select('_id');
    const businessIds = businesses.map((b) => b._id);

    const orders = await Order.find({ business: { $in: businessIds } })
      .sort({ createdAt: -1 })
      .populate('business', 'name slug whatsapp')
      .lean();

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching orders' });
  }
};

// @desc    Admin: list all orders
// @route   GET /api/orders
// @access  Private (admin)
export const adminListOrders = async (req, res) => {
  try {
    const { status, businessId, search } = req.query;

    const query = {};
    if (businessId) query.business = businessId;
    if (status && ['pending', 'confirmed', 'delivered', 'cancelled'].includes(status)) query.status = status;

    if (search) {
      const q = String(search).trim();
      if (q) {
        query.$or = [
          { orderId: { $regex: q, $options: 'i' } },
          { 'customer.name': { $regex: q, $options: 'i' } },
          { 'customer.phone': { $regex: q, $options: 'i' } },
        ];
      }
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('business', 'name slug whatsapp owner')
      .lean();

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('Admin list orders error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching orders' });
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (owner/admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['pending', 'confirmed', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(id).populate('business', 'owner');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const ownerId = order.business?.owner?.toString?.();
    if (req.user.role !== 'admin' && ownerId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
    }

    if (req.user.role !== 'admin') {
      const business = await Business.findById(order.business?._id)
        .populate('plan')
        .select('_id isActive owner plan planExpiresAt featureOverrides');

      if (!business || !business.isActive) {
        return res.status(404).json({ success: false, message: 'Business not found' });
      }

      const entitlements = await getEffectiveEntitlementsForBusiness(business);
      if (entitlements?.features?.ordersEnabled !== true) {
        return res.status(403).json({
          success: false,
          message: 'This feature is not enabled in your plan. Please upgrade.',
        });
      }
    }

    order.status = status;
    await order.save();

    const populated = await Order.findById(order._id).populate('business', 'name slug whatsapp').lean();
    res.status(200).json({ success: true, message: 'Order updated', data: populated });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating order' });
  }
};

// @desc    Owner: Get orders summary for dashboard
// @route   GET /api/orders/my/summary
// @access  Private (business_owner)
export const getMyOrdersSummary = async (req, res) => {
  try {
    const businesses = await Business.find({ owner: req.user._id }).select('_id');
    const businessIds = businesses.map((b) => b._id);

    const summary = await Order.aggregate([
      { $match: { business: { $in: businessIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const byStatus = summary.reduce((acc, row) => {
      acc[String(row._id)] = Number(row.count) || 0;
      return acc;
    }, {});

    const pending = byStatus.pending || 0;
    const confirmed = byStatus.confirmed || 0;
    const delivered = byStatus.delivered || 0;
    const cancelled = byStatus.cancelled || 0;
    const totalOrders = pending + confirmed + delivered + cancelled;

    return res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pending,
        confirmed,
        delivered,
        cancelled,
      },
    });
  } catch (error) {
    console.error('Get my orders summary error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching orders summary' });
  }
};
