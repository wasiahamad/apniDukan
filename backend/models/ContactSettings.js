import mongoose from 'mongoose';

/**
 * CONTACT SETTINGS MODEL
 * Stores public contact page info managed by super admin.
 */

const contactSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true,
      index: true,
    },
    whatsappNumber: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
      default: '',
    },
    officeAddress: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const ContactSettings = mongoose.model('ContactSettings', contactSettingsSchema);

export default ContactSettings;
