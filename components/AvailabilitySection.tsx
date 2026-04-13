'use client';

import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';

type AvailabilityStatus = 'available' | 'booked';

type AvailabilitySectionProps = {
  availability: Record<string, AvailabilityStatus> | null;
  isOwner?: boolean;
  listingId?: string;
  moduleKey?: string;
};

export default function AvailabilitySection({ availability, isOwner, listingId, moduleKey }: AvailabilitySectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleAvailabilityChange = async (updated: Record<string, AvailabilityStatus>) => {
    if (!listingId || !moduleKey) return;

    const response = await fetch(`/api/listings/${moduleKey}/${listingId}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability: updated }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update availability');
    }

    setSaveMessage('Availability updated!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="mt-8 pt-8 border-t border-white/10">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
      >
        <CalendarDays className="h-4 w-4 text-blue-300" />
        {isOwner ? 'Manage Availability' : 'Check Availability'}
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="mt-4">
          {isOwner && (
            <p className="text-xs text-zinc-400 mb-3">You own this listing. Tap dates to mark as booked, then click Update.</p>
          )}
          <AvailabilityCalendar
            availability={availability}
            editable={!!isOwner}
            onAvailabilityChange={isOwner ? handleAvailabilityChange : undefined}
            listingTitle=""
          />
          {saveMessage && (
            <p className="mt-2 text-sm font-semibold text-emerald-400">{saveMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
