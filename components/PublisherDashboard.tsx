'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  ChevronRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import type { ListingRecord } from '@/lib/submissions';

interface PublisherDashboardProps {
  initialListings: ListingRecord[];
  townId: string;
  townName: string;
  publisherEmail: string;
}

function formatSubmittedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function PublisherDashboard({
  initialListings,
  townId,
  townName,
  publisherEmail,
}: PublisherDashboardProps) {
  const [listings, setListings] = useState(initialListings);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'availability'>('overview');
  const [isLogoutMenuOpen, setIsLogoutMenuOpen] = useState(false);

  const selectedListing = listings.find((l) => l.id === selectedListingId) ?? listings[0];
  const approvedListings = listings.filter((l) => l.approved);

  const handleAvailabilityChange = async (
    listingId: string,
    availability: Record<string, 'available' | 'booked'>
  ) => {
    try {
      const response = await fetch(
        `/api/listings/${selectedListing!.moduleKey}/${listingId}/availability`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ availability }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update availability');
      }

      // Update local state
      setListings((prev) =>
        prev.map((l) =>
          l.id === listingId ? { ...l, availability } : l
        )
      );
    } catch (error) {
      console.error('Failed to update availability:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Publisher Dashboard</h1>
              <p className="text-sm text-zinc-400 mt-1">{townName}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsLogoutMenuOpen(!isLogoutMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-900 transition"
              >
                <span className="text-sm">{publisherEmail}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {isLogoutMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg z-50"
                  >
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-zinc-800 transition rounded-lg text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {listings.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto text-zinc-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No listings yet</h2>
            <p className="text-zinc-400 mb-6">
              Submit your first listing to get started.
            </p>
            <Link
              href={`/${townId}/publish`}
              className="inline-flex items-center gap-2 px-6 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Create Listing
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Listings Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  My Listings ({approvedListings.length})
                </h3>
                <div className="space-y-2">
                  {approvedListings.map((listing) => (
                    <button
                      key={listing.id}
                      onClick={() => {
                        setSelectedListingId(listing.id);
                        setActiveTab('availability');
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg transition text-sm',
                        selectedListingId === listing.id
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-zinc-800 text-zinc-300'
                      )}
                    >
                      <div className="font-medium truncate">{listing.title}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {listing.moduleKey}
                      </div>
                    </button>
                  ))}
                </div>

                {listings.some((l) => !l.approved) && (
                  <div className="mt-6 pt-4 border-t border-zinc-800">
                    <p className="text-xs text-zinc-400 mb-3">
                      {listings.filter((l) => !l.approved).length} listing(s) pending approval
                    </p>
                  </div>
                )}

                <Link
                  href={`/${townId}/publish`}
                  className="w-full mt-4 block text-center px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition"
                >
                  + New Listing
                </Link>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {selectedListing ? (
                <motion.div
                  key={selectedListing.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Listing Header */}
                  <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">{selectedListing.title}</h2>
                        <p className="text-zinc-400 mb-4">{selectedListing.description}</p>
                        <div className="flex items-center gap-4 flex-wrap text-sm text-zinc-400">
                          {selectedListing.address && (
                            <div>📍 {selectedListing.address}</div>
                          )}
                          {selectedListing.phone && (
                            <div>📞 {selectedListing.phone}</div>
                          )}
                          {selectedListing.email && (
                            <div>✉️ {selectedListing.email}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-700 rounded-lg text-sm text-green-300">
                        <CheckCircle2 className="w-4 h-4" />
                        Approved
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 border-b border-zinc-800">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={cn(
                        'px-4 py-3 font-medium border-b-2 transition',
                        activeTab === 'overview'
                          ? 'border-white text-white'
                          : 'border-transparent text-zinc-400 hover:text-white'
                      )}
                    >
                      <Settings className="w-4 h-4 inline mr-2" />
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab('availability')}
                      className={cn(
                        'px-4 py-3 font-medium border-b-2 transition',
                        activeTab === 'availability'
                          ? 'border-white text-white'
                          : 'border-transparent text-zinc-400 hover:text-white'
                      )}
                    >
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Availability
                    </button>
                  </div>

                  {/* Tab Content */}
                  <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                      <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4"
                      >
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-400 mb-2">Status</h3>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="capitalize">{selectedListing.status}</span>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-400 mb-2">Category</h3>
                          <span className="capitalize">{selectedListing.moduleKey}</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-400 mb-2">Contact Name</h3>
                          <span>{selectedListing.contactName}</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-400 mb-2">Website</h3>
                          {selectedListing.website ? (
                            <a
                              href={selectedListing.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              {selectedListing.website}
                            </a>
                          ) : (
                            <span className="text-zinc-500">Not provided</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-400 mb-2">Submitted</h3>
                          <span className="text-sm text-zinc-400">
                            {formatSubmittedDate(selectedListing.submittedAt)}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'availability' && (
                      <motion.div
                        key="availability"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <AvailabilityCalendar
                          availability={selectedListing.availability}
                          editable={true}
                          onAvailabilityChange={(availability) =>
                            handleAvailabilityChange(selectedListing.id, availability)
                          }
                          listingTitle={selectedListing.title}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
