'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { useMemo, useState } from 'react';
import { MODULE_DEFINITIONS } from '@/config/modules';
import type { Town } from '@/config/towns';
import type { AppViewer, LoginRole } from '@/lib/auth';
import type { ListingRecord } from '@/lib/submissions';
import type { RequestedRole, SignupRequestRecord } from '@/lib/user-access';

type LoginHubProps = {
  authConfigured: boolean;
  viewer: AppViewer;
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

export default function LoginHub({
  authConfigured,
  viewer,
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
    requestedRole: intent === 'townadmin' || intent === 'superadmin' ? intent : 'publisher',
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

  function updateField(field: keyof SignupFormState, value: string) {
    setFormState((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  function updateLoginField(field: keyof LoginFormState, value: string) {
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

    setLoginFormState((currentValue) => ({
      ...currentValue,
      requestedRole: nextRole,
      townId: nextRole === 'publisher' || nextRole === 'townadmin' ? currentTownId ?? currentValue.townId : currentValue.townId,
    }));
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      <div className="rounded-[2rem] border border-slate-300 bg-slate-100 p-8 text-slate-950 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
        <h1 className="font-display text-3xl">Login / Signup is not configured</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7">
          Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_SECRET to enable approved publisher, townadmin, and superadmin access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.1)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Login / Signup</p>
            <h1 className="mt-3 font-display text-4xl text-slate-950 sm:text-5xl">Pre-approved role access</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Sign up with name, email, mobile number, and role. Publisher signup is approved immediately, townadmin signup is reviewed by the superadmin, and the single superadmin account is seeded manually in the database.
            </p>
          </div>
          {viewer.isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-3">
              {viewer.email ? <div className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">{viewer.email}</div> : null}
              <button
                type="button"
                onClick={() => void handleSignOut()}
                suppressHydrationWarning
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Log out
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-8 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
          {(['login', 'signup'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMode(tab)}
              suppressHydrationWarning
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${mode === tab ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-white'}`}
            >
              {tab === 'login' ? 'Login' : 'Signup'}
            </button>
          ))}
        </div>

        {errorMessage ? <p className="mt-6 text-sm font-medium text-slate-700">{errorMessage}</p> : null}

        {mode === 'login' ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <form onSubmit={handleLoginSubmit} className="rounded-[1.8rem] border border-slate-200 bg-slate-50/90 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Login verification</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Verify your role before Google login</h2>

              <div className="mt-6 grid gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Approved email</span>
                  <input required type="email" value={loginFormState.email} onChange={(event) => updateLoginField('email', event.target.value)} suppressHydrationWarning className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500" placeholder="Email approved for this role" />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Role</span>
                  <select value={loginFormState.requestedRole} onChange={(event) => handleLoginRoleChange(event.target.value)} suppressHydrationWarning className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500">
                    <option value="publisher">Publisher</option>
                    <option value="townadmin">Townadmin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </label>

                {loginFormState.requestedRole === 'publisher' || loginFormState.requestedRole === 'townadmin' ? (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Town</span>
                    <select value={loginFormState.townId} onChange={(event) => updateLoginField('townId', event.target.value)} disabled={Boolean(currentTownId)} suppressHydrationWarning className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-slate-500">
                      {currentTown ? (
                        <option value={currentTown.id}>{currentTown.name}</option>
                      ) : (
                        towns.map((town) => (
                          <option key={town.id} value={town.id}>
                            {town.name}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                ) : null}

                <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
                  Your email must already be approved for the selected role before Google sign-in starts. Superadmin login works only for the single manually seeded superadmin account.
                </div>

                {errorMessage ? <p className="text-sm font-medium text-slate-700">{errorMessage}</p> : null}
                {loginError ? <p className="text-sm font-medium text-slate-700">{loginError}</p> : null}

                <button type="submit" disabled={isSubmittingIntent !== null} suppressHydrationWarning className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70">
                  {isSubmittingIntent ? 'Checking access...' : 'Verify and continue with Google'}
                </button>
              </div>
            </form>

            <div className="space-y-6">
              <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/90 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Role rules</p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
                  <p>Publisher: only approved publisher emails can open publish menus for their assigned town.</p>
                  <p>Townadmin: only superadmin-approved townadmin emails can moderate their assigned enabled town.</p>
                  <p>Superadmin: only one manually seeded superadmin email can access full control.</p>
                </div>
              </div>

              {viewer.isAuthenticated ? (
                <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/90 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Current access</p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                    <p>Publisher: {isPublisher ? 'Approved' : 'Not approved'}</p>
                    <p>Townadmin: {isTownAdmin ? 'Approved' : 'Not approved'}</p>
                    <p>Superadmin: {isSuperAdmin ? 'Approved' : 'Not approved'}</p>
                    {hasAdminAccess ? <Link href="/admin" className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Open moderation workspace</Link> : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <form onSubmit={handleSignupSubmit} className="rounded-[1.8rem] border border-slate-200 bg-slate-50/90 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Signup form</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Create your access request</h2>

              <div className="mt-6 grid gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Name</span>
                  <input required value={formState.name} onChange={(event) => updateField('name', event.target.value)} suppressHydrationWarning className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500" placeholder="Full name" />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Email</span>
                  <input required type="email" value={formState.email} onChange={(event) => updateField('email', event.target.value)} suppressHydrationWarning className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500" placeholder="Email used for Google login" />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Mobile number</span>
                  <input required value={formState.mobile} onChange={(event) => updateField('mobile', event.target.value)} suppressHydrationWarning className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500" placeholder="Mobile number" />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Role</span>
                  <select value={formState.requestedRole} onChange={(event) => handleRoleChange(event.target.value)} suppressHydrationWarning className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500">
                    <option value="publisher">Publisher</option>
                    <option value="townadmin">Townadmin</option>
                  </select>
                </label>

                {formState.requestedRole === 'publisher' ? (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Publisher town</span>
                    <select
                      value={formState.townId}
                      onChange={(event) => updateField('townId', event.target.value)}
                      disabled={Boolean(currentTownId)}
                      suppressHydrationWarning
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-slate-500"
                    >
                      {currentTown ? (
                        <option value={currentTown.id}>{currentTown.name}</option>
                      ) : (
                        towns.map((town) => (
                          <option key={town.id} value={town.id}>
                            {town.name}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                ) : null}

                {formState.requestedRole === 'townadmin' ? (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Enabled town</span>
                    <select value={formState.townId} onChange={(event) => updateField('townId', event.target.value)} suppressHydrationWarning className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500">
                      {towns.map((town) => (
                        <option key={town.id} value={town.id} disabled={approvedTownIds.has(town.id) || pendingTownIds.has(town.id)}>
                          {town.name} {approvedTownIds.has(town.id) ? '(already approved)' : pendingTownIds.has(town.id) ? '(pending)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">Publisher signup is approved immediately. Townadmin signup stays pending until reviewed by the superadmin. Use the same approved email later when logging in with Google.</div>

                {signupError ? <p className="text-sm font-medium text-slate-700">{signupError}</p> : null}
                {signupMessage ? <p className="text-sm font-medium text-slate-700">{signupMessage}</p> : null}

                <button type="submit" disabled={isSubmittingSignup} suppressHydrationWarning className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70">
                  {isSubmittingSignup ? 'Submitting...' : 'Submit signup'}
                </button>
              </div>
            </form>

            <div className="space-y-6">
              <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/90 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Role rules</p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
                  <p>Publisher: can see publish menus and submit listings.</p>
                  <p>Townadmin: can review publish requests only for the selected enabled town after superadmin approval.</p>
                  <p>Superadmin: is a single manually seeded account that can enable towns and review townadmin requests.</p>
                </div>
              </div>

              {viewer.isAuthenticated ? (
                <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/90 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Current access</p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                    <p>Publisher: {isPublisher ? 'Approved' : 'Not approved'}</p>
                    <p>Townadmin: {isTownAdmin ? 'Approved' : 'Not approved'}</p>
                    <p>Superadmin: {isSuperAdmin ? 'Approved' : 'Only available through manual seed'}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {viewer.isAuthenticated ? (
        <>
          <section className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.1)] sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Publisher dashboard</p>
                <h2 className="mt-3 font-display text-3xl text-slate-950">Track your publish requests</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">Approved publisher accounts can publish. Their submissions are reviewed by the townadmin assigned to that town.</p>
            </div>

            <div className="mt-8 space-y-4">
              {ownSubmissions.map((submission) => (
                <article key={submission.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="rounded-full bg-slate-950 px-3 py-1 font-semibold text-white">{MODULE_DEFINITIONS[submission.moduleKey].label}</span>
                        <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">{submission.townName}</span>
                        <span className={`rounded-full px-3 py-1 font-semibold ${submission.status === 'approved' ? 'bg-slate-200 text-slate-800' : submission.status === 'rejected' ? 'bg-slate-300 text-slate-900' : 'bg-slate-100 text-slate-700'}`}>{submission.status}</span>
                      </div>
                      <h3 className="mt-4 text-2xl font-semibold text-slate-950">{submission.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{submission.summary}</p>
                      {submission.moderationNote ? <p className="mt-3 text-sm leading-7 text-slate-500">{submission.moderationNote}</p> : null}
                    </div>
                    <div className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Submitted {new Date(submission.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC</div>
                  </div>
                </article>
              ))}

              {ownSubmissions.length === 0 ? <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">No publish requests have been submitted from this account yet.</div> : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.1)] sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Signup history</p>
                <h2 className="mt-3 font-display text-3xl text-slate-950">Your signup requests</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">Townadmin signup stays pending until the superadmin reviews the request.</p>
            </div>

            <div className="mt-8 space-y-4">
              {accessRequests.map((request) => (
                <article key={request.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-full bg-slate-950 px-3 py-1 font-semibold text-white">{request.requestedRole}</span>
                    {request.townName ? <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">{request.townName}</span> : null}
                    <span className={`rounded-full px-3 py-1 font-semibold ${request.status === 'approved' ? 'bg-slate-200 text-slate-800' : request.status === 'rejected' ? 'bg-slate-300 text-slate-900' : 'bg-slate-100 text-slate-700'}`}>{request.status}</span>
                  </div>
                  {request.reviewNote ? <p className="mt-3 text-sm leading-7 text-slate-600">{request.reviewNote}</p> : null}
                </article>
              ))}

              {accessRequests.length === 0 ? <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">No signup requests have been submitted from this account yet.</div> : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}