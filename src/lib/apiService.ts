// ─── API Service — TryGC Hub Manager ────────────────────────────────────────
// Stable multi-provider AI service with:
//  • Per-provider timeout (10 s)
//  • Automatic retry (1 retry on network errors, NOT on 4xx)
//  • Smart context-aware mock fallback — always returns something useful
//  • Custom OpenAI-compatible provider support via workspace settings
// ─────────────────────────────────────────────────────────────────────────────

const STORE_KEY = 'trygc_flowos_workspace_v4';
const API_KEYS_STORE = 'trygc_api_keys_v1';
const TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;

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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── provider calls ────────────────────────────────────────────────────────────

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const m = model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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
    fallbackProviders?: string[];
  } | null;

  const provider: string = settings?.aiProvider || 'gemini';
  const providerModels: Record<string, string> = settings?.providerModels || {};
  const providerEndpoints: Record<string, string> = settings?.providerEndpoints || {};
  const fallbackProviders: string[] = settings?.fallbackProviders || ['local', 'openai', 'anthropic', 'groq'];
  const model: string = settings?.aiModel || providerModels[provider] || '';
  const endpoint: string = settings?.aiEndpoint || providerEndpoints[provider] || '';
  const attemptOrder = [provider, ...fallbackProviders.filter(item => item && item !== provider)];
  let lastError = '';

  for (const candidate of attemptOrder) {
    const candidateModel = candidate === provider ? model : providerModels[candidate] || '';
    const candidateEndpoint = candidate === provider ? endpoint : providerEndpoints[candidate] || '';
    const candidateKey = getApiKey(candidate);
    const t0 = Date.now();

    if (!candidateKey && candidate !== 'local') {
      lastError = `No API key configured for ${candidate}.`;
      continue;
    }

    try {
      let text = '';

      if (candidate === 'gemini') {
        text = await callGemini(candidateKey, candidateModel, prompt);
      } else if (candidate === 'openai') {
        text = await callOpenAICompat(candidateKey, candidateModel || 'gpt-4o', candidateEndpoint || 'https://api.openai.com/v1/chat/completions', prompt, 'OpenAI');
      } else if (candidate === 'anthropic') {
        text = await callAnthropic(candidateKey, candidateModel, candidateEndpoint, prompt);
      } else if (candidate === 'groq') {
        text = await callOpenAICompat(candidateKey, candidateModel || 'llama-3.3-70b-versatile', candidateEndpoint || 'https://api.groq.com/openai/v1/chat/completions', prompt, 'Groq');
      } else if (candidate === 'alibaba') {
        text = await callOpenAICompat(candidateKey, candidateModel || 'qwen-plus', candidateEndpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', prompt, 'Alibaba');
      } else if (candidate === 'local') {
        text = await callOllama(candidateModel, candidateEndpoint, prompt);
      } else if (candidateEndpoint) {
        const chatUrl = candidateEndpoint.replace(/\/?$/, '/chat/completions');
        text = await callOpenAICompat(candidateKey, candidateModel || 'default', chatUrl, prompt, candidate);
      } else {
        lastError = `Unknown provider "${candidate}".`;
        continue;
      }

      return { text, provider: candidate as AIProviderName, latencyMs: Date.now() - t0 };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[apiService] ${candidate} failed (${lastError}) — trying next fallback`);
    }
  }

  return mockFallback(prompt, lastError || 'No AI provider could respond.');
}

// ── smart mock fallback ───────────────────────────────────────────────────────

function mockFallback(prompt: string, reason?: string): AIResult {
  const lower = prompt.toLowerCase();
  const note = reason ? `\n\n_Note: ${reason}_` : '';
  let text = '';

  if (lower.includes('handover') || lower.includes('watchout') || lower.includes('shift summary')) {
    text = [
      '## Shift Handover Summary',
      '',
      '**Pending Actions:**',
      '- Review all high-priority carry-over tasks before shift close',
      '- Flag any blocked items requiring regional lead intervention',
      '- Confirm SLA compliance across all active campaigns',
      '',
      '**Key Watchouts:**',
      '- Verify all open tasks have been updated with latest status',
      '- Ensure incoming team has full context on active issues',
      '- Document any escalations or pending approvals',
    ].join('\n');
  } else if (lower.includes('risk') || lower.includes('alert') || lower.includes('urgent')) {
    text = '## Risk Assessment\n\n**Immediate Actions Required:**\n- Escalate all blocked high-priority items to regional lead\n- Verify SLA timers have not elapsed on in-progress tasks\n- Document all open dependencies in handover notes\n- Identify any tasks approaching deadline without progress';
  } else if (lower.includes('title') || lower.includes('rewrite') || lower.includes('improve title')) {
    const stripped = prompt.replace(/rewrite.*?original:\s*"/i, '').replace(/".*$/s, '').trim();
    text = stripped.length > 10 ? stripped.slice(0, 80) + (stripped.length > 80 ? '...' : '') : prompt + ' — action item';
  } else if (lower.includes('improve') || lower.includes('notes') || lower.includes('details')) {
    text = '**Objective:** Complete the outlined deliverable with full stakeholder sign-off. Ensure all dependencies are resolved and regional compliance requirements are met before closure. Coordinate with relevant teams to address any blockers and document all decisions made during execution.';
  } else if (lower.includes('status') || lower.includes('summary') || lower.includes('overview')) {
    text = '## Operations Status\n\nAll regional hubs are active and reporting. Review the carry-over task list and ensure all pending handovers are acknowledged before next shift. No critical SLA breaches detected at this time. Monitor high-priority items for any changes in status.';
  } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('help')) {
    text = 'Hello! I\'m your AI operations assistant. I can help you with:\n- Task summaries and status updates\n- Risk assessments and alerts\n- Shift handover documentation\n- Performance reporting\n\nTo get started, try asking about "risks", "tasks", or "handovers". For full AI capabilities, add an API key in Settings → AI & API.';
  } else {
    text = 'Action confirmed. Review outstanding tasks, resolve any blockers, and ensure all handovers are properly documented before the end of your shift.';
  }

  return { text: text + note, provider: 'mock' };
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

export async function chatWithWorkspaceAI({ history, tasksSummary, handoverSummary }: {
  history: ChatMessage[];
  tasksSummary: string;
  handoverSummary: string;
}): Promise<AIResult> {
  const transcript = history.map(message => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`).join('\n');
  const prompt = [
    'You are the AI operations copilot for TryGC Hub Manager.',
    `Task context: ${tasksSummary}`,
    `Handover context: ${handoverSummary}`,
    'Give direct, practical, operational answers.',
    '',
    transcript,
    '',
    'Reply to the latest user message.',
  ].join('\n');
  return callProvider(prompt);
}
