import KeyValue from '../models/KeyValue.js';
import { runAI } from '../utils/ai.js';
import { CATEGORY_FALLBACK_ICON, inferCategoryIcon } from '../utils/categoryIcon.js';
import { enforceDailyAiLimit } from './aiUsageService.js';

const toSafeKey = (input) =>
  String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 80);

const extractFirstEmoji = (text) => {
  const s = String(text || '').trim();
  if (!s) return null;

  // Try to capture the first emoji-like pictograph, including common joiners/variation selectors.
  const m = s.match(/(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u);
  return m ? m[1] : null;
};

export const getSmartCategoryIcon = async ({ name, user, aiEnabled }) => {
  const inferred = inferCategoryIcon(name);
  if (inferred !== CATEGORY_FALLBACK_ICON) return inferred;

  const enabled = aiEnabled === true;
  if (!enabled || !user?._id) return inferred;

  const nameKey = toSafeKey(name);
  if (!nameKey) return inferred;

  const kvKey = `categoryIcon:${nameKey}`;

  // Persistent cache
  try {
    const kv = await KeyValue.findOne({ key: kvKey }).select('value').lean();
    const cached = extractFirstEmoji(kv?.value);
    if (cached) return cached;
  } catch {
    // ignore cache errors
  }

  // Enforce daily AI limits (plan-based). If limit reached, do not block category creation.
  try {
    const usage = await enforceDailyAiLimit({
      actorType: 'user',
      identifier: String(user._id),
      user,
      action: 'generate',
    });

    if (!usage?.allowed) return inferred;
  } catch {
    // If usage tracking fails, stay safe.
    return inferred;
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are an assistant that returns exactly one emoji as the answer. No words, no punctuation, no quotes.',
    },
    {
      role: 'user',
      content: `Pick the best single emoji icon for this shop category: "${String(name || '').trim()}"`,
    },
  ];

  const out = await runAI(messages, {
    // Keep very short to reduce cost and prevent long responses.
    maxTokens: 8,
    temperature: 0.2,
    fallback: CATEGORY_FALLBACK_ICON,
  });

  const emoji = extractFirstEmoji(out) || inferred;

  // Cache best-effort
  try {
    await KeyValue.updateOne({ key: kvKey }, { $set: { value: emoji } }, { upsert: true });
  } catch {
    // ignore
  }

  return emoji;
};
