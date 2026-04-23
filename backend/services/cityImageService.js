/**
 * City Image Service
 * Generates or fetches images for cities using AI or public APIs
 */

import cloudinary from '../config/cloudinary.js';
import KeyValue from '../models/KeyValue.js';
import mongoose from 'mongoose';

// Cache for generated images (city -> image URL)
const cityImageCache = new Map();

const toSafeKey = (input) =>
  String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 80);

const toPublicId = (input) =>
  String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'city';

const hasCloudinaryConfig = () =>
  !!process.env.CLOUDINARY_CLOUD_NAME && !!process.env.CLOUDINARY_API_KEY && !!process.env.CLOUDINARY_API_SECRET;

const isMongoConnected = () => mongoose?.connection?.readyState === 1;

const getCloudflareAiConfig = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return {
    accountId: String(accountId).trim(),
    apiToken: String(apiToken).trim(),
  };
};

const runCloudflareImageModelOverHttp = async ({ prompt, model, width, height }) => {
  const cfg = getCloudflareAiConfig();
  if (!cfg) {
    const err = new Error('Cloudflare Workers AI is not configured for image generation');
    err.code = 'CF_AI_NOT_CONFIGURED';
    throw err;
  }

  // Cloudflare model IDs include '/' (e.g. '@cf/stabilityai/...'). Do not encode '/'.
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfg.accountId)}/ai/run/${encodeURI(model)}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      width,
      height,
    }),
  });

  const payloadText = await resp.text().catch(() => '');
  if (!resp.ok) {
    const err = new Error(`Cloudflare AI HTTP error (${resp.status}): ${payloadText || resp.statusText}`);
    err.code = 'CF_AI_HTTP_ERROR';
    throw err;
  }

  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    const err = new Error('Cloudflare AI returned non-JSON response for image generation');
    err.code = 'CF_AI_BAD_RESPONSE';
    throw err;
  }

  const result = payload?.result;
  const base64 =
    (typeof result?.image === 'string' && result.image) ||
    (Array.isArray(result?.images) && typeof result.images[0] === 'string' && result.images[0]) ||
    (Array.isArray(result?.data) && typeof result.data[0] === 'string' && result.data[0]) ||
    null;

  if (!base64 || !String(base64).trim()) {
    const err = new Error('Cloudflare AI response did not include image data');
    err.code = 'CF_AI_EMPTY';
    throw err;
  }

  const cleaned = String(base64).trim().replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
  return cleaned;
};

const uploadBase64PngToCloudinary = async ({ base64, publicId, folder }) => {
  if (!hasCloudinaryConfig()) {
    const err = new Error('Cloudinary is not configured on the server');
    err.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw err;
  }

  const dataUri = `data:image/png;base64,${base64}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    public_id: publicId,
    resource_type: 'image',
    overwrite: false,
  });

  const url = result?.secure_url;
  if (!url) {
    const err = new Error('Cloudinary upload did not return a secure_url');
    err.code = 'CLOUDINARY_UPLOAD_FAILED';
    throw err;
  }
  return url;
};

/**
 * Famous landmarks mapping for Indian cities with Unsplash search terms
 */
const cityLandmarks = {
  delhi: {
    landmark: 'Red Fort',
    unsplashQuery: 'Red Fort Delhi India',
    fallback: 'https://images.unsplash.com/photo-1519167758481-83f19106c8e3?w=400&h=300&fit=crop',
  },
  mumbai: {
    landmark: 'Gateway of India',
    unsplashQuery: 'Gateway of India Mumbai',
    fallback: 'https://images.unsplash.com/photo-1570859537857-2ba5e9b08996?w=400&h=300&fit=crop',
  },
  bangalore: {
    landmark: 'Vidhana Soudha',
    unsplashQuery: 'Bangalore city skyline India',
    fallback: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b2?w=400&h=300&fit=crop',
  },
  hyderabad: {
    landmark: 'Charminar',
    unsplashQuery: 'Charminar Hyderabad India',
    fallback: 'https://images.unsplash.com/photo-1613395877304-552e8e0ce6e2?w=400&h=300&fit=crop',
  },
  jaipur: {
    landmark: 'City Palace',
    unsplashQuery: 'Jaipur City Palace India',
    fallback: 'https://images.unsplash.com/photo-1599707154472-d4ddce44e7e8?w=400&h=300&fit=crop',
  },
  kolkata: {
    landmark: 'Victoria Memorial',
    unsplashQuery: 'Kolkata Victoria Memorial India',
    fallback: 'https://images.unsplash.com/photo-1570859537857-2ba5e9b08996?w=400&h=300&fit=crop',
  },
  ahmedabad: {
    landmark: 'Sabarmati Ashram',
    unsplashQuery: 'Ahmedabad Gujarat India',
    fallback: 'https://images.unsplash.com/photo-1613395877304-552e8e0ce6e2?w=400&h=300&fit=crop',
  },
  pune: {
    landmark: 'Aga Khan Palace',
    unsplashQuery: 'Pune Maharashtra India',
    fallback: 'https://images.unsplash.com/photo-1599707154472-d4ddce44e7e8?w=400&h=300&fit=crop',
  },
  lucknow: {
    landmark: 'Bara Imambara',
    unsplashQuery: 'Lucknow India',
    fallback: 'https://images.unsplash.com/photo-1530318521569-8d9a8f819e5e?w=400&h=300&fit=crop',
  },
  chandigarh: {
    landmark: 'Rock Garden',
    unsplashQuery: 'Chandigarh India',
    fallback: 'https://images.unsplash.com/photo-1567010772281-658239387ef8?w=400&h=300&fit=crop',
  },
  indore: {
    landmark: 'Rajwada Palace',
    unsplashQuery: 'Indore Madhya Pradesh India',
    fallback: 'https://images.unsplash.com/photo-1599707154472-d4ddce44e7e8?w=400&h=300&fit=crop',
  },
  surat: {
    landmark: 'Diamond City',
    unsplashQuery: 'Surat Gujarat India',
    fallback: 'https://images.unsplash.com/photo-1613395877304-552e8e0ce6e2?w=400&h=300&fit=crop',
  },
};
    
/**
 * Generate a Cloudinary poster for a city
 * This creates a styled city poster with the city name and landmark
 */
function generateCityPoster(cityName) { 
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return `https://via.placeholder.com/400x300?text=${encodeURIComponent(cityName)}`;
  }

  const cityKey = cityName.toLowerCase();
  const landmark = cityLandmarks[cityKey];

  // Use Cloudinary to create a styled text overlay poster
  const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 'A29BFE', 'FD79A8'];
  const colorHash = cityName
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = colorHash % colors.length;
  const bgColor = colors[colorIndex];

  // Create a Cloudinary poster with:
  // 1. Background color
  // 2. City name as main text
  // 3. Landmark name as subtitle
  // 4. Nice styling
  const cloudinaryUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/fetch/w_400,h_300,c_fill,b_${bgColor},o_40/l_text:Arial_bold_60:${encodeURIComponent(
    cityName
  )},w_360,h_120,c_fit,co_white,y_50/l_text:Arial_30:${encodeURIComponent(
    landmark?.landmark || 'Welcome'
  )},w_360,h_80,c_fit,co_white,y_170/https://via.placeholder.com/400x300`;

  return cloudinaryUrl;
}

/**
 * Get city image - generate Cloudinary poster or use landmark image
 */
async function getCityImage(cityName) {
  try {
    const cityKey = toSafeKey(cityName);
    if (!cityKey) {
      return `https://via.placeholder.com/400x300?text=${encodeURIComponent('City')}`;
    }

    // Check in-memory cache first
    if (cityImageCache.has(cityKey)) return cityImageCache.get(cityKey);

    // Check persistent KV cache (only when Mongo is connected)
    const kvKey = `cityImage:${cityKey}`;
    if (isMongoConnected()) {
      try {
        const kv = await KeyValue.findOne({ key: kvKey }).select('value').lean();
        const cachedUrl = String(kv?.value || '').trim();
        if (cachedUrl) {
          cityImageCache.set(cityKey, cachedUrl);
          return cachedUrl;
        }
      } catch {
        // ignore KV failures; we still have runtime fallbacks
      }
    }

    const landmark = cityLandmarks[cityKey];

    // If AI + Cloudinary are configured, generate once and persist.
    // Otherwise, fall back to known landmark photos or a Cloudinary text poster.
    let imageUrl = '';
    const imageModel = String(process.env.CF_AI_IMAGE_MODEL || '@cf/stabilityai/stable-diffusion-xl-base-1.0').trim();
    const canGenerateAiImage = !!getCloudflareAiConfig() && hasCloudinaryConfig();

    if (canGenerateAiImage) {
      try {
        const landmarkLabel = landmark?.landmark ? ` (${landmark.landmark})` : '';
        const prompt = `High-quality photorealistic travel photo of a famous landmark in ${cityName}${landmarkLabel}, India. Golden hour lighting, realistic details, wide angle, no text, no watermark.`;

        const base64 = await runCloudflareImageModelOverHttp({
          prompt,
          model: imageModel,
          width: 768,
          height: 576,
        });

        const publicId = `city-${toPublicId(cityKey)}`;
        imageUrl = await uploadBase64PngToCloudinary({
          base64,
          publicId,
          folder: 'apnidukan/cities',
        });
      } catch (e) {
        // Best-effort: if AI generation fails, use fallback.
        imageUrl = '';
      }
    }

    if (!imageUrl) {
      imageUrl = landmark?.fallback || generateCityPoster(cityName);
    }

    // Cache in memory + persist best-effort
    cityImageCache.set(cityKey, imageUrl);
    if (isMongoConnected()) {
      try {
        await KeyValue.updateOne({ key: kvKey }, { $set: { value: imageUrl } }, { upsert: true });
      } catch {
        // ignore
      }
    }

    return imageUrl;
  } catch (error) {
    console.error(`Error generating poster for ${cityName}:`, error);
    // Return a fallback placeholder
    return `https://via.placeholder.com/400x300?text=${encodeURIComponent(cityName)}`;
  }
}

export { getCityImage };

