import mongoose from 'mongoose';

/**
 * KEY-VALUE STORE (Mongo)
 * Lightweight KV replacement for cron metadata.
 */

const keyValueSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const KeyValue = mongoose.model('KeyValue', keyValueSchema);

export default KeyValue;
