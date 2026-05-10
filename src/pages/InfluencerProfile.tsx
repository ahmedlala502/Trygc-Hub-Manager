/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Instagram, 
  Twitter, 
  Globe, 
  Users, 
  TrendingUp, 
  Star,
  CheckCircle2,
  Calendar,
  Layers,
  BarChart3,
  Mail,
  Zap,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Video,
  Youtube
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../utils';
import { motion } from 'motion/react';
import { dataService } from '../services/dataService';

const PERFORMANCE_METRICS = [
  { label: 'Avg. Engagement', value: '8.4%', trend: '+1.2%', baseline: 'Avg: 6.5%' },
  { label: 'Conversion Velocity', value: '3.2%', trend: 'Steady', baseline: 'Avg: 2.8%' },
  { label: 'Content Quality', value: 'A+', trend: 'Peak', baseline: 'Internal Score' },
  { label: 'Total Media Value', value: '$42K', trend: '+15%', baseline: 'Estimated EMV' },
];

const getPlatformIcon = (platform: string) => {
  switch(platform?.toLowerCase()) {
    case 'instagram': return Instagram;
    case 'tiktok': return Video;
    case 'youtube': return Youtube;
    case 'snapchat': return Smartphone;
    default: return Globe;
  }
};

const getPlatformUrl = (platform: string, handle: string) => {
  const cleanHandle = handle?.replace('@', '');
  switch(platform?.toLowerCase()) {
    case 'instagram': return `https://instagram.com/${cleanHandle}`;
    case 'tiktok': return `https://tiktok.com/@${cleanHandle}`;
    case 'youtube': return `https://youtube.com/@${cleanHandle}`;
    case 'snapchat': return `https://snapchat.com/add/${cleanHandle}`;
    default: return `https://${platform?.toLowerCase()}.com/${cleanHandle}`;
  }
};

const PLATFORM_THEMES: Record<string, any> = {
  instagram: {
    primary: 'from-[#833ab4]',
    secondary: 'bg-[#E1306C]',
    accent: 'text-[#E1306C]'
  },
  tiktok: {
    primary: 'from-[#69C9D0]',
    secondary: 'bg-[#EE1D52]',
    accent: 'text-[#69C9D0]'
  },
  youtube: {
    primary: 'from-[#FF0000]',
    secondary: 'bg-[#FF0000]',
    accent: 'text-[#FF0000]'
  },
  snapchat: {
    primary: 'from-[#FFFC00]',
    secondary: 'bg-[#FFFC00]',
    accent: 'text-yellow-400'
  },
  default: {
    primary: 'from-[var(--gc-purple)]',
    secondary: 'bg-[var(--gc-orange)]',
    accent: 'text-[var(--gc-orange)]'
  }
};

export default function InfluencerProfile() {
  const navigate = useNavigate();
  const { id } = useParams();

  const influencer = React.useMemo(() => {
    return dataService.getInfluencers().find(i => i.id === id);
  }, [id]);

  const theme = React.useMemo(() => {
    if (!influencer) return PLATFORM_THEMES.default;
    return PLATFORM_THEMES[influencer.platform.toLowerCase()] || PLATFORM_THEMES.default;
  }, [influencer]);

  if (!influencer) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <h2 className="text-2xl font-black text-muted-foreground uppercase tracking-widest">Creator Record Not Found</h2>
        <button onClick={() => navigate('/influencers')} className="bg-gc-orange text-white px-4 py-2.5 rounded-lg font-condensed font-bold uppercase tracking-wide hover:bg-gc-orange/90 transition-colors">Return to Roster</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-500">
      {/* Profiler Header */}
      <header className="relative p-12 bg-foreground rounded-[3rem] text-white overflow-hidden shadow-2xl border border-slate-800">
        <div className={cn("absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br to-transparent opacity-20 blur-[120px] -mr-40 -mt-40 transition-all duration-1000", theme.primary)} />
        <div className={cn("absolute bottom-0 left-0 w-80 h-80 opacity-10 blur-[100px] -ml-20 rounded-full transition-all duration-1000", theme.secondary)} />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center lg:items-end">
           <div className="relative group">
              <div className={cn("w-48 h-48 rounded-[3rem] bg-foreground/90 border-4 border-slate-700 shadow-2xl overflow-hidden relative z-10 transition-all group-hover:border-opacity-50", influencer.platform.toLowerCase() === 'snapchat' ? 'group-hover:border-yellow-400' : 'group-hover:border-white')}>
                 <div className="w-full h-full bg-slate-700 flex items-center justify-center text-5xl font-display font-black text-white/20">
                    {influencer.username.substring(1, 3).toUpperCase()}
                 </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center border-4 border-slate-900 shadow-xl z-20">
                 <ShieldCheck size={24} />
              </div>
           </div>

           <div className="flex-1 space-y-6 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                 <h1 className="text-5xl font-display font-black tracking-tighter">Creator Profile ({influencer.username})</h1>
                 <div className={cn(
                   "flex items-center gap-2 px-3 py-1 border rounded-lg text-[10px] font-black uppercase tracking-widest",
                   influencer.status === 'Confirmed' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-[var(--white)]/10 border-white/20 text-muted-foreground"
                 )}>
                    <Star size={12} fill="currentColor" /> {influencer.status} Stage
                 </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start items-center gap-6 text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                 <div className="flex items-center gap-2">
                    <MapPin size={14} className={theme.accent} /> {influencer.city || 'Regional Market'}{influencer.country ? `, ${influencer.country}` : ''}
                 </div>
                 <div className="flex items-center gap-2">
                    <a 
                      href={getPlatformUrl(influencer.platform, influencer.username)} 
                      target="_blank" 
                      rel="noreferrer"
                      className={cn("flex items-center gap-2 hover:underline transition-colors outline-none focus:ring-2 rounded px-1 -mx-1", theme.accent, "focus:ring-white/20")}
                      title={`View ${influencer.username} on ${influencer.platform}`}
                    >
                      {React.createElement(getPlatformIcon(influencer.platform), { size: 14 })}
                      {influencer.platform} Operational
                      <ExternalLink size={10} className="opacity-50" />
                    </a>
                 </div>
                 <div className="flex items-center gap-2">
                    <Smartphone size={14} /> ID: {influencer.influencerId || influencer.id}
                 </div>
                 <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={14} /> Identity Verified
                 </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                 <button className="px-8 py-3.5 bg-[var(--white)] text-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform flex items-center gap-3 shadow-xl">
                    Deploy Invitation <Zap size={16} fill="currentColor" />
                 </button>
                 <button className="px-8 py-3.5 bg-foreground/90 text-white border border-slate-700 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-colors flex items-center gap-3">
                    Extract Data Source <ExternalLink size={16} />
                 </button>
                 <button 
                  onClick={() => navigate(-1)}
                  className="px-8 py-3.5 bg-transparent text-white border border-white/10 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[var(--white)]/5 transition-all">
                    Return to Roster
                 </button>
              </div>
           </div>
        </div>
      </header>

      {/* Metric Extraction Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {PERFORMANCE_METRICS.map((metric, idx) => (
              <div key={idx} className="bg-card border border-border rounded-xl overflow-hidden p-10 bg-[var(--white)] border-2 border-border rounded-[2.5rem] group hover:border-[var(--gc-orange-soft)] transition-all flex flex-col justify-between overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-8 text-slate-50 group-hover:text-[var(--gc-orange-soft)] transition-colors">
                    <BarChart3 size={40} strokeWidth={1} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground mb-1 text-muted-foreground mb-2">{metric.label}</p>
                    <p className="text-5xl font-display font-black text-foreground group-hover:scale-105 transition-transform origin-left">{metric.value}</p>
                 </div>
                 <div className="mt-8 flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-1 bg-secondary/30 text-muted-foreground rounded-lg text-[9px] font-black uppercase tracking-widest">
                       {metric.baseline}
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      metric.trend.includes('+') ? "text-emerald-500" : "text-[var(--gc-purple)]"
                    )}>{metric.trend}</span>
                 </div>
              </div>
            ))}
         </div>

         {/* Audience Intelligence */}
         <div className="lg:col-span-4 bg-card border border-border rounded-xl overflow-hidden bg-foreground p-10 rounded-[3.5rem] text-white flex flex-col justify-between shadow-2xl space-y-10 border border-slate-800">
            <div className="space-y-6">
               <div className="flex items-center gap-3">
                  <h3 className="font-condensed font-extrabold text-[22px] tracking-tight text-foreground text-base tracking-widest uppercase opacity-80">Audience Pulse</h3>
                  <div className="h-px flex-1 bg-foreground/90" />
               </div>
               <div className="space-y-4">
                  {[
                    { label: 'Riyadh Core', val: '42%', color: 'bg-[var(--gc-orange)]' },
                    { label: 'Male 24-34', val: '68%', color: 'bg-[var(--gc-purple)]' },
                    { label: 'Tech Interest', val: '89%', color: 'bg-emerald-500' }
                  ].map(stat => (
                    <div key={stat.label} className="space-y-2 group">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                          <span className="text-muted-foreground group-hover:text-white transition-colors">{stat.label}</span>
                          <span className="text-white">{stat.val}</span>
                       </div>
                       <div className="h-1.5 bg-foreground/90 rounded-full overflow-hidden">
                          <motion.div 
                            className={cn("h-full rounded-full transition-all duration-1000", stat.color)} 
                            initial={{ width: 0 }}
                            animate={{ width: stat.val }}
                          />
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="p-8 bg-[var(--white)]/5 border border-white/10 rounded-[2.5rem] space-y-4">
               <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--gc-orange)]">Extraction Insights</h4>
               <p className="text-xs text-muted-foreground/60 leading-relaxed font-medium italic">
                  "Highest resonance in Riyadh's tech cluster. Content depth exceeds peer median by 2.4x. Strong seasonal alignment for Summer KSA cycles."
               </p>
            </div>
         </div>
      </div>

      {/* Recent Operational Integrity */}
      <div className="bg-card border border-border rounded-xl overflow-hidden bg-[var(--white)] border-2 border-border rounded-[3rem] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.02)]">
         <div className="p-10 border-b border-border flex justify-between items-center bg-secondary/20">
            <div>
               <h3 className="font-condensed font-extrabold text-[22px] tracking-tight text-foreground text-base tracking-widest uppercase">Collaborative Portfolio</h3>
               <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Verified campaigns in the GC ecosystem</p>
            </div>
            <button className="px-6 py-3 bg-foreground text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--gc-orange)] transition-all flex items-center gap-2">
               Full Audit History <ArrowLeft size={14} className="rotate-180" />
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-50">
            {[
              { campaign: 'Red Bull Summer KSA', status: 'In Flight', date: 'Oct 2024', vibe: 'Lifestyle/Action' },
              { campaign: 'STC Pay Launch', status: 'Completed', date: 'Aug 2024', vibe: 'Fintech/UX' },
              { campaign: 'Almarai Fresh', status: 'Completed', date: 'Jun 2024', vibe: 'Social Impact' }
            ].map((p, i) => (
              <div key={i} className="p-10 space-y-6 hover:bg-secondary/20 transition-colors group cursor-pointer">
                 <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-[var(--white)] border-2 border-border rounded-2xl flex items-center justify-center text-muted-foreground group-hover:bg-foreground group-hover:text-white transition-all shadow-sm">
                       <Layers size={22} />
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                      p.status === 'In Flight' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    )}>{p.status}</span>
                 </div>
                 <div className="space-y-1">
                    <h5 className="text-lg font-display font-black text-foreground group-hover:text-[var(--gc-orange)] transition-colors">{p.campaign}</h5>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{p.vibe} • {p.date}</p>
                 </div>
                 <button className="w-full py-4 text-muted-foreground group-hover:text-foreground border-t border-border group-hover:border-border transition-all text-[10px] font-black uppercase tracking-widest text-left pt-6 flex items-center justify-between">
                    View Impact Analysis <ArrowLeft size={12} className="rotate-180" />
                 </button>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
