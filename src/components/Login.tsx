import React, { useState, useEffect } from 'react';
import { Sparkles, Lock, LogIn, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginProps {
  onLogin: (password: string) => Promise<boolean>;
  isLocked?: boolean;
  passwordless?: boolean;
}

export default function Login({ onLogin, isLocked, passwordless = false }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'welcome' | 'login'>('welcome');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordless && !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const ok = await onLogin(passwordless ? '__passwordless__' : password.trim());
      if (!ok) {
        setError('Invalid passcode. Try again.');
        setPassword('');
      }
    } catch {
      setError('Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-stone overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 'welcome' ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center space-y-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <div className="w-20 h-20 bg-citrus rounded-[28px] flex items-center justify-center mx-auto shadow-2xl shadow-citrus/20 mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <div className="space-y-3">
              <h1 className="relaxed-title text-4xl text-ink font-black tracking-tight">TryGC Hub Manager</h1>
              <p className="text-muted font-medium text-lg max-w-md mx-auto">
                Operational command center for shift management, task tracking, and team coordination.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep('login')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-ink text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-ink/10 hover:bg-ink/90 transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>Access Control Center</span>
            </motion.button>
            <p className="text-[10px] font-bold text-muted/40 mt-4">
              Secure workspace · Local-first · No data leaves your browser
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm mx-auto space-y-8"
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-ink rounded-[18px] flex items-center justify-center mx-auto shadow-lg mb-4">
                <Shield className="w-7 h-7 text-citrus" />
              </div>
              <h2 className="relaxed-title text-2xl font-black text-ink">{passwordless ? 'Workspace Closed' : 'Authentication Required'}</h2>
              <p className="text-sm font-medium text-muted">
                {passwordless ? 'Press enter to open the workspace again.' : 'Enter your passcode to access the workspace.'}
              </p>
              {isLocked && (
                <div className="flex items-center justify-center gap-2 text-amber-600 text-xs font-bold mt-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Session locked due to inactivity
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!passwordless && (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="Enter passcode"
                      autoFocus
                      className={`w-full bg-white border-2 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none transition-all pr-12 ${
                        error ? 'border-red-300 focus:border-red-500' : 'border-dawn focus:border-citrus'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1.5 text-red-500 text-xs font-bold"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {error}
                    </motion.p>
                  )}
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || (!passwordless && !password.trim())}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-ink text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-ink/10 hover:bg-ink/90 transition-all disabled:opacity-40"
              >
                {loading ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{loading ? 'Verifying...' : passwordless ? 'Enter Workspace' : 'Unlock Workspace'}</span>
              </motion.button>

              <button
                type="button"
                onClick={() => { setStep('welcome'); setPassword(''); setError(''); }}
                className="w-full text-center text-xs font-bold text-muted hover:text-ink transition-colors"
              >
                Back
              </button>
            </form>

            {!passwordless && (
              <p className="text-[10px] font-bold text-muted/30 text-center">
                Default passcode: <span className="font-mono text-muted/50">admin123</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
