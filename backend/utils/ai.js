const CF_MODEL_DEFAULT = '@cf/meta/llama-3.1-8b-instruct';
const OPENROUTER_BASE_URL_DEFAULT = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL_DEFAULT = 'openai/gpt-4o-mini';

const safeJsonParse = (text) => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
};

export const extractJsonFromText = (text) => {
  if (!text) return null;
  const trimmed = String(text).trim();

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const parsed = safeJsonParse(candidate);
  if (parsed.ok) return parsed.value;

  const tryRepairTruncatedJson = (raw) => {
    const s0 = String(raw || '').trim();
    if (!s0) return null;

    // If we end with a partial JSON key like ,"tags (missing colon/value), drop it.
    const partialKey = s0.match(/,\s*"[A-Za-z0-9_]+\s*$/);
    let s = partialKey ? s0.slice(0, partialKey.index) : s0;
    s = s.replace(/,\s*$/, '').trim();
    if (!s) return null;

    // Compute needed closers (ignore braces inside strings).
    let inString = false;
    let escape = false;
    let openObj = 0;
    let openArr = 0;
    for (let i = 0; i < s.length; i += 1) {
      const ch = s[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (ch === '\\') {
          escape = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '{') openObj += 1;
      else if (ch === '}') openObj = Math.max(0, openObj - 1);
      else if (ch === '[') openArr += 1;
      else if (ch === ']') openArr = Math.max(0, openArr - 1);
    }

    // If we are mid-string, we can't safely repair.
    if (inString) return null;

    const repaired = `${s}${']'.repeat(openArr)}${'}'.repeat(openObj)}`;
    const parsedRepaired = safeJsonParse(repaired);
    return parsedRepaired.ok ? parsedRepaired.value : null;
  };

  const firstObj = candidate.indexOf('{');
  const lastObj = candidate.lastIndexOf('}');
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    const slice = candidate.slice(firstObj, lastObj + 1);
    const parsedObj = safeJsonParse(slice);
    if (parsedObj.ok) return parsedObj.value;
  }

  // Best-effort repair: common when providers truncate output due to low max_tokens.
  if (firstObj !== -1) {
    const repaired = tryRepairTruncatedJson(candidate.slice(firstObj));
    if (repaired) return repaired;
  }

  const firstArr = candidate.indexOf('[');
  const lastArr = candidate.lastIndexOf(']');
  if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
    const slice = candidate.slice(firstArr, lastArr + 1);
    const parsedArr = safeJsonParse(slice);
    if (parsedArr.ok) return parsedArr.value;
  }

  if (firstArr !== -1) {
    const repaired = tryRepairTruncatedJson(candidate.slice(firstArr));
    if (repaired) return repaired;
  }

  return null;
};

export const truncateToMaxLines = (text, maxLines = 6) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= maxLines) return lines.join('\n');
  return lines.slice(0, maxLines).join('\n');
};

const getCloudflareAiConfig = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;

  if (!accountId || !apiToken) return null;

  return {
    accountId: String(accountId).trim(),
    apiToken: String(apiToken).trim(),
  };
};

const runCloudflareAiOverHttp = async ({ messages, model, temperature, maxTokens }) => {
  const cfg = getCloudflareAiConfig();
  if (!cfg) {
    const err = new Error('Cloudflare Workers AI is not configured (missing CLOUDFLARE_ACCOUNT_ID/CF_ACCOUNT_ID and CLOUDFLARE_API_TOKEN/CF_API_TOKEN).');
    err.code = 'CF_AI_NOT_CONFIGURED';
    throw err;
  }

  // NOTE: Cloudflare model IDs include '/' (e.g. '@cf/meta/...').
  // Do NOT encode '/' as '%2F' or the API returns "No route for that URI".
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfg.accountId)}/ai/run/${encodeURI(model)}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      ...(Number.isFinite(temperature) ? { temperature } : {}),
      ...(Number.isFinite(maxTokens) ? { max_tokens: maxTokens } : {}),
    }),
  });

  const payloadText = await resp.text().catch(() => '');
  if (!resp.ok) {
    const err = new Error(`Cloudflare AI HTTP error (${resp.status}): ${payloadText || resp.statusText}`);
    err.code = 'CF_AI_HTTP_ERROR';
    throw err;
  }

  const parsed = safeJsonParse(payloadText);
  if (!parsed.ok) {
    const err = new Error('Cloudflare AI returned non-JSON response');
    err.code = 'CF_AI_BAD_RESPONSE';
    throw err;
  }

  const result = parsed.value?.result;
  const content =
    (typeof result?.response === 'string' && result.response) ||
    (typeof result?.output_text === 'string' && result.output_text) ||
    (typeof parsed.value?.response === 'string' && parsed.value.response) ||
    null;

  if (!content) {
    const err = new Error('Cloudflare AI response did not include output text');
    err.code = 'CF_AI_EMPTY';
    throw err;
  }

  return content;
};

const getOpenRouterConfig = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (process.env.OPENROUTER_BASE_URL || OPENROUTER_BASE_URL_DEFAULT).replace(/\/$/, '');
  const model = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT;

  return {
    apiKey: String(apiKey).trim(),
    baseUrl,
    model: String(model).trim(),
    httpReferer: process.env.OPENROUTER_HTTP_REFERER ? String(process.env.OPENROUTER_HTTP_REFERER).trim() : null,
    appTitle: process.env.OPENROUTER_APP_TITLE ? String(process.env.OPENROUTER_APP_TITLE).trim() : null,
  };
};

const runOpenRouterOverHttp = async ({ messages, temperature, maxTokens }) => {
  const cfg = getOpenRouterConfig();
  if (!cfg) {
    const err = new Error('OpenRouter is not configured (missing OPENROUTER_API_KEY).');
    err.code = 'OPENROUTER_NOT_CONFIGURED';
    throw err;
  }

  const parseAffordableTokensFrom402 = (maybeJsonText) => {
    const parsed = safeJsonParse(maybeJsonText);
    const msg = parsed.ok
      ? String(parsed.value?.error?.message || '')
      : String(maybeJsonText || '');
    const m = msg.match(/can\s+only\s+afford\s+(\d+)/i);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const runOnce = async (maxTokensForCall) => {
    const resp = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
        ...(cfg.httpReferer ? { 'HTTP-Referer': cfg.httpReferer } : {}),
        ...(cfg.appTitle ? { 'X-Title': cfg.appTitle } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        ...(Number.isFinite(temperature) ? { temperature } : {}),
        ...(Number.isFinite(maxTokensForCall) ? { max_tokens: maxTokensForCall } : {}),
      }),
    });

    const text = await resp.text().catch(() => '');
    return { resp, text };
  };

  // First attempt
  const first = await runOnce(maxTokens);
  let resp = first.resp;
  let text = first.text;

  // Retry once on 402 credit/limit issues by lowering max_tokens.
  if (resp.status === 402 && Number.isFinite(maxTokens) && maxTokens > 0) {
    const affordable = parseAffordableTokensFrom402(text);
    if (affordable && affordable < 16) {
      const err = new Error(`OpenRouter credits too low (affordable max_tokens ${affordable} < 16). Please top up credits or use a cheaper model.`);
      err.code = 'OPENROUTER_INSUFFICIENT_CREDITS';
      throw err;
    }

    const retryMaxRaw = affordable ? Math.min(maxTokens, affordable) : Math.floor(maxTokens * 0.25);
    const retryMax = Math.max(16, retryMaxRaw);

    if (retryMax < maxTokens) {
      const second = await runOnce(retryMax);
      resp = second.resp;
      text = second.text;
    }
  }

  if (!resp.ok) {
    const err = new Error(`OpenRouter HTTP error (${resp.status}): ${text || resp.statusText}`);
    err.code = 'OPENROUTER_HTTP_ERROR';
    throw err;
  }

  const parsed = safeJsonParse(text);
  if (!parsed.ok) {
    const err = new Error('OpenRouter returned non-JSON response');
    err.code = 'OPENROUTER_BAD_RESPONSE';
    throw err;
  }

  const content = parsed.value?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    const err = new Error('OpenRouter response did not include output text');
    err.code = 'OPENROUTER_EMPTY';
    throw err;
  }

  return content.trim();
};

/**
 * runAI(messages)
 *
 * - Cloudflare Workers runtime: pass `{ env }` option and it will use `env.AI.run()`.
 * - Node/Express runtime: uses Cloudflare AI HTTP API when CLOUDFLARE_* env vars are set.
 * - Always returns a safe fallback string if the model fails.
 */
export const runAI = async (messages, options = {}) => {
  const model = options.model || CF_MODEL_DEFAULT;
  const temperature = options.temperature;
  const maxTokens = options.maxTokens;

  const safeFallback =
    typeof options.fallback === 'string' && options.fallback.trim()
      ? options.fallback.trim()
      : 'Sorry, abhi network issue hai. Aap WhatsApp/call pe contact kar lo.';

  try {
    if (options?.env?.AI?.run) {
      const resp = await options.env.AI.run(model, {
        messages,
        ...(Number.isFinite(temperature) ? { temperature } : {}),
        ...(Number.isFinite(maxTokens) ? { max_tokens: maxTokens } : {}),
      });

      // Workers AI typically returns `{ response: string }`.
      if (typeof resp?.response === 'string' && resp.response.trim()) return resp.response.trim();

      // Best-effort fallback for other formats.
      if (typeof resp === 'string' && resp.trim()) return resp.trim();

      const fromJson = extractJsonFromText(JSON.stringify(resp));
      if (typeof fromJson?.response === 'string' && fromJson.response.trim()) return fromJson.response.trim();

      return safeFallback;
    }

    // Node/Express runtime: prefer OpenRouter if configured, else use Cloudflare AI HTTP.
    // This keeps local dev simple, but also allows forcing Cloudflare via env.
    // Env: AI_PROVIDER=cloudflare|openrouter|auto (default: auto)
    const normalizeProvider = (v) => {
      const s = String(v || '')
        .trim()
        .toLowerCase();
      if (!s) return 'auto';
      if (['cf', 'cloudflare', 'cloudflare-ai', 'workers-ai', 'workersai'].includes(s)) return 'cloudflare';
      if (['or', 'openrouter', 'open-router'].includes(s)) return 'openrouter';
      return 'auto';
    };

    const provider = normalizeProvider(process.env.AI_PROVIDER || process.env.AI_DEFAULT_PROVIDER);
    const cfConfigured = !!getCloudflareAiConfig();
    const orConfigured = !!getOpenRouterConfig();

    const tryCloudflare = async () => runCloudflareAiOverHttp({ messages, model, temperature, maxTokens });
    const tryOpenRouter = async () => runOpenRouterOverHttp({ messages, temperature, maxTokens });

    let out;
    if (provider === 'cloudflare') {
      try {
        out = await tryCloudflare();
      } catch (e) {
        // Optional fallback when explicitly forced but not configured.
        if (String(e?.code) === 'CF_AI_NOT_CONFIGURED' && orConfigured) out = await tryOpenRouter();
        else throw e;
      }
    } else if (provider === 'openrouter') {
      try {
        out = await tryOpenRouter();
      } catch (e) {
        // Fall back when OpenRouter isn't configured or has insufficient credits.
        if (
          (String(e?.code) === 'OPENROUTER_NOT_CONFIGURED' || String(e?.code) === 'OPENROUTER_INSUFFICIENT_CREDITS') &&
          cfConfigured
        ) {
          out = await tryCloudflare();
        } else {
          throw e;
        }
      }
    } else {
      // auto: prefer Cloudflare when configured, otherwise OpenRouter.
      const primary = cfConfigured ? 'cloudflare' : 'openrouter';
      const secondary = primary === 'cloudflare' ? 'openrouter' : 'cloudflare';

      const runProvider = async (p) => {
        if (p === 'cloudflare') return tryCloudflare();
        return tryOpenRouter();
      };

      try {
        out = await runProvider(primary);
      } catch (e) {
        const code = String(e?.code);
        const canFallbackToSecondary =
          (secondary === 'cloudflare' && cfConfigured) || (secondary === 'openrouter' && orConfigured);

        // Special case: OpenRouter credits issue should always fall back to Cloudflare if possible.
        const shouldFallback =
          code === 'OPENROUTER_INSUFFICIENT_CREDITS' ||
          (primary === 'openrouter' && code === 'OPENROUTER_NOT_CONFIGURED') ||
          (primary === 'cloudflare' && code === 'CF_AI_NOT_CONFIGURED');

        if (shouldFallback && canFallbackToSecondary) {
          out = await runProvider(secondary);
        } else {
          throw e;
        }
      }
    }

    return String(out || '').trim() || safeFallback;
  } catch (error) {
    if (options?.onError) {
      try {
        options.onError(error);
      } catch {
        // ignore
      }
    }
    return safeFallback;
  }
};

export default runAI;
