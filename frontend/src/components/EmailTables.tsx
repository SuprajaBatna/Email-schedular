'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Search, Clock, CheckCircle2, AlertTriangle, RefreshCw, Mail, ExternalLink, Inbox, Ban, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface EmailRecord {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  scheduledAt: string;
  sentAt?: string | null;
  failReason?: string | null;
  createdAt: string;
  sender?: {
    label: string;
    etherealEmail: string;
  };
}

interface EmailTablesProps {
  onOpenCompose?: () => void;
}

export function EmailTables({ onOpenCompose }: EmailTablesProps = {}) {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch emails with SWR polling every 3000ms
  const { data, error, isLoading, mutate } = useSWR(
    searchQuery.trim()
      ? `${API_BASE_URL}/api/emails/search?q=${encodeURIComponent(searchQuery)}`
      : `${API_BASE_URL}/api/emails?category=${activeTab}`,
    fetcher,
    { refreshInterval: 3000 }
  );

  const handleCancelEmail = async (emailId: string, recipient: string) => {
    if (!window.confirm(`Are you sure you want to cancel the scheduled email to ${recipient}?`)) {
      return;
    }

    setCancellingId(emailId);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/emails/${emailId}/cancel`, {
        method: 'DELETE',
      });
      const resData = await res.json();

      if (res.ok && resData.success) {
        setFeedbackMsg({ type: 'success', text: `Successfully cancelled email to ${recipient}.` });
        await mutate(); // Automatically refresh scheduled list
      } else {
        setFeedbackMsg({ type: 'error', text: resData.error || 'Failed to cancel email.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Error occurred while cancelling email.' });
    } finally {
      setCancellingId(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const rawEmails: EmailRecord[] = data?.emails || [];

  // Filter by tab when not searching
  const emails = searchQuery.trim()
    ? rawEmails
    : rawEmails.filter((e) =>
        activeTab === 'scheduled'
          ? e.status === 'pending' || e.status === 'processing'
          : e.status === 'sent' || e.status === 'failed' || e.status === 'cancelled'
      );

  return (
    <div className="space-y-6">
      {/* Top Controls: Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => {
              setActiveTab('scheduled');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'scheduled' && !searchQuery
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled Emails</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('sent');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'sent' && !searchQuery
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sent & Delivered</span>
          </button>
        </div>

        {/* Search Bar & Manual Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject, recipient, or body..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <button
            onClick={() => mutate()}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh Table Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-medium ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Table Content */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl overflow-hidden backdrop-blur-md">
        {isLoading ? (
          /* Loading Skeletons */
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : emails.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <div className="p-3 rounded-full bg-slate-800/50 text-slate-500 border border-slate-700/50">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">
              {searchQuery ? 'No matching emails found' : `No ${activeTab} emails yet`}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {searchQuery
                ? `No email records matched '${searchQuery}'. Try another query.`
                : activeTab === 'scheduled'
                ? 'Click "Compose New Email" above to schedule a batch campaign.'
                : 'Emails will appear here once executed by background workers.'}
            </p>
          </div>
        ) : (
          /* Emails Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Recipient</th>
                  <th className="px-6 py-3.5">Subject</th>
                  <th className="px-6 py-3.5">Sender</th>
                  <th className="px-6 py-3.5">{activeTab === 'scheduled' ? 'Scheduled At' : 'Sent / Status Time'}</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-mono font-medium text-indigo-300">{email.recipient}</td>
                    <td className="px-6 py-4 font-medium text-white max-w-xs truncate">{email.subject}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {email.sender ? email.sender.label : 'Default Sender'}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {new Date(email.sentAt || email.scheduledAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {email.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>Pending</span>
                        </span>
                      )}
                      {email.status === 'processing' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                          <span>Processing</span>
                        </span>
                      )}
                      {email.status === 'sent' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Sent</span>
                        </span>
                      )}
                      {email.status === 'failed' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>Failed</span>
                        </span>
                      )}
                      {email.status === 'cancelled' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Cancelled</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {email.status === 'pending' ? (
                        <button
                          onClick={() => handleCancelEmail(email.id, email.recipient)}
                          disabled={cancellingId === email.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[11px] font-medium transition disabled:opacity-50"
                          title="Cancel/Unschedule Email"
                        >
                          {cancellingId === email.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Cancelling...</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-3 h-3" />
                              <span>Cancel</span>
                            </>
                          )}
                        </button>
                      ) : email.failReason ? (
                        <span
                          className="text-rose-400 hover:underline cursor-pointer truncate max-w-[150px] inline-block"
                          title={email.failReason}
                        >
                          {email.failReason}
                        </span>
                      ) : email.status === 'sent' ? (
                        <span className="text-emerald-400/80 font-mono text-[10px]">Delivered</span>
                      ) : email.status === 'cancelled' ? (
                        <span className="text-slate-500 font-mono text-[10px]">Cancelled</span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">Queued</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailTables;
