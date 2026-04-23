import { Business, KeyValue } from '../models/index.js';
import { runBusinessInsightsAgent } from './aiAgentsService.js';
import { sendEmail } from './emailService.js';

const KV_KEY_LAST_RUN = 'ai:insights:last_run_timestamp';

export const getLastRunTimestamp = async () => {
  const doc = await KeyValue.findOne({ key: KV_KEY_LAST_RUN }).select('value').lean();
  return doc?.value || null;
};

export const setLastRunTimestamp = async (isoString) => {
  const value = String(isoString || new Date().toISOString());
  await KeyValue.updateOne({ key: KV_KEY_LAST_RUN }, { $set: { key: KV_KEY_LAST_RUN, value } }, { upsert: true });
  return value;
};

export const runDailyInsightsCron = async ({ limitBusinesses = 0 } = {}) => {
  const businesses = await Business.find({ isActive: true, isVerified: true })
    .select('_id owner name email')
    .sort({ createdAt: 1 })
    .lean();

  const slice =
    Number.isFinite(limitBusinesses) && limitBusinesses > 0 ? businesses.slice(0, Math.floor(limitBusinesses)) : businesses;

  const results = {
    total: slice.length,
    processed: 0,
    importantCount: 0,
    failures: 0,
  };

  for (const b of slice) {
    try {
      const out = await runBusinessInsightsAgent({ businessId: b._id });
      results.processed += 1;

      if (out?.ok && out?.data?.important === true) {
        results.importantCount += 1;

        // Email owner (best-effort)
        const to = out.data.ownerEmail || b.email;
        if (to) {
          const subject = `Important business insights - ${b.name || 'Apnidukan'}`;
          const text = out.data.summary_hi || 'Aaj ke business insights ready hain.';
          await sendEmail({ to, subject, text });
        }
      }
    } catch (e) {
      results.failures += 1;
      console.error('Cron insights failed for business:', b?._id, e?.message || e);
    }
  }

  await setLastRunTimestamp(new Date().toISOString());
  return results;
};
