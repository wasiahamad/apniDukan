import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema(
  {
    senderRole: {
      type: String,
      enum: ['user', 'admin'],
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    ticketId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    issueType: {
      type: String,
      enum: ['billing', 'technical', 'other'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    messages: {
      type: [supportMessageSchema],
      default: [],
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

supportTicketSchema.index({ business: 1, ticketNumber: 1 }, { unique: true });
supportTicketSchema.index({ business: 1, ticketId: 1 }, { unique: true });

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

export default SupportTicket;
