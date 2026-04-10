'use client';

import { signOut } from 'next-auth/react';
import { useMemo, useState } from 'react';
import { MODULE_DEFINITIONS, MODULE_KEYS, type DirectoryModuleKey } from '@/config/modules';
import type { ListingRecord, SubmissionStatus } from '@/lib/submissions';

const UTC_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type AdminPanelProps = {
  initialListings: ListingRecord[];
  adminEmail?: string | null;
};

type ModerationAction = Exclude<SubmissionStatus, 'pending'>;

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

export default function AdminPanel({ initialListings, adminEmail = null }: AdminPanelProps) {
  const [listings, setListings] = useState(initialListings);
  const [statusFilter, setStatusFilter] = useState<'all' | SubmissionStatus>('pending');
  const [moduleFilter, setModuleFilter] = useState<'all' | DirectoryModuleKey>('all');
  const [townFilter, setTownFilter] = useState<'all' | string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const townOptions = useMemo(() => {
    return Array.from(new Set(listings.map((listing) => `${listing.townId}|${listing.townName}`)))
      .map((value) => {
        const [id, name] = value.split('|');
        return { id, name };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [listings]);

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

    try {
      const moderationNote = status === 'approved' ? 'Approved by admin.' : 'Rejected by admin.';
      const listingToUpdate = listings.find((listing) => listing.id === id);
      if (!listingToUpdate) {
        throw new Error('Submission not found in the current admin list.');
      }

      const updatedRecord = await updateSubmissionStatus(listingToUpdate.moduleKey, id, status, moderationNote);
      setListings((currentValue) => currentValue.map((listing) => (listing.id === id ? updatedRecord : listing)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update submission.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    await signOut({ callbackUrl: '/admin' });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.1)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Admin moderation</p>
            <h1 className="mt-3 font-display text-4xl text-slate-950 sm:text-5xl">Review publishing requests</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Every public listing must be approved here first. Pending records stay hidden from visitors until an admin approves them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {adminEmail ? <div className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">{adminEmail}</div> : null}
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
                      onClick={() => handleModeration(listing.id, 'approved')}
                      className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === listing.id ? 'Updating...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={!isPending || busyId === listing.id}
                      onClick={() => handleModeration(listing.id, 'rejected')}
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
    </div>
  );
}