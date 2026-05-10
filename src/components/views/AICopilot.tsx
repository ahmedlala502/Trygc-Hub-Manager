import React, { useState, useRef, useEffect } from 'react';
import { Task, Handover } from '../../types';
import { Send, Bot, User, Sparkles, AlertCircle, Terminal, Copy, CheckCircle2, RefreshCw, Layers, Code, Play, Download, Save, Cpu, Hash, History, Trash2, Cloud, HardDrive, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocalData } from '../LocalDataContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AICopilotProps {
  tasks: Task[];
  handovers: Handover[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const API_KEYS_STORE = 'trygc_api_keys_v1';
const STUDIO_SAVES_STORE = 'trygc_studio_saves';

function getApiKey(provider: string): string {
  try { return JSON.parse(localStorage.getItem(API_KEYS_STORE) || '{}')[provider] || ''; } catch { return ''; }
}

async function callAIProvider(
  provider: string,
  model: string,
  endpoint: string,
  history: Message[],
  systemPrompt: string
): Promise<string> {
  const apiKey = getApiKey(provider);
  if (!apiKey && provider !== 'local') throw new Error(`No API key for ${provider}. Add it in Settings → AI & API.`);

  const msgs = history.map(m => ({ role: m.role === 'assistant' ? (provider === 'gemini' ? 'model' : 'assistant') : 'user', content: m.content }));

  if (provider === 'gemini') {
    const m = model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: msgs.map(msg => ({ role: msg.role, parts: [{ text: msg.content }] })),
    };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Gemini ${res.status}`); }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.';
  }

  if (provider === 'openai') {
    const url = endpoint || 'https://api.openai.com/v1/chat/completions';
    const body = { model: model || 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }, ...msgs], max_tokens: 1200 };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `OpenAI ${res.status}`); }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response from OpenAI.';
  }

  if (provider === 'anthropic') {
    const url = endpoint || 'https://api.anthropic.com/v1/messages';
    const body = { model: model || 'claude-3-5-sonnet-20241022', max_tokens: 1200, system: systemPrompt, messages: msgs };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Anthropic ${res.status}`); }
    const data = await res.json();
    return data.content?.[0]?.text || 'No response from Anthropic.';
  }

  if (provider === 'groq') {
    const url = endpoint || 'https://api.groq.com/openai/v1/chat/completions';
    const body = { model: model || 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, ...msgs], max_tokens: 1200 };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Groq ${res.status}`); }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response from Groq.';
  }

  if (provider === 'alibaba') {
    const url = endpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    const body = { model: model || 'qwen-plus', messages: [{ role: 'system', content: systemPrompt }, ...msgs] };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Alibaba ${res.status}`); }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response from Alibaba.';
  }

  if (provider === 'local') {
    const base = endpoint || 'http://localhost:11434';
    const url = base.endsWith('/') ? base + 'api/chat' : base + '/api/chat';
    const body = { model: model || 'llama3', messages: [{ role: 'system', content: systemPrompt }, ...msgs], stream: false };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Local AI ${res.status} — is Ollama running?`);
    const data = await res.json();
    return data.message?.content || data.choices?.[0]?.message?.content || 'No response from local model.';
  }

  // Generic OpenAI-compatible custom provider
  if (endpoint) {
    const url = endpoint.endsWith('/') ? endpoint + 'chat/completions' : endpoint + '/chat/completions';
    const body = { model, messages: [{ role: 'system', content: systemPrompt }, ...msgs], max_tokens: 1200 };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Provider ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response.';
  }

  throw new Error(`Unknown provider: ${provider}. Configure endpoint in Settings → AI & API.`);
}

// ── Markdown renderer ──────────────────────────────────────

function parseInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-black">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-black/10 px-1 rounded font-mono text-[11px]">{part.slice(1, -1)}</code>;
    return part;
  });
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={key++} className="space-y-0.5 my-1 ml-1">{listItems}</ul>);
      listItems = [];
    }
  };

  lines.forEach(line => {
    if (line.startsWith('### ')) {
      flushList();
      elements.push(<p key={key++} className="font-black text-[10px] uppercase tracking-widest text-ink/60 mt-2">{parseInline(line.slice(4))}</p>);
    } else if (line.startsWith('## ') || line.startsWith('# ')) {
      flushList();
      const depth = line.startsWith('## ') ? 3 : 2;
      const text = line.slice(depth);
      elements.push(<p key={key++} className="font-black text-sm text-ink mt-1">{parseInline(text)}</p>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      listItems.push(
        <li key={key++} className="flex gap-2 items-start text-[13px]">
          <span className="text-citrus font-black mt-0.5 shrink-0">·</span>
          <span>{parseInline(line.slice(2))}</span>
        </li>
      );
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(<p key={key++} className="text-[13px] leading-relaxed">{parseInline(line)}</p>);
    }
  });
  flushList();

  return <div className="space-y-0.5">{elements}</div>;
}

// ── Main Component ─────────────────────────────────────────

export default function AICopilot({ tasks, handovers, messages, setMessages }: AICopilotProps) {
  const { settings } = useLocalData();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat');
  const [processingMode, setProcessingMode] = useState<'local' | 'cloud'>('local');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [previewCode, setPreviewCode] = useState(
    '<!-- AI Studio Render Area -->\n<div style="font-family: sans-serif; padding: 40px; text-align: center; color: #1E293B;">\n  <h1 style="font-size: 2.5rem; margin-bottom: 20px;">Ready to Visualize Ops</h1>\n  <p style="opacity: 0.7;">Type <strong>/render html [context]</strong> to generate code.</p>\n</div>'
  );
  const [studioSaved, setStudioSaved] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const hasApiKey = !!getApiKey(settings.aiProvider || 'gemini') || settings.aiProvider === 'local';

  const buildSystemPrompt = () =>
    `You are an AI operations assistant for TryGC Hub Manager, an enterprise shift and task management platform.\n\nWorkspace snapshot:\n- Tasks: ${tasks.length} total (${tasks.filter(t => t.status === 'Done').length} done, ${tasks.filter(t => t.status === 'Blocked').length} blocked, ${tasks.filter(t => t.priority === 'High').length} high-priority)\n- Handovers: ${handovers.length} total (${handovers.filter(h => h.status === 'Pending').length} pending)\n- Carry-over tasks: ${tasks.filter(t => t.carry).length}\n\nBe concise, data-driven, and actionable. Format responses using markdown.`;

  const generateLocalResponse = (userMsg: string): string => {
    const lowerMsg = userMsg.toLowerCase();
    if (lowerMsg.includes('risk') || lowerMsg.includes('alert')) {
      const highPriorityTasks = tasks.filter(t => t.priority === 'High');
      return `**Risk Analysis**\n\n**High Priority Items:** ${highPriorityTasks.length}\n\n${highPriorityTasks.map(t => `- [${t.status}] ${t.title}`).join('\n') || '- No high-risk items currently.'}\n\n**Recommendation:** Review carry-over tasks and ensure SLA compliance for all flagged items.`;
    }
    if (lowerMsg.includes('handover') || lowerMsg.includes('shift')) {
      return `**Shift Handover Summary**\n\n**Active Tasks:** ${tasks.filter(t => t.status !== 'Done').length}\n**Pending Handovers:** ${handovers.filter(h => h.status === 'Pending').length}\n\nAll regional hubs are synchronized. Review watchouts before shift change.`;
    }
    if (lowerMsg.includes('task') || lowerMsg.includes('outcome')) {
      return `**Task Overview**\n\n**Total:** ${tasks.length}\n**Completed:** ${tasks.filter(t => t.status === 'Done').length}\n**In Progress:** ${tasks.filter(t => t.status === 'In Progress').length}\n**Blocked:** ${tasks.filter(t => t.status === 'Blocked').length}`;
    }
    if (lowerMsg.includes('status') || lowerMsg.includes('summary')) {
      return `**Operations Summary**\n\n**Regional Hubs:** 4 active\n**Team Coverage:** Operations & Community teams\n**Current Shift:** Multi-shift coverage active\n\nAll systems operational.`;
    }
    return `**Local Analysis Complete**\n\nCurrently tracking:\n- ${tasks.length} total tasks\n- ${handovers.length} handovers\n- ${tasks.filter(t => t.priority === 'High').length} high-priority items\n\nFor AI-powered responses, switch to **Cloud Sync** mode and configure your API key in Settings → AI & API.`;
  };

  const updatePreview = (code: string) => {
    setPreviewCode(code);
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) { doc.open(); doc.write(code); doc.close(); }
    }
  };

  const handleCommand = async (command: string): Promise<boolean> => {
    if (command.startsWith('/render html')) {
      setActiveTab('preview');
      const prompt = command.replace('/render html', '').trim();
      setMessages(prev => [...prev, { role: 'assistant', content: `Preparing visualization${prompt ? ` for: ${prompt}` : ''}...`, timestamp: Date.now() }]);
      const mockHtml = `<div style="padding:30px;font-family:'Inter',sans-serif;background:#f8fafc;border-radius:20px;border:1px solid #e2e8f0"><h2 style="color:#1e293b;margin-top:0">Risk Analysis Report</h2><div style="display:flex;gap:15px;margin-bottom:20px"><div style="background:#fee2e2;color:#ef4444;padding:15px;border-radius:12px;flex:1"><strong>High Alerts</strong><div style="font-size:24px;font-weight:bold">${tasks.filter(t => t.priority === 'High').length}</div></div><div style="background:#fef9c3;color:#ca8a04;padding:15px;border-radius:12px;flex:1"><strong>Pending Handovers</strong><div style="font-size:24px;font-weight:bold">${handovers.filter(h => h.status === 'Pending').length}</div></div><div style="background:#dcfce7;color:#16a34a;padding:15px;border-radius:12px;flex:1"><strong>Completed</strong><div style="font-size:24px;font-weight:bold">${tasks.filter(t => t.status === 'Done').length}</div></div></div><p style="color:#64748b;font-size:14px;line-height:1.6">Generated from active workspace context.</p></div>`;
      setTimeout(() => updatePreview(mockHtml), 800);
      return true;
    }
    if (command === '/clear') {
      setMessages([{ role: 'assistant', content: 'Chat cleared. How can I assist?', timestamp: Date.now() }]);
      return true;
    }
    return false;
  };

  const handleSend = async (overrideInput?: string) => {
    const userMsg = (overrideInput ?? input).trim();
    if (!userMsg || isLoading) return;
    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: Date.now() }]);

    if (await handleCommand(userMsg)) return;

    setIsLoading(true);
    try {
      let response: string;
      if (processingMode === 'cloud') {
        const history: Message[] = [...messages, { role: 'user', content: userMsg, timestamp: Date.now() }];
        response = await callAIProvider(
          settings.aiProvider || 'gemini',
          settings.aiModel || '',
          settings.aiEndpoint || '',
          history,
          buildSystemPrompt()
        );
      } else {
        await new Promise(r => setTimeout(r, 400));
        response = generateLocalResponse(userMsg);
      }
      setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: Date.now() }]);
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      setError(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${msg}`, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(idx);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Chat cleared. How can I assist with your operations?', timestamp: Date.now() }]);
    setError('');
  };

  const saveStudio = () => {
    try {
      const saves = JSON.parse(localStorage.getItem(STUDIO_SAVES_STORE) || '[]');
      saves.unshift({ code: previewCode, savedAt: new Date().toISOString() });
      localStorage.setItem(STUDIO_SAVES_STORE, JSON.stringify(saves.slice(0, 10)));
      setStudioSaved(true);
      setTimeout(() => setStudioSaved(false), 2000);
    } catch {}
  };

  const downloadStudio = () => {
    const blob = new Blob([previewCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ops-visualization-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeProviderName = (settings.aiProvider || 'gemini').charAt(0).toUpperCase() + (settings.aiProvider || 'gemini').slice(1);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 glass-card p-0 flex flex-col overflow-hidden border-dawn shadow-lg">
          {/* Header */}
          <div className="p-4 border-b border-dawn bg-stone/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ink text-white rounded-xl shadow-lg ring-4 ring-citrus/5">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-black uppercase tracking-widest text-ink">AI Command Hub</span>
                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${processingMode === 'cloud' && hasApiKey ? 'bg-blue-500' : 'bg-green-500'}`} />
                  {processingMode === 'local' ? 'Local Analysis Mode' : `${activeProviderName} Cloud Mode`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'chat' && (
                <button
                  onClick={clearChat}
                  className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Clear chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="flex bg-stone p-1 rounded-xl border border-dawn">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-ink text-white shadow-md' : 'text-muted hover:text-ink'}`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Relay</span>
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'preview' ? 'bg-ink text-white shadow-md' : 'text-muted hover:text-ink'}`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Studio</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar" ref={scrollRef}>
                  <AnimatePresence>
                    {messages.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-4 group ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${m.role === 'user' ? 'bg-dawn text-ink' : 'bg-citrus text-white'}`}>
                          {m.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col gap-1.5 max-w-[80%]">
                          <div className={`relative p-4 rounded-2xl text-[13px] font-semibold leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-ink text-white rounded-tr-none' : 'bg-stone/50 border border-dawn text-ink rounded-tl-none'}`}>
                            {m.role === 'assistant' ? <MarkdownMessage content={m.content} /> : m.content}
                            <button
                              onClick={() => copyMessage(m.content, i)}
                              className={`absolute -top-2 ${m.role === 'user' ? '-left-2' : '-right-2'} p-1.5 bg-white border border-dawn rounded-lg text-muted hover:text-ink transition-all opacity-0 group-hover:opacity-100 shadow-sm`}
                            >
                              {copiedId === i ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-widest text-muted/50 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                            {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isLoading && (
                    <div className="flex gap-4">
                      <div className="w-9 h-9 rounded-xl bg-citrus text-white flex items-center justify-center shadow-lg shadow-citrus/20">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                          <RefreshCw className="w-4 h-4" />
                        </motion.div>
                      </div>
                      <div className="p-4 rounded-2xl bg-stone/50 border border-dawn font-black text-muted animate-pulse text-[10px] tracking-[0.2em] uppercase">
                        {processingMode === 'cloud' ? `Calling ${activeProviderName}...` : 'Processing Local Data...'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 border-t border-dawn bg-stone/5">
                  {error && (
                    <div className="mb-3 flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{error}</span>
                      <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/40 font-black text-[10px]">/</div>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Ask about risks, tasks, or type /render html..."
                      className="w-full bg-white border border-dawn rounded-2xl pl-8 pr-14 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-citrus/5 focus:border-citrus transition-all placeholder:text-muted/30"
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={isLoading || !input.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-ink text-white rounded-xl flex items-center justify-center hover:bg-slate-900 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar py-1">
                    {[
                      { cmd: 'What are the current risks and alerts?', label: 'Risk Analysis', icon: AlertCircle },
                      { cmd: 'Summarize pending handovers', label: 'Handovers', icon: RefreshCw },
                      { cmd: '/render html ops dashboard', label: 'Visualize', icon: Play },
                      { cmd: 'Give me a full status summary', label: 'Status', icon: Hash },
                      { cmd: 'List all blocked tasks', label: 'Blocked', icon: Terminal },
                    ].map((suggest, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(suggest.cmd)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-dawn rounded-lg text-[9px] font-black uppercase tracking-widest text-muted hover:text-citrus hover:border-citrus/30 transition-all shrink-0"
                      >
                        <suggest.icon className="w-3 h-3" />
                        <span>{suggest.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col h-full">
                <div className="p-3 bg-stone border-b border-dawn flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-muted" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">HTML/CSS Render Sandbox</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updatePreview(previewCode)} className="p-1.5 hover:bg-dawn rounded-lg text-muted hover:text-green-500 transition-all" title="Run">
                      <Play className="w-4 h-4" />
                    </button>
                    <button onClick={saveStudio} className="p-1.5 hover:bg-dawn rounded-lg transition-all" title="Save to browser">
                      {studioSaved ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Save className="w-4 h-4 text-muted hover:text-blue-500" />}
                    </button>
                    <button onClick={downloadStudio} className="p-1.5 hover:bg-dawn rounded-lg text-muted hover:text-citrus transition-all" title="Download HTML">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 flex flex-col md:flex-row min-h-0 h-full">
                  <div className="flex-1 bg-slate-900 p-4 border-r border-slate-800 flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Source Editor</span>
                    <textarea
                      value={previewCode}
                      onChange={(e) => setPreviewCode(e.target.value)}
                      className="flex-1 w-full bg-transparent text-white font-mono text-xs focus:outline-none resize-none custom-scrollbar leading-relaxed"
                    />
                  </div>
                  <div className="flex-1 bg-white relative flex flex-col h-full min-h-[300px]">
                    <span className="absolute top-2 right-4 text-[9px] font-black uppercase tracking-widest text-muted/30">Live View</span>
                    <iframe
                      ref={iframeRef}
                      title="Render Preview"
                      className="w-full h-full border-none"
                      srcDoc={previewCode}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-5 border-l-4 border-l-citrus">
          <div className="flex items-center gap-3 mb-3">
            <Layers className="w-4 h-4 text-citrus" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Live Context</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-stone rounded-md text-[9px] font-black text-ink">{tasks.length} tasks</span>
            <span className="px-2 py-1 bg-stone rounded-md text-[9px] font-black text-ink">{handovers.length} handovers</span>
            <span className="px-2 py-1 bg-red-50 text-red-600 rounded-md text-[9px] font-black">{tasks.filter(t => t.priority === 'High').length} high-risk</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Cpu className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Processing Mode</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setProcessingMode('local')}
              className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${processingMode === 'local' ? 'bg-citrus/10 border border-citrus/30 text-ink shadow-sm' : 'bg-stone border border-dawn text-muted hover:text-ink'}`}
            >
              <HardDrive className="w-3 h-3" /> Local
            </button>
            <button
              onClick={() => setProcessingMode('cloud')}
              title={!hasApiKey ? `Add a ${activeProviderName} API key in Settings → AI & API` : ''}
              className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${processingMode === 'cloud' ? 'bg-blue-50 border border-blue-200 text-blue-700 shadow-sm' : 'bg-stone border border-dawn text-muted hover:text-ink'} ${!hasApiKey ? 'opacity-60' : ''}`}
            >
              <Cloud className="w-3 h-3" /> Cloud
            </button>
          </div>
          {processingMode === 'cloud' && !hasApiKey && (
            <p className="text-[8px] font-bold text-amber-600 mt-2 leading-tight">No API key — configure in Settings</p>
          )}
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-1.5">
            <History className="w-4 h-4 text-muted" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Session</span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="relaxed-title text-2xl">{messages.length}</span>
            <span className="text-[9px] font-bold text-muted/60 uppercase">messages</span>
          </div>
          <div className="h-1 bg-stone rounded-full overflow-hidden">
            <div className="h-full bg-ink transition-all" style={{ width: `${Math.min(100, (messages.length / 30) * 100)}%` }} />
          </div>
        </div>

        <div className={`glass-card p-5 flex flex-col justify-between border-l-4 ${processingMode === 'cloud' && hasApiKey ? 'border-l-blue-400 bg-blue-50/30' : 'border-l-citrus'}`}>
          <div className="flex items-center justify-between">
            <Sparkles className={`w-4 h-4 ${processingMode === 'cloud' && hasApiKey ? 'text-blue-500' : 'text-citrus'}`} />
            <span className={`text-[8px] font-black uppercase tracking-widest ${processingMode === 'cloud' && hasApiKey ? 'text-blue-500' : 'text-citrus'}`}>
              {processingMode === 'cloud' && hasApiKey ? activeProviderName : 'Local'}
            </span>
          </div>
          <p className="text-[10px] font-bold text-ink leading-relaxed mt-4">
            {processingMode === 'cloud' && hasApiKey
              ? `Connected to ${activeProviderName} — ${settings.aiModel || 'default model'}.`
              : 'Local analysis powered by workspace data. Switch to Cloud for AI responses.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Minimal import for the X icon used in error banner
function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}
