const parseGoogleClientIds = () => {
  return (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
};

export const verifyGoogleIdToken = async (idToken) => {
  if (!idToken) {
    throw new Error('Google token is required');
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || 'Invalid Google token');
  }

  const allowedClientIds = parseGoogleClientIds();
  if (allowedClientIds.length > 0 && !allowedClientIds.includes(payload.aud)) {
    throw new Error('Google token audience mismatch');
  }

  if (payload.email_verified !== 'true') {
    throw new Error('Google email is not verified');
  }

  return {
    providerId: payload.sub,
    email: payload.email?.toLowerCase(),
    name: payload.name || payload.given_name || 'Google User',
    profileImage: payload.picture,
  };
};

export const verifyGoogleAccessToken = async (accessToken) => {
  if (!accessToken) {
    throw new Error('Google access token is required');
  }

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const profilePayload = await profileResponse.json();
  if (!profileResponse.ok) {
    throw new Error(profilePayload?.error_description || profilePayload?.error || 'Invalid Google access token');
  }

  if (!profilePayload?.email) {
    throw new Error('Google account email is required');
  }

  if (profilePayload.email_verified !== true) {
    throw new Error('Google email is not verified');
  }

  return {
    providerId: profilePayload.sub,
    email: String(profilePayload.email).toLowerCase(),
    name: profilePayload.name || 'Google User',
    profileImage: profilePayload.picture,
  };
};

export const verifyFacebookAccessToken = async (accessToken) => {
  if (!accessToken) {
    throw new Error('Facebook access token is required');
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('Facebook app credentials are not configured');
  }

  const debugUrl = new URL('https://graph.facebook.com/debug_token');
  debugUrl.searchParams.set('input_token', accessToken);
  debugUrl.searchParams.set('access_token', `${appId}|${appSecret}`);

  const debugResponse = await fetch(debugUrl);
  const debugPayload = await debugResponse.json();

  if (!debugResponse.ok || !debugPayload?.data?.is_valid) {
    throw new Error(debugPayload?.error?.message || 'Invalid Facebook token');
  }

  if (String(debugPayload.data.app_id) !== String(appId)) {
    throw new Error('Facebook token audience mismatch');
  }

  const profileUrl = new URL('https://graph.facebook.com/me');
  profileUrl.searchParams.set('fields', 'id,name,email,picture.type(large)');
  profileUrl.searchParams.set('access_token', accessToken);

  const profileResponse = await fetch(profileUrl);
  const profilePayload = await profileResponse.json();

  if (!profileResponse.ok) {
    throw new Error(profilePayload?.error?.message || 'Unable to fetch Facebook profile');
  }

  if (!profilePayload?.email) {
    throw new Error('Facebook account email is required');
  }

  return {
    providerId: profilePayload.id,
    email: profilePayload.email.toLowerCase(),
    name: profilePayload.name || 'Facebook User',
    profileImage: profilePayload?.picture?.data?.url,
  };
};
