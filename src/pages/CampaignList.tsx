/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  Search, 
  ChevronRight, 
  MoreVertical, 
  Plus, 
  Activity,
  AlertCircle,
  AlertTriangle,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Eye,
  LayoutList,
  Upload,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils';
import { CampaignStage, STAGE_NAMES } from '../constants';
import { Campaign } from '../types';
import { dataService } from '../services/dataService';
import { exportCampaigns, readSpreadsheet, rowsToCampaigns } from '../services/spreadsheetService';

export default function CampaignList() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>(dataService.getCampaigns());
  const [selectedStage, setSelectedStage] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCompactView, setIsCompactView] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesStage = selectedStage === 'all' || campaign.stage === selectedStage;
      const lowerQuery = searchQuery.toLowerCase();
      
      const internalOwnerMatch = campaign.internalOwners?.some(o => o.toLowerCase().includes(lowerQuery));
      const clientOwnerMatch = campaign.clientOwners?.some(o => o.toLowerCase().includes(lowerQuery));
      
      const matchesSearch = !searchQuery || 
        (campaign.name || '').toLowerCase().includes(lowerQuery) ||
        internalOwnerMatch ||
        clientOwnerMatch;
        
      return matchesStage && matchesSearch;
    });
  }, [selectedStage, searchQuery, campaigns]);

  const handleUpdateStatus = (id: string, status: Campaign['status']) => {
    const updated = dataService.updateCampaign(id, { status });
    setCampaigns(updated);
  };

  const handleUpdateHealth = (id: string, recordHealth: Campaign['recordHealth']) => {
    const updated = dataService.updateCampaign(id, { recordHealth });
    setCampaigns(updated);
  };

  const handleUpdateStage = (id: string, stage: CampaignStage) => {
    const updated = dataService.updateCampaign(id, { stage });
    setCampaigns(updated);
  };

  const handleBulkUpload = async (file?: File) => {
    if (!file) return;
    try {
      const rows = await readSpreadsheet(file);
      const imported = rowsToCampaigns(rows);
      const updated = dataService.addCampaigns(imported);
      setCampaigns(updated);
      setBulkMessage(`${imported.length} campaigns imported from ${file.name}`);
    } catch (error) {
      console.error(error);
      setBulkMessage('Import failed. Check your CSV/XLSX columns and try again.');
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-10">
        <div>
          <div className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-gc-orange">Operations Core</div>
          <h2 className="font-condensed font-extrabold text-[22px] tracking-tight text-foreground">Campaign Registry</h2>
          <p className="text-[var(--ink-700)] flex items-center gap-2 mt-2 font-mono text-[13px]">
            <Activity size={16} className="text-[var(--gc-orange)]" />
            Centralized hub for all <span className="font-bold text-[var(--ink-900)]">18-stage</span> campaign lifecycle operations.
          </p>
        </div>
        <button onClick={() => navigate('/campaigns/new')} className="bg-gc-orange text-white px-4 py-2.5 rounded-lg font-condensed font-bold uppercase tracking-wide hover:bg-gc-orange/90 transition-colors flex items-center gap-2 shadow-[var(--shadow-sm)]">
          <Plus strokeWidth={3} size={16} /> New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-gc-orange dark:bg-orange-900/20">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Bulk Campaign Upload</p>
            <p className="text-xs text-muted-foreground">Supports `.xlsx`, `.xls`, and `.csv`. Columns can include name, country, city, stage, status, owner, budget, platforms, dates.</p>
            {bulkMessage && <p className="mt-1 text-xs font-semibold text-gc-orange">{bulkMessage}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:bg-card dark:text-gray-300 dark:hover:bg-gray-800">
            <Upload size={15} />
            Import
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => handleBulkUpload(event.target.files?.[0])}
            />
          </label>
          <button
            onClick={() => exportCampaigns(filteredCampaigns)}
            className="inline-flex items-center gap-2 rounded-lg bg-gc-orange px-3 py-2 text-xs font-bold text-white hover:bg-gc-orange/90"
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      {/* Stage Filter Chips */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-display font-black uppercase tracking-[1.5px] text-[var(--ink-500)]">Lifecycle Phase Filter</p>
          <button 
            onClick={() => setSelectedStage('all')}
            className="text-[11px] font-display font-black uppercase tracking-widest text-[var(--gc-orange)] hover:text-[#D14F1C] transition-colors"
          >
            Clear All Filters
          </button>
        </div>
        <div className="flex overflow-x-auto gap-2 pb-4 snap-x custom-scrollbar">
          <button
            onClick={() => setSelectedStage('all')}
            className={cn(
              "whitespace-nowrap px-5 py-2.5 rounded-full text-[10.5px] font-display font-black uppercase tracking-widest transition-all border shrink-0",
              selectedStage === 'all' 
                ? "bg-[var(--gc-purple)] text-white border-[var(--gc-purple)] shadow-[var(--shadow-md)] shadow-purple-900/10" 
                : "bg-[var(--white)] text-[var(--ink-500)] border-[var(--border)] hover:bg-[var(--bg)] hover:text-[var(--ink-700)]"
            )}
          >
            All Stages
          </button>
          {Object.entries(STAGE_NAMES).map(([stage, name]) => (
            <button
              key={stage}
              onClick={() => setSelectedStage(Number(stage))}
              className={cn(
                "whitespace-nowrap px-5 py-2.5 rounded-full text-[10.5px] font-display font-black uppercase tracking-widest transition-all border shrink-0",
                selectedStage === Number(stage)
                  ? "bg-[var(--gc-orange)] text-white border-[var(--gc-orange)] shadow-[var(--shadow-md)] shadow-orange-900/10"
                  : "bg-[var(--white)] text-[var(--ink-500)] border-[var(--border)] hover:bg-[var(--bg)] hover:text-[var(--ink-700)] hover:border-[var(--ink-300)]"
              )}
            >
              {stage}. {name.split('–')[0].split('/')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg)]">
           <div className="relative w-[380px]">
             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-300)]" />
             <input 
               className="w-full pl-12 pr-4 py-3 text-sm outline-none font-medium bg-[var(--white)] border border-[var(--border)] rounded-full focus:border-[var(--gc-purple)] focus:ring-[4px] focus:ring-[var(--gc-purple-mid)] transition-all" 
               placeholder="Filter by name, owner, or reference ID..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
           
           <div className="flex items-center gap-2">
             <button 
               onClick={() => setIsCompactView(!isCompactView)}
               className={cn(
                 "flex items-center gap-2 px-5 py-3 border rounded-full text-[12px] font-display font-bold uppercase tracking-widest transition-all",
                 isCompactView 
                   ? "bg-[var(--gc-purple)] text-white border-[var(--gc-purple)]" 
                   : "bg-[var(--white)] text-[var(--ink-700)] border-[var(--border)] hover:bg-[var(--bg)] hover:border-[var(--border-strong)]"
               )}
             >
                <LayoutList strokeWidth={2.5} size={16} /> {isCompactView ? 'Compact View' : 'Default View'}
             </button>
             <button className="flex items-center gap-2 px-5 py-3 border border-[var(--border)] rounded-full text-[12px] font-display font-bold uppercase tracking-widest text-[var(--ink-700)] bg-[var(--white)] hover:bg-[var(--bg)] hover:border-[var(--border-strong)] transition-all">
                <Filter strokeWidth={2.5} size={16} /> Refine
             </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground bg-muted/30 border-b border-border">Campaign Name</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground bg-muted/30 border-b border-border">Current Stage</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground bg-muted/30 border-b border-border text-center">Status</th>
                {!isCompactView && (
                  <>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground bg-muted/30 border-b border-border">Market</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground bg-muted/30 border-b border-border">Health</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground bg-muted/30 border-b border-border text-right">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="px-5 py-3.5 border-b border-border bg-card group-hover:bg-accent/40 transition-colors group hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all cursor-default bg-[var(--white)] z-0 hover:z-10 relative">
                    <td className="px-6 py-4 border-b border-[var(--border)]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[var(--gc-orange-soft)] border border-[var(--gc-orange)]/20 text-[var(--gc-orange)] flex items-center justify-center font-display font-black shadow-sm">
                          {campaign.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <input 
                            className="text-[15px] font-bold text-[var(--ink-900)] bg-transparent border-none outline-none focus:ring-[2px] focus:ring-[var(--gc-orange-soft)] rounded px-2 -mx-2 transition-all block w-full"
                            value={campaign.name}
                            onChange={(e) => {
                              const updated = dataService.updateCampaign(campaign.id, { name: e.target.value });
                              setCampaigns(updated);
                            }}
                          />
                          <p className="text-[11px] text-[var(--ink-500)] font-mono mt-1 tracking-wider uppercase pl-1">{campaign.id} · {campaign.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-b border-[var(--border)] min-w-[240px]">
                       <div className="space-y-2.5">
                          <div className="flex items-center justify-between px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[var(--bg)] border border-[var(--border)] group/stage-toggle transition-colors relative focus-within:ring-2 focus-within:ring-[var(--gc-purple)] focus-within:border-[var(--gc-purple)] pr-2">
                             <button
                               onClick={() => setSelectedStage(campaign.stage)}
                               className="flex-1 text-left text-[10px] font-black uppercase tracking-widest text-[var(--ink-900)] hover:text-[var(--gc-purple)] truncate transition-colors py-1 outline-none"
                               title="Filter by this stage"
                             >
                               {campaign.stage}. {STAGE_NAMES[campaign.stage as keyof typeof STAGE_NAMES]}
                             </button>
                             <div className="relative flex items-center justify-center p-1 rounded hover:bg-[var(--ink-200)] transition-colors text-[var(--ink-400)] hover:text-[var(--ink-900)]">
                                <select 
                                  value={campaign.stage}
                                  onChange={(e) => handleUpdateStage(campaign.id, Number(e.target.value))}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  title="Update Stage"
                                >
                                  {Object.entries(STAGE_NAMES).map(([s, n]) => (
                                    <option key={s} value={s}>{s}. {n}</option>
                                  ))}
                                </select>
                                <ChevronRight size={14} className="rotate-90" />
                             </div>
                          </div>
                          <div className="h-1.5 w-full bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
                             <div className="h-full bg-[var(--gc-purple)] transition-all duration-700 ease-out" style={{ width: `${((campaign.stage || 1) / 18) * 100}%` }} />
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 border-b border-[var(--border)] text-center relative group/status">
                       <label className={cn(
                         "flex items-center justify-center mx-auto w-fit px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest gap-2 cursor-pointer transition-all hover:scale-105 shadow-sm",
                         campaign.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                         campaign.status === 'Blocked' ? "bg-red-50 text-red-600 border-red-200" :
                         campaign.status === 'Closed' ? "bg-secondary text-muted-foreground border-border" :
                         "bg-amber-50 text-amber-600 border-amber-200"
                       )}>
                         {campaign.status === 'Active' && <Activity size={12} />}
                         {campaign.status === 'Blocked' && <AlertCircle size={12} />}
                         {campaign.status === 'Closed' && <CheckCircle2 size={12} />}
                         {campaign.status === 'On Hold' && <Clock size={12} />}
                         
                         <select 
                           value={campaign.status}
                           onChange={(e) => handleUpdateStatus(campaign.id, e.target.value as any)}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                           title="Change Status"
                         >
                           {['Active', 'Blocked', 'Closed', 'On Hold'].map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                         {campaign.status}
                       </label>
                    </td>
                    {!isCompactView && (
                      <React.Fragment>
                        <td className="px-6 py-4 border-b border-[var(--border)]">
                           <input 
                             className="text-[14px] font-bold text-[var(--ink-700)] bg-transparent border-none outline-none focus:ring-[2px] focus:ring-[var(--gc-orange-soft)] rounded px-2 py-1 -mx-2 transition-all w-full"
                             value={campaign.country}
                             onChange={(e) => {
                               const updated = dataService.updateCampaign(campaign.id, { country: e.target.value });
                               setCampaigns(updated);
                             }}
                           />
                        </td>
                        <td className="px-6 py-4 border-b border-[var(--border)] relative group/health">
                           <div className="flex items-center w-full">
                             <label className={cn(
                               "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all hover:scale-105 shadow-sm relative overflow-hidden",
                               campaign.recordHealth === 'Healthy' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                               campaign.recordHealth === 'At Risk' ? "bg-amber-50 text-amber-600 border-amber-200" : 
                               "bg-red-50 text-red-600 border-red-200"
                             )}>
                                {campaign.recordHealth === 'Healthy' && <ShieldCheck size={12} strokeWidth={2.5} />}
                                {campaign.recordHealth === 'At Risk' && <AlertTriangle size={12} strokeWidth={2.5} />}
                                {campaign.recordHealth === 'Critical' && <Flame size={12} strokeWidth={2.5} />}
                                
                                {campaign.recordHealth}

                                <select 
                                  value={campaign.recordHealth}
                                  onChange={(e) => handleUpdateHealth(campaign.id, e.target.value as any)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  title="Update Mission Health"
                                >
                                  {['Healthy', 'At Risk', 'Critical'].map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                             </label>
                           </div>
                        </td>
                        <td className="px-6 py-4 border-b border-[var(--border)] text-right">
                           <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                                className="p-2.5 text-[var(--ink-300)] hover:text-[var(--gc-purple)] hover:bg-[var(--gc-purple-soft)] rounded-md transition-all shadow-sm shadow-transparent hover:shadow-[var(--shadow-sm)]"
                                title="View Mission Detail"
                              >
                                 <Eye size={18} />
                              </button>
                              <button className="p-2.5 text-[var(--ink-300)] hover:text-[var(--ink-900)] hover:bg-[var(--bg)] rounded-md transition-all shadow-sm shadow-transparent hover:shadow-[var(--shadow-sm)]">
                                 <MoreVertical size={18} />
                              </button>
                           </div>
                        </td>
                      </React.Fragment>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <div className="w-20 h-20 bg-[var(--bg)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <Search size={28} className="text-[var(--ink-300)]" />
                    </div>
                    <p className="text-[18px] font-bold text-[var(--ink-900)] tracking-tight">No campaigns found</p>
                    <p className="text-[13px] font-mono text-[var(--ink-500)] mt-2">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
