'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  ShieldCheck, 
  Mail, 
  ChevronRight, 
  Smartphone, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  LogOut, 
  ArrowLeft,
  Settings,
  Flame,
  Globe,
  LayoutDashboard,
  Check,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODULE_DEFINITIONS } from '@/config/modules';
import type { Town } from '@/config/towns';
import type { AppViewer, LoginRole } from '@/lib/auth';
import type { ListingRecord } from '@/lib/submissions';
import type { RequestedRole, SignupRequestRecord } from '@/lib/user-access';

type LoginHubProps = {
  authConfigured: boolean;
  viewer: AppViewer;
  configuredSuperAdminEmail: string | null;
  callbackUrl: string;
  intent: string;
  errorMessage?: string | null;
  towns: Town[];
  currentTownId?: string | null;
  ownSubmissions: ListingRecord[];
  ownAccessRequests: SignupRequestRecord[];
};

type WorkspaceMode = 'login' | 'signup';
type LoginIntent = LoginRole;
type LoginFormState = {
  email: string;
  requestedRole: LoginIntent;
  townId: string;
};
type SignupFormState = {
  name: string;
  email: string;
  mobile: string;
  requestedRole: RequestedRole;
  townId: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function submitSignup(payload: SignupFormState) {
  const response = await fetch('/api/access-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    error?: string;
    kind?: 'approved' | 'pending';
    request?: SignupRequestRecord;
    user?: { email: string };
  };
  if (!response.ok || !data.kind) {
    throw new Error(data.error ?? 'Unable to submit the signup form.');
  }

  return data;
}

async function verifyLoginAccess(payload: LoginFormState) {
  const response = await fetch('/api/auth/check-access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { error?: string; ok?: boolean };
  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? 'Unable to verify access for login.');
  }
}

function getSignInTarget(intent: LoginIntent, callbackUrl: string) {
  if (callbackUrl !== '/login') {
    return callbackUrl;
  }

  return intent === 'publisher' ? '/login' : '/admin';
}

function PremiumSelect({ 
  value, 
  onChange, 
  options, 
  icon: Icon, 
  label,
  disabled = false
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: { value: string; label: string; disabled?: boolean }[]; 
  icon: any; 
  label: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-3 rounded-[1.25rem] border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white text-left transition-all",
            isOpen ? "border-emerald-500 ring-2 ring-emerald-500/10" : "hover:border-white/10",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <span className={cn("flex-1 truncate", !selectedOption && "text-zinc-500")}>
            {selectedOption?.label || "Select..."}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition-transform", isOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {isOpen && !disabled && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsOpen(false)} 
              />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl backdrop-blur-xl"
              >
                <div className="max-h-60 overflow-y-auto p-2">
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition-all",
                        value === opt.value 
                          ? "bg-emerald-500 text-zinc-950 font-bold" 
                          : "text-zinc-300 hover:bg-white/5 hover:text-white",
                        opt.disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {opt.label}
                      {value === opt.value && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function LoginHub({
  authConfigured,
  viewer,
  configuredSuperAdminEmail,
  callbackUrl,
  intent,
  errorMessage = null,
  towns,
  currentTownId = null,
  ownSubmissions,
  ownAccessRequests,
}: LoginHubProps) {
  const router = useRouter();
  const [mode, setMode] = useState<WorkspaceMode>(viewer.isAuthenticated ? 'login' : 'signup');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingIntent, setIsSubmittingIntent] = useState<LoginIntent | null>(null);
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [accessRequests, setAccessRequests] = useState(ownAccessRequests);
  const [loginFormState, setLoginFormState] = useState<LoginFormState>({
    email: viewer.email ?? '',
    requestedRole: intent === 'townadmin' || intent === 'superadmin' ? (intent as LoginIntent) : 'publisher',
    townId: currentTownId ?? towns[0]?.id ?? '',
  });
  const [formState, setFormState] = useState<SignupFormState>({
    name: viewer.name ?? '',
    email: viewer.email ?? '',
    mobile: '',
    requestedRole: intent === 'townadmin' ? 'townadmin' : 'publisher',
    townId: currentTownId ?? towns[0]?.id ?? '',
  });

  const isPublisher = viewer.roles.includes('publisher');
  const isTownAdmin = viewer.roles.includes('townadmin');
  const isSuperAdmin = viewer.roles.includes('super-admin');
  const hasAdminAccess = isTownAdmin || isSuperAdmin;

  const approvedTownIds = useMemo(
    () =>
      new Set(
        accessRequests
          .filter((request) => request.requestedRole === 'townadmin' && request.status === 'approved' && request.townId)
          .map((request) => request.townId as string)
      ),
    [accessRequests]
  );

  const currentTown = useMemo(
    () => towns.find((town) => town.id === currentTownId) ?? null,
    [currentTownId, towns]
  );

  const pendingTownIds = useMemo(
    () =>
      new Set(
        accessRequests
          .filter((request) => request.requestedRole === 'townadmin' && request.status === 'pending' && request.townId)
          .map((request) => request.townId as string)
      ),
    [accessRequests]
  );

  const hasPendingTownAdminLoginRequest = useMemo(
    () =>
      loginFormState.requestedRole === 'townadmin' &&
      accessRequests.some(
        (request) =>
          request.requestedRole === 'townadmin' &&
          request.status === 'pending' &&
          normalizeEmail(request.email) === normalizeEmail(loginFormState.email) &&
          request.townId === loginFormState.townId
      ),
    [accessRequests, loginFormState.email, loginFormState.requestedRole, loginFormState.townId]
  );

  const loginDisabledReason = hasPendingTownAdminLoginRequest
    ? 'Townadmin access is still pending superadmin review for this email and town.'
    : null;
  const canShowSuperAdminOption = normalizeEmail(loginFormState.email) === (configuredSuperAdminEmail ? normalizeEmail(configuredSuperAdminEmail) : null);

  useEffect(() => {
    if (!canShowSuperAdminOption && loginFormState.requestedRole === 'superadmin') {
      setLoginFormState((currentValue) => ({
        ...currentValue,
        requestedRole: 'publisher',
      }));
    }
  }, [canShowSuperAdminOption, loginFormState.requestedRole]);

  function updateField(field: keyof SignupFormState, value: string) {
    setFormState((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  function updateLoginField(field: keyof LoginFormState, value: string) {
    setLoginError(null);
    setLoginFormState((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  function handleRoleChange(value: string) {
    const nextRole = value as RequestedRole;

    setFormState((currentValue) => ({
      ...currentValue,
      requestedRole: nextRole,
      townId: nextRole === 'publisher' || nextRole === 'townadmin'
        ? currentTownId ?? currentValue.townId
        : currentValue.townId,
    }));
  }

  function handleLoginRoleChange(value: string) {
    const nextRole = value as LoginIntent;
    setLoginError(null);

    setLoginFormState((currentValue) => ({
      ...currentValue,
      requestedRole: nextRole,
      townId: nextRole === 'publisher' || nextRole === 'townadmin' ? currentTownId ?? currentValue.townId : currentValue.townId,
    }));
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasPendingTownAdminLoginRequest) {
      setLoginError(loginDisabledReason);
      return;
    }

    setIsSubmittingIntent(loginFormState.requestedRole);
    setLoginError(null);

    try {
      await verifyLoginAccess(loginFormState);
      await signIn(
        'google',
        {
          callbackUrl: getSignInTarget(loginFormState.requestedRole, callbackUrl),
        },
        {
          login_hint: loginFormState.email,
        }
      );
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to continue to Google login.');
      setIsSubmittingIntent(null);
    }
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: '/login' });
  }

  async function handleSignupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingSignup(true);
    setSignupMessage(null);
    setSignupError(null);

    try {
      const result = await submitSignup(formState);

      if (result.kind === 'approved') {
        setSignupMessage('Publisher signup is approved. Log in with the same Google email to access publish options.');
        if (viewer.email && result.user?.email && viewer.email.toLowerCase() === result.user.email.toLowerCase()) {
          router.refresh();
        }
      }

      if (result.kind === 'pending' && result.request) {
        setAccessRequests((currentValue) => [result.request!, ...currentValue]);
        setSignupMessage(`Townadmin signup for ${result.request.townName} is pending superadmin review.`);
      }
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : 'Unable to submit the signup form.');
    } finally {
      setIsSubmittingSignup(false);
    }
  }

  if (!authConfigured) {
    return (
      <div className="premium-card bg-red-500/5 border-red-500/20 p-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-6 font-display text-4xl text-white">Security Not Configured</h1>
        <p className="mt-4 max-w-2xl mx-auto text-zinc-400 leading-relaxed">
          The authentication system is currently offline. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_SECRET to enable access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="premium-card relative overflow-hidden p-8 sm:p-12">
        <div className="absolute top-0 right-0 h-96 w-96 bg-emerald-500/5 blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              Secure Gateway
            </div>
            <h1 className="mt-6 font-display text-5xl text-white">Access Portal</h1>
            <p className="mt-6 max-w-2xl text-lg text-zinc-400 leading-relaxed">
              Verify your pre-approved role or request new credentials to start participating in the {currentTown?.name ?? 'SearchMyTown'} ecosystem.
            </p>
          </div>
          {viewer.isAuthenticated && (
            <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                  <User className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="text-sm">
                  <div className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Active Session</div>
                  <div className="font-medium text-white truncate max-w-[150px]">{viewer.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-xl bg-white/5 hover:bg-red-500/10 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:text-red-400 transition-all border border-white/5"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        <div className="mt-12 flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5 w-fit">
          {(['login', 'signup'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setMode(tab);
                setSignupMessage(null);
                setSignupError(null);
                setLoginError(null);
              }}
              className={cn(
                "px-8 py-3 rounded-full text-sm font-bold transition-all duration-300",
                mode === tab 
                  ? "bg-white text-zinc-950 shadow-lg" 
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {tab === 'login' ? 'Login' : 'Signup'}
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="mt-8 p-4 rounded-2xl bg-red-400/10 border border-red-400/20 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {errorMessage}
          </div>
        )}

        <AnimatePresence mode="wait">
          {mode === 'login' ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="mt-12 grid gap-12 lg:grid-cols-2"
            >
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div className="space-y-6 bg-white/5 p-8 rounded-[2rem] border border-white/5">
                  <div className="flex items-center gap-3 text-emerald-500">
                    <Lock className="h-5 w-5" />
                    <h2 className="text-xl font-bold">Identity Verification</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                        <input 
                          required 
                          type="email" 
                          value={loginFormState.email} 
                          onChange={(e) => updateLoginField('email', e.target.value)} 
                          className="w-full rounded-[1.25rem] border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all" 
                          placeholder="Your verified Google email" 
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <PremiumSelect
                        label="Intended Role"
                        icon={ShieldCheck}
                        value={loginFormState.requestedRole}
                        onChange={(val) => handleLoginRoleChange(val)}
                        options={[
                          { value: 'publisher', label: 'Publisher' },
                          { value: 'townadmin', label: 'Townadmin' },
                          ...(canShowSuperAdminOption ? [{ value: 'superadmin', label: 'Superadmin' }] : [])
                        ]}
                      />

                      {(loginFormState.requestedRole === 'publisher' || loginFormState.requestedRole === 'townadmin') && (
                        <PremiumSelect
                          label="Town Scope"
                          icon={Building2}
                          value={loginFormState.townId}
                          onChange={(val) => updateLoginField('townId', val)}
                          disabled={Boolean(currentTownId)}
                          options={currentTown ? [
                            { value: currentTown.id, label: currentTown.name }
                          ] : towns.map(t => ({ value: t.id, label: t.name }))}
                        />
                      )}
                    </div>
                  </div>

                  {(loginError || loginDisabledReason) && (
                    <div className="p-4 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs leading-relaxed">
                      {loginError || loginDisabledReason}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmittingIntent !== null || !!loginDisabledReason} 
                    className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-sm font-bold text-zinc-950 transition-all hover:bg-zinc-200 disabled:opacity-50 mt-4 group"
                  >
                    {isSubmittingIntent ? (
                      <span className="flex items-center gap-2">Checking Credentials...</span>
                    ) : (
                      <>Verify & Continue <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                    )}
                  </button>
                </div>
              </form>

              <div className="space-y-8">
                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5">
                  <h3 className="text-zinc-500 uppercase text-xs font-bold tracking-widest flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Role Compliance
                  </h3>
                  <div className="mt-6 space-y-6">
                    <div className="flex gap-4">
                      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Publisher</div>
                        <div className="mt-1 text-xs text-zinc-500 leading-relaxed">Immediate access for approved emails to submit local content.</div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Townadmin</div>
                        <div className="mt-1 text-xs text-zinc-500 leading-relaxed">Assigned per town. Requires superadmin verification for moderation.</div>
                      </div>
                    </div>
                  </div>
                </div>

                {viewer.isAuthenticated && (
                  <div className="bg-emerald-500/5 p-8 rounded-[2rem] border border-emerald-500/10">
                    <h3 className="text-emerald-500 text-xs font-bold uppercase tracking-widest">Your Privileges</h3>
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      {[
                        { label: 'Pub', active: isPublisher },
                        { label: 'Admin', active: isTownAdmin },
                        { label: 'Super', active: isSuperAdmin }
                      ].map(item => (
                        <div key={item.label} className={cn("text-center p-3 rounded-xl border transition-all", item.active ? "bg-emerald-500/20 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/5 text-zinc-500")}>
                          <div className="text-[10px] font-bold uppercase">{item.label}</div>
                          <div className="mt-1 text-[10px]">{item.active ? 'Yes' : 'No'}</div>
                        </div>
                      ))}
                    </div>
                    {hasAdminAccess && (
                      <Link href="/admin" className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-zinc-950 hover:bg-emerald-400">
                        <LayoutDashboard className="h-4 w-4" /> Go to Console
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mt-12 grid gap-12 lg:grid-cols-[1.2fr_0.8fr]"
            >
              <form onSubmit={handleSignupSubmit} className="bg-white/5 p-8 rounded-[2rem] border border-white/5 space-y-8">
                <div className="flex items-center gap-3 text-emerald-500">
                  <Flame className="h-5 w-5" />
                  <h2 className="text-xl font-bold">Request Access</h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                      <input required value={formState.name} onChange={(e) => updateField('name', e.target.value)} className="w-full rounded-[1.25rem] border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none" placeholder="John Doe" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                      <input required type="email" value={formState.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded-[1.25rem] border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none" placeholder="google-account@gmail.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Mobile Contact</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                      <input required value={formState.mobile} onChange={(e) => updateField('mobile', e.target.value)} className="w-full rounded-[1.25rem] border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none" placeholder="+1 234 567 890" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <PremiumSelect
                    label="Requested Role"
                    icon={ShieldCheck}
                    value={formState.requestedRole}
                    onChange={handleRoleChange}
                    options={[
                      { value: 'publisher', label: 'Publisher' },
                      { value: 'townadmin', label: 'Townadmin' }
                    ]}
                  />

                  <PremiumSelect
                    label="Target Location"
                    icon={Globe}
                    value={formState.townId}
                    onChange={(val) => updateField('townId', val)}
                    disabled={Boolean(currentTownId)}
                    options={currentTown ? [
                      { value: currentTown.id, label: currentTown.name }
                    ] : towns.map(town => {
                      const isApproved = approvedTownIds.has(town.id);
                      const isPending = pendingTownIds.has(town.id);
                      return {
                        value: town.id,
                        label: `${town.name}${formState.requestedRole === 'townadmin' ? (isApproved ? ' (Admin Assigned)' : isPending ? ' (Pending)' : '') : ''}`,
                        disabled: formState.requestedRole === 'townadmin' && (isApproved || isPending)
                      };
                    })}
                  />
                </div>

                {(signupError || signupMessage) && (
                  <div className={cn("p-4 rounded-xl border text-sm", signupError ? "bg-red-400/10 border-red-400/20 text-red-400" : "bg-emerald-400/10 border-emerald-400/20 text-emerald-400")}>
                    {signupError || signupMessage}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmittingSignup || !!signupMessage} 
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 py-4 text-sm font-bold text-zinc-950 transition-all hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isSubmittingSignup ? 'Processing Request...' : signupMessage ? 'Submitted' : 'Submit Credentials'}
                </button>
              </form>

              <div className="space-y-8">
                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5">
                  <h3 className="text-emerald-500 text-xs font-bold uppercase tracking-widest">Wait times</h3>
                  <div className="mt-8 space-y-8">
                    <div className="relative pl-8 border-l border-white/10">
                      <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-emerald-500" />
                      <div className="text-white text-sm font-bold">Automatic Approval</div>
                      <div className="mt-1 text-xs text-zinc-500">Publishers are whitelisted instantly.</div>
                    </div>
                    <div className="relative pl-8 border-l border-white/10">
                      <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-amber-500" />
                      <div className="text-white text-sm font-bold">Manual Review</div>
                      <div className="mt-1 text-xs text-zinc-500">Townadmin requests take 2-3 business days.</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {viewer.isAuthenticated && (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Submissions Section */}
          <section className="premium-card p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-white">Your Submissions</h2>
                <div className="mt-2 text-xs font-bold uppercase tracking-widest text-emerald-500">{ownSubmissions.length} Items Found</div>
              </div>
              <LayoutDashboard className="h-6 w-6 text-zinc-700" />
            </div>

            <div className="mt-8 space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {ownSubmissions.map((submission) => (
                <motion.article 
                  key={submission.id} 
                  whileHover={{ y: -4 }}
                  className="bg-white/5 p-6 rounded-2xl border border-white/5 group transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded-md bg-white/10 text-[10px] font-bold text-zinc-300 uppercase tracking-tighter">
                        {MODULE_DEFINITIONS[submission.moduleKey].label}
                      </span>
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter",
                        submission.status === 'approved' ? "bg-emerald-500/10 text-emerald-400" : 
                        submission.status === 'rejected' ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                      )}>
                        {submission.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-600 font-bold">
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <h3 className="mt-4 font-bold text-zinc-100 group-hover:text-white">{submission.title}</h3>
                  <p className="mt-2 text-xs text-zinc-500 line-clamp-2 leading-relaxed">{submission.summary}</p>
                  {submission.moderationNote && (
                    <div className="mt-4 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 text-[11px] text-orange-300/80 italic">
                      " {submission.moderationNote} "
                    </div>
                  )}
                </motion.article>
              ))}

              {ownSubmissions.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                  <p className="text-sm text-zinc-600">No submission records found.</p>
                </div>
              )}
            </div>
          </section>

          {/* Requests History */}
          <section className="premium-card p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-white">Access History</h2>
                <div className="mt-2 text-xs font-bold uppercase tracking-widest text-blue-500">{accessRequests.length} Requests</div>
              </div>
              <HistoryIcon className="h-6 w-6 text-zinc-700" />
            </div>

            <div className="mt-8 space-y-4">
              {accessRequests.map((request) => (
                <motion.article 
                  key={request.id} 
                  className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase">{request.requestedRole}</span>
                      <ChevronRight className="h-3 w-3 text-zinc-700" />
                      <span className="text-xs text-zinc-400">{request.townName || 'Global'}</span>
                    </div>
                    {request.reviewNote && <p className="mt-2 text-xs text-zinc-500 italic">"{request.reviewNote}"</p>}
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                    request.status === 'approved' ? "bg-emerald-500/20 text-emerald-400" : 
                    request.status === 'rejected' ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-500"
                  )}>
                    {request.status}
                  </div>
                </motion.article>
              ))}

              {accessRequests.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                  <p className="text-sm text-zinc-600">No requests in history.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function HistoryIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="m12 7 0 5 3 3" />
    </svg>
  );
}