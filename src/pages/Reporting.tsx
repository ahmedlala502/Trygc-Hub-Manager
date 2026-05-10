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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-condensed text-[24px] font-extrabold tracking-tight uppercase">Client Reporting</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Generate and manage performance reports for all campaigns.</p>
        </div>
        <Button className="bg-gc-orange text-white hover:bg-gc-orange/90 h-9 font-condensed font-bold tracking-wider">
          <Download className="h-4 w-4 mr-2" />
          Export All Data
        </Button>
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
          </CardContent>
        </Card>
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
            {campaigns.map((campaign) => (
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
                   {campaign.blockerStatus ? (
                     <Badge variant="outline" className="text-[9px] font-bold uppercase font-condensed border-border text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20">
                       Blocked
                     </Badge>
                   ) : campaign.stage === 18 ? (
                     <Badge variant="outline" className="text-[9px] font-bold uppercase font-condensed border-border text-gc-orange bg-gc-orange/10 dark:text-gc-orange/20 dark:bg-gc-orange/90">
                       Completed
                     </Badge>
                   ) : (
                     <Badge variant="outline" className="text-[9px] font-bold uppercase font-condensed border-border text-gc-purple bg-gc-purple/10 dark:text-gc-purple/20 dark:bg-gc-purple/90">
                       Active
                     </Badge>
                   )}
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
