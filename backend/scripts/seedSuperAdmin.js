import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import { User } from '../models/index.js';

dotenv.config({ override: true });

const getArgValue = (name) => {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) return undefined;
  return value;
};

const pick = (...values) => values.find((v) => typeof v === 'string' && v.trim());

const normalizeEmail = (v) => String(v || '').trim().toLowerCase();

const normalizePhone10 = (v) => {
  const digits = String(v || '').replace(/\D/g, '');
  if (!digits) return '';
  // keep last 10 digits if country code provided
  const tail10 = digits.length > 10 ? digits.slice(-10) : digits;
  return tail10;
};

const main = async () => {
  const email = normalizeEmail(pick(getArgValue('email'), process.env.ADMIN_EMAIL));
  const password = pick(getArgValue('password'), process.env.ADMIN_PASSWORD);
  const phone = normalizePhone10(pick(getArgValue('phone'), process.env.ADMIN_PHONE));
  const name = String(pick(getArgValue('name'), process.env.ADMIN_NAME, 'Super Admin')).trim();

  if (!email) {
    console.error('❌ Missing admin email. Provide --email or set ADMIN_EMAIL');
    process.exit(1);
  }

  if (!password || String(password).trim().length < 6) {
    console.error('❌ Missing/invalid admin password. Provide --password or set ADMIN_PASSWORD (min 6 chars)');
    process.exit(1);
  }

  await connectDB();

  const applyAdminUpdates = async (user) => {
    let changed = false;

    if (name && user.name !== name) {
      user.name = name;
      changed = true;
    }

    if (user.role !== 'admin') {
      user.role = 'admin';
      changed = true;
    }

    if (user.isActive !== true) {
      user.isActive = true;
      changed = true;
    }

    if (user.authProvider !== 'local') {
      user.authProvider = 'local';
      changed = true;
    }

    if (phone && user.phone !== phone) {
      user.phone = phone;
      changed = true;
    }

    // Always rotate password if provided (so you can regain access)
    user.password = String(password);
    changed = true;

    if (changed) {
      await user.save();
    }

    return user;
  };

  const existingByEmail = email ? await User.findOne({ email }).select('+password') : null;

  if (existingByEmail) {
    const updated = await applyAdminUpdates(existingByEmail);
    console.log(`✅ Super admin ensured: ${updated.email}`);
    process.exit(0);
  }

  const existingByPhone = phone ? await User.findOne({ phone }).select('+password') : null;
  if (existingByPhone) {
    if (email && existingByPhone.email !== email) {
      const emailTaken = await User.findOne({ email }).select('_id');
      if (emailTaken) {
        console.error(`❌ Cannot set admin email to ${email} because it is already used by another user`);
        process.exit(1);
      }
      existingByPhone.email = email;
    }

    const updated = await applyAdminUpdates(existingByPhone);
    console.log(`✅ Super admin ensured: ${updated.email}`);
    process.exit(0);
  }

  if (!phone) {
    console.error('❌ Admin phone is required for creating a new local admin. Provide --phone or set ADMIN_PHONE');
    process.exit(1);
  }

  try {
    const created = await User.create({
      name,
      email,
      phone,
      password: String(password),
      authProvider: 'local',
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
    });

    console.log(`✅ Super admin created: ${created.email}`);
  } catch (e) {
    // If phone is already used, treat it as an update instead of failing.
    if ((e && e.code === 11000) && phone) {
      const byPhone = await User.findOne({ phone }).select('+password');
      if (byPhone) {
        if (email && byPhone.email !== email) {
          const emailTaken = await User.findOne({ email }).select('_id');
          if (emailTaken) {
            throw e;
          }
          byPhone.email = email;
        }

        const updated = await applyAdminUpdates(byPhone);
        console.log(`✅ Super admin ensured: ${updated.email}`);
        process.exit(0);
      }
    }

    throw e;
  }
};

main().catch((err) => {
  console.error('❌ seedSuperAdmin failed:', err?.message || err);
  process.exit(1);
});
