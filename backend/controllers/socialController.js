import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Business } from '../models/index.js';

const mustEnv = (key) => {
  const v = process.env[key];
  if (!v) {
    const err = new Error(`${key} is not configured`);
    err.statusCode = 500;
    throw err;
  }
  return v;
};

const apiPublicUrl = () => process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:8080';

const signState = (payload) => {
  const secret = mustEnv('JWT_SECRET');
  return jwt.sign(payload, secret, { expiresIn: '10m' });
};

const verifyState = (state) => {
  const secret = mustEnv('JWT_SECRET');
  return jwt.verify(state, secret);
};

const isValidPlatform = (platform) => ['facebook', 'instagram', 'twitter', 'youtube'].includes(platform);

const getRedirectUri = (platform) => `${apiPublicUrl()}/social/oauth/${platform}/callback`;

const base64Url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const buildXAuthUrl = ({ state, codeChallenge }) => {
  const clientId = mustEnv('X_CLIENT_ID');
  const redirectUri = getRedirectUri('twitter');
  const scope = [
    'tweet.read',
    'users.read',
    'offline.access',
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
};

const buildGoogleAuthUrl = ({ state }) => {
  const clientId = mustEnv('GOOGLE_CLIENT_ID');
  const redirectUri = getRedirectUri('youtube');

  const scope = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/youtube.readonly',
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

const buildMetaAuthUrl = ({ state, platform }) => {
  const appId = mustEnv('META_APP_ID');
  const redirectUri = getRedirectUri(platform);

  // We use the Instagram callback endpoint to fetch IG business username via Graph.
  // This works only for businesses with a connected Instagram professional account.
  const scope = [
    'public_profile',
    'pages_show_list',
    'instagram_basic',
  ].join(',');

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    state,
  });

  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
};

const updateBusinessSocial = async ({ businessId, user, platform, url }) => {
  const query = user.role === 'admin' ? { _id: businessId } : { _id: businessId, owner: user._id };
  const updated = await Business.findOneAndUpdate(
    query,
    { $set: { [`socialMedia.${platform}`]: url } },
    { new: true, runValidators: true }
  );
  return updated;
};

const assertOwnerCanManageSocial = (business, reqUser) => {
  if (!business) {
    const err = new Error('Business not found');
    err.statusCode = 404;
    throw err;
  }

  if (reqUser.role !== 'admin' && String(business.owner) !== String(reqUser._id)) {
    const err = new Error('Not authorized');
    err.statusCode = 403;
    throw err;
  }

  if (reqUser.role !== 'admin' && business.isVerified === false) {
    const err = new Error('Business verification pending. Only support access is allowed until admin verification.');
    err.statusCode = 403;
    err.code = 'BUSINESS_NOT_VERIFIED';
    throw err;
  }
};

export const getOAuthUrl = async (req, res) => {
  try {
    const { platform } = req.params;
    const { businessId } = req.query;

    if (!isValidPlatform(platform)) {
      return res.status(400).json({ success: false, message: 'Invalid platform' });
    }

    if (!businessId) {
      return res.status(400).json({ success: false, message: 'businessId is required' });
    }

    const business = await Business.findById(businessId).select('_id owner isVerified');
    assertOwnerCanManageSocial(business, req.user);

    const nonce = crypto.randomBytes(16).toString('hex');
    const userId = String(req.user._id);

    if (platform === 'twitter') {
      mustEnv('X_CLIENT_ID');
      mustEnv('X_CLIENT_SECRET');

      const codeVerifier = base64Url(crypto.randomBytes(32));
      const codeChallenge = base64Url(crypto.createHash('sha256').update(codeVerifier).digest());

      const state = signState({ platform, businessId: String(businessId), userId, nonce, codeVerifier });
      const url = buildXAuthUrl({ state, codeChallenge });

      return res.status(200).json({ success: true, data: { url } });
    }

    if (platform === 'youtube') {
      mustEnv('GOOGLE_CLIENT_ID');
      mustEnv('GOOGLE_CLIENT_SECRET');

      const state = signState({ platform, businessId: String(businessId), userId, nonce });
      const url = buildGoogleAuthUrl({ state });

      return res.status(200).json({ success: true, data: { url } });
    }

    if (platform === 'instagram' || platform === 'facebook') {
      mustEnv('META_APP_ID');
      mustEnv('META_APP_SECRET');

      // We start Meta auth (Facebook) and finish on instagram callback to derive IG username.
      const state = signState({ platform, businessId: String(businessId), userId, nonce });
      const url = buildMetaAuthUrl({ state, platform });

      return res.status(200).json({ success: true, data: { url } });
    }

    return res.status(400).json({ success: false, message: 'Unsupported platform' });
  } catch (error) {
    console.error('Get OAuth URL error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Error generating OAuth URL' });
  }
};

export const oauthCallback = async (req, res) => {
  const { platform } = req.params;
  const { code, state, error, error_description } = req.query;

  const redirectBase = `${clientUrl()}/dashboard/business-profile`;
  const fail = (msg) => res.redirect(`${redirectBase}?social=${encodeURIComponent(platform)}&status=failed&message=${encodeURIComponent(msg)}`);

  try {
    if (!isValidPlatform(platform)) return fail('Invalid platform');
    if (error) return fail(String(error_description || error));
    if (!code || !state) return fail('Missing code/state');

    const decoded = verifyState(String(state));
    const businessId = decoded.businessId;
    const userId = decoded.userId;

    if (!businessId) return fail('Invalid state');
    if (!userId) return fail('Invalid state');

    const owned = await Business.findOne({ _id: businessId, owner: userId }).select('_id isVerified');
    if (!owned) return fail('Not authorized');
    if (!owned.isVerified) return fail('Business verification pending. Connect social after admin verification.');

    // We need a user context to enforce ownership. Callback is public, so we use a minimal check:
    // - Update by businessId only (best-effort) and rely on signed state created for an authenticated user.
    // The state is signed with JWT_SECRET and short-lived.

    if (platform === 'twitter') {
      mustEnv('X_CLIENT_ID');
      mustEnv('X_CLIENT_SECRET');

      const redirectUri = getRedirectUri('twitter');
      const tokenUrl = 'https://api.twitter.com/2/oauth2/token';

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri,
        client_id: process.env.X_CLIENT_ID,
        code_verifier: decoded.codeVerifier,
      });

      const basic = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64');
      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basic}`,
        },
        body,
      });

      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) return fail(tokenJson?.error_description || tokenJson?.error || 'Twitter token exchange failed');

      const accessToken = tokenJson.access_token;
      const meRes = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meJson = await meRes.json();
      if (!meRes.ok) return fail(meJson?.title || 'Twitter profile fetch failed');

      const username = meJson?.data?.username;
      if (!username) return fail('Twitter username not found');

      const profileUrl = `https://x.com/${username}`;
      await Business.updateOne({ _id: businessId, owner: userId }, { $set: { 'socialMedia.twitter': profileUrl } }, { runValidators: true });

      return res.redirect(`${redirectBase}?social=twitter&status=connected`);
    }

    if (platform === 'youtube') {
      mustEnv('GOOGLE_CLIENT_ID');
      mustEnv('GOOGLE_CLIENT_SECRET');

      const redirectUri = getRedirectUri('youtube');
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) return fail(tokenJson?.error_description || tokenJson?.error || 'Google token exchange failed');

      const accessToken = tokenJson.access_token;

      const ytRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const ytJson = await ytRes.json();
      if (!ytRes.ok) return fail(ytJson?.error?.message || 'YouTube profile fetch failed');

      const channel = ytJson?.items?.[0];
      const channelId = channel?.id;

      if (!channelId) return fail('YouTube channel not found');

      const profileUrl = `https://www.youtube.com/channel/${channelId}`;
      await Business.updateOne({ _id: businessId, owner: userId }, { $set: { 'socialMedia.youtube': profileUrl } }, { runValidators: true });

      return res.redirect(`${redirectBase}?social=youtube&status=connected`);
    }

    if (platform === 'instagram' || platform === 'facebook') {
      mustEnv('META_APP_ID');
      mustEnv('META_APP_SECRET');

      const redirectUri = getRedirectUri(platform);

      const tokenParams = new URLSearchParams({
        client_id: process.env.META_APP_ID,
        redirect_uri: redirectUri,
        client_secret: process.env.META_APP_SECRET,
        code: String(code),
      });

      const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`);
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) return fail(tokenJson?.error?.message || 'Meta token exchange failed');

      const accessToken = tokenJson.access_token;

      if (platform === 'facebook') {
        // Best-effort: use first Page ID if available, else fallback to user id.
        const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id&access_token=${encodeURIComponent(accessToken)}`);
        const pagesJson = await pagesRes.json();
        const pageId = pagesJson?.data?.[0]?.id;

        if (pageId) {
          const fbUrl = `https://facebook.com/${pageId}`;
          await Business.updateOne({ _id: businessId, owner: userId }, { $set: { 'socialMedia.facebook': fbUrl } }, { runValidators: true });
          return res.redirect(`${redirectBase}?social=facebook&status=connected`);
        }

        const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id&access_token=${encodeURIComponent(accessToken)}`);
        const meJson = await meRes.json();
        const meId = meJson?.id;

        if (!meId) return fail('Facebook profile/page not found');

        const fbUrl = `https://facebook.com/${meId}`;
        await Business.updateOne({ _id: businessId, owner: userId }, { $set: { 'socialMedia.facebook': fbUrl } }, { runValidators: true });
        return res.redirect(`${redirectBase}?social=facebook&status=connected`);
      }

      // Instagram connect: resolve IG username from linked IG business account
      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account&access_token=${encodeURIComponent(accessToken)}`);
      const pagesJson = await pagesRes.json();
      const pageWithIg = pagesJson?.data?.find((p) => p?.instagram_business_account?.id);
      const igId = pageWithIg?.instagram_business_account?.id;

      if (igId) {
        const igRes = await fetch(`https://graph.facebook.com/v19.0/${igId}?fields=username&access_token=${encodeURIComponent(accessToken)}`);
        const igJson = await igRes.json();
        const username = igJson?.username;
        if (username) {
          const igUrl = `https://instagram.com/${username}`;
          await Business.updateOne({ _id: businessId, owner: userId }, { $set: { 'socialMedia.instagram': igUrl } }, { runValidators: true });
          return res.redirect(`${redirectBase}?social=instagram&status=connected`);
        }
      }

      return fail('Instagram business account not found (requires IG professional account linked to a Facebook Page)');
    }

    return fail('Unsupported platform');
  } catch (e) {
    console.error('OAuth callback error:', e);
    return fail(e.message || 'OAuth failed');
  }
};

export const connectYoutubeWithAccessToken = async (req, res) => {
  try {
    const { businessId, accessToken } = req.body || {};
    if (!businessId) {
      return res.status(400).json({ success: false, message: 'businessId is required' });
    }
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'accessToken is required' });
    }

    const business = await Business.findById(businessId).select('_id owner isVerified');
    assertOwnerCanManageSocial(business, req.user);

    const ytRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const ytJson = await ytRes.json();
    if (!ytRes.ok) {
      return res.status(400).json({
        success: false,
        message: ytJson?.error?.message || 'YouTube profile fetch failed',
      });
    }

    const channel = ytJson?.items?.[0];
    const channelId = channel?.id;
    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: 'YouTube channel not found for selected Google account',
      });
    }

    const profileUrl = `https://www.youtube.com/channel/${channelId}`;
    const updated = await Business.findOneAndUpdate(
      req.user.role === 'admin' ? { _id: businessId } : { _id: businessId, owner: req.user._id },
      { $set: { 'socialMedia.youtube': profileUrl } },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'YouTube connected successfully',
      data: {
        url: profileUrl,
      },
    });
  } catch (error) {
    console.error('Connect YouTube with token error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code,
      message: error.message || 'Failed to connect YouTube',
    });
  }
};
