import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

// Load backend/.env for local runs; do not override deployment env vars.
dotenv.config({ path: path.join(backendRoot, '.env'), override: false });

const safeTrim = (v) => String(v || '').trim();

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  return args[i + 1] || null;
};

const apiKey = safeTrim(process.env.RESEND_API_KEY);
const from = safeTrim(process.env.EMAIL_FROM || 'PublicDukan <noreply@publicdukan.com>');
const to = safeTrim(getArg('--to'));

if (!apiKey) {
  console.error('Missing RESEND_API_KEY in environment');
  process.exit(2);
}

if (!to) {
  console.error('Usage: node scripts/verifySmtp.js --to someone@example.com');
  process.exit(2);
}

const resend = new Resend(apiKey);

try {
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: 'PublicDukan Resend test',
    text: `Resend test email sent at ${new Date().toISOString()}`,
    html: `<h2>PublicDukan</h2><p>Resend test email sent at ${new Date().toISOString()}</p>`,
  });

  if (error) {
    throw new Error(error.message || 'Resend API returned an error');
  }

  console.log(`[Resend] test email sent id=${safeTrim(data?.id)} to=${to}`);
  process.exit(0);
} catch (e) {
  console.error('[Resend] FAILED', {
    message: safeTrim(e?.message || e),
  });
  process.exit(1);
}
