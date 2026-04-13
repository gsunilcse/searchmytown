'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  User, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  FileText, 
  AlignLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  ChevronDown
} from 'lucide-react';
import { HELPER_CATEGORY_LABELS, type DirectoryModuleKey, type ModuleDefinition } from '@/config/modules';
import type { Town } from '@/config/towns';
import { cn } from '@/lib/utils';

type PublishFormProps = {
  town: Town;
  moduleDefinition: ModuleDefinition;
};

type FormState = {
  title: string;
  summary: string;
  movieLanguage: string;
  showDate: string;
  showTimes: string;
  helperCategory: string;
  description: string;
  contactName: string;
  helperLocality: string;
  phone: string;
  email: string;
  address: string;
  website: string;
};

const INITIAL_FORM_STATE: FormState = {
  title: '',
  summary: '',
  movieLanguage: '',
  showDate: '',
  showTimes: '',
  helperCategory: '',
  description: '',
  contactName: '',
  helperLocality: '',
  phone: '',
  email: '',
  address: '',
  website: '',
};

async function submitListing(townId: string, moduleKey: DirectoryModuleKey, payload: FormState) {
  const requestPayload =
    moduleKey === 'movies'
      ? {
          ...payload,
          summary: `Now Showing: ${payload.summary.trim()}${payload.movieLanguage.trim() ? ` (${payload.movieLanguage.trim()})` : ''}`,
          description: [
            payload.showDate.trim() ? `Show Date: ${payload.showDate.trim()}` : '',
            payload.showTimes.trim() ? `Show Timings: ${payload.showTimes.trim()}` : '',
            payload.description.trim(),
          ]
            .filter(Boolean)
            .join('\n'),
        }
      : payload;

  const response = await fetch('/api/submissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      townId,
      moduleKey,
      ...requestPayload,
    }),
  });

  const data = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? 'Unable to submit your request.');
  }
}

function PremiumSelect({
  value,
  onChange,
  options,
  label,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setIsOpen((currentValue) => !currentValue);
          }}
          className={cn(
            'w-full flex items-center justify-between gap-3 rounded-2xl border bg-zinc-950/50 py-4 px-4 text-sm text-white text-left transition-all disabled:cursor-not-allowed disabled:opacity-60',
            isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-white/5 hover:border-white/10'
          )}
        >
          <span className={cn('truncate', !value && 'text-zinc-500')}>{value || 'Select a category'}</span>
          <ChevronDown className={cn('h-4 w-4 text-zinc-500 transition-transform', isOpen && 'rotate-180')} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl backdrop-blur-xl"
              >
                <div className="max-h-60 overflow-y-auto p-2">
                  {options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        onChange(option);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition-all',
                        value === option
                          ? 'bg-emerald-500 text-zinc-950 font-bold'
                          : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      {option}
                      {value === option && <Check className="h-4 w-4" />}
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

export default function PublishForm({ town, moduleDefinition }: PublishFormProps) {
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isMoviesModule = moduleDefinition.key === 'movies';
  const isHelpersModule = moduleDefinition.key === 'helpers';
  const isLocked = isSubmitting || Boolean(successMessage);

  function updateField(field: keyof FormState, value: string) {
    setFormState((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isHelpersModule && !formState.helperCategory) {
      setErrorMessage('Please select a helper category.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await submitListing(town.id, moduleDefinition.key, formState);
      setSuccessMessage(
        isMoviesModule
          ? 'Movie schedule submitted. Your latest entry replaced the previous one and is now pending admin approval.'
          : `${moduleDefinition.singularLabel} submitted. It will only appear publicly after admin approval.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit your request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.form 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit} 
      className="premium-card p-8 sm:p-12 relative overflow-hidden space-y-8"
    >
      <div className="absolute top-0 right-0 h-96 w-96 bg-emerald-500/5 blur-[100px] pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 text-emerald-500 mb-6 font-display text-2xl">
          <Send className="h-6 w-6" />
          <span>Publish to {town.name}</span>
        </div>

        <fieldset disabled={isLocked} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Title and Summary */}
            <div className="md:col-span-2 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
                {isMoviesModule ? 'Theatre Name' : 'Listing Title'}
              </label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                <input
                  required
                  value={formState.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder={isMoviesModule ? 'Example: Sri Lakshmi Cinema' : moduleDefinition.titlePlaceholder}
                  className="w-full rounded-2xl border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
                {isMoviesModule ? 'Currently Showing Movies' : 'Key Summary'}
              </label>
              <div className="relative">
                <AlignLeft className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                <input
                  required
                  value={formState.summary}
                  onChange={(event) => updateField('summary', event.target.value)}
                  placeholder={
                    isMoviesModule
                      ? 'Example: Court, HIT 3, Dragon'
                      : moduleDefinition.summaryPlaceholder
                  }
                  className="w-full rounded-2xl border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            {isMoviesModule && (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Language</label>
                  <input
                    required
                    value={formState.movieLanguage}
                    onChange={(event) => updateField('movieLanguage', event.target.value)}
                    placeholder="Telugu"
                    className="w-full rounded-2xl border border-white/5 bg-zinc-950/50 py-4 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Show Date</label>
                  <input
                    required
                    type="date"
                    value={formState.showDate}
                    onChange={(event) => updateField('showDate', event.target.value)}
                    className="w-full rounded-2xl border border-white/5 bg-zinc-950/50 py-4 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Show Timings</label>
                  <input
                    required
                    value={formState.showTimes}
                    onChange={(event) => updateField('showTimes', event.target.value)}
                    placeholder="10:00 AM, 1:30 PM, 7:00 PM"
                    className="w-full rounded-2xl border border-white/5 bg-zinc-950/50 py-4 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {isHelpersModule && (
              <PremiumSelect
                value={formState.helperCategory}
                onChange={(value) => updateField('helperCategory', value)}
                options={HELPER_CATEGORY_LABELS}
                label="Helper Category"
                disabled={isLocked}
              />
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
              {isMoviesModule ? 'Optional Notes' : 'Detailed Insight'}
            </label>
            <textarea
              rows={5}
              value={formState.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder={
                isMoviesModule
                  ? 'Optional: format (2D/3D), special shows, or important notice...'
                  : 'Add key details, timings, specialties, or verified business info...'
              }
              className="w-full rounded-2xl border border-white/5 bg-zinc-950/50 p-4 text-sm text-white focus:border-emerald-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Contact Details */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Primary Contact</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
              <input
                required
                value={formState.contactName}
                onChange={(event) => updateField('contactName', event.target.value)}
                placeholder="Manager or Owner Name"
                className="w-full rounded-2xl border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
              <input
                value={formState.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="Direct line"
                className="w-full rounded-2xl border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          {isHelpersModule && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Village / Locality</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                <input
                  required
                  value={formState.helperLocality}
                  onChange={(event) => updateField('helperLocality', event.target.value)}
                  placeholder={`Village or locality in ${town.name}`}
                  className="w-full rounded-2xl border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Email Connection</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
              <input
                type="email"
                value={formState.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="Official Email"
                className="w-full rounded-2xl border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Web Presence</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
              <input
                value={formState.website}
                onChange={(event) => updateField('website', event.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-2xl border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

            {/* Location */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Exact Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 h-5 w-5 text-zinc-600" />
                <textarea
                  rows={3}
                  value={formState.address}
                  onChange={(event) => updateField('address', event.target.value)}
                  placeholder={`Street, area, and prominent landmarks in ${town.name}`}
                  className="w-full rounded-2xl border border-white/5 bg-zinc-950/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 text-xs text-zinc-500 flex items-center gap-4 leading-relaxed">
            <CheckCircle2 className="h-6 w-6 text-emerald-500/50 shrink-0" />
            <span>Professional verification required. Your submission will undergo moderation prior to public distribution in the {town.name} council directory.</span>
          </div>
        </fieldset>

        <AnimatePresence>
          {errorMessage && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-4 p-4 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-sm flex items-center gap-3"
            >
              <AlertCircle className="h-5 w-5" /> {errorMessage}
            </motion.div>
          )}

          {successMessage && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-4 p-4 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-sm flex items-center gap-3"
            >
              <CheckCircle2 className="h-5 w-5" /> {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={isLocked}
          className="w-full mt-6 group flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-5 text-sm font-bold text-zinc-950 transition-all hover:bg-zinc-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : successMessage ? (
            <>
              Submitted
              <CheckCircle2 className="h-4 w-4" />
            </>
          ) : (
            <>
              {moduleDefinition.submitButtonLabel}
              <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>
    </motion.form>
  );
}