'use client';

import { useState } from 'react';
import type { DirectoryModuleKey, ModuleDefinition } from '@/config/modules';
import type { Town } from '@/config/towns';

type PublishFormProps = {
  town: Town;
  moduleDefinition: ModuleDefinition;
};

type FormState = {
  title: string;
  summary: string;
  description: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
};

const INITIAL_FORM_STATE: FormState = {
  title: '',
  summary: '',
  description: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  website: '',
};

async function submitListing(townId: string, moduleKey: DirectoryModuleKey, payload: FormState) {
  const response = await fetch('/api/submissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      townId,
      moduleKey,
      ...payload,
    }),
  });

  const data = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? 'Unable to submit your request.');
  }
}

export default function PublishForm({ town, moduleDefinition }: PublishFormProps) {
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateField(field: keyof FormState, value: string) {
    setFormState((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await submitListing(town.id, moduleDefinition.key, formState);
      setFormState(INITIAL_FORM_STATE);
      setSuccessMessage(`${moduleDefinition.singularLabel} submitted. It will only appear publicly after admin approval.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit your request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.1)] sm:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-800">Listing title</span>
          <input
            required
            value={formState.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder={moduleDefinition.titlePlaceholder}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-800">Short summary</span>
          <input
            required
            value={formState.summary}
            onChange={(event) => updateField('summary', event.target.value)}
            placeholder={moduleDefinition.summaryPlaceholder}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-800">Detailed description</span>
          <textarea
            rows={5}
            value={formState.description}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Add key details, timings, services, specialties, or anything visitors should know."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-800">Contact name</span>
          <input
            required
            value={formState.contactName}
            onChange={(event) => updateField('contactName', event.target.value)}
            placeholder="Contact person or business owner"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-800">Phone number</span>
          <input
            value={formState.phone}
            onChange={(event) => updateField('phone', event.target.value)}
            placeholder="Primary phone number"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-800">Email address</span>
          <input
            type="email"
            value={formState.email}
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="Contact email"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-800">Website or social link</span>
          <input
            value={formState.website}
            onChange={(event) => updateField('website', event.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-800">Address</span>
          <textarea
            rows={3}
            value={formState.address}
            onChange={(event) => updateField('address', event.target.value)}
            placeholder={`Street, area, landmark in ${town.name}`}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
          />
        </label>
      </div>

      <div className="rounded-[1.5rem] border border-slate-300 bg-slate-100 px-4 py-4 text-sm leading-7 text-slate-800">
        Every submission enters the admin queue first. The public directory will show this listing only after approval.
      </div>

      {errorMessage ? <p className="text-sm font-medium text-slate-700">{errorMessage}</p> : null}
      {successMessage ? <p className="text-sm font-medium text-slate-700">{successMessage}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting ? 'Submitting...' : moduleDefinition.submitButtonLabel}
      </button>
    </form>
  );
}