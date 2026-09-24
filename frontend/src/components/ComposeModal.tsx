'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Papa from 'papaparse';
import { X, Upload, Send, Sparkles, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

interface Sender {
  id: string;
  label: string;
  etherealEmail: string;
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onSuccess?: () => void;
  onScheduled?: () => void;
}

export function ComposeModal({ isOpen, onClose, userId, onSuccess, onScheduled }: ComposeModalProps) {
  const { data: session } = useSession();
  const activeUserId = userId || (session?.user as any)?.id || '00000000-0000-0000-0000-000000000001';
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('Hello,\n\nHope this email finds you well!');
  const [rawRecipients, setRawRecipients] = useState<string>('');
  const [detectedEmails, setDetectedEmails] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<string>('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Set initial default start time (2 minutes in future)
  useEffect(() => {
    const defaultDate = new Date(Date.now() + 2 * 60 * 1000);
    setStartTime(defaultDate.toISOString().slice(0, 16));
  }, []);

  // Fetch senders list from backend
  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE_URL}/api/senders`)
        .then((res) => res.json())
        .then((data) => {
          if (data.senders && data.senders.length > 0) {
            setSenders(data.senders);
            setSelectedSenderId(data.senders[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Extract and parse email addresses from rawRecipients input
  useEffect(() => {
    const extracted = rawRecipients
      .split(/[\s,;\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    // Deduplicate
    const unique = Array.from(new Set(extracted));
    setDetectedEmails(unique);
  }, [rawRecipients]);

  // Handle CSV File Upload via PapaParse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const foundEmails: string[] = [];
        results.data.forEach((row: any) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (typeof cell === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cell.trim())) {
                foundEmails.push(cell.trim().toLowerCase());
              }
            });
          } else if (typeof row === 'object' && row !== null) {
            Object.values(row).forEach((val) => {
              if (typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
                foundEmails.push(val.trim().toLowerCase());
              }
            });
          }
        });

        if (foundEmails.length > 0) {
          const combined = Array.from(new Set([...detectedEmails, ...foundEmails]));
          setRawRecipients(combined.join('\n'));
        }
      },
      error: () => {
        setErrorMsg('Failed to parse CSV file.');
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedSenderId) {
      setErrorMsg('Please select a sender account.');
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('Please enter an email subject.');
      return;
    }
    if (!body.trim()) {
      setErrorMsg('Please enter email content body.');
      return;
    }
    if (detectedEmails.length === 0) {
      setErrorMsg('Please enter or upload at least one valid recipient email.');
      return;
    }

    const startTimestamp = new Date(startTime).getTime();
    if (isNaN(startTimestamp) || startTimestamp < Date.now() - 60000) {
      setErrorMsg('Start time must be a valid future timestamp.');
      return;
    }

    if (delaySeconds < 0) {
      setErrorMsg('Delay between emails must be 0 seconds or greater.');
      return;
    }

    if (hourlyLimit <= 0) {
      setErrorMsg('Hourly send limit must be greater than 0.');
      return;
    }

    setLoading(true);

    try {
      let successCount = 0;

      // Stagger each recipient according to the selected delay
      for (let i = 0; i < detectedEmails.length; i++) {
        const recipient = detectedEmails[i];
        const staggeredScheduledAt = new Date(startTimestamp + i * delaySeconds * 1000).toISOString();

        const res = await fetch(`${API_BASE_URL}/api/emails/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: activeUserId,
            senderId: selectedSenderId,
            recipient,
            subject,
            body,
            scheduledAt: staggeredScheduledAt,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
        }
      }

      setSuccessMsg(`Successfully scheduled ${successCount} email(s) with ${delaySeconds}s staggered delay!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onSuccess?.();
        onScheduled?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to schedule emails.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Compose New Scheduled Campaign</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Sender Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              From Sender Account
            </label>
            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.etherealEmail})
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Important Product Update for your team"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Content Body
            </label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your email body here..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm text-white focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          {/* Recipients / Lead Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Recipients / Leads
              </label>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-medium">
                  {detectedEmails.length} Email(s) Detected
                </span>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition border border-slate-700">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload CSV</span>
                  <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
            <textarea
              rows={3}
              value={rawRecipients}
              onChange={(e) => setRawRecipients(e.target.value)}
              placeholder="Paste email addresses separated by commas, spaces, or newlines..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
            />
          </div>

          {/* Scheduling & Rate Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Start Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Delay Between Sends (sec)</label>
              <input
                type="number"
                min={1}
                max={300}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 2)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Max Hourly Limit</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 50)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Footer Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Schedule {detectedEmails.length} Email(s)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ComposeModal;
