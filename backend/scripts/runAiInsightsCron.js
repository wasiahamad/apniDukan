import 'dotenv/config';
import connectDB from '../config/database.js';
import { runDailyInsightsCron } from '../services/aiInsightsCronService.js';

// Usage:
// node scripts/runAiInsightsCron.js
// node scripts/runAiInsightsCron.js --limit=10

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {};
  for (const a of args) {
    const m = String(a).match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
};

const main = async () => {
  const args = parseArgs();
  const limit = args.limit ? Number(args.limit) : 0;

  await connectDB();
  const result = await runDailyInsightsCron({ limitBusinesses: limit });
  console.log('AI Insights Cron Result:', result);
  process.exit(0);
};

main().catch((err) => {
  console.error('AI Insights Cron failed:', err);
  process.exit(1);
});
