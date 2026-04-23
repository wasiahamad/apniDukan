import cloudinary from '../config/cloudinary.js';
import { Business, Listing, Story, StoryView } from '../models/index.js';

const hasCloudinaryConfig = () => {
  return (
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET
  );
};

const getMediaTypeFromMimetype = (mimetype) => {
  if (typeof mimetype !== 'string') return null;
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return null;
};

const uploadToCloudinary = async (file, folder) => {
  if (!hasCloudinaryConfig()) {
    const err = new Error('Cloudinary is not configured on the server');
    err.statusCode = 500;
    throw err;
  }

  if (!file?.buffer) {
    const err = new Error('No file uploaded');
    err.statusCode = 400;
    throw err;
  }

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, uploadResult) => {
        if (error) return reject(error);
        resolve(uploadResult);
      }
    );

    uploadStream.end(file.buffer);
  });

  return result;
};

const isValidLinkUrl = (value) => {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  // Allow absolute http(s) links and site-relative links
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return true;
  return false;
};

const resolveBusinessForCreate = async (req) => {
  if (req.user?.role === 'admin') {
    const businessId = req.body?.businessId;
    if (businessId) {
      const business = await Business.findById(businessId);
      return business;
    }
  }

  const business = await Business.findOne({ owner: req.user._id, isActive: true });
  return business;
};

const resolveStoryBusinessOwnerId = async (storyBusinessId) => {
  const biz = await Business.findById(storyBusinessId).select('owner').lean();
  return biz?.owner ? String(biz.owner) : null;
};

const canMutateStory = async (req, story) => {
  if (!req.user?._id) return false;
  if (req.user.role === 'admin') return true;
  if (req.user.role !== 'business_owner') return false;

  const ownerId = await resolveStoryBusinessOwnerId(story.business);
  return !!ownerId && ownerId === String(req.user._id);
};

const isTruthyQueryValue = (v) => {
  if (v === true) return true;
  if (v === false) return false;
  if (v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'y';
};

/**
 * POST /api/story
 * Upload a story (or reel if kind='reel')
 *
 * Accepts either:
 * - multipart/form-data: file + caption + kind + folder(optional)
 * OR
 * - JSON: mediaUrl + mediaType + caption + kind
 */
export const createStory = async (req, res) => {
  try {
    const business = await resolveBusinessForCreate(req);
    if (!business || business.isActive !== true) {
      return res.status(400).json({
        success: false,
        message: 'No active business found for this account',
      });
    }

    const kind = (req.body?.kind || 'story').toString().toLowerCase();
    if (!['story', 'reel'].includes(kind)) {
      return res.status(400).json({
        success: false,
        message: "Invalid kind. Allowed: 'story' | 'reel'",
      });
    }

    const caption = (req.body?.caption || '').toString();

    const linkUrlRaw = req.body?.linkUrl;
    const linkUrl = typeof linkUrlRaw === 'string' ? linkUrlRaw.trim() : (linkUrlRaw ? String(linkUrlRaw).trim() : '');
    if (linkUrl && !isValidLinkUrl(linkUrl)) {
      return res.status(400).json({
        success: false,
        message: 'linkUrl must start with http(s):// or /',
      });
    }

    let durationSec = null;
    if (kind === 'story' && req.body?.durationSec !== undefined && req.body?.durationSec !== null && String(req.body.durationSec).trim() !== '') {
      const parsed = Number(String(req.body.durationSec).trim());
      if (!Number.isFinite(parsed)) {
        return res.status(400).json({
          success: false,
          message: 'durationSec must be a number',
        });
      }
      const normalized = Math.floor(parsed);
      if (normalized < 1 || normalized > 60) {
        return res.status(400).json({
          success: false,
          message: 'durationSec must be between 1 and 60',
        });
      }
      durationSec = normalized;
    }

    const folder = req.body?.folder || 'apnidukan/stories';

    let mediaUrl = req.body?.mediaUrl;
    let mediaType = req.body?.mediaType;

    if (req.file) {
      const inferred = getMediaTypeFromMimetype(req.file.mimetype);
      const uploadResult = await uploadToCloudinary(req.file, folder);
      mediaUrl = uploadResult?.secure_url;
      mediaType = inferred || (uploadResult?.resource_type === 'video' ? 'video' : 'image');
    }

    if (!mediaUrl || typeof mediaUrl !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'mediaUrl is required (or upload a file)',
      });
    }

    if (!mediaType || !['image', 'video'].includes(mediaType)) {
      return res.status(400).json({
        success: false,
        message: "mediaType must be 'image' or 'video'",
      });
    }

    if (kind === 'reel' && mediaType !== 'video') {
      return res.status(400).json({
        success: false,
        message: 'Reels must be video only',
      });
    }

    const now = new Date();
    const expiresAt = kind === 'story' ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : undefined;

    const story = await Story.create({
      business: business._id,
      kind,
      mediaUrl,
      mediaType,
      caption,
      ...(kind === 'story' && durationSec ? { durationSec } : {}),
      ...(linkUrl ? { linkUrl } : {}),
      ...(expiresAt ? { expiresAt } : {}),
    });

    return res.status(201).json({
      success: true,
      message: kind === 'reel' ? 'Reel uploaded' : 'Story uploaded',
      data: {
        _id: story._id,
        businessId: story.business,
        kind: story.kind,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        durationSec: story.durationSec ?? null,
        linkUrl: story.linkUrl ?? null,
        viewsCount: story.viewsCount || 0,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt || null,
      },
    });
  } catch (error) {
    console.error('Create story error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error uploading story',
    });
  }
};

/**
 * POST /api/stories/from-listing
 * Create a story/reel using an existing listing.
 * - Story: uses listing primary image (no upload required)
 * - Reel: requires an uploaded video file
 * Auto-attaches linkUrl to the listing in the public storefront.
 */
export const createStoryFromListing = async (req, res) => {
  try {
    const business = await resolveBusinessForCreate(req);
    if (!business || business.isActive !== true) {
      return res.status(400).json({
        success: false,
        message: 'No active business found for this account',
      });
    }

    const listingIdRaw = req.body?.listingId ?? req.body?.listing;
    const listingId = typeof listingIdRaw === 'string' ? listingIdRaw.trim() : (listingIdRaw ? String(listingIdRaw).trim() : '');
    if (!listingId) {
      return res.status(400).json({ success: false, message: 'listingId is required' });
    }

    const kind = (req.body?.kind || 'story').toString().toLowerCase();
    if (!['story', 'reel'].includes(kind)) {
      return res.status(400).json({
        success: false,
        message: "Invalid kind. Allowed: 'story' | 'reel'",
      });
    }

    const listing = await Listing.findOne({ _id: listingId, business: business._id }).lean();
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found for this business',
      });
    }

    const captionRaw = req.body?.caption;
    const caption = (typeof captionRaw === 'string' ? captionRaw : (captionRaw ? String(captionRaw) : '')).toString();

    let durationSec = null;
    if (kind === 'story' && req.body?.durationSec !== undefined && req.body?.durationSec !== null && String(req.body.durationSec).trim() !== '') {
      const parsed = Number(String(req.body.durationSec).trim());
      if (!Number.isFinite(parsed)) {
        return res.status(400).json({ success: false, message: 'durationSec must be a number' });
      }
      const normalized = Math.floor(parsed);
      if (normalized < 1 || normalized > 60) {
        return res.status(400).json({ success: false, message: 'durationSec must be between 1 and 60' });
      }
      durationSec = normalized;
    }

    // Build storefront relative link.
    // Public Website uses /:shopSlug for shop pages, so keep link relative.
    const slug = typeof business.slug === 'string' ? business.slug.trim() : '';
    const linkUrl = slug ? `/${slug}?listing=${encodeURIComponent(String(listing._id))}` : null;

    const folder = req.body?.folder || 'apnidukan/stories';

    let mediaUrl = null;
    let mediaType = null;

    if (kind === 'reel') {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Reel requires a video upload',
        });
      }

      const inferred = getMediaTypeFromMimetype(req.file.mimetype);
      if (inferred !== 'video') {
        return res.status(400).json({
          success: false,
          message: 'Reels must be video only',
        });
      }

      const uploadResult = await uploadToCloudinary(req.file, folder);
      mediaUrl = uploadResult?.secure_url;
      mediaType = 'video';
    } else {
      const firstImageUrl = Array.isArray(listing.images) ? String(listing.images?.[0]?.url || '').trim() : '';
      if (!firstImageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Listing has no image. Please add at least one image to the listing first.',
        });
      }
      mediaUrl = firstImageUrl;
      mediaType = 'image';
    }

    if (!mediaUrl) {
      return res.status(400).json({ success: false, message: 'Unable to resolve mediaUrl' });
    }

    const now = new Date();
    const expiresAt = kind === 'story' ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : undefined;

    const story = await Story.create({
      business: business._id,
      kind,
      mediaUrl,
      mediaType,
      caption: caption || listing.title || '',
      ...(kind === 'story' && durationSec ? { durationSec } : {}),
      ...(linkUrl ? { linkUrl } : {}),
      ...(expiresAt ? { expiresAt } : {}),
    });

    return res.status(201).json({
      success: true,
      message: kind === 'reel' ? 'Reel created from listing' : 'Story created from listing',
      data: {
        _id: story._id,
        businessId: story.business,
        kind: story.kind,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        durationSec: story.durationSec ?? null,
        linkUrl: story.linkUrl ?? null,
        viewsCount: story.viewsCount || 0,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt || null,
      },
    });
  } catch (error) {
    console.error('Create story from listing error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error creating story from listing',
    });
  }
};

/**
 * GET /api/stories
 * Fetch active stories (latest first)
 * Optional: ?kind=story|reel (default: story)
 */
export const getStories = async (req, res) => {
  try {
    const kind = (req.query?.kind || 'story').toString().toLowerCase();
    if (!['story', 'reel'].includes(kind)) {
      return res.status(400).json({
        success: false,
        message: "Invalid kind. Allowed: 'story' | 'reel'",
      });
    }

    const businessId = req.query?.businessId ? req.query.businessId.toString() : null;

    const now = new Date();

    const query = { kind, isDeleted: false };
    if (businessId) {
      query.business = businessId;
    }
    if (kind === 'story') {
      query.expiresAt = { $gt: now };
    }

    const stories = await Story.find(query)
      .sort({ createdAt: -1 })
      .populate('business', 'name logo slug')
      .select('business mediaUrl mediaType caption createdAt expiresAt kind durationSec linkUrl viewsCount')
      .lean();

    // If some older docs don't have viewsCount (or it's null), compute it from StoryView.
    const missingViewsIds = stories
      .filter((s) => s.viewsCount === null || s.viewsCount === undefined)
      .map((s) => s._id);

    let computedViewsMap = null;
    if (missingViewsIds.length > 0) {
      const counts = await StoryView.aggregate([
        { $match: { story: { $in: missingViewsIds } } },
        { $group: { _id: '$story', count: { $sum: 1 } } },
      ]);

      computedViewsMap = new Map(counts.map((c) => [String(c._id), Number(c.count || 0)]));

      // Persist backfill (best-effort)
      try {
        const ops = missingViewsIds.map((id) => ({
          updateOne: {
            filter: { _id: id },
            update: { $set: { viewsCount: computedViewsMap.get(String(id)) || 0 } },
          },
        }));
        if (ops.length > 0) await Story.bulkWrite(ops, { ordered: false });
      } catch {
        // ignore
      }
    }

    return res.status(200).json({
      success: true,
      data: stories.map((s) => {
        const biz = s.business && typeof s.business === 'object' ? s.business : null;
        return {
          _id: s._id,
          businessId: biz?._id || s.business,
          business: biz
            ? {
                _id: biz._id,
                name: biz.name,
                logo: biz.logo || null,
                slug: biz.slug || null,
              }
            : null,
          kind: s.kind,
          mediaUrl: s.mediaUrl,
          mediaType: s.mediaType,
          caption: s.caption,
          durationSec: typeof s.durationSec === 'number' ? s.durationSec : null,
          linkUrl: s.linkUrl || null,
          viewsCount: Number.isFinite(Number(s.viewsCount))
            ? Number(s.viewsCount)
            : (computedViewsMap ? (computedViewsMap.get(String(s._id)) || 0) : 0),
          createdAt: s.createdAt,
          expiresAt: s.expiresAt || null,
        };
      }),
    });
  } catch (error) {
    console.error('Get stories error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching stories',
    });
  }
};

/**
 * POST /api/stories/:id/view
 * Mark a story/reel as viewed by the logged-in user (unique per user per story)
 */
export const markStoryViewed = async (req, res) => {
  try {
    const storyId = req.params?.id;
    if (!storyId) {
      return res.status(400).json({ success: false, message: 'Story id is required' });
    }
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const story = await Story.findById(storyId).select('business kind expiresAt isDeleted').lean();
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    if (story.isDeleted === true) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    // Only count active stories
    if (story.kind === 'story' && story.expiresAt && new Date(story.expiresAt).getTime() <= Date.now()) {
      return res.status(200).json({ success: true, data: { viewed: false, reason: 'expired' } });
    }

    // Do not count business owner's own views
    const biz = await Business.findById(story.business).select('owner').lean();
    if (biz?.owner && String(biz.owner) === String(req.user._id)) {
      return res.status(200).json({ success: true, data: { viewed: false, reason: 'self' } });
    }

    // Do not count admin/staff views (internal preview should not affect analytics)
    if (req.user?.role === 'admin' || req.user?.role === 'staff') {
      const current = await Story.findById(storyId).select('viewsCount').lean();
      const viewsCount = current?.viewsCount ?? null;
      return res.status(200).json({ success: true, data: { viewed: false, reason: 'admin', viewsCount } });
    }

    let viewed = false;
    try {
      await StoryView.create({ story: storyId, viewer: req.user._id });
      viewed = true;
    } catch (e) {
      // Duplicate key can happen under race; treat as already viewed
      if (e?.code !== 11000) throw e;
      viewed = false;
    }

    let viewsCount = null;
    if (viewed) {
      const updated = await Story.findByIdAndUpdate(storyId, { $inc: { viewsCount: 1 } }, { new: true })
        .select('viewsCount')
        .lean();
      viewsCount = updated?.viewsCount ?? null;
    } else {
      const current = await Story.findById(storyId).select('viewsCount').lean();
      viewsCount = current?.viewsCount ?? null;

      // Backfill for stories created/seen before viewsCount existed or before the old bug fix.
      if (viewsCount === null || viewsCount === undefined) {
        const computed = await StoryView.countDocuments({ story: storyId });
        const updated = await Story.findByIdAndUpdate(
          storyId,
          { $set: { viewsCount: computed } },
          { new: true }
        )
          .select('viewsCount')
          .lean();
        viewsCount = updated?.viewsCount ?? computed;
      }
    }

    return res.status(200).json({ success: true, data: { viewed, reason: viewed ? 'ok' : 'duplicate', viewsCount } });
  } catch (error) {
    console.error('Mark story viewed error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error marking story viewed' });
  }
};

/**
 * PATCH /api/stories/:id
 * Update story/reel metadata (caption/link/duration)
 * Allowed: business owner (own story) or admin
 */
export const updateStory = async (req, res) => {
  try {
    const storyId = req.params?.id;
    if (!storyId) return res.status(400).json({ success: false, message: 'Story id is required' });
    if (!req.user?._id) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const story = await Story.findById(storyId).select('business kind caption linkUrl durationSec isDeleted').lean();
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });

    if (story.isDeleted === true && req.user?.role !== 'admin') {
      return res.status(410).json({ success: false, message: 'Story has been deleted' });
    }

    const allowed = await canMutateStory(req, story);
    if (!allowed) return res.status(403).json({ success: false, message: 'Not authorized to update this story' });

    const next = {};

    if (req.body?.caption !== undefined) {
      next.caption = String(req.body.caption || '').toString().slice(0, 500);
    }

    if (req.body?.linkUrl !== undefined) {
      const linkUrlRaw = req.body?.linkUrl;
      const linkUrl = typeof linkUrlRaw === 'string' ? linkUrlRaw.trim() : (linkUrlRaw ? String(linkUrlRaw).trim() : '');
      if (linkUrl && !isValidLinkUrl(linkUrl)) {
        return res.status(400).json({ success: false, message: 'linkUrl must start with http(s):// or /' });
      }
      next.linkUrl = linkUrl || null;
    }

    if (req.body?.durationSec !== undefined) {
      if (story.kind !== 'story') {
        return res.status(400).json({ success: false, message: 'durationSec can be set only for stories' });
      }

      const raw = req.body?.durationSec;
      if (raw === null || String(raw).trim() === '') {
        next.durationSec = null;
      } else {
        const parsed = Number(String(raw).trim());
        if (!Number.isFinite(parsed)) {
          return res.status(400).json({ success: false, message: 'durationSec must be a number' });
        }
        const normalized = Math.floor(parsed);
        if (normalized < 1 || normalized > 60) {
          return res.status(400).json({ success: false, message: 'durationSec must be between 1 and 60' });
        }
        next.durationSec = normalized;
      }
    }

    const updated = await Story.findByIdAndUpdate(storyId, { $set: next }, { new: true })
      .populate('business', 'name logo slug')
      .select('business mediaUrl mediaType caption createdAt expiresAt kind durationSec linkUrl viewsCount')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Story updated',
      data: {
        _id: updated._id,
        businessId: updated.business?._id || updated.business,
        business: updated.business
          ? {
              _id: updated.business._id,
              name: updated.business.name,
              logo: updated.business.logo || null,
              slug: updated.business.slug || null,
            }
          : null,
        kind: updated.kind,
        mediaUrl: updated.mediaUrl,
        mediaType: updated.mediaType,
        caption: updated.caption,
        durationSec: typeof updated.durationSec === 'number' ? updated.durationSec : null,
        linkUrl: updated.linkUrl || null,
        viewsCount: updated.viewsCount || 0,
        createdAt: updated.createdAt,
        expiresAt: updated.expiresAt || null,
      },
    });
  } catch (error) {
    console.error('Update story error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error updating story' });
  }
};

/**
 * DELETE /api/stories/:id
 * Delete a story/reel + its viewers
 * Allowed: business owner (own story) or admin
 */
export const deleteStory = async (req, res) => {
  try {
    const storyId = req.params?.id;
    if (!storyId) return res.status(400).json({ success: false, message: 'Story id is required' });
    if (!req.user?._id) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const story = await Story.findById(storyId).select('business kind isDeleted').lean();
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });

    const allowed = await canMutateStory(req, story);
    if (!allowed) return res.status(403).json({ success: false, message: 'Not authorized to delete this story' });

    if (story.isDeleted === true) {
      return res.status(200).json({ success: true, message: 'Story deleted' });
    }

    await Story.updateOne(
      { _id: storyId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user._id,
        },
      }
    );

    // Keep StoryView records for backup/audit.
    return res.status(200).json({ success: true, message: 'Story deleted' });
  } catch (error) {
    console.error('Delete story error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error deleting story' });
  }
};

/**
 * GET /api/admin/stories
 * Admin-only: Fetch stories/reels including deleted/expired for backup.
 * Optional:
 * - kind=story|reel (default: story)
 * - businessId=<mongoId>
 * - includeDeleted=1|0 (default: 1)
 * - includeExpired=1|0 (default: 1) (only affects kind=story)
 */
export const getStoriesAdmin = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const kind = (req.query?.kind || 'story').toString().toLowerCase();
    if (!['story', 'reel'].includes(kind)) {
      return res.status(400).json({
        success: false,
        message: "Invalid kind. Allowed: 'story' | 'reel'",
      });
    }

    const businessId = req.query?.businessId ? req.query.businessId.toString() : null;
    const includeDeleted = req.query?.includeDeleted === undefined ? true : isTruthyQueryValue(req.query.includeDeleted);
    const includeExpired = req.query?.includeExpired === undefined ? true : isTruthyQueryValue(req.query.includeExpired);

    const now = new Date();

    const query = { kind };
    if (businessId) query.business = businessId;
    if (!includeDeleted) query.isDeleted = false;
    if (kind === 'story' && !includeExpired) query.expiresAt = { $gt: now };

    const stories = await Story.find(query)
      .sort({ createdAt: -1 })
      .populate('business', 'name logo slug')
      .select('business mediaUrl mediaType caption createdAt expiresAt kind durationSec linkUrl viewsCount isDeleted deletedAt deletedBy')
      .lean();

    return res.status(200).json({
      success: true,
      data: (stories || []).map((s) => {
        const biz = s.business && typeof s.business === 'object' ? s.business : null;
        return {
          _id: s._id,
          businessId: biz?._id || s.business,
          business: biz
            ? {
                _id: biz._id,
                name: biz.name,
                logo: biz.logo || null,
                slug: biz.slug || null,
              }
            : null,
          kind: s.kind,
          mediaUrl: s.mediaUrl,
          mediaType: s.mediaType,
          caption: s.caption,
          durationSec: typeof s.durationSec === 'number' ? s.durationSec : null,
          linkUrl: s.linkUrl || null,
          viewsCount: Number(s.viewsCount || 0),
          createdAt: s.createdAt,
          expiresAt: s.expiresAt || null,
          isDeleted: s.isDeleted === true,
          deletedAt: s.deletedAt || null,
          deletedBy: s.deletedBy || null,
        };
      }),
    });
  } catch (error) {
    console.error('Get admin stories error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching stories' });
  }
};

/**
 * GET /api/stories/:id/viewers
 * Fetch viewers (unique users) for a story/reel.
 * Owner-only (or admin).
 */
export const getStoryViewers = async (req, res) => {
  try {
    const storyId = req.params?.id;
    if (!storyId) {
      return res.status(400).json({ success: false, message: 'Story id is required' });
    }
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const story = await Story.findById(storyId).select('business kind').lean();
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    // Allow only story owner (business owner) or admin
    if (req.user?.role !== 'admin') {
      const biz = await Business.findById(story.business).select('owner').lean();
      if (!biz?.owner || String(biz.owner) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to view viewers for this story' });
      }
    }

    const views = await StoryView.find({ story: storyId })
      .sort({ createdAt: -1 })
      .populate('viewer', 'name email profileImage')
      .select('viewer createdAt')
      .lean();

    const data = (views || [])
      .map((v) => {
        const viewer = v.viewer && typeof v.viewer === 'object' ? v.viewer : null;
        if (!viewer) return null;
        return {
          viewer: {
            _id: viewer._id,
            name: viewer.name,
            email: viewer.email,
            profileImage: viewer.profileImage || null,
          },
          viewedAt: v.createdAt,
        };
      })
      .filter(Boolean);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get story viewers error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching viewers' });
  }
};
