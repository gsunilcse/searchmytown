import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import LoginHub from '@/components/LoginHub';
import { canAccessAdmin, getAppSession, getConfiguredSuperAdminEmail, getViewerFromSession, isAuthConfigured, sanitizeCallbackPath } from '@/lib/auth';
import { getTownPath } from '@/config/towns';
import { buildMetadata } from '@/lib/seo';
import { getListingsBySubmitter } from '@/lib/submissions';
import { getEnabledTownById, getEnabledTowns } from '@/lib/town-settings';
import { getSignupRequestsByEmail } from '@/lib/user-access';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = buildMetadata({
  title: 'Login / Signup',
  description: 'Publisher and townadmin signup with pre-approved Google login for SearchMyTown.',
  path: '/login',
  robots: {
    index: false,
    follow: false,
  },
});

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
    intent?: string;
    town?: string;
  }>;
};

function getAuthErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  if (error === 'AccessDenied') {
    return 'That Google account cannot access the requested workspace.';
  }

  return 'Unable to sign in right now.';
}

function getAuthenticatedRedirectPath(
  callbackUrl: string,
  viewer: ReturnType<typeof getViewerFromSession>,
  currentTownId: string | null
): string {
  if (callbackUrl !== '/login') {
    return callbackUrl;
  }

  if (canAccessAdmin(viewer)) {
    return '/admin';
  }

  if (currentTownId && viewer.publisherTownIds.includes(currentTownId)) {
    return `/${currentTownId}`;
  }

  if (viewer.publisherTownIds.length > 0) {
    return `/${viewer.publisherTownIds[0]}`;
  }

  return '/';
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const session = isAuthConfigured() ? await getAppSession() : null;
  const viewer = getViewerFromSession(session);
  const configuredSuperAdminEmail = getConfiguredSuperAdminEmail();
  const callbackUrl = sanitizeCallbackPath(params.callbackUrl, '/login');
  const intent = params.intent ?? 'publisher';
  const selectedTown = typeof params.town === 'string' ? await getEnabledTownById(params.town) : null;

  if (viewer.isAuthenticated) {
    redirect(getAuthenticatedRedirectPath(callbackUrl, viewer, selectedTown?.id ?? null));
  }

  const [towns, ownSubmissions, ownAccessRequests] = viewer.email
    ? await Promise.all([
        getEnabledTowns(),
        getListingsBySubmitter(viewer.email),
        getSignupRequestsByEmail(viewer.email),
      ])
    : [await getEnabledTowns(), [], []];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-6">
        <Link
          href={selectedTown ? getTownPath(selectedTown.id) : '/'}
          className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
        >
          ← Back to dashboard
        </Link>
      </div>
      <LoginHub
        authConfigured={isAuthConfigured()}
        viewer={viewer}
        configuredSuperAdminEmail={configuredSuperAdminEmail}
        callbackUrl={callbackUrl}
        intent={intent}
        errorMessage={getAuthErrorMessage(params.error)}
        towns={towns}
        currentTownId={selectedTown?.id ?? null}
        ownSubmissions={ownSubmissions}
        ownAccessRequests={ownAccessRequests}
      />
    </main>
  );
}