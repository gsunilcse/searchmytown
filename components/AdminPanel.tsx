'use client';

import { signOut } from 'next-auth/react';
import { useMemo, useState } from 'react';
import { MODULE_DEFINITIONS, MODULE_KEYS, type DirectoryModuleKey } from '@/config/modules';
import type { Town } from '@/config/towns';
import type { AppViewer } from '@/lib/auth';
import type { ListingRecord, SubmissionStatus } from '@/lib/submissions';
import type { SignupRequestRecord } from '@/lib/user-access';

const UTC_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type AdminPanelProps = {
  initialListings: ListingRecord[];
  initialTowns: Town[];
  initialAdminAccessRequests: SignupRequestRecord[];
  adminEmail?: string | null;
  viewer: AppViewer;
};

type ModerationAction = Exclude<SubmissionStatus, 'pending'>;
type AccessReviewAction = 'approved' | 'rejected';

function formatAdminTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = UTC_MONTH_NAMES[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds} UTC`;
}

async function updateSubmissionStatus(moduleKey: DirectoryModuleKey, id: string, status: ModerationAction, moderationNote: string) {
  const response = await fetch(`/api/admin/submissions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ moduleKey, status, moderationNote }),
  });

  const data = (await response.json()) as { error?: string; record?: ListingRecord };
  if (!response.ok || !data.record) {
    throw new Error(data.error ?? 'Unable to update submission.');
  }

  return data.record;
}

async function updateTownEnabledSetting(townId: string, enabled: boolean) {
  const response = await fetch('/api/admin/towns', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ townId, enabled }),
  });

  const data = (await response.json()) as { error?: string; towns?: Town[] };
  if (!response.ok || !data.towns) {
    throw new Error(data.error ?? 'Unable to update town availability.');
  }

  return data.towns;
}

async function updateAdminAccessRequestStatus(id: string, status: AccessReviewAction, reviewNote: string) {
  const response = await fetch(`/api/admin/access-requests/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, reviewNote }),
  });

  const data = (await response.json()) as { error?: string; record?: SignupRequestRecord };
  if (!response.ok || !data.record) {
    throw new Error(data.error ?? 'Unable to update the signup request.');
  }

  return data.record;
}

export default function AdminPanel({
  initialListings,
  initialTowns,
  initialAdminAccessRequests,
  adminEmail = null,
  viewer,
}: AdminPanelProps) {
  const isSuperAdmin = viewer.roles.includes('super-admin');
  const isTownAdmin = viewer.roles.includes('townadmin');
  const [listings, setListings] = useState(initialListings);
  const [towns, setTowns] = useState(initialTowns);
  const [adminAccessRequests, setAdminAccessRequests] = useState(initialAdminAccessRequests);
  const [statusFilter, setStatusFilter] = useState<'all' | SubmissionStatus>('pending');
  const [moduleFilter, setModuleFilter] = useState<'all' | DirectoryModuleKey>('all');
  const [townFilter, setTownFilter] = useState<'all' | string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyTownId, setBusyTownId] = useState<string | null>(null);
  const [busyAccessRequestId, setBusyAccessRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const summary = useMemo(() => {
    return listings.reduce(
      (accumulator, listing) => {
        accumulator.total += 1;
        accumulator[listing.status] += 1;
        return accumulator;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }, [listings]);

  const requestSummary = useMemo(() => {
    return adminAccessRequests.reduce(
      (accumulator, request) => {
        accumulator.total += 1;
        accumulator[request.status] += 1;
        return accumulator;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }, [adminAccessRequests]);

  const townOptions = useMemo(() => {
    return towns
      .map((town) => ({ id: town.id, name: town.name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [towns]);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      if (statusFilter !== 'all' && listing.status !== statusFilter) {
        return false;
      }

      if (moduleFilter !== 'all' && listing.moduleKey !== moduleFilter) {
        return false;
      }

      if (townFilter !== 'all' && listing.townId !== townFilter) {
        return false;
      }

      return true;
    });
  }, [listings, moduleFilter, statusFilter, townFilter]);

  async function handleModeration(id: string, status: ModerationAction) {
    setBusyId(id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const moderationNote = status === 'approved' ? 'Approved by admin.' : 'Rejected by admin.';
      const listingToUpdate = listings.find((listing) => listing.id === id);
      if (!listingToUpdate) {
        throw new Error('Submission not found in the current moderation list.');
      }

      const updatedRecord = await updateSubmissionStatus(listingToUpdate.moduleKey, id, status, moderationNote);
      setListings((currentValue) => currentValue.map((listing) => (listing.id === id ? updatedRecord : listing)));
      setSuccessMessage(
        statusFilter === 'pending'
          ? `${updatedRecord.title} was ${status}. The current filter is still set to Pending, so reviewed items drop out of this list.`
          : `${updatedRecord.title} was ${status}.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update submission.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    await signOut({ callbackUrl: '/login' });
  }

  async function handleTownToggle(townId: string, enabled: boolean) {
    setBusyTownId(townId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatedTowns = await updateTownEnabledSetting(townId, enabled);
      setTowns(updatedTowns);
      const updatedTown = updatedTowns.find((town) => town.id === townId);
      setSuccessMessage(
        updatedTown ? `${updatedTown.name} is now ${enabled ? 'enabled' : 'hidden'}.` : 'Town availability updated.'
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update town availability.');
    } finally {
      setBusyTownId(null);
    }
  }

  async function handleAdminAccessReview(id: string, status: AccessReviewAction) {
    setBusyAccessRequestId(id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const reviewNote = status === 'approved' ? 'Approved by super admin.' : 'Rejected by super admin.';
      const updatedRecord = await updateAdminAccessRequestStatus(id, status, reviewNote);
      setAdminAccessRequests((currentValue) => currentValue.map((record) => (record.id === id ? updatedRecord : record)));
      setSuccessMessage(`${updatedRecord.email} was ${status}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update the admin access request.');
    } finally {
      setBusyAccessRequestId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.1)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              {isSuperAdmin ? 'Super admin workspace' : 'Town admin workspace'}
            </p>
            <h1 className="mt-3 font-display text-4xl text-slate-950 sm:text-5xl">Review publishing requests</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              {isSuperAdmin
                ? 'Superadmin can review all towns, approve signup requests, and control town visibility.'
                : 'Your account can moderate publish requests only for the enabled towns assigned to it.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {adminEmail ? <div className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">{adminEmail}</div> : null}
            <div className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              {isSuperAdmin ? 'All towns' : `${viewer.adminTownIds.length} assigned town${viewer.adminTownIds.length === 1 ? '' : 's'}`}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Total</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{summary.total}</div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-300 bg-slate-100 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">Pending</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{summary.pending}</div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-300 bg-slate-100 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">Approved</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{summary.approved}</div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-300 bg-slate-100 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">Rejected</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{summary.rejected}</div>
          </div>
        </div>
      </section>

      {isSuperAdmin ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.1)] sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Town access</p>
              <h2 className="mt-3 font-display text-3xl text-slate-950">Control which towns are live</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              Only the super admin can expose a town on the public site. Hidden towns stay out of the landing page, sitemap, and publish flows.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {towns.map((town) => (
              <div key={town.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">{town.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{town.state}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${town.enabled ? 'bg-slate-950 text-white' : 'bg-white text-slate-700'}`}>
                    {town.enabled ? 'Enabled' : 'Hidden'}
                  </span>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    disabled={busyTownId === town.id || town.enabled}
                    onClick={() => void handleTownToggle(town.id, true)}
                    className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyTownId === town.id ? 'Updating...' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    disabled={busyTownId === town.id || !town.enabled}
                    onClick={() => void handleTownToggle(town.id, false)}
                    className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyTownId === town.id ? 'Updating...' : 'Hide'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.1)] sm:p-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Status filter</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | SubmissionStatus)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Module filter</span>
            <select
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value as 'all' | DirectoryModuleKey)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
            >
              <option value="all">All modules</option>
              {MODULE_KEYS.map((moduleKey) => (
                <option key={moduleKey} value={moduleKey}>
                  {MODULE_DEFINITIONS[moduleKey].label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Town filter</span>
            <select
              value={townFilter}
              onChange={(event) => setTownFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
            >
              <option value="all">All towns</option>
              {townOptions.map((town) => (
                <option key={town.id} value={town.id}>
                  {town.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {errorMessage ? <p className="mt-4 text-sm font-medium text-slate-700">{errorMessage}</p> : null}
        {successMessage ? <p className="mt-4 text-sm font-medium text-slate-700">{successMessage}</p> : null}

        <div className="mt-8 space-y-4">
          {filteredListings.map((listing) => {
            const moduleDefinition = MODULE_DEFINITIONS[listing.moduleKey];
            const isPending = listing.status === 'pending';

            return (
              <article key={listing.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="rounded-full bg-slate-950 px-3 py-1 font-semibold text-white">{moduleDefinition.label}</span>
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">{listing.townName}</span>
                      <span
                        className={`rounded-full px-3 py-1 font-semibold ${
                          listing.status === 'approved'
                            ? 'bg-slate-200 text-slate-800'
                            : listing.status === 'rejected'
                              ? 'bg-slate-300 text-slate-900'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {listing.status}
                      </span>
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-950">{listing.title}</h2>
                    <p className="text-sm leading-7 text-slate-600">{listing.summary}</p>
                    {listing.description ? <p className="text-sm leading-7 text-slate-500">{listing.description}</p> : null}
                    <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-3">
                      <div><strong className="text-slate-900">Contact:</strong> {listing.contactName}</div>
                      <div><strong className="text-slate-900">Phone:</strong> {listing.phone || 'Not provided'}</div>
                      <div><strong className="text-slate-900">Email:</strong> {listing.email || 'Not provided'}</div>
                      <div className="md:col-span-2 xl:col-span-1"><strong className="text-slate-900">Website:</strong> {listing.website || 'Not provided'}</div>
                      <div className="md:col-span-2 xl:col-span-2"><strong className="text-slate-900">Address:</strong> {listing.address || 'Not provided'}</div>
                      <div className="md:col-span-2 xl:col-span-3"><strong className="text-slate-900">Submitted by:</strong> {listing.submittedByName || 'Unknown'} {listing.submittedByEmail ? `(${listing.submittedByEmail})` : ''}</div>
                    </div>
                  </div>

                  <div className="flex min-w-[220px] flex-col gap-3">
                    <div className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Submitted {formatAdminTimestamp(listing.submittedAt)}
                    </div>
                    {listing.reviewedAt ? (
                      <div className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Reviewed {formatAdminTimestamp(listing.reviewedAt)}
                      </div>
                    ) : null}
                    {listing.moderationNote ? (
                      <div className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                        {listing.moderationNote}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={!isPending || busyId === listing.id}
                      onClick={() => void handleModeration(listing.id, 'approved')}
                      className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === listing.id ? 'Updating...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={!isPending || busyId === listing.id}
                      onClick={() => void handleModeration(listing.id, 'rejected')}
                      className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === listing.id ? 'Updating...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {filteredListings.length === 0 ? (
            <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
              No submissions match the current filters.
            </div>
          ) : null}
        </div>
      </section>

      {isSuperAdmin ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.1)] sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Signup review</p>
              <h2 className="mt-3 font-display text-3xl text-slate-950">Review townadmin signup requests</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              Approved townadmin requests grant moderation access to the selected enabled town. The single superadmin account is seeded manually in the database.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Total requests</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{requestSummary.total}</div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-300 bg-slate-100 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">Pending</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{requestSummary.pending}</div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-300 bg-slate-100 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">Approved</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{requestSummary.approved}</div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-300 bg-slate-100 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">Rejected</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{requestSummary.rejected}</div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {adminAccessRequests.map((request) => {
              const isPending = request.status === 'pending';

              return (
                <article key={request.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="rounded-full bg-slate-950 px-3 py-1 font-semibold text-white">{request.townName}</span>
                        <span className={`rounded-full px-3 py-1 font-semibold ${request.status === 'approved' ? 'bg-slate-200 text-slate-800' : request.status === 'rejected' ? 'bg-slate-300 text-slate-900' : 'bg-slate-100 text-slate-700'}`}>
                          {request.status}
                        </span>
                      </div>
                      <h3 className="text-2xl font-semibold text-slate-950">{request.name || 'Unnamed requester'}</h3>
                      <p className="text-sm leading-7 text-slate-600">{request.email}</p>
                      <p className="text-sm leading-7 text-slate-600">Requested role: {request.requestedRole}</p>
                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <div><strong className="text-slate-900">Requested:</strong> {formatAdminTimestamp(request.requestedAt)}</div>
                        <div><strong className="text-slate-900">Reviewed by:</strong> {request.reviewedByEmail || 'Pending review'}</div>
                      </div>
                      {request.reviewNote ? <p className="text-sm leading-7 text-slate-500">{request.reviewNote}</p> : null}
                    </div>

                    <div className="flex min-w-[220px] flex-col gap-3">
                      <button
                        type="button"
                        disabled={!isPending || busyAccessRequestId === request.id}
                        onClick={() => void handleAdminAccessReview(request.id, 'approved')}
                        className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyAccessRequestId === request.id ? 'Updating...' : 'Approve signup'}
                      </button>
                      <button
                        type="button"
                        disabled={!isPending || busyAccessRequestId === request.id}
                        onClick={() => void handleAdminAccessReview(request.id, 'rejected')}
                        className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyAccessRequestId === request.id ? 'Updating...' : 'Reject request'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {adminAccessRequests.length === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                No signup requests have been submitted yet.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}