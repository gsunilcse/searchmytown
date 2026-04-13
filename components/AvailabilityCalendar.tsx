'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type AvailabilityStatus = 'available' | 'booked';

interface AvailabilityCalendarProps {
  availability: Record<string, AvailabilityStatus> | null;
  editable?: boolean;
  onAvailabilityChange?: (availability: Record<string, AvailabilityStatus>) => Promise<void>;
  listingTitle?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDefaultAvailability(daysFromToday: number = 60): Record<string, AvailabilityStatus> {
  const availability: Record<string, AvailabilityStatus> = {};
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < daysFromToday; i++) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + i);
    const key = getDateKey(date);
    availability[key] = 'available';
  }

  return availability;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function AvailabilityCalendar({
  availability: initialAvailability,
  editable = false,
  onAvailabilityChange,
  listingTitle,
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<Record<string, AvailabilityStatus>>(
    initialAvailability ?? getDefaultAvailability()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const year = currentDate.getUTCFullYear();
  const month = currentDate.getUTCMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];

  const today =new Date();
  today.setUTCHours(0, 0, 0, 0);
  const minDate = getDateKey(today);
  const maxDate = new Date(today);
  maxDate.setUTCDate(maxDate.getUTCDate() + 59);
  const maxDateKey = getDateKey(maxDate);

  const previousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setUTCMonth(newDate.getUTCMonth() - 1);
    setCurrentDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setUTCMonth(newDate.getUTCMonth() + 1);
    setCurrentDate(newDate);
  };

  const toggleDate = (dayNum: number) => {
    if (!editable) return;

    const date = new Date(Date.UTC(year, month, dayNum));
    const dateKey = getDateKey(date);

    if (dateKey < minDate || dateKey > maxDateKey) {
      return;
    }

    const newAvailability = {
      ...availability,
      [dateKey]: availability[dateKey] === 'available' ? 'booked' : 'available',
    } as Record<string, AvailabilityStatus>;

    setAvailability(newAvailability);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!onAvailabilityChange) return;
    setIsSaving(true);
    try {
      await onAvailabilityChange(availability);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to update availability:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getDateStatus = (dayNum: number): AvailabilityStatus | null => {
    const date = new Date(Date.UTC(year, month, dayNum));
    const dateKey = getDateKey(date);
    return availability[dateKey] ?? null;
  };

  const isDateInRange = (dayNum: number): boolean => {
    const date = new Date(Date.UTC(year, month, dayNum));
    const dateKey = getDateKey(date);
    return dateKey >= minDate && dateKey <= maxDateKey;
  };

  const isDatePast = (dayNum: number): boolean => {
    const date = new Date(Date.UTC(year, month, dayNum));
    const dateKey = getDateKey(date);
    return dateKey < minDate;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {listingTitle && (
        <h3 className="text-lg font-semibold mb-4 text-white">{listingTitle}</h3>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={previousMonth}
            className="p-1 hover:bg-zinc-800 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-white">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-1 hover:bg-zinc-800 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((day) => (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-xs font-semibold text-zinc-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-10" />;
            }

            const status = getDateStatus(day);
            const inRange = isDateInRange(day);
            const isPast = isDatePast(day);
            const isToday = getDateKey(new Date(Date.UTC(year, month, day))) === getDateKey(today);

            return (
              <button
                key={day}
                onClick={() => toggleDate(day)}
                disabled={!editable || !inRange || isPast || isSaving}
                className={cn(
                  'h-10 rounded-lg flex items-center justify-center text-sm font-medium transition relative',
                  // Base styles
                  isPast && 'opacity-40 cursor-not-allowed bg-zinc-800',
                  !isPast && !inRange && 'opacity-30 cursor-not-allowed bg-zinc-800',
                  inRange && !isPast && 'cursor-pointer',
                  // Status colors
                  status === 'available' && inRange && !isPast && 'bg-green-900/40 border border-green-700 text-green-300',
                  status === 'booked' && inRange && !isPast && 'bg-red-900/40 border border-red-700 text-red-300',
                  status === null && inRange && !isPast && !isToday && 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700',
                  isToday && status === null && 'bg-blue-900/40 border border-blue-700 text-blue-300 font-bold',
                  isToday && status === 'available' && 'bg-green-800/60 border border-green-600 text-green-200 font-bold',
                  isToday && status === 'booked' && 'bg-red-800/60 border border-red-600 text-red-200 font-bold',
                  // Disabled state
                  editable && inRange && !isPast && 'hover:bg-opacity-80',
                )}
                title={
                  !inRange || isPast
                    ? 'Not available for selection'
                    : status === 'booked'
                    ? 'Booked'
                    : 'Available'
                }
              >
                <span>{day}</span>
                {editable && inRange && !isPast && status && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {status === 'available' ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-900/40 border border-green-700" />
            <span className="text-zinc-400">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-900/40 border border-red-700" />
            <span className="text-zinc-400">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-zinc-800 border border-zinc-700" />
            <span className="text-zinc-400">Not set</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-900/40 border border-blue-700" />
            <span className="text-zinc-400">Today</span>
          </div>
        </div>

        {editable && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-400 mb-3">Tap dates to mark as booked or available. Click Update to save.</p>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Updating...' : hasChanges ? 'Update Availability' : 'No changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
