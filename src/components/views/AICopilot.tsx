import React, { useState, useRef, useEffect } from 'react';
import { Task, Handover } from '../../types';
import { Send, Bot, User, Sparkles, AlertCircle, Quote, Terminal, Copy, CheckCircle2, RefreshCw, Layers, Code, Play, Download, Save, Globe, Cpu, Zap, Hash, History, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

interface AICopilotProps {
  tasks: Task[];
  handovers: Handover[];
  messages: {role: 'user' | 'assistant', content: string, timestamp: number}[];
  setMessages: React.Dispatch<React.SetStateAction<{role: 'user' | 'assistant', content: string, timestamp: number}[]>>;
}

type Provider = 'local' | 'openai' | 'alibaba' | 'gemini';

export default function AICopilot({ tasks, handovers, messages, setMessages }: AICopilotProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat');
  const [provider, setProvider] = useState<Provider>('gemini');
  const [previewCode, setPreviewCode] = useState('<!-- AI Studio Render Area -->\n<div style="font-family: sans-serif; padding: 40px; text-align: center; color: #1E293B;">\n  <h1 style="font-size: 2.5rem; margin-bottom: 20px;">Ready to Visualize Ops</h1>\n  <p style="opacity: 0.7;">Type <strong>/render html [context]</strong> to generate code.</p>\n</div>');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const updatePreview = (code: string) => {
    setPreviewCode(code);
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(code);
        doc.close();
      }
    }
  };

  const handleCommand = async (command: string) => {
    if (command.startsWith('/render html')) {
      setActiveTab('preview');
      const prompt = command.replace('/render html', '').trim();
      setMessages(prev => [...prev, { role: 'assistant', content: `Preparing visualization for: ${prompt}...`, timestamp: Date.now() }]);
      // Logic would call AI to generate HTML
      const mockHtml = `
        <div style="padding: 30px; font-family: 'Inter', sans-serif; background: #f8fafc; border-radius: 20px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin-top: 0;">Risk Analysis Report</h2>
          <div style="display: flex; gap: 15px; margin-bottom: 20px;">
            <div style="background: #fee2e2; color: #ef4444; padding: 15px; border-radius: 12px; flex: 1;">
              <strong>High Alerts</strong>
              <div style="font-size: 24px; font-weight: bold;">${tasks.filter(t => t.priority === 'High').length}</div>
            </div>
          </div>
          <div style="color: #64748b; font-size: 14px; line-height: 1.6;">
            Generated based on active workspace context.
          </div>
        </div>
      `;
      setTimeout(() => updatePreview(mockHtml), 1000);
      return true;
    }
    return false;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    
    // Check for slash commands
    if (await handleCommand(userMsg)) return;

    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        throw new Error('MISSING_KEY');
      }

      const ai = new GoogleGenAI({ apiKey });
      const context = `
        Current Operations State:
        - Total Tasks: ${tasks.length}
        - Open Tasks: ${tasks.filter(t => t.status !== 'Done').length}
        - High Priorities: ${tasks.filter(t => t.priority === 'High').length}
        - Recent Handovers: ${handovers.length}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          { parts: [{ text: `You are an Operations Copilot. Answer concisely. Context: ${context}. User query: ${userMsg}` }] }
        ],
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "I'm sorry, I couldn't process that query.", timestamp: Date.now() }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️AI Service unreachable. Check API configuration.`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Section: Chat & Controls */}
        <div className="flex-1 glass-card p-0 flex flex-col overflow-hidden border-dawn shadow-lg">
          <div className="p-4 border-b border-dawn bg-stone/20 flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-ink text-white rounded-xl shadow-lg ring-4 ring-citrus/5">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-sm font-black uppercase tracking-widest text-ink">AI Command Hub</span>
                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Synthetic Logic Syncing
                    </span>
                  </div>
                </div>
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

             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {(['gemini', 'openai', 'alibaba', 'local'] as Provider[]).map(p => (
                  <button 
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${
                      provider === p ? 'bg-citrus/10 border-citrus text-ink' : 'bg-white border-dawn text-muted hover:border-ink/20'
                    }`}
                  >
                    {p}
                  </button>
                ))}
             </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
                  <AnimatePresence>
                    {messages.map((m, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${m.role === 'user' ? 'bg-dawn text-ink' : 'bg-citrus text-white'}`}>
                          {m.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col gap-1.5 max-w-[80%]">
                           <div className={`p-4 rounded-2xl text-[13px] font-semibold leading-relaxed shadow-sm ${
                              m.role === 'user' ? 'bg-ink text-white rounded-tr-none' : 'bg-stone/50 border border-dawn text-ink rounded-tl-none'
                            }`}>
                              {m.content}
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest text-muted/50 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                        Synthesizing Operational Data...
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 border-t border-dawn bg-stone/5">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/40 font-black text-[10px]">/</div>
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Type a command or ask about risks..."
                      className="w-full bg-white border border-dawn rounded-2xl pl-8 pr-14 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-citrus/5 focus:border-citrus transition-all placeholder:text-muted/30"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-ink text-white rounded-xl flex items-center justify-center hover:bg-slate-900 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mt-4 flex gap-4 overflow-x-auto no-scrollbar py-1">
                    {[
                      { cmd: '/risk', label: 'Analysis', icon: AlertCircle },
                      { cmd: '/handover', label: 'Transfer', icon: RefreshCw },
                      { cmd: '/render html', label: 'Visualize', icon: Play },
                      { cmd: '/mcp json', label: 'Import', icon: Hash }
                    ].map((suggest, i) => (
                      <button 
                        key={i}
                        onClick={() => setInput(suggest.cmd + ' ')}
                        className="flex items-center gap-1.5 px-3 py-1 bg-white border border-dawn rounded-lg text-[9px] font-black uppercase tracking-widest text-muted hover:text-citrus hover:border-citrus/30 transition-all shrink-0"
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
                    <button onClick={() => updatePreview(previewCode)} className="p-1.5 hover:bg-dawn rounded-lg text-muted hover:text-green-500 transition-all">
                      <Play className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 hover:bg-dawn rounded-lg text-muted hover:text-blue-500 transition-all">
                      <Save className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 hover:bg-dawn rounded-lg text-muted hover:text-citrus transition-all">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-5 border-l-4 border-l-citrus">
          <div className="flex items-center gap-3 mb-3">
             <Layers className="w-4 h-4 text-citrus" />
             <span className="text-[10px] font-black uppercase tracking-widest text-muted">MCP Context</span>
          </div>
          <div className="flex flex-wrap gap-2">
             <span className="px-2 py-1 bg-stone rounded-md text-[9px] font-black text-ink">tasks.v1</span>
             <span className="px-2 py-1 bg-stone rounded-md text-[9px] font-black text-ink">hubs.v2</span>
             <span className="px-2 py-1 bg-stone rounded-md text-[9px] font-black text-ink">handovers</span>
          </div>
        </div>

        <div className="glass-card p-5">
           <div className="flex items-center gap-3 mb-3">
             <Cpu className="w-4 h-4 text-blue-500" />
             <span className="text-[10px] font-black uppercase tracking-widest text-muted">Inference Mode</span>
          </div>
          <div className="flex gap-2">
             <button className="flex-1 p-2 bg-stone border border-dawn rounded-xl text-[9px] font-black uppercase tracking-tighter text-ink">Heavy Model</button>
             <button className="flex-1 p-2 bg-citrus/10 border border-citrus/20 rounded-xl text-[9px] font-black uppercase tracking-tighter text-ink shadow-sm">Fast Flow</button>
          </div>
        </div>

        <div className="glass-card p-5">
           <div className="flex items-center gap-3 mb-1.5">
             <History className="w-4 h-4 text-muted" />
             <span className="text-[10px] font-black uppercase tracking-widest text-muted">Session Tokens</span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="relaxed-title text-2xl">4,280</span>
            <span className="text-[9px] font-bold text-muted/60 uppercase">/ 100k Limit</span>
          </div>
          <div className="h-1 bg-stone rounded-full overflow-hidden">
             <div className="h-full bg-ink w-[4.2%]" />
          </div>
        </div>

        <div className="glass-card p-5 bg-gradient-to-br from-citrus/10 to-transparent border-citrus/20 flex flex-col justify-between">
           <div className="flex items-center justify-between">
              <Sparkles className="w-4 h-4 text-citrus" />
              <button className="p-1 px-3 bg-ink text-white rounded-lg text-[8px] font-black uppercase tracking-widest">Upgrade</button>
           </div>
           <p className="text-[10px] font-bold text-ink leading-relaxed mt-4">
             Unlock Alibaba & Custom Endpoint support for high-volume operational cycles.
           </p>
        </div>
      </div>
    </div>
  );
}
