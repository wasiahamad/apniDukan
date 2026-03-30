import { Business, SupportTicket, SupportCounter, User } from '../models/index.js';

const padTicket = (n) => String(n).padStart(3, '0');

const nextTicketId = async (businessId) => {
  const counter = await SupportCounter.findOneAndUpdate(
    { business: businessId },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const seq = counter.seq;
  return { ticketNumber: seq, ticketId: `TKT${padTicket(seq)}` };
};

const normalizeIssueType = (raw) => {
  const v = (raw || '').toString().trim().toLowerCase();
  if (['billing', 'technical', 'other'].includes(v)) return v;
  // UI might send labels like "Billing".
  if (v === 'tech' || v === 'technology') return 'technical';
  if (v === 'bill') return 'billing';
  return 'other';
};

const canAccessTicket = async ({ ticketId, user }) => {
  const ticket = await SupportTicket.findById(ticketId)
    .populate('business', 'name slug')
    .populate('owner', 'name email phone')
    .populate('assignedTo', 'name email')
    .lean();

  if (!ticket) return { ok: false, code: 404, message: 'Ticket not found' };
  if (user.role === 'admin') return { ok: true, ticket };
  if (String(ticket.owner?._id || ticket.owner) !== String(user._id)) {
    return { ok: false, code: 403, message: 'Not authorized to access this ticket' };
  }
  return { ok: true, ticket };
};

// @desc    Create support ticket (dukandar)
// @route   POST /api/support/tickets
// @access  Private
export const createTicket = async (req, res) => {
  try {
    const issueType = normalizeIssueType(req.body?.issueType);
    const message = (req.body?.message || '').toString().trim();

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const businesses = await Business.find({ owner: req.user._id })
      .select('_id name slug isActive')
      .sort({ createdAt: -1 });
    const business = businesses[0];
    if (!business) {
      return res.status(400).json({ success: false, message: 'No business found for this account' });
    }

    const { ticketNumber, ticketId } = await nextTicketId(business._id);

    const ticket = await SupportTicket.create({
      business: business._id,
      owner: req.user._id,
      issueType,
      ticketNumber,
      ticketId,
      status: 'open',
      messages: [{ senderRole: 'user', sender: req.user._id, message }],
      lastMessageAt: new Date(),
    });

    const populated = await SupportTicket.findById(ticket._id)
      .populate('business', 'name slug')
      .populate('owner', 'name email phone')
      .populate('assignedTo', 'name email')
      .lean();

    res.status(201).json({ success: true, message: 'Ticket created', data: populated });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating ticket' });
  }
};

// @desc    List my tickets (dukandar)
// @route   GET /api/support/tickets
// @access  Private
export const listMyTickets = async (req, res) => {
  try {
    const { status } = req.query;
    const q = { owner: req.user._id };
    if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(String(status))) {
      q.status = String(status);
    }

    const tickets = await SupportTicket.find(q)
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .populate('business', 'name slug')
      .lean();

    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('List my tickets error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching tickets' });
  }
};

// @desc    Get my ticket by id
// @route   GET /api/support/tickets/:id
// @access  Private
export const getTicket = async (req, res) => {
  try {
    const result = await canAccessTicket({ ticketId: req.params.id, user: req.user });
    if (!result.ok) return res.status(result.code).json({ success: false, message: result.message });
    res.json({ success: true, data: result.ticket });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching ticket' });
  }
};

// @desc    Add message to ticket (dukandar)
// @route   POST /api/support/tickets/:id/messages
// @access  Private
export const addMyMessage = async (req, res) => {
  try {
    const message = (req.body?.message || '').toString().trim();
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (String(ticket.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this ticket' });
    }
    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Closed ticket cannot receive new messages',
      });
    }

    ticket.messages.push({ senderRole: 'user', sender: req.user._id, message });
    ticket.lastMessageAt = new Date();
    await ticket.save();

    const populated = await SupportTicket.findById(ticket._id)
      .populate('business', 'name slug')
      .populate('owner', 'name email phone')
      .populate('assignedTo', 'name email')
      .lean();

    res.json({ success: true, message: 'Message added', data: populated });
  } catch (error) {
    console.error('Add my message error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error adding message' });
  }
};

// @desc    Admin: list all tickets
// @route   GET /api/support/admin/tickets
// @access  Private (admin)
export const adminListTickets = async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);

    const query = {};
    if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(String(status))) {
      query.status = String(status);
    }

    const rawSearch = String(search || '').trim();
    if (rawSearch) {
      const regex = new RegExp(rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      const matchingUsers = await User.find({
        $or: [{ name: regex }, { email: regex }, { phone: regex }],
      }).select('_id');
      const userIds = matchingUsers.map((u) => u._id);

      const matchingBusinesses = await Business.find({
        $or: [{ name: regex }, { slug: regex }, ...(userIds.length ? [{ owner: { $in: userIds } }] : [])],
      }).select('_id');
      const businessIds = matchingBusinesses.map((b) => b._id);

      query.$or = [{ ticketId: regex }];
      if (businessIds.length) query.$or.push({ business: { $in: businessIds } });
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('business', 'name slug')
        .populate('owner', 'name email phone')
        .populate('assignedTo', 'name email')
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        items: tickets,
        page: pageNum,
        limit: limitNum,
        total,
      },
    });
  } catch (error) {
    console.error('Admin list tickets error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching tickets' });
  }
};

// @desc    Admin: get ticket by id
// @route   GET /api/support/admin/tickets/:id
// @access  Private (admin)
export const adminGetTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('business', 'name slug')
      .populate('owner', 'name email phone')
      .populate('assignedTo', 'name email')
      .lean();
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Admin get ticket error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching ticket' });
  }
};

// @desc    Admin: update ticket fields (status/assignee)
// @route   PATCH /api/support/admin/tickets/:id
// @access  Private (admin)
export const adminUpdateTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const { status, assignedTo } = req.body || {};
    if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(String(status))) {
      ticket.status = String(status);
    }

    if (assignedTo === null || assignedTo === '') {
      ticket.assignedTo = null;
    } else if (assignedTo) {
      // Basic validation: must exist and be admin.
      const admin = await User.findById(assignedTo).select('_id role');
      if (!admin || admin.role !== 'admin') {
        return res.status(400).json({ success: false, message: 'assignedTo must be an admin user id' });
      }
      ticket.assignedTo = admin._id;
    }

    await ticket.save();

    const populated = await SupportTicket.findById(ticket._id)
      .populate('business', 'name slug')
      .populate('owner', 'name email phone')
      .populate('assignedTo', 'name email')
      .lean();

    res.json({ success: true, message: 'Ticket updated', data: populated });
  } catch (error) {
    console.error('Admin update ticket error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating ticket' });
  }
};

// @desc    Admin: add message
// @route   POST /api/support/admin/tickets/:id/messages
// @access  Private (admin)
export const adminAddMessage = async (req, res) => {
  try {
    const message = (req.body?.message || '').toString().trim();
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Closed ticket cannot receive new messages',
      });
    }

    ticket.messages.push({ senderRole: 'admin', sender: req.user._id, message });
    ticket.lastMessageAt = new Date();
    await ticket.save();

    const populated = await SupportTicket.findById(ticket._id)
      .populate('business', 'name slug')
      .populate('owner', 'name email phone')
      .populate('assignedTo', 'name email')
      .lean();

    res.json({ success: true, message: 'Response sent', data: populated });
  } catch (error) {
    console.error('Admin add message error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error sending message' });
  }
};
