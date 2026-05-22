import { User, VisitorLocation } from '../models/index.js';

const parseLatLng = (body) => {
  const lat = Number(body?.latitude ?? body?.lat);
  const lng = Number(body?.longitude ?? body?.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

const normalizeMeta = (body) => {
  const city = String(body?.city || '').trim();
  const state = String(body?.state || '').trim();
  const country = String(body?.country || '').trim();
  const pincode = String(body?.pincode || '').trim();
  const source = String(body?.source || '').trim();
  const accuracy = Number(body?.accuracy ?? body?.accuracyMeters);

  return {
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(country ? { country } : {}),
    ...(pincode ? { pincode } : {}),
    ...(source ? { source } : {}),
    ...(Number.isFinite(accuracy) && accuracy >= 0 ? { accuracy } : {}),
  };
};

// @desc    Update user location (auth optional). Anonymous locations stored as visitor entries.
// @route   POST /api/location/update
// @access  Public (optional auth)
export const updateLocation = async (req, res) => {
  try {
    const coords = parseLatLng(req.body || {});
    if (!coords) {
      return res.status(400).json({ success: false, message: 'Invalid latitude/longitude' });
    }

    const meta = normalizeMeta(req.body || {});
    const now = new Date();

    if (req.user?._id) {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      user.currentLocation = {
        type: 'Point',
        coordinates: [coords.lng, coords.lat],
        ...(meta.accuracy != null ? { accuracy: meta.accuracy } : {}),
        capturedAt: now,
      };

      user.currentLocationMeta = {
        ...(meta.city ? { city: meta.city } : {}),
        ...(meta.state ? { state: meta.state } : {}),
        ...(meta.country ? { country: meta.country } : {}),
        ...(meta.pincode ? { pincode: meta.pincode } : {}),
        ...(meta.source ? { source: meta.source } : {}),
        capturedAt: now,
      };

      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Location updated',
        data: {
          stored: 'user',
          updatedAt: now.toISOString(),
          locationUpdatedAt: now.toISOString(),
          locationAgeSeconds: 0,
        },
      });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await VisitorLocation.create({
      page: String(req.body?.page || 'app').trim() || 'app',
      source: String(req.body?.source || 'public').trim() || 'public',
      location: { type: 'Point', coordinates: [coords.lng, coords.lat] },
      accuracyMeters: meta.accuracy,
      metadata: {
        userAgent: req.get('user-agent') || undefined,
        ipAddress: req.ip,
        referrer: req.get('referer') || undefined,
      },
      expiresAt,
    });

    return res.status(200).json({
      success: true,
      message: 'Location stored',
      data: { stored: 'visitor', updatedAt: now.toISOString() },
    });
  } catch (error) {
    console.error('Update location error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error updating location' });
  }
};
