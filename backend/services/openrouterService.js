const OPENROUTER_BASE_URL = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

const ALLOWED_LUCIDE_ICON_NAMES = new Set([
  'Truck',
  'BadgeIndianRupee',
  'Leaf',
  'Award',
  'Store',
  'Utensils',
  'GraduationCap',
  'Home',
  'MapPin',
  'Scissors',
  'Shirt',
  'Smartphone',
  'Pill',
  'Car',
  'Dumbbell',
  'Coffee',
  'NotebookPen',
  'Wrench',
  'Sofa',
  'PawPrint',
]);

const coerceTemplates = (raw) => {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const title = String(item?.title || '').trim();
    const desc = String(item?.desc || '').trim();
    const iconName = String(item?.iconName || '').trim();
    if (!title && !desc) continue;
    out.push({
      title,
      desc,
      ...(ALLOWED_LUCIDE_ICON_NAMES.has(iconName) ? { iconName } : {}),
    });
  }
  return out;
};

const safeJsonParse = (text) => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
};

const extractJson = (text) => {
  if (!text) return null;
  const trimmed = String(text).trim();

  // Best-effort: sometimes models wrap JSON in fences.
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const parsed = safeJsonParse(candidate);
  if (parsed.ok) return parsed.value;

  // Fallback: try to find first JSON array in the text
  const firstBracket = candidate.indexOf('[');
  const lastBracket = candidate.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const slice = candidate.slice(firstBracket, lastBracket + 1);
    const parsedSlice = safeJsonParse(slice);
    if (parsedSlice.ok) return parsedSlice.value;
  }

  return null;
};

export const generateWhyChooseUsTemplatesForBusinessType = async ({ businessType, count }) => {
  if (!OPENROUTER_API_KEY) {
    const err = new Error('OPENROUTER_API_KEY is not set');
    err.code = 'OPENROUTER_NOT_CONFIGURED';
    throw err;
  }

  const safeCount = Number.isFinite(count) ? Math.min(Math.max(count, 2), 8) : 4;
  const name = String(businessType?.name || '').trim();
  const description = String(businessType?.description || '').trim();
  const suggestedListingType = String(businessType?.suggestedListingType || '').trim();
  const exampleCategories = Array.isArray(businessType?.exampleCategories)
    ? businessType.exampleCategories.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 12)
    : [];

  const system = [
    'You are an assistant that generates "Why Choose Us" cards for local businesses.',
    'Return ONLY valid JSON (no markdown), as an array of objects.',
    'Each object must be: {"title": string, "desc": string, "iconName": string}.',
    `iconName must be one of: ${Array.from(ALLOWED_LUCIDE_ICON_NAMES).join(', ')}.`,
    'Keep title <= 60 chars and desc <= 140 chars.',
    'Use simple, customer-friendly English.',
  ].join('\n');

  const user = [
    `Business type: ${name || 'Unknown'}`,
    description ? `Description: ${description}` : null,
    suggestedListingType ? `Listing type: ${suggestedListingType}` : null,
    exampleCategories.length ? `Example categories: ${exampleCategories.join(', ')}` : null,
    `Generate ${safeCount} cards.`,
  ].filter(Boolean).join('\n');

  const resp = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      ...(process.env.OPENROUTER_HTTP_REFERER ? { 'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER } : {}),
      ...(process.env.OPENROUTER_APP_TITLE ? { 'X-Title': process.env.OPENROUTER_APP_TITLE } : {}),
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`OpenRouter error (${resp.status}): ${text || resp.statusText}`);
  }

  const payload = await resp.json();
  const content = payload?.choices?.[0]?.message?.content;
  const json = extractJson(content);
  const templates = coerceTemplates(json);

  if (templates.length === 0) {
    throw new Error('AI did not return valid templates JSON');
  }

  return templates;
};
