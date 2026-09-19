'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Download,
  Smartphone,
  Laptop,
  CheckCircle2,
  X,
  RefreshCw,
  Layers,
  MapPin,
  Flame,
  Zap,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGoogleCalendarSubscribeUrl } from '@/lib/google-calendar';
import { GoogleCalendarConfigModal } from './google-calendar-config-modal';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVenue?: 'all' | 'events_place' | 'view_deck' | 'courts';
}

export function GoogleCalendarSyncModal({
  isOpen,
  onClose,
  defaultVenue = 'all',
}: GoogleCalendarSyncModalProps) {
  const [selectedFeed, setSelectedFeed] = useState<'all' | 'events_place' | 'view_deck' | 'courts'>(defaultVenue);
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [instructionTab, setInstructionTab] = useState<'google' | 'apple' | 'android'>('google');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!isOpen) return null;

  // Build the live feed URL
  const feedPath = `/api/calendar/venue-feed?venue=${selectedFeed}`;
  const fullFeedUrl = origin ? `${origin}${feedPath}` : feedPath;
  const webcalSubscribeUrl = origin ? getGoogleCalendarSubscribeUrl(fullFeedUrl) : '#';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullFeedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] text-foreground rounded-3xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#707072] dark:text-[#8a8a93] hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c20] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 pb-4 border-b border-[#e5e5e5] dark:border-[#222226]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#007d48]/10 text-[#007d48] dark:text-[#10b981] flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-[#007d48] dark:text-[#10b981] border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-[#007d48] animate-pulse" />
              Live RFC 5545 Synchronization
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Google Calendar Live Synchronization
          </h2>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
            Connect C&amp;J Events Place Rental, View Deck Lounge, and Court schedules directly to your Google Calendar on desktop, phone, or tablet.
          </p>
        </div>

        {/* Automated Down-Payment Direct Push Banner */}
        <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#007d48] dark:text-emerald-400">
              <Zap className="w-4 h-4 fill-current" />
              <span>Automated Down-Payment Push</span>
            </div>
            <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
              Automatically push reservations to your Google Calendar account immediately upon down payment receipt.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsConfigOpen(true)}
            className="h-8 px-3 rounded-full text-xs font-bold bg-[#007d48] hover:bg-[#006037] text-white shrink-0 cursor-pointer shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 mr-1" />
            Direct API Settings
          </Button>
        </div>

        {/* Venue Feed Selector */}
        <div className="py-4 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Select Calendar Feed Channel
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setSelectedFeed('all')}
              className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                selectedFeed === 'all'
                  ? 'border-[#111111] dark:border-white bg-[#f5f5f5] dark:bg-[#1c1c20] shadow-xs'
                  : 'border-[#cacacb] dark:border-[#27272a] hover:bg-[#f9f9f9] dark:hover:bg-[#18181c]'
              }`}
            >
              <span className="block text-xs font-bold text-foreground">All Facilities</span>
              <span className="block text-[10px] text-[#707072] dark:text-[#8a8a93]">Courts + Venues</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFeed('events_place')}
              className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                selectedFeed === 'events_place'
                  ? 'border-[#111111] dark:border-white bg-[#f5f5f5] dark:bg-[#1c1c20] shadow-xs'
                  : 'border-[#cacacb] dark:border-[#27272a] hover:bg-[#f9f9f9] dark:hover:bg-[#18181c]'
              }`}
            >
              <span className="block text-xs font-bold text-foreground">🎉 Events Place</span>
              <span className="block text-[10px] text-[#707072] dark:text-[#8a8a93]">3rd Flr Banquet</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFeed('view_deck')}
              className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                selectedFeed === 'view_deck'
                  ? 'border-[#111111] dark:border-white bg-[#f5f5f5] dark:bg-[#1c1c20] shadow-xs'
                  : 'border-[#cacacb] dark:border-[#27272a] hover:bg-[#f9f9f9] dark:hover:bg-[#18181c]'
              }`}
            >
              <span className="block text-xs font-bold text-foreground">🌆 View Deck</span>
              <span className="block text-[10px] text-[#707072] dark:text-[#8a8a93]">5th Flr Lounge</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFeed('courts')}
              className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                selectedFeed === 'courts'
                  ? 'border-[#111111] dark:border-white bg-[#f5f5f5] dark:bg-[#1c1c20] shadow-xs'
                  : 'border-[#cacacb] dark:border-[#27272a] hover:bg-[#f9f9f9] dark:hover:bg-[#18181c]'
              }`}
            >
              <span className="block text-xs font-bold text-foreground">🏓 Courts 1 &amp; 2</span>
              <span className="block text-[10px] text-[#707072] dark:text-[#8a8a93]">Pickleball Only</span>
            </button>
          </div>
        </div>

        {/* Primary Action: 1-Click Subscribe in Google Calendar */}
        <div className="p-4 rounded-2xl bg-[#f5f5f5] dark:bg-[#18181c] border border-[#e5e5e5] dark:border-[#27272a] space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#eab308]" />
                1-Click Google Calendar Subscription
              </span>
              <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
                Directly opens Google Calendar and prompts you to add this live schedule feed.
              </p>
            </div>
            <a
              href={webcalSubscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-bold text-xs hover:bg-[#222222] transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Subscribe in Google Calendar</span>
            </a>
          </div>

          {/* Copyable URL Bar */}
          <div className="pt-2 border-t border-[#e5e5e5] dark:border-[#27272a] space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              Live WebCal / iCal Subscription URL
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullFeedUrl}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-black text-xs font-mono text-foreground border border-[#cacacb] dark:border-[#3f3f46] outline-none"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCopy}
                className="h-9 px-3.5 rounded-xl font-bold text-xs cursor-pointer shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy URL
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Platform Step-by-Step Instructions */}
        <div className="pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              How Live Sync Works
            </span>
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setInstructionTab('google')}
                className={`px-2.5 py-1 rounded-full font-bold transition-colors cursor-pointer ${
                  instructionTab === 'google'
                    ? 'bg-foreground text-background'
                    : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
                }`}
              >
                Google Calendar
              </button>
              <button
                type="button"
                onClick={() => setInstructionTab('android')}
                className={`px-2.5 py-1 rounded-full font-bold transition-colors cursor-pointer ${
                  instructionTab === 'android'
                    ? 'bg-foreground text-background'
                    : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
                }`}
              >
                Android
              </button>
              <button
                type="button"
                onClick={() => setInstructionTab('apple')}
                className={`px-2.5 py-1 rounded-full font-bold transition-colors cursor-pointer ${
                  instructionTab === 'apple'
                    ? 'bg-foreground text-background'
                    : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
                }`}
              >
                iPhone / Apple
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-[#e5e5e5] dark:border-[#27272a] text-xs space-y-2 text-[#707072] dark:text-[#8a8a93] leading-relaxed">
            {instructionTab === 'google' && (
              <ol className="list-decimal list-inside space-y-1.5">
                <li>
                  Click the <strong>&quot;Subscribe in Google Calendar&quot;</strong> button above (or open{' '}
                  <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-foreground"
                  >
                    calendar.google.com
                  </a>
                  ).
                </li>
                <li>
                  On the left sidebar, find <strong>&quot;Other calendars&quot;</strong> and click the <strong>+</strong> icon &gt; <strong>&quot;From URL&quot;</strong>.
                </li>
                <li>
                  Paste the copied Live Feed URL and click <strong>&quot;Add calendar&quot;</strong>.
                </li>
                <li>
                  Google Calendar will now display all booked Events Place rentals, View Deck parties, and match schedules with automatic live updates every 15 minutes!
                </li>
              </ol>
            )}

            {instructionTab === 'android' && (
              <ol className="list-decimal list-inside space-y-1.5">
                <li>
                  Subscribe to the feed URL on your Google Account via a desktop or mobile browser using the instructions under Google Calendar.
                </li>
                <li>
                  Open the <strong>Google Calendar app</strong> on your Android phone.
                </li>
                <li>
                  Go to <strong>Settings</strong> &gt; tap your Google Account name &gt; look for the <strong>C&amp;J Schedule</strong> calendar.
                </li>
                <li>
                  Toggle <strong>&quot;Sync&quot;</strong> ON. Your phone will receive live notification reminders before every booked event!
                </li>
              </ol>
            )}

            {instructionTab === 'apple' && (
              <ol className="list-decimal list-inside space-y-1.5">
                <li>
                  On your iPhone or iPad, open <strong>Settings</strong> &gt; <strong>Calendar</strong> &gt; <strong>Accounts</strong>.
                </li>
                <li>
                  Tap <strong>Add Account</strong> &gt; select <strong>Other</strong> &gt; tap <strong>Add Subscribed Calendar</strong>.
                </li>
                <li>
                  Paste the copied Live Feed URL and tap <strong>Next</strong> &gt; <strong>Save</strong>.
                </li>
                <li>
                  All C&amp;J venue schedules will immediately integrate with iOS Calendar and Apple Watch.
                </li>
              </ol>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#e5e5e5] dark:border-[#222226] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[#707072] dark:text-[#8a8a93]">
            <MapPin className="w-3.5 h-3.5 text-[#007d48]" />
            <span>25 Bologna St., Muzon, Taytay, Rizal</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 px-4 text-xs rounded-full cursor-pointer"
          >
            Done
          </Button>
        </div>
      </div>

      {/* Direct API Config Modal */}
      <GoogleCalendarConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
