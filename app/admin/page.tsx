import type { Metadata } from 'next';
import Link from 'next/link';
import AdminLoginCard from '@/components/AdminLoginCard';
import AdminPanel from '@/components/AdminPanel';
import { canAccessAdmin, canReviewAdminRequests, getAppSession, getViewerFromSession, isAuthConfigured } from '@/lib/auth';
import { buildMetadata } from '@/lib/seo';
import { getAllListings } from '@/lib/submissions';
import { getManagedTowns } from '@/lib/town-settings';
import { getAllSignupRequests } from '@/lib/user-access';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = buildMetadata({
  title: 'Moderation workspace',
  description: 'SearchMyTown admin and super-admin moderation workspace.',
  path: '/admin',
  robots: {
    index: false,
    follow: false,
  },
});

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
    return 'That Google account cannot access the requested moderation area.';
  }

  return 'Unable to sign in right now.';
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const isConfigured = isAuthConfigured();
  const session = isConfigured ? await getAppSession() : null;
  const viewer = getViewerFromSession(session);

  const [allListings, managedTowns, adminAccessRequests] = canAccessAdmin(viewer)
    ? await Promise.all([
        getAllListings(),
        getManagedTowns(),
        canReviewAdminRequests(viewer)
          ? getAllSignupRequests().then((requests) => requests.filter((request) => request.requestedRole === 'townadmin'))
          : Promise.resolve([]),
      ])
    : [[], [], []];

  const scopedListings = canReviewAdminRequests(viewer)
    ? allListings
    : allListings.filter((listing) => viewer.adminTownIds.includes(listing.townId));
  const scopedTowns = canReviewAdminRequests(viewer)
    ? managedTowns
    : managedTowns.filter((town) => viewer.adminTownIds.includes(town.id));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-6">
        <Link href="/" className="text-sm font-semibold text-slate-700 transition hover:text-slate-900">
          ← Back to town portal
        </Link>
      </div>

      {!isConfigured ? (
        <div className="rounded-[2rem] border border-slate-300 bg-slate-100 p-8 text-slate-950 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <h1 className="font-display text-3xl">Login is not configured</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7">
            Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_SECRET to enable Google-based admin login.
          </p>
        </div>
      ) : !viewer.isAuthenticated ? (
        <AdminLoginCard errorMessage={getAuthErrorMessage(params.error)} callbackUrl="/admin" />
      ) : !canAccessAdmin(viewer) ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white/92 p-8 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Access required</p>
          <h1 className="mt-3 font-display text-4xl text-slate-950">This account does not have admin access yet</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Use the Login / Signup workspace to request townadmin access for an enabled town. Superadmin approval is required before this moderation area opens.
          </p>
          <div className="mt-8">
            <Link href="/login" className="inline-flex rounded-full border border-slate-950 bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Open Login / Signup
            </Link>
          </div>
        </div>
      ) : (
        <AdminPanel
          initialListings={scopedListings}
          initialTowns={scopedTowns}
          initialAdminAccessRequests={adminAccessRequests}
          adminEmail={session?.user?.email ?? null}
          viewer={viewer}
        />
      )}
    </main>
  );
}