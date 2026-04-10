'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

type AdminLoginCardProps = {
  errorMessage?: string | null;
};

export default function AdminLoginCard({ errorMessage = null }: AdminLoginCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setIsSubmitting(true);
    await signIn('google', { callbackUrl: '/admin' });
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/92 p-8 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Admin section</p>
      <h1 className="mt-3 font-display text-4xl text-slate-950">Protected moderation access</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
        Sign in with Google to review pending publishing requests and approve what should become public.
      </p>

      <div className="mt-8 space-y-4">
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600">
          Only authorized Google accounts can access the admin moderation area.
        </div>
        {errorMessage ? <p className="text-sm font-medium text-slate-700">{errorMessage}</p> : null}
        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={isSubmitting}
          className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
        >
          {isSubmitting ? 'Redirecting to Google...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}