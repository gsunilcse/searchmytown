'use client';

import { signOut } from 'next-auth/react';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  LogOut, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Building2, 
  TrendingUp,
  LayoutDashboard,
  Eye,
  EyeOff,
  UserCheck,
  Globe,
  Newspaper,
  ImageOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODULE_DEFINITIONS, MODULE_KEYS, type DirectoryModuleKey } from '@/config/modules';
import type { Town } from '@/config/towns';
import type { AppViewer } from '@/lib/auth';
import type { ListingRecord, SubmissionStatus } from '@/lib/submissions';
import type { SignupRequestRecord } from '@/lib/user-access';
import type { ArticleRecord } from '@/lib/articles';
import ArticleSubmitForm from '@/components/ArticleSubmitForm';

const UTC_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ArticleSubmitFormSection({ townIds, towns }: { townIds: string[]; towns: Town[] }) {
  const [selectedTownId, setSelectedTownId] = useState(townIds[0] ?? '');
  const townName = towns.find(t => t.id === selectedTownId)?.name ?? selectedTownId;
  return (
    <div className="space-y-4">
      {townIds.length > 1 && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Select Town</label>
          <select
            value={selectedTownId}
            onChange={e => setSelectedTownId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          >
            {townIds.map(id => (
              <option key={id} value={id}>{towns.find(t => t.id === id)?.name ?? id}</option>
            ))}
          </select>
        </div>
      )}
      {selectedTownId && <ArticleSubmitForm townId={selectedTownId} townName={townName} />}
    </div>
  );
}

type AdminPanelProps = {
  initialListings: ListingRecord[];
  initialTowns: Town[];
  initialAdminAccessRequests: SignupRequestRecord[];
  initialArticles: ArticleRecord[];
  adminEmail?: string | null;
  viewer: AppViewer;
};

type ModerationAction = Exclude<SubmissionStatus, 'pending'>;
type AccessReviewAction = 'approved' | 'rejected';

function formatAdminTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = UTC_MONTH_NAMES[date.getUTCMonth()];
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month}, ${hours}:${minutes} UTC`;
}

function getHelperExpiryState(listing: ListingRecord) {
  if (listing.moduleKey !== 'helpers' || listing.status !== 'approved') {
    return { expired: false, expiresAt: listing.validUntil };
  }

  if (!listing.validUntil) {
    return { expired: true, expiresAt: null };
  }

  return {
    expired: new Date(listing.validUntil).getTime() <= Date.now(),
    expiresAt: listing.validUntil,
  };
}

async function updateSubmissionStatus(moduleKey: DirectoryModuleKey, id: string, status: ModerationAction, moderationNote: string) {
  const response = await fetch(`/api/admin/submissions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moduleKey, status, moderationNote }),
  });
  const data = (await response.json()) as { error?: string; record?: ListingRecord };
  if (!response.ok || !data.record) throw new Error(data.error ?? 'Unable to update submission.');
  return data.record;
}

async function renewHelperSubmission(id: string, renewalDays: number) {
  const response = await fetch(`/api/admin/submissions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moduleKey: 'helpers', action: 'renew', renewalDays }),
  });
  const data = (await response.json()) as { error?: string; record?: ListingRecord };
  if (!response.ok || !data.record) throw new Error(data.error ?? 'Unable to renew helper listing.');
  return data.record;
}

async function updateTownEnabledSetting(townId: string, enabled: boolean) {
  const response = await fetch('/api/admin/towns', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ townId, enabled }),
  });
  const data = (await response.json()) as { error?: string; towns?: Town[] };
  if (!response.ok || !data.towns) throw new Error(data.error ?? 'Unable to update town availability.');
  return data.towns;
}

async function updateAdminAccessRequestStatus(id: string, status: AccessReviewAction, reviewNote: string) {
  const response = await fetch(`/api/admin/access-requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reviewNote }),
  });
  const data = (await response.json()) as { error?: string; record?: SignupRequestRecord };
  if (!response.ok || !data.record) throw new Error(data.error ?? 'Unable to update the signup request.');
  return data.record;
}

async function updateArticleReviewStatus(id: string, status: 'approved' | 'rejected', moderationNote: string) {
  const response = await fetch(`/api/admin/articles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, moderationNote }),
  });
  const data = (await response.json()) as { error?: string; record?: ArticleRecord };
  if (!response.ok || !data.record) throw new Error(data.error ?? 'Unable to update article.');
  return data.record;
}

export default function AdminPanel({
  initialListings,
  initialTowns,
  initialAdminAccessRequests,
  initialArticles,
  adminEmail = null,
  viewer,
}: AdminPanelProps) {
  const isSuperAdmin = viewer.roles.includes('super-admin');
  const [listings, setListings] = useState(initialListings);
  const [towns, setTowns] = useState(initialTowns);
  const [adminAccessRequests, setAdminAccessRequests] = useState(initialAdminAccessRequests);
  const [articles, setArticles] = useState(initialArticles);
  const [busyArticleId, setBusyArticleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | SubmissionStatus | 'expired-helpers'>('pending');
  const [moduleFilter, setModuleFilter] = useState<'all' | DirectoryModuleKey>('all');
  const [townFilter, setTownFilter] = useState<'all' | string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyTownId, setBusyTownId] = useState<string | null>(null);
  const [busyAccessRequestId, setBusyAccessRequestId] = useState<string | null>(null);
  const [busyRenewId, setBusyRenewId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const summary = useMemo(() => {
    return listings.reduce((acc, l) => {
      acc.total += 1;
      acc[l.status] += 1;
      return acc;
    }, { total: 0, pending: 0, approved: 0, rejected: 0 });
  }, [listings]);

  const townOptions = useMemo(() => {
    return towns.map(t => ({ id: t.id, name: t.name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [towns]);

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      if (statusFilter === 'expired-helpers') {
        return l.moduleKey === 'helpers' && l.status === 'approved' && getHelperExpiryState(l).expired;
      }

      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (moduleFilter !== 'all' && l.moduleKey !== moduleFilter) return false;
      if (townFilter !== 'all' && l.townId !== townFilter) return false;
      return true;
    });
  }, [listings, moduleFilter, statusFilter, townFilter]);

  async function handleModeration(id: string, status: ModerationStatus) {
    setBusyId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const note = status === 'approved' ? 'Legacy approval.' : 'Rejected by moderator.';
      const l = listings.find(x => x.id === id);
      if (!l) return;
      const updated = await updateSubmissionStatus(l.moduleKey, id, status as ModerationAction, note);
      setListings(curr => curr.map(item => item.id === id ? updated : item));
      setSuccessMessage(`${updated.title} marked as ${status}.`);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Moderation failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleTownToggle(townId: string, enabled: boolean) {
    setBusyTownId(townId);
    setErrorMessage(null);
    try {
      const updated = await updateTownEnabledSetting(townId, enabled);
      setTowns(updated);
      setSuccessMessage('Town visibility updated.');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setBusyTownId(null);
    }
  }

  async function handleAdminAccess(id: string, status: AccessReviewAction) {
    setBusyAccessRequestId(id);
    try {
      const updated = await updateAdminAccessRequestStatus(id, status, `Reviewed by ${viewer.email}`);
      setAdminAccessRequests(curr => curr.map(item => item.id === id ? updated : item));
      setSuccessMessage(`${updated.email} request reviewed.`);
    } catch (e) {
      setErrorMessage('Access review failed.');
    } finally {
      setBusyAccessRequestId(null);
    }
  }

  async function handleArticleReview(id: string, status: 'approved' | 'rejected') {
    setBusyArticleId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await updateArticleReviewStatus(id, status, `Reviewed by ${viewer.email}`);
      setArticles(curr => curr.map(item => item.id === id ? updated : item));
      setSuccessMessage(`Article "${updated.title}" ${status}.`);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Article review failed.');
    } finally {
      setBusyArticleId(null);
    }
  }

  async function handleHelperRenew(id: string, renewalDays: number) {
    setBusyRenewId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await renewHelperSubmission(id, renewalDays);
      setListings(curr => curr.map(item => item.id === id ? updated : item));
      setSuccessMessage(`${updated.contactName || updated.title} renewed for ${renewalDays} days.`);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Renewal failed.');
    } finally {
      setBusyRenewId(null);
    }
  }

  return (
    <div className="space-y-12">
      {/* Header Info */}
      <section className="premium-card p-8 sm:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-64 w-64 bg-emerald-500/5 blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              {isSuperAdmin ? 'System Authority' : 'Regional Administration'}
            </div>
            <h1 className="mt-4 font-display text-5xl text-white">Console</h1>
            <p className="mt-4 text-zinc-400">Moderating {summary.pending} pending requests across {viewer.adminTownIds.length || 'global'} zones.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                  <User className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-sm">
                  <div className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Admin ID</div>
                  <div className="font-medium text-white">{adminEmail}</div>
                </div>
              </div>
            </div>
            <button onClick={() => void signOut({ callbackUrl: '/login' })} className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/20 transition-all text-red-400">
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Incoming', value: summary.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Published', value: summary.approved, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Archived', value: summary.rejected, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: 'Overall', value: summary.total, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-xl", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <span className="text-3xl font-bold text-white transition-all">{stat.value}</span>
              </div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Visibility Controls */}
      {isSuperAdmin && (
        <section className="premium-card p-8">
          <div className="flex items-center gap-3 text-emerald-500">
            <Globe className="h-5 w-5" />
            <h2 className="text-xl font-bold">Network Visibility</h2>
          </div>
          <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {towns.map(t => (
              <div key={t.id} className="bg-white/5 border border-white/5 rounded-2xl p-5 group transition-all hover:bg-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white">{t.name}</h3>
                    <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest mt-1">{t.state}</div>
                  </div>
                  {t.enabled ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-zinc-600" />}
                </div>
                <div className="mt-6 flex gap-2">
                  <button 
                    onClick={() => handleTownToggle(t.id, !t.enabled)}
                    disabled={busyTownId === t.id}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all",
                      t.enabled ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    )}
                  >
                    {busyTownId === t.id ? '...' : t.enabled ? 'Suspend Sync' : 'Go Live'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Listing Moderation */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-6 w-6 text-emerald-500" />
            <h2 className="text-2xl font-display text-white">Moderation Queue</h2>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {[
              { val: 'pending', lab: 'Pending', icon: Clock },
              { val: 'approved', lab: 'Approved', icon: CheckCircle2 },
              { val: 'rejected', lab: 'Rejected', icon: XCircle },
              { val: 'expired-helpers', lab: 'Expired Helpers', icon: AlertCircle },
              { val: 'all', lab: 'History', icon: Filter }
            ].map(f => (
              <button 
                key={f.val}
                onClick={() => setStatusFilter(f.val as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                  statusFilter === f.val ? "bg-white text-zinc-950 border-white" : "bg-white/5 text-zinc-500 border-white/5 hover:text-white"
                )}
              >
                <f.icon className="h-3 w-3" />
                {f.lab}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && <div className="p-4 rounded-xl bg-red-500/10 text-red-400 text-xs border border-red-500/20 mx-2">{errorMessage}</div>}
        {successMessage && <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20 mx-2">{successMessage}</div>}

        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredListings.map((l) => (
              <motion.article 
                layout
                key={l.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="premium-card p-6 sm:p-8"
              >
                <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-tighter">
                      <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md">{MODULE_DEFINITIONS[l.moduleKey].label}</span>
                      <span className="bg-white/10 text-zinc-400 px-2 py-1 rounded-md">{l.townName}</span>
                      <span className={cn(
                        "px-2 py-1 rounded-md",
                        l.status === 'approved' ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-500"
                      )}>{l.status}</span>
                      {l.moduleKey === 'helpers' && l.status === 'approved' && (
                        <span className={cn(
                          "px-2 py-1 rounded-md",
                          getHelperExpiryState(l).expired ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-300"
                        )}>
                          {getHelperExpiryState(l).expired ? 'expired' : 'active'}
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-bold text-white">{l.title}</h3>
                      <p className="mt-2 text-zinc-500 text-sm leading-relaxed">{l.summary}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 text-xs border-t border-white/5 pt-6">
                      <div className="space-y-2">
                        <div className="text-zinc-500 uppercase font-bold tracking-widest">Submitter</div>
                        <div className="text-zinc-500 font-medium">{l.submittedByName} <span className="text-zinc-600">({l.submittedByEmail})</span></div>
                        {l.moduleKey === 'helpers' && (
                          <div className="text-zinc-300 font-medium">Village/Locality: {l.helperLocality || l.address || l.townName}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="text-zinc-500 uppercase font-bold tracking-widest">Metadata</div>
                        <div className="text-zinc-300 font-medium">Ref: {l.id.slice(-8)} • {formatAdminTimestamp(l.submittedAt)}</div>
                        {l.moduleKey === 'helpers' && l.status === 'approved' && (
                          <div className="text-zinc-300 font-medium">
                            Valid till: {l.validUntil ? formatAdminTimestamp(l.validUntil) : 'Not set'}
                          </div>
                        )}
                        {l.moduleKey === 'helpers' && (
                          <div className="text-zinc-300 font-medium">Phone clicks from site: {l.phoneClickCount}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-fit flex flex-col gap-3 min-w-[200px]">
                    {l.status === 'pending' ? (
                      <>
                        <button 
                          onClick={() => handleModeration(l.id, 'approved')}
                          disabled={busyId === l.id}
                          className="w-full py-4 rounded-2xl bg-emerald-500 text-zinc-950 font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                        >
                          Confirm & Live
                        </button>
                        <button 
                          onClick={() => handleModeration(l.id, 'rejected')}
                          disabled={busyId === l.id}
                          className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-red-500/10 transition-all"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                          <div className="text-[10px] font-bold uppercase text-zinc-500">Moderated On</div>
                          <div className="mt-1 text-xs text-zinc-300">{formatAdminTimestamp(l.reviewedAt ?? l.submittedAt)}</div>
                        </div>
                        {l.moduleKey === 'helpers' && l.status === 'approved' && (
                          <>
                            <button
                              onClick={() => void handleHelperRenew(l.id, 30)}
                              disabled={busyRenewId === l.id}
                              className="w-full py-3 rounded-2xl bg-blue-500/15 border border-blue-400/20 text-blue-200 font-bold text-xs hover:bg-blue-500/25 transition-all"
                            >
                              Renew 30 Days
                            </button>
                            <button
                              onClick={() => void handleHelperRenew(l.id, 60)}
                              disabled={busyRenewId === l.id}
                              className="w-full py-3 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 text-indigo-200 font-bold text-xs hover:bg-indigo-500/25 transition-all"
                            >
                              Renew 60 Days
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>

          {filteredListings.length === 0 && (
            <div className="py-24 text-center glass-panel rounded-[3rem] border-dashed">
              <Search className="mx-auto h-12 w-12 text-zinc-800" />
              <p className="mt-4 text-zinc-500">No records matching these criteria.</p>
            </div>
          )}
        </div>
      </section>

      {/* Town Admin: Submit Article */}
      {!isSuperAdmin && viewer.adminTownIds.length > 0 && (
        <section className="premium-card p-8 sm:p-12">
          <div className="flex items-center gap-3 text-emerald-500">
            <Newspaper className="h-5 w-5" />
            <h2 className="text-xl font-bold">Publish Town Article</h2>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Submit articles for your town carousel. Each article requires super-admin approval. Max 5 active per town.
          </p>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div>
              <ArticleSubmitFormSection townIds={viewer.adminTownIds} towns={towns} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Your Recent Submissions</div>
              <div className="space-y-3">
                {articles.filter(a => viewer.adminTownIds.includes(a.townId)).length === 0 && (
                  <p className="text-sm text-zinc-600">No articles yet.</p>
                )}
                {articles.filter(a => viewer.adminTownIds.includes(a.townId)).slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-4">
                    {a.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.images[0]} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <ImageOff className="h-5 w-5 text-zinc-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{a.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{a.townName} · {formatAdminTimestamp(a.submittedAt)}</p>
                    </div>
                    <span className={cn(
                      'shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md',
                      a.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      a.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    )}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Article Moderation */}
      {isSuperAdmin && (
        <section className="premium-card p-8 sm:p-12">
          <div className="flex items-center gap-3 text-emerald-500">
            <Newspaper className="h-5 w-5" />
            <h2 className="text-xl font-bold">Town Articles</h2>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Approve or reject articles submitted by town admins. Max 5 approved articles per town — oldest is removed on new approval.</p>

          <div className="mt-10 space-y-4">
            {articles.filter(a => a.status === 'pending').length === 0 && (
              <div className="py-12 text-center text-zinc-600 text-sm">No pending articles.</div>
            )}
            {articles.filter(a => a.status === 'pending').map(article => (
              <div key={article.id} className="bg-white/5 border border-white/5 rounded-[2rem] p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-tighter">
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md">{article.townName}</span>
                      <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded-md">{formatAdminTimestamp(article.submittedAt)}</span>
                    </div>
                    <h4 className="text-xl font-bold text-white">{article.title}</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{article.content}</p>
                    {article.images.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {article.images.map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={url} alt={`Article image ${i + 1}`} className="h-20 w-20 rounded-xl object-cover border border-white/10" />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-zinc-500">By {article.submittedByName} ({article.submittedByEmail})</p>
                  </div>
                  <div className="flex flex-col gap-3 w-full lg:w-48 shrink-0">
                    <button
                      onClick={() => void handleArticleReview(article.id, 'approved')}
                      disabled={busyArticleId === article.id}
                      className="w-full py-3 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-sm hover:bg-emerald-400 transition-all"
                    >
                      Approve & Publish
                    </button>
                    <button
                      onClick={() => void handleArticleReview(article.id, 'rejected')}
                      disabled={busyArticleId === article.id}
                      className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-red-500/10 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Access Requests */}
      {isSuperAdmin && (
        <section className="premium-card p-8 sm:p-12">
          <div className="flex items-center gap-3 text-emerald-500">
            <UserCheck className="h-5 w-5" />
            <h2 className="text-xl font-bold">Admin Applications</h2>
          </div>
          
          <div className="mt-12 space-y-4">
            {adminAccessRequests.map(r => (
              <div key={r.id} className="bg-white/5 border border-white/5 rounded-[2rem] p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <User className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">{r.name}</h4>
                      <p className="text-zinc-500 text-sm mt-0.5">{r.email}</p>
                      <div className="mt-3 flex gap-2">
                        <span className="bg-white/5 text-zinc-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">{r.requestedRole}</span>
                        <span className="bg-white/5 text-zinc-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">{r.townName}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 w-full lg:w-fit">
                    {r.status === 'pending' ? (
                      <>
                        <button 
                          onClick={() => handleAdminAccess(r.id, 'approved')}
                          disabled={busyAccessRequestId === r.id}
                          className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs"
                        >
                          Grant Access
                        </button>
                        <button 
                          onClick={() => handleAdminAccess(r.id, 'rejected')}
                          disabled={busyAccessRequestId === r.id}
                          className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-white/5 text-white font-bold text-xs"
                        >
                          Deny
                        </button>
                      </>
                    ) : (
                      <span className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border",
                        r.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>
                        {r.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'expired-helpers' | 'all';