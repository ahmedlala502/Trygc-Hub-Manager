import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Search,
  Filter,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { exportCampaigns } from '../services/spreadsheetService';
import { dataService } from '../services/dataService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function Reporting() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const chartData = [
    { name: 'Active', value: campaigns.filter(c => c.stage < 18).length },
    { name: 'Completed', value: campaigns.filter(c => c.stage === 18).length },
    { name: 'Blocked', value: campaigns.filter(c => c.blockerStatus).length },
  ];

const COLORS = ['#f97316', '#6b21a8', '#ef4444'];
  const activeCampaigns = campaigns.filter(c => Number(c.stage) < 18);
  const completedCampaigns = campaigns.filter(c => Number(c.stage) === 18);
  const blockedCampaigns = campaigns.filter(c => Boolean(c.blockerStatus));
  const totalBudget = campaigns.reduce((sum, campaign) => sum + Number(campaign.budget || 0), 0);
  const marketInsights = Object.entries(
    campaigns.reduce((acc, campaign) => {
      const key = campaign.country || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const filteredCampaigns = campaigns.filter((campaign) => {
    const queryValue = searchTerm.trim().toLowerCase();
    if (!queryValue) return true;
    return `${campaign.name || ''} ${campaign.clientId || ''} ${campaign.brandId || ''} ${campaign.country || ''}`.toLowerCase().includes(queryValue);
  });

  const handleExportAll = () => {
    const localCampaigns = dataService.getCampaigns();
    exportCampaigns(localCampaigns);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-condensed text-[24px] font-extrabold tracking-tight uppercase">Client Reporting</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Generate and manage performance reports for all campaigns.</p>
        </div>
        <Button onClick={handleExportAll} className="bg-gc-orange text-white hover:bg-gc-orange/90 h-9 font-condensed font-bold tracking-wider">
          <Download className="h-4 w-4 mr-2" />
          Export All Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Active Campaigns" value={activeCampaigns.length} tone="orange" />
        <MetricCard label="Completed Campaigns" value={completedCampaigns.length} tone="green" />
        <MetricCard label="Blocked Campaigns" value={blockedCampaigns.length} tone="red" />
        <MetricCard label="Tracked Budget" value={`$${totalBudget.toLocaleString()}`} tone="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border md:col-span-2">
          <CardHeader>
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider font-condensed flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              Campaign Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="JetBrains Mono"
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="JetBrains Mono"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--foreground)', fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider font-condensed flex items-center gap-2 text-muted-foreground">
              <PieChartIcon className="h-3.5 w-3.5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-2 rounded-md bg-secondary/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase font-condensed">Total Campaigns</span>
              <span className="text-[13px] font-mono font-bold">{campaigns.length}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-md bg-secondary/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase font-condensed">Avg. Coverage Rate</span>
              <span className="text-[13px] font-mono font-bold text-emerald-500">92%</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-md bg-secondary/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase font-condensed">SLA Compliance</span>
              <span className="text-[13px] font-mono font-bold text-gc-orange">88%</span>
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Top Markets</p>
              {marketInsights.slice(0, 3).map((market) => (
                <div key={market.name} className="flex items-center justify-between rounded-md border border-border bg-background px-2.5 py-1.5">
                  <span className="text-[11px] font-bold text-foreground">{market.name}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">{market.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search campaign, client, brand, market..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground/60 font-condensed text-[10px] uppercase tracking-[1px] py-3">Campaign</TableHead>
              <TableHead className="text-muted-foreground/60 font-condensed text-[10px] uppercase tracking-[1px] py-3">Client / Brand</TableHead>
              <TableHead className="text-muted-foreground/60 font-condensed text-[10px] uppercase tracking-[1px] py-3">Coverage</TableHead>
              <TableHead className="text-muted-foreground/60 font-condensed text-[10px] uppercase tracking-[1px] py-3">Report Status</TableHead>
              <TableHead className="text-right font-condensed text-[10px] uppercase tracking-[1px] py-3">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.map((campaign) => (
              <TableRow key={campaign.id} className="border-border hover:bg-secondary/30 transition-colors group">
                <TableCell>
                  <span className="font-bold text-[12.5px] font-condensed">{campaign.name}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-[11.5px] font-medium">{campaign.clientId}</span>
                    <span className="text-[10px] text-muted-foreground font-mono tracking-tight">{campaign.brandId}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.25 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[75%]" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">75%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[9px] font-bold uppercase font-condensed border-border text-muted-foreground bg-secondary">
                    {campaign.stage === 18 ? 'Complete' : campaign.blockerStatus ? 'Blocked' : 'Ready'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground hover:bg-accent font-condensed font-bold uppercase tracking-wider">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string | number; tone: 'orange' | 'green' | 'red' | 'purple' }) {
  const tones = {
    orange: 'text-gc-orange',
    green: 'text-emerald-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
  };
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-black ${tones[tone]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
