import React, { useState, useRef, useEffect } from 'react';
import { Task, Handover } from '../../types';
import {
  Send, Bot, User, Sparkles, AlertCircle, Copy, CheckCircle2,
  RefreshCw, Code, Trash2, Cloud, HardDrive, Check, X, ChevronDown,
  Play, Download, Save,
} from 'lucide-react';
import { useLocalData } from '../LocalDataContext';

interface Message { role: 'user' | 'assistant'; content: string; timestamp: number; }

interface AICopilotProps {
  tasks: Task[];
  handovers: Handover[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const API_KEYS_STORE = 'trygc_api_keys_v1';
const STUDIO_SAVES_STORE = 'trygc_studio_saves';

function getApiKey(p: string): string {
  try { return (JSON.parse(localStorage.getItem(API_KEYS_STORE) || '{}') as Record<string, string>)[p] || ''; } catch { return ''; }
}

// ── inline provider call (keeps conversation history) ────────────────────────
async function callCloud(provider: string, model: string, endpoint: string, history: Message[], sys: string): Promise<string> {
  const key = getApiKey(provider);
  if (!key && provider !== 'local') throw new Error(`No API key for ${provider}. Add it in Settings → AI & API.`);

  const msgs = history.map(m => ({ role: m.role === 'assistant' ? (provider === 'gemini' ? 'model' : 'assistant') : 'user', content: m.content }));
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 12000);

  const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: controller.signal });

  if (provider === 'gemini') {
    const res = await post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${key}`,
      { systemInstruction: { parts: [{ text: sys }] }, contents: msgs.map(m => ({ role: m.role, parts: [{ text: m.content }] })) }
    );
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error?.message || `Gemini ${res.status}`); }
    return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
  }
  if (provider === 'anthropic') {
    const res = await post(endpoint || 'https://api.anthropic.com/v1/messages',
      { model: model || 'claude-3-5-haiku-20241022', max_tokens: 1200, system: sys, messages: msgs },
      { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
    );
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error?.message || `Anthropic ${res.status}`); }
    return (await res.json())?.content?.[0]?.text || 'No response.';
  }
  if (provider === 'local') {
    const base = endpoint || 'http://localhost:11434';
    const res = await post((base.endsWith('/') ? base : base + '/') + 'api/chat',
      { model: model || 'llama3', messages: [{ role: 'system', content: sys }, ...msgs], stream: false }
    );
    if (!res.ok) throw new Error(`Ollama ${res.status} — is the server running?`);
    const d = await res.json(); return d?.message?.content || 'No response.';
  }
  // openai / groq / alibaba / custom
  const url = endpoint || (provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : provider === 'alibaba' ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions');
  const res = await post(url, { model: model || 'gpt-4o', messages: [{ role: 'system', content: sys }, ...msgs], max_tokens: 1200 }, { Authorization: `Bearer ${key}` });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error?.message || `${provider} ${res.status}`); }
  return (await res.json())?.choices?.[0]?.message?.content || 'No response.';
}

// ── local offline responses ───────────────────────────────────────────────────
function localReply(msg: string, tasks: Task[], handovers: Handover[]): string {
  const q = msg.toLowerCase();
  if (q.includes('risk') || q.includes('alert') || q.includes('block')) {
    const hi = tasks.filter(t => t.priority === 'High');
    const bl = tasks.filter(t => t.status === 'Blocked');
    return `**Risk Snapshot**\n\n- 🔴 ${hi.length} high-priority task${hi.length !== 1 ? 's' : ''}\n- 🚫 ${bl.length} blocked\n${hi.slice(0, 3).map(t => `- [${t.status}] ${t.title}`).join('\n')}\n\nReview carry-overs and confirm SLA compliance.`;
  }
  if (q.includes('handover') || q.includes('shift')) {
    const pend = handovers.filter(h => h.status === 'Pending').length;
    return `**Handover Status**\n\n- ${pend} pending handover${pend !== 1 ? 's' : ''}\n- ${tasks.filter(t => t.status !== 'Done').length} active tasks remaining\n\nAcknowledge incoming relays before shift end.`;
  }
  if (q.includes('task') || q.includes('status') || q.includes('summary')) {
    return `**Task Overview**\n\n- ✅ ${tasks.filter(t => t.status === 'Done').length} done\n- 🔄 ${tasks.filter(t => t.status === 'In Progress').length} in progress\n- 🚫 ${tasks.filter(t => t.status === 'Blocked').length} blocked\n- 📋 ${tasks.length} total`;
  }
  return `I'm running in **local mode** with ${tasks.length} tasks and ${handovers.length} handovers in context.\n\nSwitch to **Cloud** mode and add an API key in Settings → AI & API for full AI responses.`;
}

// ── simple markdown renderer ─────────────────────────────────────────────────
function Md({ content }: { content: string }) {
  const parts = content.split('\n').reduce<React.ReactNode[]>((acc, line, i) => {
    if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
      acc.push(<p key={i} className="font-bold text-sm text-ink mb-0.5">{line.slice(2, -2)}</p>);
    } else if (line.startsWith('- ')) {
      const text = line.slice(2).replace(/\*\*([^*]+)\*\*/g, '__$1__');
      acc.push(<li key={i} className="flex gap-2 text-sm text-ink/80 leading-relaxed"><span className="text-citrus shrink-0 mt-0.5">·</span><span dangerouslySetInnerHTML={{ __html: text.replace(/__([^_]+)__/g, '<strong>$1</strong>') }} /></li>);
    } else if (line.trim()) {
      acc.push(<p key={i} className="text-sm text-ink/80 leading-relaxed">{line.replace(/\*\*([^*]+)\*\*/g, (_, m) => m).split(/(\*\*[^*]+\*\*)/g).map((p, j) => p.startsWith('**') ? <strong key={j}>{p.slice(2,-2)}</strong> : p)}</p>);
    }
    return acc;
  }, []);
  return <div className="space-y-1">{parts}</div>;
}

// ── main component ────────────────────────────────────────────────────────────
export default function AICopilot({ tasks, handovers, messages, setMessages }: AICopilotProps) {
  const { settings } = useLocalData();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'local' | 'cloud'>('local');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showStudio, setShowStudio] = useState(false);
  const [previewCode, setPreviewCode] = useState('<!-- paste or generate HTML here -->\n<div style="padding:40px;font-family:sans-serif;color:#1e293b;text-align:center">\n  <h1>Ops Visualizer</h1>\n  <p style="opacity:.5">Type /render html to generate.</p>\n</div>');
  const [studioSaved, setStudioSaved] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const providerLabel = (settings.aiProvider || 'gemini').charAt(0).toUpperCase() + (settings.aiProvider || 'gemini').slice(1);
  const hasKey = !!getApiKey(settings.aiProvider || 'gemini') || settings.aiProvider === 'local';

  const sys = `You are an AI operations assistant for TryGC Hub Manager.\nContext: ${tasks.length} tasks (${tasks.filter(t=>t.status==='Done').length} done, ${tasks.filter(t=>t.status==='Blocked').length} blocked, ${tasks.filter(t=>t.priority==='High').length} high-priority), ${handovers.filter(h=>h.status==='Pending').length} pending handovers. Be concise and operational.`;

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setInput(''); setError('');
    const userMsg: Message = { role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    // /clear command
    if (text === '/clear') { setMessages([{ role: 'assistant', content: 'Chat cleared. How can I help?', timestamp: Date.now() }]); return; }

    // /render html command
    if (text.startsWith('/render html')) {
      setShowStudio(true);
      const html = `<div style="padding:30px;font-family:sans-serif;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0"><h2>Risk Report</h2><div style="display:flex;gap:12px"><div style="background:#fee2e2;color:#ef4444;padding:14px;border-radius:10px;flex:1"><b>High Risk</b><div style="font-size:28px;font-weight:bold">${tasks.filter(t=>t.priority==='High').length}</div></div><div style="background:#fef9c3;color:#ca8a04;padding:14px;border-radius:10px;flex:1"><b>Pending</b><div style="font-size:28px;font-weight:bold">${handovers.filter(h=>h.status==='Pending').length}</div></div><div style="background:#dcfce7;color:#16a34a;padding:14px;border-radius:10px;flex:1"><b>Done</b><div style="font-size:28px;font-weight:bold">${tasks.filter(t=>t.status==='Done').length}</div></div></div></div>`;
      setPreviewCode(html);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Visualization ready — see the Studio panel below.', timestamp: Date.now() }]);
      return;
    }

    setLoading(true);
    try {
      let reply: string;
      if (mode === 'cloud') {
        const history: Message[] = [...messages, userMsg];
        reply = await callCloud(settings.aiProvider || 'gemini', settings.aiModel || '', settings.aiEndpoint || '', history, sys);
      } else {
        await new Promise(r => setTimeout(r, 350));
        reply = localReply(text, tasks, handovers);
      }
      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I ran into an issue: ${msg}`, timestamp: Date.now() }]);
    } finally { setLoading(false); }
  };

  const copyMsg = (content: string, i: number) => {
    navigator.clipboard.writeText(content).then(() => { setCopiedId(i); setTimeout(() => setCopiedId(null), 1500); });
  };

  const saveStudio = () => {
    const saves = JSON.parse(localStorage.getItem(STUDIO_SAVES_STORE) || '[]');
    saves.unshift({ code: previewCode, savedAt: new Date().toISOString() });
    localStorage.setItem(STUDIO_SAVES_STORE, JSON.stringify(saves.slice(0, 10)));
    setStudioSaved(true); setTimeout(() => setStudioSaved(false), 2000);
  };

  const downloadStudio = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([previewCode], { type: 'text/html' }));
    a.download = `ops-viz-${Date.now()}.html`; a.click();
  };

  const QUICK = [
    { label: '🔴 Risks', cmd: 'Show current risks and blocked tasks' },
    { label: '📋 Tasks', cmd: 'Give me a task status summary' },
    { label: '🔄 Handovers', cmd: 'Summarize pending handovers' },
    { label: '📊 Visualize', cmd: '/render html ops dashboard' },
  ];

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-140px)]">

      {/* ── Chat card ── */}
      <div className="flex-1 flex flex-col bg-white rounded-[28px] border border-dawn shadow-lg overflow-hidden min-h-0">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-dawn bg-stone/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ink text-white rounded-xl flex items-center justify-center shadow">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="block text-sm font-black text-ink">AI Copilot</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${mode === 'cloud' && hasKey ? 'bg-blue-500' : 'bg-green-400'} animate-pulse`} />
                <span className="text-[10px] font-bold text-muted">
                  {mode === 'local' ? 'Local mode' : `${providerLabel}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex bg-stone border border-dawn rounded-xl p-0.5">
              <button
                onClick={() => setMode('local')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${mode === 'local' ? 'bg-white shadow text-ink' : 'text-muted hover:text-ink'}`}
              >
                <HardDrive className="w-3 h-3" /> Local
              </button>
              <button
                onClick={() => setMode('cloud')}
                title={!hasKey ? `Add a ${providerLabel} API key in Settings → AI & API` : ''}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${mode === 'cloud' ? 'bg-white shadow text-blue-600' : 'text-muted hover:text-ink'} ${!hasKey ? 'opacity-50' : ''}`}
              >
                <Cloud className="w-3 h-3" /> Cloud
              </button>
            </div>

            {/* Studio toggle */}
            <button
              onClick={() => setShowStudio(v => !v)}
              title="HTML Studio"
              className={`p-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 ${showStudio ? 'bg-ink text-white border-ink' : 'border-dawn text-muted hover:text-ink'}`}
            >
              <Code className="w-3.5 h-3.5" />
            </button>

            {/* Clear */}
            <button
              onClick={() => { setMessages([{ role: 'assistant', content: 'Chat cleared. How can I help?', timestamp: Date.now() }]); setError(''); }}
              title="Clear chat"
              className="p-2 rounded-xl border border-transparent text-muted hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* No-key warning */}
        {mode === 'cloud' && !hasKey && (
          <div className="mx-4 mt-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            No API key for {providerLabel} — add one in <span className="underline cursor-pointer ml-1">Settings → AI & API</span>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 group ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${m.role === 'user' ? 'bg-stone border border-dawn' : 'bg-citrus text-white'}`}>
                {m.role === 'user' ? <User className="w-4 h-4 text-muted" /> : <Sparkles className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div className={`relative max-w-[78%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'bg-ink text-white rounded-tr-sm'
                    : 'bg-stone/60 border border-dawn text-ink rounded-tl-sm'
                }`}>
                  {m.role === 'assistant' ? <Md content={m.content} /> : m.content}
                </div>
                <div className={`flex items-center gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[9px] text-muted/40 font-medium">
                    {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  <button
                    onClick={() => copyMsg(m.content, i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy"
                  >
                    {copiedId === i
                      ? <Check className="w-3 h-3 text-green-500" />
                      : <Copy className="w-3 h-3 text-muted hover:text-ink" />}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-citrus text-white flex items-center justify-center shrink-0 shadow-sm">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <div className="px-4 py-3 bg-stone/60 border border-dawn rounded-2xl rounded-tl-sm">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-muted/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-4 pb-4 pt-2 border-t border-dawn bg-white shrink-0">
          {/* Error */}
          {error && (
            <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 line-clamp-1">{error}</span>
              <button onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Quick prompts — only show when input is empty */}
          {!input && (
            <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar">
              {QUICK.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q.cmd)}
                  className="shrink-0 px-3 py-1.5 bg-stone border border-dawn rounded-lg text-xs font-bold text-muted hover:text-ink hover:border-ink/20 transition-all"
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Text input */}
          <div className={`flex items-center gap-2 bg-stone/50 border rounded-2xl px-4 py-2.5 transition-all ${inputFocused ? 'border-citrus bg-white shadow-sm shadow-citrus/5' : 'border-dawn'}`}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Ask anything about tasks, risks, handovers…"
              className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-muted/40"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="w-8 h-8 bg-ink text-white rounded-xl flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-40 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[9px] text-muted/30 mt-1.5 text-center">Enter to send · /clear to reset · /render html to visualize</p>
        </div>
      </div>

      {/* ── Studio (collapsible) ── */}
      {showStudio && (
        <div className="bg-white rounded-[24px] border border-dawn shadow-lg overflow-hidden" style={{ height: '380px' }}>
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-white/50" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">HTML Studio</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { if (iframeRef.current) { const d = iframeRef.current.contentDocument; if (d) { d.open(); d.write(previewCode); d.close(); } } }} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-green-400 transition-all" title="Run"><Play className="w-3.5 h-3.5" /></button>
              <button onClick={saveStudio} className="p-1.5 hover:bg-white/10 rounded-lg transition-all" title="Save">{studioSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5 text-white/40 hover:text-blue-400" />}</button>
              <button onClick={downloadStudio} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-citrus transition-all" title="Download"><Download className="w-3.5 h-3.5" /></button>
              <button onClick={() => setShowStudio(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all ml-1"><ChevronDown className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div className="flex h-[calc(100%-42px)]">
            <div className="w-1/2 bg-slate-900 border-r border-slate-800 flex flex-col p-3">
              <textarea
                value={previewCode}
                onChange={e => setPreviewCode(e.target.value)}
                className="flex-1 w-full bg-transparent text-green-400 font-mono text-xs focus:outline-none resize-none custom-scrollbar leading-relaxed"
                spellCheck={false}
              />
            </div>
            <div className="w-1/2 bg-white relative">
              <span className="absolute top-2 right-3 text-[9px] font-bold text-muted/30 uppercase">Preview</span>
              <iframe ref={iframeRef} title="Preview" className="w-full h-full border-none" srcDoc={previewCode} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
