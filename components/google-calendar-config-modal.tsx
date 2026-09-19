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
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveGoogleCalendarSettings, testGoogleCalendarSyncAction, getGoogleCalendarSettingsAction } from '@/app/actions';

interface GoogleCalendarConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCalendarId?: string;
  initialServiceEmail?: string;
}

export function GoogleCalendarConfigModal({
  isOpen,
  onClose,
  initialCalendarId = '',
  initialServiceEmail = '',
}: GoogleCalendarConfigModalProps) {
  const [calendarId, setCalendarId] = useState(initialCalendarId);
  const [serviceAccountEmail, setServiceAccountEmail] = useState(initialServiceEmail);
  const [privateKey, setPrivateKey] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingSettings(true);
    getGoogleCalendarSettingsAction().then((res) => {
      if (!isMounted) return;
      setIsLoadingSettings(false);
      if (res.success) {
        if (res.calendarId) setCalendarId(res.calendarId);
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
      calendarId: calendarId.trim(),
      serviceAccountEmail: serviceAccountEmail.trim() || undefined,
      privateKey: privateKey.trim() || undefined,
      autoSyncEnabled,
    });

    setIsSaving(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: 'Google Calendar configuration saved successfully!',
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to save configuration.',
      });
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const res = await testGoogleCalendarSyncAction();
    setIsTesting(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: res.message || 'Connection verified! Test event successfully created on Google Calendar.',
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Test failed. Please verify your calendar permissions and service account key.',
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
              Direct API Auto-Sync Engine
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Automated Google Calendar Sync
          </h2>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
            Instantly pushes Events Place, View Deck, and Court reservations to your Google Calendar the moment a down payment or payment is received.
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
              placeholder="Paste the raw contents of your downloaded JSON key file here to auto-fill..."
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

          {/* Target Calendar ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="targetCalId" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#007d48]" />
                Target Google Calendar ID / Email
              </Label>
              <span className="text-[10px] text-[#707072] dark:text-[#8a8a93]">
                e.g. yourname@gmail.com
              </span>
            </div>
            <Input
              id="targetCalId"
              placeholder="e.g. cjpickleball.events@gmail.com or your primary Gmail"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              required
              className="h-10 px-4 rounded-xl bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-xs font-medium"
            />
            <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
              Events will be created directly in this Google Calendar account.
            </p>
          </div>

          {/* Service Account Client Email */}
          <div className="space-y-1.5">
            <Label htmlFor="svcEmail" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#007d48]" />
              Google Cloud Service Account Email
            </Label>
            <Input
              id="svcEmail"
              placeholder="e.g. cj-sync@your-project-id.iam.gserviceaccount.com"
              value={serviceAccountEmail}
              onChange={(e) => setServiceAccountEmail(e.target.value)}
              className="h-10 px-4 rounded-xl bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-xs font-mono"
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
                // If user pasted full JSON into private key textarea
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
              className="w-full p-3 rounded-xl bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-[11px] font-mono outline-none"
            />
          </div>

          {/* Auto-Sync Toggle */}
          <div className="p-4 rounded-2xl bg-[#f5f5f5] dark:bg-[#18181c] border border-[#e5e5e5] dark:border-[#27272a] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground">
                Automatic Push on Down Payment
              </span>
              <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
                When enabled, every PayMongo checkout or cashier down payment triggers immediate sync to your Google Calendar.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
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
              <HelpCircle className="w-4 h-4" /> Quick 2-Minute Google Setup:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-[11px]">
              <li>
                In <strong>Google Cloud Console</strong> &gt; IAM &amp; Admin &gt; Service Accounts, create a service account and generate a <strong>JSON Key</strong>.
              </li>
              <li>
                Copy the <code>client_email</code> and <code>private_key</code> into the fields above.
              </li>
              <li>
                Open <strong>Google Calendar</strong> ([calendar.google.com](https://calendar.google.com)), click the 3 dots next to your calendar &gt; <strong>Settings and sharing</strong>.
              </li>
              <li>
                Under <strong>&quot;Share with specific people&quot;</strong>, add your Service Account email and set permission to <strong>&quot;Make changes to events&quot;</strong>.
              </li>
            </ol>
          </div>

          {/* Test Connection Result Box */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-[#007d48]'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-[#d30005]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !calendarId}
              className="w-full sm:w-auto h-10 px-4 text-xs font-bold border-emerald-300 dark:border-emerald-800 text-[#007d48] dark:text-[#10b981] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full cursor-pointer"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Testing Sync...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1.5" /> Send Test Event to Google
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
