'use client';

import Link from 'next/link';

type AdminLoginCardProps = {
  errorMessage?: string | null;
  callbackUrl?: string;
};

export default function AdminLoginCard({ errorMessage = null, callbackUrl = '/admin' }: AdminLoginCardProps) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/92 p-8 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Moderation workspace</p>
      <h1 className="mt-3 font-display text-4xl text-slate-950">Role-based protected access</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
        Verify your approved role in the Login / Signup workspace before continuing to Google sign-in for the admin or superadmin area.
      </p>

      <div className="mt-8 space-y-4">
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600">
          Only approved townadmin accounts and the single manually seeded superadmin account can continue to Google authentication.
        </div>
        {errorMessage ? <p className="text-sm font-medium text-slate-700">{errorMessage}</p> : null}
        <Link href={`/login?intent=townadmin&callbackUrl=${encodeURIComponent(callbackUrl)}`} className="inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          Open Login / Signup
        </Link>
      </div>
    </div>
  );
}