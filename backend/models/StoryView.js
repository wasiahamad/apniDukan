import mongoose from 'mongoose';

const storyViewSchema = new mongoose.Schema(
  {
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Story',
      required: true,
      index: true,
    },
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// One view per user per story
storyViewSchema.index({ story: 1, viewer: 1 }, { unique: true });

export default mongoose.model('StoryView', storyViewSchema);
