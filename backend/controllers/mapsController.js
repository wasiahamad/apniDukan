const parseLatLng = (value) => {
  const raw = String(value || '').trim();
  const parts = raw.split(',').map((x) => x.trim());
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

const parseLatLngBody = (body) => {
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

// @desc    Get route between origin and destination (polyline)
// @route   GET /api/maps/route?origin=lat,lng&destination=lat,lng
// @access  Public
export const getRoute = async (req, res) => {
  try {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      return res.status(503).json({
        success: false,
        code: 'MAPS_KEY_MISSING',
        message: 'GOOGLE_MAPS_API_KEY not configured',
      });
    }

    const origin = parseLatLng(req.query.origin);
    const destination = parseLatLng(req.query.destination);

    if (!origin) return res.status(400).json({ success: false, message: 'Invalid origin' });
    if (!destination) return res.status(400).json({ success: false, message: 'Invalid destination' });

    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
    url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
    url.searchParams.set('mode', String(req.query.mode || 'driving'));
    url.searchParams.set('key', key);

    const resp = await fetch(url.toString());
    const json = await resp.json();

    if (!resp.ok) {
      return res.status(502).json({
        success: false,
        code: 'DIRECTIONS_HTTP_ERROR',
        message: 'Directions request failed',
        error: json,
      });
    }

    // Google Directions API returns 200 even for logical errors.
    const status = String(json?.status || '').toUpperCase();
    if (status && status !== 'OK') {
      const http = status === 'OVER_QUERY_LIMIT' ? 429 : 400;
      return res.status(http).json({
        success: false,
        code: `DIRECTIONS_${status}`,
        message: json?.error_message || status,
      });
    }

    const route = json?.routes?.[0];
    const leg = route?.legs?.[0];
    const polyline = route?.overview_polyline?.points;
    if (!route || !leg || !polyline) {
      return res.status(404).json({ success: false, message: json?.status || 'No route found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        polyline,
        distanceText: leg?.distance?.text || '',
        durationText: leg?.duration?.text || '',
        distanceMeters: Number(leg?.distance?.value || 0),
        durationSeconds: Number(leg?.duration?.value || 0),
        startAddress: leg?.start_address || '',
        endAddress: leg?.end_address || '',
        steps:
          Array.isArray(leg?.steps)
            ? leg.steps
                .map((s) => ({
                  instruction: String(s?.html_instructions || '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim(),
                  distanceText: s?.distance?.text || '',
                  durationText: s?.duration?.text || '',
                }))
                .filter((s) => s.instruction)
            : [],
      },
    });
  } catch (error) {
    console.error('Get route error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching route' });
  }
};

// @desc    Save anonymous visitor location (TTL)
// @route   POST /api/maps/visit
// @access  Public
export const saveVisitorLocation = async (req, res) => {
  try {
    const { VisitorLocation, Business } = await import('../models/index.js');
    const loc = parseLatLngBody(req.body);
    if (!loc) return res.status(400).json({ success: false, message: 'Invalid lat/lng' });

    const shopSlug = String(req.body?.shopSlug || '').trim().toLowerCase() || undefined;
    const page = String(req.body?.page || 'unknown').trim() || 'unknown';
    const source = String(req.body?.source || 'website').trim() || 'website';
    const accuracyMeters = Number(req.body?.accuracyMeters);

    let businessId;
    if (shopSlug) {
      const business = await Business.findOne({ slug: shopSlug, isActive: true }).select('_id');
      if (business?._id) businessId = business._id;
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const doc = await VisitorLocation.create({
      shopSlug,
      business: businessId,
      page,
      source,
      location: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      accuracyMeters: Number.isFinite(accuracyMeters) ? accuracyMeters : undefined,
      metadata: {
        userAgent: req.get('user-agent') || undefined,
        ipAddress: req.ip,
        referrer: req.get('referer') || undefined,
      },
      expiresAt,
    });

    return res.status(201).json({ success: true, data: { visitId: doc._id } });
  } catch (error) {
    console.error('Save visitor location error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error saving location' });
  }
};
