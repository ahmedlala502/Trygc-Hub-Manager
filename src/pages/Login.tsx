import React from 'react';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { ShieldCheck, Command } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      // Error is already handled in AuthProvider/App.tsx but we can add local UI feedback here if needed
    }
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-card border border-border shadow-2xl">
          <Command className="h-8 w-8 text-gc-orange" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-condensed text-[32px] font-extrabold tracking-tight uppercase leading-none">TryGC OPS</h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Command Center</p>
        </div>
      </div>
      
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <h2 className="font-condensed text-[20px] font-bold uppercase tracking-tight">Authentication Required</h2>
          <p className="text-[12px] text-muted-foreground font-medium">Sign in with your corporate Google account to access the operations dashboard.</p>
        </div>
        
        <Button 
          onClick={handleLogin} 
          className="w-full bg-gc-orange text-white hover:bg-gc-orange/90 h-11 font-condensed font-bold uppercase tracking-wider text-[14px]"
        >
          Sign in with Google
        </Button>
        
        <div className="flex items-center justify-center gap-2 pt-4 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold font-condensed">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Secure Enterprise Access</span>
        </div>
      </div>
      
      <p className="mt-12 font-mono text-[10px] text-muted-foreground/40 font-bold">
        SYSTEM_ID: TRYGC_OPS_V1 // STATUS: STANDBY
      </p>
    </div>
  );
}
