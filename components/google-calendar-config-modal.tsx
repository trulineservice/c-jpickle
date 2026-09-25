'use client';

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Key,
  Mail,
  HelpCircle,
  ExternalLink,
  Loader2,
  X,
  Zap,
  Lock,
  Save,
  Play,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  saveGoogleCalendarSettings,
  testGoogleCalendarSyncAction,
  getGoogleCalendarSettingsAction,
} from '@/app/actions';

interface GoogleCalendarConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPickleballCalId?: string;
  initialEventsCalId?: string;
  initialServiceEmail?: string;
}

export function GoogleCalendarConfigModal({
  isOpen,
  onClose,
  initialPickleballCalId = '',
  initialEventsCalId = '',
  initialServiceEmail = '',
}: GoogleCalendarConfigModalProps) {
  const [pickleballCalendarId, setPickleballCalendarId] = useState(initialPickleballCalId);
  const [eventsCalendarId, setEventsCalendarId] = useState(initialEventsCalId);
  const [serviceAccountEmail, setServiceAccountEmail] = useState(initialServiceEmail);
  const [privateKey, setPrivateKey] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [testingTarget, setTestingTarget] = useState<'pickleball' | 'events' | 'both' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    pickleballResult?: { success: boolean; message?: string; error?: string; calendarId?: string };
    eventsResult?: { success: boolean; message?: string; error?: string; calendarId?: string };
    message: string;
  } | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingSettings(true);
    getGoogleCalendarSettingsAction().then((res) => {
      if (!isMounted) return;
      setIsLoadingSettings(false);
      if (res.success) {
        if (res.pickleballCalendarId) {
          setPickleballCalendarId(res.pickleballCalendarId);
        } else if (res.calendarId) {
          setPickleballCalendarId(res.calendarId);
        }
        if (res.eventsCalendarId) {
          setEventsCalendarId(res.eventsCalendarId);
        } else if (res.calendarId) {
          setEventsCalendarId(res.calendarId);
        }
        if (res.serviceAccountEmail) setServiceAccountEmail(res.serviceAccountEmail);
        if (res.autoSyncEnabled !== undefined) setAutoSyncEnabled(res.autoSyncEnabled);
        if (res.hasPrivateKey) setHasExistingKey(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    const res = await saveGoogleCalendarSettings({
      pickleballCalendarId: pickleballCalendarId.trim(),
      eventsCalendarId: eventsCalendarId.trim(),
      calendarId: pickleballCalendarId.trim() || eventsCalendarId.trim(),
      serviceAccountEmail: serviceAccountEmail.trim() || undefined,
      privateKey: privateKey.trim() || undefined,
      autoSyncEnabled,
    });

    setIsSaving(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: 'Google Calendar configuration saved successfully for both channels!',
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to save configuration.',
      });
    }
  };

  const handleTestConnection = async (target: 'pickleball' | 'events' | 'both') => {
    setTestingTarget(target);
    setTestResult(null);

    const res = await testGoogleCalendarSyncAction(target);
    setTestingTarget(null);

    if (res.success) {
      setTestResult({
        success: true,
        pickleballResult: res.pickleballResult,
        eventsResult: res.eventsResult,
        message: res.message || 'Connection verified! Test events successfully pushed to Google Calendar.',
      });
    } else {
      setTestResult({
        success: false,
        pickleballResult: res.pickleballResult,
        eventsResult: res.eventsResult,
        message: res.error || res.message || 'Test failed. Please verify calendar sharing permissions.',
      });
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
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#007d48] dark:text-[#10b981] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#007d48] dark:text-[#10b981] border border-emerald-200 dark:border-emerald-800">
              Multi-Channel Direct API Engine
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Separated Google Calendar Real-Time Sync
          </h2>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
            Route Pickleball Court schedules and Events Place private banquet reservations to separate, dedicated Google Calendars in real time.
          </p>
        </div>

        {feedback && (
          <div
            className={`mt-4 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-[#007d48]'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-[#d30005]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="py-4 space-y-4">
          {/* Quick JSON Paste Shortcut */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Shortcut: Paste Google Service Account JSON File
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400">
                Auto-extracts Email &amp; Key
              </span>
            </div>
            <textarea
              rows={2}
              placeholder="Paste the raw contents of your downloaded JSON service account key file here to auto-fill..."
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val.startsWith('{') && val.includes('private_key')) {
                  try {
                    const parsed = JSON.parse(val);
                    if (parsed.client_email) setServiceAccountEmail(parsed.client_email);
                    if (parsed.private_key) setPrivateKey(parsed.private_key);
                    setFeedback({
                      type: 'success',
                      message: '✓ Service Account JSON key detected! Email & Private Key auto-filled below.',
                    });
                    e.target.value = '';
                  } catch {
                    // ignore invalid JSON
                  }
                }
              }}
              className="w-full p-2.5 rounded-xl bg-white dark:bg-black border border-amber-300 dark:border-amber-800 text-[11px] font-mono outline-none text-foreground"
            />
          </div>

          {/* Section 1: Target Google Calendars */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#fafafa] dark:bg-[#16161a] border border-[#e5e5e5] dark:border-[#27272a]">
            <div className="flex items-center gap-2 pb-2 border-b border-[#e5e5e5] dark:border-[#27272a]">
              <Layers className="w-4 h-4 text-[#007d48]" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Dedicated Target Google Calendars
              </span>
            </div>

            {/* 1. Pickleball Courts Calendar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="pickleballCalId"
                  className="text-xs font-bold text-foreground flex items-center gap-1.5"
                >
                  <span className="text-base">🏓</span>
                  <span>Pickleball Courts Calendar ID / Email</span>
                </Label>
                <button
                  type="button"
                  onClick={() => handleTestConnection('pickleball')}
                  disabled={!!testingTarget || !pickleballCalendarId}
                  className="text-[11px] font-semibold text-[#007d48] dark:text-[#10b981] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  {testingTarget === 'pickleball' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  Test Court Sync
                </button>
              </div>
              <Input
                id="pickleballCalId"
                placeholder="e.g. cjpickleball.courts@gmail.com or primary calendar ID"
                value={pickleballCalendarId}
                onChange={(e) => setPickleballCalendarId(e.target.value)}
                required
                className="h-10 px-4 rounded-xl bg-white dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-xs font-medium"
              />
              <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
                Receives Court 1 &amp; Court 2 hourly reservations, matches, and cashier walk-ins.
              </p>
            </div>

            {/* 2. Events Place & View Deck Calendar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="eventsCalId"
                  className="text-xs font-bold text-foreground flex items-center gap-1.5"
                >
                  <span className="text-base">🎉</span>
                  <span>Events Place &amp; View Deck Calendar ID / Email</span>
                </Label>
                <button
                  type="button"
                  onClick={() => handleTestConnection('events')}
                  disabled={!!testingTarget || !eventsCalendarId}
                  className="text-[11px] font-semibold text-[#007d48] dark:text-[#10b981] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  {testingTarget === 'events' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  Test Events Sync
                </button>
              </div>
              <Input
                id="eventsCalId"
                placeholder="e.g. cjpickleball.events@gmail.com or secondary calendar ID"
                value={eventsCalendarId}
                onChange={(e) => setEventsCalendarId(e.target.value)}
                required
                className="h-10 px-4 rounded-xl bg-white dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-xs font-medium"
              />
              <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
                Receives 3rd Floor Events Place &amp; 5th Floor View Deck private lounge celebrations.
              </p>
            </div>
          </div>

          {/* Section 2: Shared Google Cloud Service Account Credentials */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#fafafa] dark:bg-[#16161a] border border-[#e5e5e5] dark:border-[#27272a]">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5] dark:border-[#27272a]">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#007d48]" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Shared Google Service Account Credentials
                </span>
              </div>
              <span className="text-[10px] text-[#707072] dark:text-[#8a8a93]">
                1 Service Account manages both calendars
              </span>
            </div>

            {/* Service Account Client Email */}
            <div className="space-y-1.5">
              <Label htmlFor="svcEmail" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#007d48]" />
                Google Cloud Service Account Email
              </Label>
              <Input
                id="svcEmail"
                placeholder="e.g. cj-sync@your-project-id.iam.gserviceaccount.com"
                value={serviceAccountEmail}
                onChange={(e) => setServiceAccountEmail(e.target.value)}
                className="h-10 px-4 rounded-xl bg-white dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-xs font-mono"
              />
            </div>

            {/* Private Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="privKey" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#007d48]" />
                  Service Account RSA Private Key (PEM)
                </Label>
                <span className="text-[10px] text-[#707072] dark:text-[#8a8a93]">
                  {hasExistingKey ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Key configured (Leave empty to keep existing)</span>
                  ) : (
                    'Stored securely in PostgreSQL'
                  )}
                </span>
              </div>
              <textarea
                id="privKey"
                rows={3}
                placeholder={hasExistingKey ? 'Key is currently saved. Paste a new PEM key only if replacing.' : '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...'}
                value={privateKey}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.trim().startsWith('{') && val.includes('private_key')) {
                    try {
                      const parsed = JSON.parse(val.trim());
                      if (parsed.client_email) setServiceAccountEmail(parsed.client_email);
                      if (parsed.private_key) setPrivateKey(parsed.private_key);
                      setFeedback({
                        type: 'success',
                        message: '✓ Extracted Private Key and Service Email from pasted JSON file!',
                      });
                      return;
                    } catch {
                      // ignore
                    }
                  }
                  setPrivateKey(val);
                }}
                className="w-full p-3 rounded-xl bg-white dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-[11px] font-mono outline-none"
              />
            </div>
          </div>

          {/* Auto-Sync Toggle */}
          <div className="p-4 rounded-2xl bg-[#f5f5f5] dark:bg-[#18181c] border border-[#e5e5e5] dark:border-[#27272a] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#007d48]" />
                Real-Time Push on Payments &amp; Booking Updates
              </span>
              <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
                When enabled, PayMongo payments, cashier walk-ins, down payments, and reschedules immediately push/update events in their respective Google Calendar. Cancellations are automatically removed.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-3">
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#cacacb] peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007d48]"></div>
            </label>
          </div>

          {/* Quick Setup Instructions Callout */}
          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 text-xs space-y-1.5 text-[#707072] dark:text-[#8a8a93] leading-relaxed">
            <span className="font-bold text-[#004aad] dark:text-blue-400 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> Quick Setup Guide for Separate Calendars:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-[11px]">
              <li>
                In <strong>Google Cloud Console</strong> &gt; IAM &amp; Admin &gt; Service Accounts, generate a <strong>JSON Key</strong> and paste it into the shortcut above.
              </li>
              <li>
                Open <strong>Google Calendar</strong> ([calendar.google.com](https://calendar.google.com)).
              </li>
              <li>
                Create or open your <strong>Pickleball Calendar</strong> &gt; Settings &amp; sharing &gt; under <em>&quot;Share with specific people&quot;</em>, add your Service Account email with <strong>&quot;Make changes to events&quot;</strong> permission.
              </li>
              <li>
                Create or open your <strong>Events Place Calendar</strong> &gt; Settings &amp; sharing &gt; add the <em>same</em> Service Account email with <strong>&quot;Make changes to events&quot;</strong> permission.
              </li>
            </ol>
          </div>

          {/* Test Connection Result Box */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl text-xs space-y-2 border ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-[#007d48] dark:text-emerald-400'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#007d48]" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                )}
                <span>{testResult.message}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                {testResult.pickleballResult && (
                  <div
                    className={`p-2.5 rounded-xl border ${
                      testResult.pickleballResult.success
                        ? 'bg-emerald-100/60 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-800'
                        : 'bg-red-100/60 dark:bg-red-900/30 border-red-300 dark:border-red-800 text-[#d30005]'
                    }`}
                  >
                    <strong>🏓 Pickleball Court Calendar:</strong>
                    <p className="mt-0.5">
                      {testResult.pickleballResult.success
                        ? `✓ ${testResult.pickleballResult.message}`
                        : `✗ ${testResult.pickleballResult.error}`}
                    </p>
                  </div>
                )}

                {testResult.eventsResult && (
                  <div
                    className={`p-2.5 rounded-xl border ${
                      testResult.eventsResult.success
                        ? 'bg-emerald-100/60 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-800'
                        : 'bg-red-100/60 dark:bg-red-900/30 border-red-300 dark:border-red-800 text-[#d30005]'
                    }`}
                  >
                    <strong>🎉 Events Place Calendar:</strong>
                    <p className="mt-0.5">
                      {testResult.eventsResult.success
                        ? `✓ ${testResult.eventsResult.message}`
                        : `✗ ${testResult.eventsResult.error}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleTestConnection('both')}
              disabled={!!testingTarget || (!pickleballCalendarId && !eventsCalendarId)}
              className="w-full sm:w-auto h-10 px-4 text-xs font-bold border-emerald-300 dark:border-emerald-800 text-[#007d48] dark:text-[#10b981] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full cursor-pointer"
            >
              {testingTarget === 'both' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Testing Both Channels...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1.5" /> Test Both Calendars
                </>
              )}
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 sm:flex-initial h-10 px-5 text-xs rounded-full cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-initial h-10 px-6 text-xs bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] rounded-full font-bold cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save Configuration
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
