import mongoose from 'mongoose';

const visitorLocationSchema = new mongoose.Schema(
  {
    shopSlug: { type: String, trim: true, lowercase: true, index: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', index: true },
    page: { type: String, trim: true, default: 'unknown', index: true },
    source: { type: String, trim: true, default: 'website', index: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v) => Array.isArray(v) && v.length === 2 && v.every((n) => Number.isFinite(n)),
          message: 'coordinates must be [lng, lat]',
        },
      },
    },
    accuracyMeters: { type: Number },
    metadata: {
      userAgent: String,
      ipAddress: String,
      referrer: String,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

visitorLocationSchema.index({ location: '2dsphere' });
// TTL index: documents auto-delete when expiresAt passes
visitorLocationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('VisitorLocation', visitorLocationSchema);
