const STORE_KEY = 'trygc_flowos_workspace_v4';
const API_KEYS_STORE = 'trygc_api_keys_v1';

function getSettings() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.settings || null;
  } catch { return null; }
}

function getApiKey(provider: string): string {
  try { return JSON.parse(localStorage.getItem(API_KEYS_STORE) || '{}')[provider] || ''; } catch { return ''; }
}

interface AIResult {
  text: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'groq' | 'alibaba' | 'local' | 'mock';
}

async function callProvider(prompt: string): Promise<AIResult> {
  const settings = getSettings();
  const provider = settings?.aiProvider || 'gemini';
  const model = settings?.aiModel || '';
  const endpoint = settings?.aiEndpoint || '';
  const apiKey = getApiKey(provider);

  if (!apiKey && provider !== 'local') {
    return mockFallback(prompt);
  }

  try {
    if (provider === 'gemini') {
      const m = model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (!res.ok) return mockFallback(prompt);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { text, provider: 'gemini' };
    }

    if (provider === 'openai') {
      const url = endpoint || 'https://api.openai.com/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: model || 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 400 }),
      });
      if (!res.ok) return mockFallback(prompt);
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '', provider: 'openai' };
    }

    if (provider === 'anthropic') {
      const url = endpoint || 'https://api.anthropic.com/v1/messages';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: model || 'claude-3-5-haiku-20241022', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) return mockFallback(prompt);
      const data = await res.json();
      return { text: data.content?.[0]?.text || '', provider: 'anthropic' };
    }

    if (provider === 'groq') {
      const url = endpoint || 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: model || 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 400 }),
      });
      if (!res.ok) return mockFallback(prompt);
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '', provider: 'groq' };
    }

    if (provider === 'alibaba') {
      const url = endpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: model || 'qwen-plus', messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) return mockFallback(prompt);
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '', provider: 'alibaba' };
    }

    if (provider === 'local') {
      const base = endpoint || 'http://localhost:11434';
      const url = base.endsWith('/') ? base + 'api/generate' : base + '/api/generate';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model || 'llama3', prompt, stream: false }),
      });
      if (!res.ok) return mockFallback(prompt);
      const data = await res.json();
      return { text: data.response || '', provider: 'local' };
    }
  } catch {
    // fall through to mock
  }

  return mockFallback(prompt);
}

function mockFallback(prompt: string): AIResult {
  const lower = prompt.toLowerCase();
  let text = '';

  if (lower.includes('handover') || lower.includes('watchout') || lower.includes('summary')) {
    text = 'Ensure all high-priority carry-over tasks are reviewed before shift close. Flag any blocked items requiring regional lead intervention. Confirm SLA compliance across active campaigns.';
  } else if (lower.includes('title') || lower.includes('improve')) {
    text = prompt.length > 60 ? prompt.slice(0, 80).trim() + '...' : prompt + ' — action item';
  } else {
    text = 'Complete the outlined objective with all relevant stakeholders confirmed and regional compliance met.';
  }

  return { text, provider: 'mock' };
}

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
