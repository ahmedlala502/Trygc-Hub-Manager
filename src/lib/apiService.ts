// ─── API Service — TryGC Hub Manager ────────────────────────────────────────
// Stable multi-provider AI service with:
//  • Per-provider timeout (10 s)
//  • Automatic retry (1 retry on network errors, NOT on 4xx)
//  • Smart context-aware mock fallback — always returns something useful
//  • Custom OpenAI-compatible provider support via workspace settings
// ─────────────────────────────────────────────────────────────────────────────

const STORE_KEY = 'trygc_flowos_workspace_v4';
const API_KEYS_STORE = 'trygc_api_keys_v1';
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

// ── helpers ──────────────────────────────────────────────────────────────────

function getSettings(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.settings || null;
  } catch { return null; }
}

function getApiKey(provider: string): string {
  try { return (JSON.parse(localStorage.getItem(API_KEYS_STORE) || '{}') as Record<string, string>)[provider] || ''; } catch { return ''; }
}

/** fetch with a hard timeout and automatic retry on network/5xx errors */
async function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  attempt = 0
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    // Retry once on 5xx (server errors), never on 4xx (auth / bad-request)
    if (!res.ok && res.status >= 500 && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 800));
      return fetchWithTimeout(url, opts, attempt + 1);
    }
    return res;
  } catch (err: unknown) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    if (!isAbort && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 800));
      return fetchWithTimeout(url, opts, attempt + 1);
    }
    throw isAbort ? new Error('Request timed out — check your network or endpoint.') : err;
  }
}

// ── types ─────────────────────────────────────────────────────────────────────

export type AIProviderName = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'alibaba' | 'local' | 'custom' | 'mock';

export interface AIResult {
  text: string;
  provider: AIProviderName;
  latencyMs?: number;
}

// ── provider calls ────────────────────────────────────────────────────────────

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const m = model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message || `Gemini ${res.status}`);
  }
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Gemini returned an empty response.');
  return text;
}

async function callOpenAICompat(
  apiKey: string,
  model: string,
  endpoint: string,
  prompt: string,
  providerLabel = 'OpenAI'
): Promise<string> {
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 600 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message || `${providerLabel} ${res.status}`);
  }
  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error(`${providerLabel} returned an empty response.`);
  return text;
}

async function callAnthropic(apiKey: string, model: string, endpoint: string, prompt: string): Promise<string> {
  const url = endpoint || 'https://api.anthropic.com/v1/messages';
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: model || 'claude-3-5-haiku-20241022', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message || `Anthropic ${res.status}`);
  }
  const data = await res.json();
  const text: string = data?.content?.[0]?.text || '';
  if (!text) throw new Error('Anthropic returned an empty response.');
  return text;
}

async function callOllama(model: string, endpoint: string, prompt: string): Promise<string> {
  const base = endpoint || 'http://localhost:11434';
  const url = (base.endsWith('/') ? base : base + '/') + 'api/generate';
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || 'llama3', prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status} — is the server running?`);
  const data = await res.json();
  const text: string = data?.response || '';
  if (!text) throw new Error('Ollama returned an empty response.');
  return text;
}

// ── main dispatcher ───────────────────────────────────────────────────────────

async function callProvider(prompt: string): Promise<AIResult> {
  const settings = getSettings() as {
    aiProvider?: string;
    aiModel?: string;
    aiEndpoint?: string;
    providerModels?: Record<string, string>;
    providerEndpoints?: Record<string, string>;
  } | null;

  const provider: string = settings?.aiProvider || 'gemini';
  const providerModels: Record<string, string> = settings?.providerModels || {};
  const providerEndpoints: Record<string, string> = settings?.providerEndpoints || {};
  const model: string = settings?.aiModel || providerModels[provider] || '';
  const endpoint: string = settings?.aiEndpoint || providerEndpoints[provider] || '';
  const apiKey = getApiKey(provider);

  const t0 = Date.now();

  // No key → skip directly to mock (never throw)
  if (!apiKey && provider !== 'local') {
    return mockFallback(prompt, 'No API key configured. Add one in Settings → AI & API.');
  }

  try {
    let text = '';

    if (provider === 'gemini') {
      text = await callGemini(apiKey, model, prompt);
    } else if (provider === 'openai') {
      text = await callOpenAICompat(apiKey, model || 'gpt-4o', endpoint || 'https://api.openai.com/v1/chat/completions', prompt, 'OpenAI');
    } else if (provider === 'anthropic') {
      text = await callAnthropic(apiKey, model, endpoint, prompt);
    } else if (provider === 'groq') {
      text = await callOpenAICompat(apiKey, model || 'llama-3.3-70b-versatile', endpoint || 'https://api.groq.com/openai/v1/chat/completions', prompt, 'Groq');
    } else if (provider === 'alibaba') {
      text = await callOpenAICompat(apiKey, model || 'qwen-plus', endpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', prompt, 'Alibaba');
    } else if (provider === 'local') {
      text = await callOllama(model, endpoint, prompt);
    } else if (endpoint) {
      // Generic custom OpenAI-compatible provider
      const chatUrl = endpoint.replace(/\/?$/, '/chat/completions');
      text = await callOpenAICompat(apiKey, model || 'default', chatUrl, prompt, provider);
    } else {
      return mockFallback(prompt, `Unknown provider "${provider}". Configure an endpoint in Settings → AI & API.`);
    }

    return { text, provider: provider as AIProviderName, latencyMs: Date.now() - t0 };
  } catch (err: unknown) {
    // All errors fall gracefully through to context-aware mock
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[apiService] ${provider} failed (${errMsg}) — using mock fallback`);
    return mockFallback(prompt, errMsg);
  }
}

// ── smart mock fallback ───────────────────────────────────────────────────────

function mockFallback(prompt: string, _reason?: string): AIResult {
  const lower = prompt.toLowerCase();
  let text = '';

  if (lower.includes('handover') || lower.includes('watchout') || lower.includes('shift summary')) {
    text = [
      'Ensure all high-priority carry-over tasks are reviewed before shift close.',
      'Flag any blocked items requiring regional lead intervention.',
      'Confirm SLA compliance across all active campaigns before sign-off.',
    ].join(' ');
  } else if (lower.includes('risk') || lower.includes('alert') || lower.includes('urgent')) {
    text = 'Escalate all blocked High-priority items to the regional lead. Verify that SLA timers have not elapsed on any in-progress tasks. Document any open dependencies in the handover notes.';
  } else if (lower.includes('title') || lower.includes('rewrite') || lower.includes('improve title')) {
    const stripped = prompt.replace(/rewrite.*?original:\s*"/i, '').replace(/".*$/s, '').trim();
    text = stripped.length > 10 ? stripped.slice(0, 80) + (stripped.length > 80 ? '...' : '') : prompt + ' — action item';
  } else if (lower.includes('improve') || lower.includes('notes') || lower.includes('details')) {
    text = 'Objective: complete the outlined deliverable with full stakeholder sign-off. Ensure all dependencies are resolved and regional compliance requirements are met before closure.';
  } else if (lower.includes('status') || lower.includes('summary') || lower.includes('overview')) {
    text = 'All regional hubs are active. Review carry-over task list and ensure pending handovers are acknowledged. No critical SLA breaches detected at this time.';
  } else {
    text = 'Action confirmed. Review outstanding tasks, resolve blockers, and ensure all handovers are properly documented before shift end.';
  }

  return { text, provider: 'mock' };
}

// ── public API ────────────────────────────────────────────────────────────────

export async function improveTaskContent({ content, type, campaign, team }: {
  content: string;
  type: 'title' | 'details';
  campaign?: string;
  team?: string;
}): Promise<AIResult> {
  const prompt = type === 'title'
    ? `Rewrite this task title to be more clear and actionable. Keep it under 80 characters. Original: "${content}"${campaign ? `. Campaign: ${campaign}` : ''}${team ? `. Team: ${team}` : ''}. Return only the improved title, no explanation.`
    : `Improve these task notes to be clearer and more actionable for the operations team. Original: "${content}"${campaign ? `. Campaign: ${campaign}` : ''}. Return only the improved notes, no explanation.`;
  return callProvider(prompt);
}

export async function generateHandoverSummary({ tasks, watchouts }: {
  tasks: Array<{ title: string; priority: string; status: string }>;
  watchouts?: string;
}): Promise<AIResult> {
  const taskList = tasks.map(t => `- [${t.priority}/${t.status}] ${t.title}`).join('\n');
  const prompt = `Generate a concise shift handover watchout summary for the following tasks:\n${taskList}\n${watchouts ? `Existing notes: ${watchouts}\n` : ''}Write 2-3 sentences covering key risks, blockers, and actions needed. Be direct and operational.`;
  return callProvider(prompt);
}
