import { Business, Listing, Order, DailySummary, User } from '../models/index.js';
import { runAI, extractJsonFromText, truncateToMaxLines } from '../utils/ai.js';
import { getIstDateKey } from './aiUsageService.js';

const SYSTEM_PROMPT =
  'You are a helpful local business assistant for Indian users. Speak in Hinglish, simple, friendly, and short responses.';

const coerceString = (v, fallback = '') => {
  if (typeof v === 'string') return v.trim();
  if (v === null || v === undefined) return fallback;
  return String(v).trim();
};

const coerceStringArray = (v, max = 12) => {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => coerceString(x))
    .filter(Boolean)
    .slice(0, max);
};

const getIstWeekdayKey = (date = new Date()) => {
  const key = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  }).format(date);

  switch (String(key).toLowerCase()) {
    case 'monday':
      return 'monday';
    case 'tuesday':
      return 'tuesday';
    case 'wednesday':
      return 'wednesday';
    case 'thursday':
      return 'thursday';
    case 'friday':
      return 'friday';
    case 'saturday':
      return 'saturday';
    case 'sunday':
      return 'sunday';
    default:
      return 'monday';
  }
};

const isValidTime = (t) => typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t.trim());

const generateSlots = ({ open, close, max = 6, stepMinutes = 60 }) => {
  if (!isValidTime(open) || !isValidTime(close)) return [];

  const [oh, om] = open.split(':').map((x) => Number(x));
  const [ch, cm] = close.split(':').map((x) => Number(x));
  if (![oh, om, ch, cm].every((n) => Number.isFinite(n))) return [];

  const start = oh * 60 + om;
  const end = ch * 60 + cm;
  if (end <= start) return [];

  const fmt = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const out = [];
  for (let s = start; s < end && out.length < max; s += stepMinutes) {
    const e = Math.min(end, s + stepMinutes);
    // Avoid showing a tiny last slot.
    if (e - s < Math.max(30, Math.min(60, stepMinutes))) break;
    out.push(`${fmt(s)}-${fmt(e)}`);
  }
  return out;
};

const formatAddress = (addr) => {
  if (!addr || typeof addr !== 'object') return '';
  const parts = [addr.street, addr.landmark, addr.city, addr.state, addr.pincode]
    .map((x) => coerceString(x))
    .filter(Boolean);
  return parts.join(', ');
};

const formatWorkingHoursCompact = (workingHours) => {
  const wh = workingHours && typeof workingHours === 'object' ? workingHours : null;
  if (!wh) return '';

  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const label = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  };

  const lines = [];
  for (const k of dayKeys) {
    const d = wh[k];
    const open = coerceString(d?.open);
    const close = coerceString(d?.close);
    const isOpen = typeof d?.isOpen === 'boolean' ? d.isOpen : true;
    if (!open && !close && isOpen === false) {
      lines.push(`${label[k]}: closed`);
      continue;
    }
    if (open && close) {
      lines.push(`${label[k]}: ${isOpen === false ? 'closed' : `${open}-${close}`}`);
    }
  }
  return lines.join(' | ');
};

const buildListingsShort = (listings, max = 12) => {
  const arr = Array.isArray(listings) ? listings : [];
  return arr
    .map((l) => {
      const title = coerceString(l?.title);
      if (!title) return '';
      const price = Number(l?.price);
      const priceLabel = Number.isFinite(price) ? `₹${Math.round(price)}` : '';
      return priceLabel ? `${title} (${priceLabel})` : title;
    })
    .filter(Boolean)
    .slice(0, Math.max(1, Math.min(max, 20)));
};

const classifyCustomerIntent = (text) => {
  const t = coerceString(text).toLowerCase();
  if (!t) return 'general';

  const hasAny = (arr) => arr.some((k) => t.includes(k));
  const hasRe = (re) => re.test(t);

  // Products / items intent (Hinglish + common misspellings)
  const productKeywords = [
    'product',
    'products',
    'prod',
    'item',
    'items',
    'listing',
    'listings',
    'menu',
    'catalog',
    'catalogue',
    'samaan',
    'saman',
    'samaaan',
    'kya kya',
    'kaun kaun',
    'kaunse',
    'kaun si',
    'kon kon',
    'konse',
    'kon si',
    'kon konse',
    'milta',
    'milte',
    'available',
    'avail',
    'stock',
    'kitne',
  ];

  // Match "prod" in words like prodyt/prodcts/etc.
  const looksLikeProductWord = hasRe(/prod[a-z]*/i);

  if (looksLikeProductWord || hasAny(productKeywords)) {
    return 'products';
  }

  if (hasAny(['time', 'timing', 'timings', 'open', 'close', 'kab', 'slot', 'slots', 'aaj', 'today', 'working hours', 'hours'])) {
    return 'timings';
  }

  if (hasAny(['address', 'location', 'map', 'direction', 'phone', 'number', 'call', 'whatsapp', 'email', 'contact'])) {
    return 'contact';
  }

  if (hasAny(['about', 'details', 'detail', 'shop', 'store', 'business', 'service', 'services'])) {
    return 'details';
  }

  return 'general';
};

export const buildCustomerChatContext = async ({ businessId }) => {
  const business = await Business.findById(businessId)
    .select('name nameHi description descriptionHi phone whatsapp email address address businessType slug workingHours openStatusMode')
    .populate('businessType', 'name suggestedListingType')
    .lean();

  if (!business || business.isActive === false) return { ok: false, error: 'Business not found' };

  const listings = await Listing.find({ business: business._id, isActive: true })
    .select('title description listingType price priceType discountPercent pricingOptions stock')
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(20)
    .lean();

  const listingSummary = listings.map((l) => {
    const title = coerceString(l?.title);
    const type = coerceString(l?.listingType);
    const price = Number(l?.price);
    const priceLabel = Number.isFinite(price) ? `₹${Math.round(price)}` : '';
    const priceType = coerceString(l?.priceType);
    const suffix = priceType && priceType !== 'fixed' ? ` (${priceType})` : '';
    const stock = Number(l?.stock);
    const stockLabel = Number.isFinite(stock) ? (stock > 0 ? 'in-stock' : 'out-of-stock') : '';
    const pricingOptions = Array.isArray(l?.pricingOptions) ? l.pricingOptions : [];
    const opt = pricingOptions
      .slice(0, 2)
      .map((p) => {
        const label = coerceString(p?.label);
        const amt = Number(p?.price);
        const amtLabel = Number.isFinite(amt) ? `₹${Math.round(amt)}` : '';
        return label ? `${label}${amtLabel ? ` ${amtLabel}` : ''}` : '';
      })
      .filter(Boolean);
    const optLabel = opt.length ? ` | options: ${opt.join(', ')}` : '';
    return `- ${title}${type ? ` [${type}]` : ''} ${priceLabel}${suffix}${stockLabel ? ` | ${stockLabel}` : ''}${optLabel}`.trim();
  });

  const weekdayKey = getIstWeekdayKey(new Date());
  const todays = business?.workingHours?.[weekdayKey];
  const todayOpen = coerceString(todays?.open);
  const todayClose = coerceString(todays?.close);
  const todayIsOpen = typeof todays?.isOpen === 'boolean' ? todays.isOpen : null;
  const slots = generateSlots({ open: todayOpen, close: todayClose, max: 6, stepMinutes: 60 });

  return {
    ok: true,
    business,
    listings,
    details: {
      name: coerceString(business?.nameHi) || coerceString(business?.name),
      about: coerceString(business?.descriptionHi) || coerceString(business?.description),
      address: formatAddress(business?.address),
      phone: coerceString(business?.phone),
      whatsapp: coerceString(business?.whatsapp),
      email: coerceString(business?.email),
      hoursCompact: formatWorkingHoursCompact(business?.workingHours),
      today: {
        weekdayKey,
        open: todayOpen,
        close: todayClose,
        isOpen: todayIsOpen,
        slots,
      },
      listingsShort: buildListingsShort(listings, 12),
    },
    contextText: [
      `Business: ${coerceString(business?.nameHi) || coerceString(business?.name)}`,
      business?.descriptionHi || business?.description ? `About: ${coerceString(business?.descriptionHi) || coerceString(business?.description)}` : null,
      business?.address?.city ? `City: ${coerceString(business.address.city)}` : null,
      todayOpen && todayClose
        ? `Today (IST): ${weekdayKey} ${todayIsOpen === false ? '(closed)' : ''} ${todayOpen}-${todayClose}`.trim()
        : null,
      slots.length ? `Suggested time slots today: ${slots.join(', ')}` : null,
      `Phone: ${coerceString(business?.phone)}`,
      business?.whatsapp ? `WhatsApp: ${coerceString(business?.whatsapp)}` : null,
      listingSummary.length ? `Listings (top):\n${listingSummary.join('\n')}` : 'Listings: (none found)',
    ]
      .filter(Boolean)
      .join('\n'),
  };
};

export const runCustomerChatAgent = async ({ businessId, userMessage }) => {
  const ctx = await buildCustomerChatContext({ businessId });
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const intent = classifyCustomerIntent(userMessage);
  const d = ctx.details || {};

  // Deterministic answers for common shop questions (no hallucinations).
  if (intent === 'products') {
    const items = Array.isArray(d.listingsShort) ? d.listingsShort : [];
    if (!items.length) {
      const contactLine = d.whatsapp ? `WhatsApp: ${d.whatsapp}` : d.phone ? `Call: ${d.phone}` : '';
      return {
        ok: true,
        reply: truncateToMaxLines(
          [
            'Abhi is shop ne products/listings add nahi kiye hain.',
            d.address ? `Address: ${d.address}` : null,
            contactLine || null,
            'Aap product ka naam bata do, main availability confirm karne me help kar dunga.',
          ]
            .filter(Boolean)
            .join('\n'),
          6
        ),
      };
    }

    return {
      ok: true,
      reply: truncateToMaxLines(
        [
          `Is shop me products (sample):`,
          items
            .slice(0, 4)
            .map((x) => `- ${x}`)
            .join('\n'),
          items.length > 4 ? `+ ${items.length - 4} aur items (page par listings me dekh sakte ho)` : null,
          d.whatsapp ? `Order/confirm ke liye WhatsApp: ${d.whatsapp}` : d.phone ? `Call: ${d.phone}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        6
      ),
    };
  }

  if (intent === 'timings') {
    const t = d.today || {};
    const todayLine = t.open && t.close ? `Aaj (${t.weekdayKey}, IST): ${t.isOpen === false ? 'closed' : `${t.open}-${t.close}`}` : '';
    const slotsLine = Array.isArray(t.slots) && t.slots.length ? `Slots: ${t.slots.slice(0, 6).join(', ')}` : '';
    const weekly = d.hoursCompact ? `Weekly: ${d.hoursCompact}` : '';
    const contactLine = d.whatsapp ? `WhatsApp: ${d.whatsapp}` : d.phone ? `Call: ${d.phone}` : '';

    return {
      ok: true,
      reply: truncateToMaxLines(
        [
          todayLine || 'Shop timing abhi available nahi hai.',
          slotsLine || null,
          weekly || null,
          contactLine || null,
        ]
          .filter(Boolean)
          .join('\n'),
        6
      ),
    };
  }

  if (intent === 'contact' || intent === 'details') {
    const lines = [
      d.name ? `Shop: ${d.name}` : null,
      d.about ? `About: ${d.about}` : null,
      d.address ? `Address: ${d.address}` : null,
      d.phone ? `Call: ${d.phone}` : null,
      d.whatsapp ? `WhatsApp: ${d.whatsapp}` : null,
      d.email ? `Email: ${d.email}` : null,
    ].filter(Boolean);

    return { ok: true, reply: truncateToMaxLines(lines.join('\n'), 6) };
  }

  const system = [
    SYSTEM_PROMPT,
    'Rules:',
    '- Reply max 6 lines.',
    '- Use only the provided business/listing info; do NOT invent details.',
    '- Never reply with ONLY “WhatsApp/call” — include at least 1 helpful fact from context (hours, listings, address, etc.).',
    '- If a asked product is not in listings, say so and suggest 1-3 close alternatives from listings, then ask a short clarification.',
    '- If user asks about timing/slots, use the provided working hours/slots (IST) if available.',
    '- If you are still unsure after clarifying, then suggest call/WhatsApp.',
  ].join('\n');

  const user = [
    'Shop context:',
    ctx.contextText,
    '',
    `Customer message: ${coerceString(userMessage)}`,
    '',
    'Write the best answer now.',
  ].join('\n');

  const reply = await runAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    {
      temperature: 0.3,
      maxTokens: 350,
      fallback: 'Haan ji, aap WhatsApp/call pe baat kar lo. Main details confirm karke bata dunga.',
    }
  );

  return { ok: true, reply: truncateToMaxLines(reply, 6) };
};

export const runDukandarGenerateAgent = async ({ title, businessType }) => {
  let lastError = null;
  const extractAffordableTokens = (message) => {
    const s = String(message || '');
    const m = s.match(/can\s+only\s+afford\s+(\d+)/i);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const extractPromptTokenCap = (message) => {
    const s = String(message || '');
    const m = s.match(/prompt\s+tokens\s+limit\s+exceeded\s*:\s*\d+\s*>\s*(\d+)/i);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const runMicroDraft = async ({ maxTokens }) => {
    let microError = null;
    const microSystem =
      'Return ONLY one-line minified JSON (no markdown). Keys: title, description, shortDescription. Keep description 1 short sentence. Keep shortDescription <= 70 chars.';

    const microUser = businessType
      ? `Name: ${coerceString(title)}\nType: ${coerceString(businessType)}`
      : `Name: ${coerceString(title)}`;

    const microOut = await runAI(
      [
        { role: 'system', content: microSystem },
        { role: 'user', content: microUser },
      ],
      {
        temperature: 0.4,
        maxTokens,
        onError: (e) => {
          microError = e;
        },
        fallback: JSON.stringify({
          title: coerceString(title),
          description: '',
          shortDescription: '',
        }),
      }
    );

    if (microError) {
      return { ok: false, error: String(microError?.message || 'AI error'), code: String(microError?.code || 'AI_ERROR') };
    }

    const microJson = extractJsonFromText(microOut);
    if (!microJson || typeof microJson !== 'object') {
      return { ok: false, error: 'AI response was incomplete.', code: 'AI_BAD_OUTPUT' };
    }

    return {
      ok: true,
      data: {
        title: coerceString(microJson.title || title),
        description: coerceString(microJson.description),
        shortDescription: coerceString(microJson.shortDescription),
      },
    };
  };

  const system =
    'Return ONLY one-line minified JSON (no markdown). Keys: title, description, shortDescription, features. description: 1 short sentence (<=160 chars). shortDescription: <=90 chars. features: exactly 3 short bullets (<=40 chars each). Do not add extra keys.';

  const user = businessType
    ? `Name: ${coerceString(title)}\nType: ${coerceString(businessType)}`
    : `Name: ${coerceString(title)}`;

  const out = await runAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    {
      temperature: 0.6,
      maxTokens: 900,
      onError: (e) => {
        lastError = e;
      },
      fallback: JSON.stringify({
        title: coerceString(title),
        description: 'Is product/service ke liye description abhi generate nahi ho paaya. Aap thodi der baad try karein.',
        shortDescription: 'Abhi AI response available nahi hai.',
        features: [],
        tags: [],
      }),
    }
  );

  if (lastError) {
    const code = String(lastError?.code || '').trim();
    const msg = String(lastError?.message || '').trim();

    // Prompt too large for remaining credits: fall back to a tiny prompt.
    if (code === 'OPENROUTER_HTTP_ERROR' && msg.includes('(402)') && /prompt\s+tokens\s+limit\s+exceeded/i.test(msg)) {
      const micro = await runMicroDraft({ maxTokens: 80 });
      if (micro.ok) {
        return {
          ok: true,
          data: {
            title: micro.data.title,
            description: micro.data.description,
            shortDescription: micro.data.shortDescription,
            features: [],
            tags: [],
            attributes: [],
            pricingOptions: [],
          },
        };
      }
    }

    // If credits are too low, try a much smaller draft so we can still return something useful.
    if (code === 'OPENROUTER_HTTP_ERROR' && msg.includes('(402)')) {
      const affordable = extractAffordableTokens(msg);
      if (affordable && affordable >= 16) {
        const micro = await runMicroDraft({ maxTokens: Math.min(affordable, 80) });
        if (micro.ok) {
          return {
            ok: true,
            data: {
              title: micro.data.title,
              description: micro.data.description,
              shortDescription: micro.data.shortDescription,
              features: [],
              tags: [],
              attributes: [],
              pricingOptions: [],
            },
          };
        }
      }
    }

    return {
      ok: false,
      error:
        code === 'OPENROUTER_NOT_CONFIGURED' || code === 'CF_AI_NOT_CONFIGURED'
          ? 'AI is not configured on the server. Please set OPENROUTER_API_KEY (or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN).'
          : msg || 'AI service error. Please try again.',
      code: code || 'AI_ERROR',
    };
  }

  const json = extractJsonFromText(out);
  if (!json || typeof json !== 'object') {
    const micro = await runMicroDraft({ maxTokens: 80 });
    if (micro.ok) {
      return {
        ok: true,
        data: {
          title: micro.data.title,
          description: micro.data.description,
          shortDescription: micro.data.shortDescription,
          features: [],
          tags: [],
          attributes: [],
          pricingOptions: [],
        },
      };
    }
    return { ok: false, error: 'AI response was incomplete. Please try again.', code: 'AI_BAD_OUTPUT' };
  }

  const payload = json;

  const attributesRaw = Array.isArray(payload.attributes) ? payload.attributes : [];
  const attributes = attributesRaw
    .map((a) => ({ name: coerceString(a?.name), value: coerceString(a?.value) }))
    .filter((a) => a.name && a.value)
    .slice(0, 12);

  const pricingOptionsRaw = Array.isArray(payload.pricingOptions) ? payload.pricingOptions : [];
  const pricingOptions = pricingOptionsRaw
    .map((p) => ({
      label: coerceString(p?.label),
      price: Number(p?.price),
    }))
    .filter((p) => p.label && Number.isFinite(p.price) && p.price >= 0)
    .slice(0, 12);

  const result = {
    title: coerceString(payload.title || title),
    description: coerceString(payload.description),
    shortDescription: coerceString(payload.shortDescription),
    features: coerceStringArray(payload.features, 12),
    tags: coerceStringArray(payload.tags, 20),
    attributes,
    pricingOptions,
  };

  if (!result.description && result.features.length === 0 && result.tags.length === 0) {
    return {
      ok: false,
      error: 'AI response was incomplete. Please try again.',
      code: 'AI_BAD_OUTPUT',
    };
  }

  return { ok: true, data: result };
};

export const runBusinessProfileDescriptionAgent = async ({ businessName, businessTypeName, city, state }) => {
  let lastError = null;
  const system = [
    SYSTEM_PROMPT,
    'You write short business profile descriptions for Indian local shops.',
    'Return ONLY valid JSON (no markdown).',
    'JSON schema:',
    '{"description": string}',
    'Rules:',
    '- 2-4 lines, simple Hinglish.',
    '- Do NOT invent claims, awards, years, or exact prices.',
    '- If city/state missing, avoid mentioning location.',
  ].join('\n');

  const user = [
    businessName ? `Business name: ${coerceString(businessName)}` : null,
    businessTypeName ? `Business type: ${coerceString(businessTypeName)}` : null,
    city ? `City: ${coerceString(city)}` : null,
    state ? `State: ${coerceString(state)}` : null,
    '',
    'Write a business profile description now.',
  ]
    .filter(Boolean)
    .join('\n');

  const out = await runAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    {
      temperature: 0.6,
      maxTokens: 250,
      onError: (e) => {
        lastError = e;
      },
      fallback: JSON.stringify({
        description: 'Aapke business ka short description abhi generate nahi ho paaya. Thodi der baad try karein.',
      }),
    }
  );

  if (lastError) {
    const code = String(lastError?.code || '').trim();
    const msg = String(lastError?.message || '').trim();
    return {
      ok: false,
      error:
        code === 'OPENROUTER_NOT_CONFIGURED' || code === 'CF_AI_NOT_CONFIGURED'
          ? 'AI is not configured on the server. Please set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (or OPENROUTER_API_KEY).'
          : msg || 'AI service error. Please try again.',
      code: code || 'AI_ERROR',
    };
  }

  const json = extractJsonFromText(out);
  const payload = json && typeof json === 'object' ? json : {};
  return {
    ok: true,
    data: {
      description: coerceString(payload.description),
    },
  };
};

export const runWhyChooseUsAgent = async ({ businessName, businessTypeName, city, state, maxCards = 4 }) => {
  const safeMax = Math.max(2, Math.min(8, Number(maxCards) || 4));
  let lastError = null;

  const system = [
    SYSTEM_PROMPT,
    'You create "Why Choose Us" cards for Indian local shops.',
    'Return ONLY valid JSON (no markdown).',
    'JSON schema:',
    '{"cards": [{"title": string, "desc": string}]}',
    'Rules:',
    `- Create exactly ${safeMax} cards.`,
    '- Each title: 2-5 words max.',
    '- Each desc: 1-2 short lines.',
    '- Do NOT invent claims (e.g., "100% guarantee", awards, years) unless given.',
    '- Keep it generic but relevant to business type.',
  ].join('\n');

  const user = [
    businessName ? `Business name: ${coerceString(businessName)}` : null,
    businessTypeName ? `Business type: ${coerceString(businessTypeName)}` : null,
    city ? `City: ${coerceString(city)}` : null,
    state ? `State: ${coerceString(state)}` : null,
    '',
    'Generate the cards now.',
  ]
    .filter(Boolean)
    .join('\n');

  const out = await runAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    {
      temperature: 0.7,
      maxTokens: 500,
      onError: (e) => {
        lastError = e;
      },
      fallback: JSON.stringify({
        cards: Array.from({ length: safeMax }, () => ({
          title: 'Best Service',
          desc: 'Quality aur support ke saath.\nAapka kaam fast hota hai.',
        })),
      }),
    }
  );

  if (lastError) {
    const code = String(lastError?.code || '').trim();
    const msg = String(lastError?.message || '').trim();
    return {
      ok: false,
      error:
        code === 'OPENROUTER_NOT_CONFIGURED' || code === 'CF_AI_NOT_CONFIGURED'
          ? 'AI is not configured on the server. Please set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (or OPENROUTER_API_KEY).'
          : msg || 'AI service error. Please try again.',
      code: code || 'AI_ERROR',
    };
  }

  const json = extractJsonFromText(out);
  const payload = json && typeof json === 'object' ? json : {};
  const cards = Array.isArray(payload.cards) ? payload.cards : [];

  const normalized = cards
    .map((c) => ({
      title: coerceString(c?.title),
      desc: coerceString(c?.desc),
    }))
    .filter((c) => c.title || c.desc)
    .slice(0, safeMax);

  while (normalized.length < safeMax) {
    normalized.push({ title: '', desc: '' });
  }

  return { ok: true, data: { cards: normalized } };
};

export const runBrandingSuggestionAgent = async ({ businessTypeName }) => {
  let lastError = null;
  const system = [
    SYSTEM_PROMPT,
    'You suggest simple branding (colors + font) for a small Indian business dashboard.',
    'Return ONLY valid JSON (no markdown).',
    'JSON schema:',
    '{"themeColor": string, "backgroundColor": string, "fontColor": string, "fontFamily": string}',
    'Rules:',
    '- Colors must be HEX format like #1DBF73.',
    '- fontFamily must be exactly one of: Plus Jakarta Sans, Inter, Poppins, Roboto.',
    '- Keep background light and fontColor dark for readability.',
  ].join('\n');

  const user = [
    businessTypeName ? `Business type: ${coerceString(businessTypeName)}` : null,
    '',
    'Suggest branding now.',
  ]
    .filter(Boolean)
    .join('\n');

  const out = await runAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    {
      temperature: 0.6,
      maxTokens: 220,
      onError: (e) => {
        lastError = e;
      },
      fallback: JSON.stringify({
        themeColor: '#1DBF73',
        backgroundColor: '#F3F4F6',
        fontColor: '#111827',
        fontFamily: 'Plus Jakarta Sans',
      }),
    }
  );

  if (lastError) {
    const code = String(lastError?.code || '').trim();
    const msg = String(lastError?.message || '').trim();
    return {
      ok: false,
      error:
        code === 'OPENROUTER_NOT_CONFIGURED' || code === 'CF_AI_NOT_CONFIGURED'
          ? 'AI is not configured on the server. Please set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (or OPENROUTER_API_KEY).'
          : msg || 'AI service error. Please try again.',
      code: code || 'AI_ERROR',
    };
  }

  const json = extractJsonFromText(out);
  const payload = json && typeof json === 'object' ? json : {};

  const toHex = (v, fallback) => {
    const s = coerceString(v);
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
    return fallback;
  };

  const allowedFonts = new Set(['Plus Jakarta Sans', 'Inter', 'Poppins', 'Roboto']);
  const font = coerceString(payload.fontFamily) || 'Plus Jakarta Sans';

  return {
    ok: true,
    data: {
      themeColor: toHex(payload.themeColor, '#1DBF73'),
      backgroundColor: toHex(payload.backgroundColor, '#F3F4F6'),
      fontColor: toHex(payload.fontColor, '#111827'),
      fontFamily: allowedFonts.has(font) ? font : 'Plus Jakarta Sans',
    },
  };
};

const aggregateBusinessData = async ({ businessId, days = 30 }) => {
  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, Math.min(days, 90)));

  const [business, listings, orders] = await Promise.all([
    Business.findById(businessId)
      .select('name nameHi phone whatsapp address businessType owner')
      .populate('businessType', 'name suggestedListingType')
      .lean(),
    Listing.find({ business: businessId, isActive: true })
      .select('title listingType price stats.views stats.inquiries stats.bookings createdAt')
      .sort({ 'stats.views': -1, createdAt: -1 })
      .limit(50)
      .lean(),
    Order.find({ business: businessId, createdAt: { $gte: since } })
      .select('status source total subtotal deliveryCharges createdAt items')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
  ]);

  if (!business || business.isActive === false) return { ok: false, error: 'Business not found' };

  let revenue = 0;
  let orderCount = 0;
  const itemMap = new Map();

  for (const o of orders) {
    orderCount += 1;
    const total = Number(o?.total);
    if (Number.isFinite(total)) revenue += total;

    const items = Array.isArray(o?.items) ? o.items : [];
    for (const it of items) {
      const title = coerceString(it?.title);
      const qty = Number(it?.quantity);
      const lineTotal = Number(it?.lineTotal);
      if (!title) continue;
      const prev = itemMap.get(title) || { title, qty: 0, revenue: 0 };
      prev.qty += Number.isFinite(qty) ? qty : 0;
      prev.revenue += Number.isFinite(lineTotal) ? lineTotal : 0;
      itemMap.set(title, prev);
    }
  }

  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const topViewed = listings
    .slice(0, 8)
    .map((l) => ({ title: coerceString(l?.title), views: Number(l?.stats?.views || 0) }))
    .filter((x) => x.title);

  return {
    ok: true,
    business,
    stats: {
      windowDays: days,
      orderCount,
      revenue: Math.round(revenue),
      activeListings: listings.length,
      topItems,
      topViewed,
    },
    ordersSampleCount: orders.length,
    listingsSampleCount: listings.length,
    since,
  };
};

export const runBusinessInsightsAgent = async ({ businessId }) => {
  const agg = await aggregateBusinessData({ businessId, days: 30 });
  if (!agg.ok) return { ok: false, error: agg.error };

  const system = [
    SYSTEM_PROMPT,
    'You are an analytics assistant for a small Indian business owner (dukandar).',
    'Return ONLY valid JSON (no markdown).',
    'JSON schema:',
    '{"summary_hi": string, "insights": string[], "suggestions": string[], "important": boolean}',
    'Rules:',
    '- summary_hi should be in simple Hindi (Devanagari or Hinglish mix ok).',
    '- Do NOT invent numbers or products; use only data provided.',
    '- If data is low, say so and give safe suggestions.',
    '- suggestions must include: kya bechna chahiye, kaunsa product trend me hai (based on top items/views).',
  ].join('\n');

  const user = [
    'Business data (last 30 days):',
    `Name: ${coerceString(agg.business?.nameHi) || coerceString(agg.business?.name)}`,
    agg.business?.address?.city ? `City: ${coerceString(agg.business.address.city)}` : null,
    `Orders: ${agg.stats.orderCount}`,
    `Revenue: ₹${agg.stats.revenue}`,
    `Active listings: ${agg.stats.activeListings}`,
    agg.stats.topItems.length
      ? `Top selling items (by revenue):\n${agg.stats.topItems
          .map((x) => `- ${x.title}: qty ${x.qty}, revenue ₹${Math.round(x.revenue)}`)
          .join('\n')}`
      : 'Top selling items: (no order item data)',
    agg.stats.topViewed.length
      ? `Most viewed listings:\n${agg.stats.topViewed.map((x) => `- ${x.title}: ${x.views} views`).join('\n')}`
      : 'Most viewed listings: (no views data)',
    '',
    'Generate today\'s summary and suggestions now.',
  ]
    .filter(Boolean)
    .join('\n');

  const out = await runAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    {
      temperature: 0.4,
      maxTokens: 900,
      fallback: JSON.stringify({
        summary_hi: 'Aaj ke liye summary abhi generate nahi ho paaya. Thodi der baad try karein.',
        insights: [],
        suggestions: ['WhatsApp/call par customers se feedback lein aur best sellers ko highlight karein.'],
        important: false,
      }),
    }
  );

  const json = extractJsonFromText(out);
  const payload = json && typeof json === 'object' ? json : {};

  const result = {
    summaryHi: coerceString(payload.summary_hi || payload.summaryHi),
    insights: coerceStringArray(payload.insights, 12),
    suggestions: coerceStringArray(payload.suggestions, 12),
    important: !!payload.important,
    stats: agg.stats,
  };

  const dateKey = getIstDateKey(new Date());

  // Save summary (upsert)
  const saved = await DailySummary.findOneAndUpdate(
    { business: businessId, dateKey },
    {
      $set: {
        business: businessId,
        dateKey,
        summaryHi: result.summaryHi,
        insights: result.insights,
        suggestions: result.suggestions,
        important: result.important,
        generatedAt: new Date(),
        inputSnapshot: {
          stats: agg.stats,
          since: agg.since,
          samples: {
            orders: agg.ordersSampleCount,
            listings: agg.listingsSampleCount,
          },
        },
      },
    },
    { new: true, upsert: true }
  ).lean();

  // Resolve owner email for optional notifications
  let ownerEmail = null;
  try {
    const owner = agg.business?.owner ? await User.findById(agg.business.owner).select('email name').lean() : null;
    ownerEmail = owner?.email || null;
  } catch {
    // ignore
  }

  return {
    ok: true,
    data: {
      businessId: String(businessId),
      date: dateKey,
      summary_hi: result.summaryHi,
      insights: result.insights,
      suggestions: result.suggestions,
      important: result.important,
      savedId: saved?._id ? String(saved._id) : null,
      ownerEmail,
    },
  };
};
