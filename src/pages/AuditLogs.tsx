import React, { useEffect, useState } from 'react';
import { collectionGroup, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  History, 
  User, 
  Clock, 
  Search,
  ArrowRight
} from 'lucide-react';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(
      collectionGroup(db, 'audit'), 
      orderBy('changedAt', 'desc'),
      limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        path: doc.ref.path,
        ...doc.data() 
      })));
    });
    return unsubscribe;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-condensed text-[24px] font-extrabold tracking-tight uppercase">Audit Logs</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">Full history of critical data changes across the Command Center.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input 
            placeholder="Search logs..." 
            className="pl-10 bg-card border-border h-9 text-[12.5px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground/60 font-condensed text-[10px] uppercase tracking-[1px] py-3">Timestamp</TableHead>
              <TableHead className="text-muted-foreground/60 font-condensed text-[10px] uppercase tracking-[1px] py-3">User</TableHead>
              <TableHead className="text-muted-foreground/60 font-condensed text-[10px] uppercase tracking-[1px] py-3">Resource</TableHead>
              <TableHead className="text-muted-foreground/60 font-condensed text-[10px] uppercase tracking-[1px] py-3">Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground/40 font-mono text-[11px]">
                  NO AUDIT LOGS RECORDED
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="border-border hover:bg-secondary/30 transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(log.changedAt).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="text-[12px] font-bold font-condensed uppercase tracking-tight">{log.changedBy || 'System'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight">
                      {log.path.split('/')[0]} / {log.path.split('/')[1]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-[11.5px]">
                      <span className="text-muted-foreground font-mono">{log.field}:</span>
                      <span className="text-rose-500/70 line-through font-medium">{log.oldValue}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                      <span className="text-emerald-500 font-bold">{log.newValue}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
