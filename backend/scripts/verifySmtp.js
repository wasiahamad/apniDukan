import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

// Load backend/.env for local runs; do not override Render env vars.
dotenv.config({ path: path.join(backendRoot, '.env'), override: false });

const safeTrim = (v) => String(v || '').trim();
const normalizeSmtpPassword = (v) => String(v || '').replace(/[\s\r\n]+/g, '');

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  return args[i + 1] || null;
};

const host = safeTrim(process.env.EMAIL_HOST);
const port = Number(safeTrim(process.env.EMAIL_PORT || 587));
const user = safeTrim(process.env.EMAIL_USER);
const pass = normalizeSmtpPassword(process.env.EMAIL_PASS);
const configuredFrom = safeTrim(process.env.EMAIL_FROM);
const to = safeTrim(getArg('--to'));
const debug = args.includes('--debug') || String(process.env.EMAIL_DEBUG || '').toLowerCase() === 'true';

if (!host || !user || !pass) {
  console.error('Missing EMAIL_* env. Need EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS');
  process.exit(2);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  ...(port === 587 ? { requireTLS: true } : {}),
  ...(debug ? { logger: true, debug: true } : {}),
});

try {
  console.log(`[SMTP] host=${host} port=${port} user=${user}`);
  if (configuredFrom) console.log(`[SMTP] EMAIL_FROM=${configuredFrom}`);

  await transporter.verify();
  console.log('[SMTP] verify OK');

  if (to) {
    const mail = {
      from: configuredFrom || user,
      to,
      subject: 'PublicDukan SMTP test',
      text: `SMTP test from ${host}:${port} at ${new Date().toISOString()}`,
    };

    if (configuredFrom && configuredFrom.toLowerCase() !== user.toLowerCase() && /@gmail\.com$/i.test(user)) {
      mail.from = user;
      mail.replyTo = configuredFrom;
    }

    const info = await transporter.sendMail(mail);
    console.log(`[SMTP] test email sent messageId=${safeTrim(info?.messageId)}`);
  } else {
    console.log('[SMTP] No --to provided; skipping sendMail test');
  }

  process.exit(0);
} catch (e) {
  console.error('[SMTP] FAILED', {
    message: safeTrim(e?.message || e),
    code: e?.code,
    command: e?.command,
    responseCode: e?.responseCode,
    response: safeTrim(e?.response),
  });
  process.exit(1);
}
