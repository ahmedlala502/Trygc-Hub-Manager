import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, Shield, Sparkles, UserPlus, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocalData } from './LocalDataContext';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  isLocked?: boolean;
}

type AuthTab = 'signin' | 'signup';

export default function Login({ onLogin, isLocked }: LoginProps) {
  const { pendingSignups, requestSignup, settings } = useLocalData();
  const [tab, setTab] = useState<AuthTab>('signin');
  const [signinForm, setSigninForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    team: settings.teams?.[0] || 'Operations Team',
    office: settings.locations?.[0] || 'Cairo HQ',
    country: 'EG',
  });
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const pendingByEmail = useMemo(() => {
    const map = new Map<string, boolean>();
    pendingSignups.forEach(request => map.set(request.email.toLowerCase(), true));
    return map;
  }, [pendingSignups]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await onLogin(signinForm.email, signinForm.password);
      if (!result.ok) {
        setError(result.error || 'Sign in failed.');
      }
    } catch {
      setError('Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await requestSignup(signupForm);
      if (!result.ok) {
        setError(result.error || 'Request access failed.');
      } else {
        setSuccess('Access request sent. Your account will stay pending until you approve it from User Management.');
        setSignupForm(current => ({ ...current, name: '', email: '', password: '' }));
        setTab('signin');
      }
    } catch {
      setError('Request access failed.');
    } finally {
      setLoading(false);
    }
  };

  const isPendingEmail = pendingByEmail.get(signinForm.email.trim().toLowerCase());

  return (
    <div className="min-h-screen w-full bg-stone px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-[40px] bg-ink px-8 py-10 text-white shadow-2xl lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.24),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.08),_transparent_28%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-citrus text-white shadow-xl shadow-citrus/20">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-citrus">TryGC Hub Manager</p>
                <h1 className="relaxed-title max-w-lg text-4xl font-black tracking-tight lg:text-5xl">
                  Secure sign-in for task control, handovers, and team continuity.
                </h1>
                <p className="max-w-xl text-sm font-medium leading-7 text-white/75">
                  Approved users get their own profile, their own performance view, and the right access for their team. New requests stay pending until you approve them.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FeatureCard
                icon={<Shield className="h-4 w-4" />}
                title="Approval Gate"
                text="Sign-up stays pending until you approve it."
              />
              <FeatureCard
                icon={<Users className="h-4 w-4" />}
                title="Team Aware"
                text="Accounts stay aligned to team, office, and country."
              />
              <FeatureCard
                icon={<Lock className="h-4 w-4" />}
                title="Master Locked"
                text="Protected controls stay reserved for your master account."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-xl rounded-[32px] border border-dawn bg-white p-6 shadow-xl shadow-ink/5 lg:p-8">
            <div className="mb-6 flex items-center gap-2 rounded-2xl bg-stone/60 p-1.5">
              <AuthTabButton active={tab === 'signin'} icon={<Mail className="h-4 w-4" />} label="Sign In" onClick={() => { setTab('signin'); setError(''); setSuccess(''); }} />
              <AuthTabButton active={tab === 'signup'} icon={<UserPlus className="h-4 w-4" />} label="Request Access" onClick={() => { setTab('signup'); setError(''); setSuccess(''); }} />
            </div>

            {isLocked && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Session locked due to inactivity. Sign in again to continue.
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-xs font-bold text-green-600">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <AnimatePresence mode="wait">
              {tab === 'signin' ? (
                <motion.form
                  key="signin"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  onSubmit={handleSignIn}
                  className="space-y-5"
                >
                  <PanelTitle title="Welcome back" text="Use your approved account to enter the workspace." />

                  <Field label="Email">
                    <input
                      type="email"
                      value={signinForm.email}
                      onChange={e => { setSigninForm({ ...signinForm, email: e.target.value }); setError(''); }}
                      placeholder="name@company.com"
                      className={inputClass}
                      autoFocus
                    />
                  </Field>

                  <Field label="Password">
                    <div className="relative">
                      <input
                        type={showSigninPassword ? 'text' : 'password'}
                        value={signinForm.password}
                        onChange={e => { setSigninForm({ ...signinForm, password: e.target.value }); setError(''); }}
                        placeholder="Enter your password"
                        className={`${inputClass} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSigninPassword(value => !value)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink"
                      >
                        {showSigninPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  {isPendingEmail && (
                    <p className="text-[11px] font-bold text-amber-600">
                      This email already has a pending approval request.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !signinForm.email.trim() || !signinForm.password.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-4 text-sm font-black uppercase tracking-[0.24em] text-white transition-all hover:bg-ink/90 disabled:opacity-40"
                  >
                    <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  onSubmit={handleSignUp}
                  className="space-y-5"
                >
                  <PanelTitle title="Request access" text="New accounts stay pending until you approve them from the master workspace." />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full Name">
                      <input
                        type="text"
                        value={signupForm.name}
                        onChange={e => setSignupForm({ ...signupForm, name: e.target.value })}
                        placeholder="Full name"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        type="email"
                        value={signupForm.email}
                        onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                        placeholder="name@company.com"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Password">
                      <div className="relative">
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          value={signupForm.password}
                          onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                          placeholder="Create password"
                          className={`${inputClass} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(value => !value)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink"
                        >
                          {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field label="Team">
                      <select
                        value={signupForm.team}
                        onChange={e => setSignupForm({ ...signupForm, team: e.target.value })}
                        className={inputClass}
                      >
                        {(settings.teams || []).map(team => <option key={team} value={team}>{team}</option>)}
                      </select>
                    </Field>
                    <Field label="Office">
                      <input
                        type="text"
                        value={signupForm.office}
                        onChange={e => setSignupForm({ ...signupForm, office: e.target.value })}
                        placeholder="Cairo HQ"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Country">
                      <input
                        type="text"
                        value={signupForm.country}
                        onChange={e => setSignupForm({ ...signupForm, country: e.target.value.toUpperCase() })}
                        placeholder="EG"
                        maxLength={4}
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !signupForm.name.trim() || !signupForm.email.trim() || !signupForm.password.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-citrus px-5 py-4 text-sm font-black uppercase tracking-[0.24em] text-ink transition-all hover:brightness-95 disabled:opacity-40"
                  >
                    <span>{loading ? 'Sending Request...' : 'Send Access Request'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthTabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all ${
        active ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PanelTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-2 pb-1">
      <h2 className="relaxed-title text-2xl font-black text-ink">{title}</h2>
      <p className="text-sm font-medium leading-6 text-muted">{text}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">{label}</span>
      {children}
    </label>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-citrus">
        {icon}
      </div>
      <h3 className="text-sm font-black text-white">{title}</h3>
      <p className="mt-1 text-xs font-medium leading-5 text-white/65">{text}</p>
    </div>
  );
}

const inputClass = 'w-full rounded-2xl border border-dawn bg-stone/40 px-4 py-3 text-sm font-bold text-ink outline-none transition-all placeholder:text-muted/45 focus:border-citrus';
