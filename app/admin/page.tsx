import Link from 'next/link';
import AdminLoginCard from '@/components/AdminLoginCard';
import AdminPanel from '@/components/AdminPanel';
import { getAdminSession, isAdminAuthConfigured } from '@/lib/admin-auth';
import { getAllListings } from '@/lib/submissions';

export const dynamic = 'force-dynamic';

type AdminPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getAuthErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  if (error === 'AccessDenied') {
    return 'That Google account is not allowed to access admin moderation.';
  }

  return 'Unable to sign in to the admin section right now.';
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const isConfigured = isAdminAuthConfigured();
  const session = isConfigured ? await getAdminSession() : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-6">
        <Link href="/" className="text-sm font-semibold text-slate-700 transition hover:text-slate-900">
          ← Back to town portal
        </Link>
      </div>

      {!isConfigured ? (
        <div className="rounded-[2rem] border border-slate-300 bg-slate-100 p-8 text-slate-950 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <h1 className="font-display text-3xl">Admin login is not configured</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7">
            Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_SECRET to enable Google-based admin login.
          </p>
        </div>
      ) : !session ? (
        <AdminLoginCard errorMessage={getAuthErrorMessage(params.error)} />
      ) : (
        <AdminPanel initialListings={await getAllListings()} adminEmail={session.user?.email ?? null} />
      )}
    </main>
  );
}