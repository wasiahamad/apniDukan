import mongoose from 'mongoose';

/**
 * ABOUT PAGE MODEL
 * Stores public about page content managed by super admin.
 */

const aboutPageSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true,
      index: true,
    },
    heading: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "About publicdukan 🇮🇳",
    },
    intro: {
      type: String,
      trim: true,
      maxlength: 2000,
      default:
        "publicdukan is India's growing local business discovery platform, built to bridge the gap between neighbourhood shops and digital-savvy customers.",
    },
    cards: {
      type: [
        {
          title: { type: String, trim: true, maxlength: 120, default: '' },
          desc: { type: String, trim: true, maxlength: 400, default: '' },
        },
      ],
      default: [
        { title: 'Our Mission', desc: 'Har local dukaan ko online laana — simple, fast, aur free.' },
        { title: 'Our Vision', desc: 'India ke 60 million+ small businesses ko digital banane ka sapna.' },
        { title: 'Our Impact', desc: '10,000+ shops across 5 cities, connecting lakhs of customers.' },
        { title: 'Our Promise', desc: 'Zero technical knowledge needed. 10 minute mein shop live.' },
      ],
    },
    body: {
      type: String,
      trim: true,
      maxlength: 5000,
      default:
        "We believe every chai wala, salon owner, kirana store, and tailor deserves the same digital tools as big brands. publicdukan makes it happen — with WhatsApp-first ordering, Google-friendly shop pages, and zero setup cost.",
    },
    closing: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "Built with ❤️ in India, for India's local heroes.",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const AboutPage = mongoose.model('AboutPage', aboutPageSchema);

export default AboutPage;
