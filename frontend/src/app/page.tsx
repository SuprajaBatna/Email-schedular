'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import EmailTables from '@/components/EmailTables';
import ComposeModal from '@/components/ComposeModal';
import { Plus, Mail, Loader2, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium animate-pulse">Loading ReachInbox Dashboard...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="fixed top-0 left-1/4 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent blur-3xl rounded-full pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tl from-cyan-600/10 via-indigo-600/5 to-transparent blur-3xl rounded-full pointer-events-none" />

      {/* Navbar */}
      <Navbar onOpenCompose={() => setIsComposeOpen(true)} />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 space-y-6">
        {/* Welcome & Quick Action Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ReachInbox Email Dispatcher</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Campaign & Email Management
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Schedule, track, and optimize high-volume multi-sender email dispatches.
            </p>
          </div>

          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-200 active:scale-95 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
            <span>Compose New Email</span>
          </button>
        </div>

        {/* Email Tables Component */}
        <EmailTables onOpenCompose={() => setIsComposeOpen(true)} />
      </main>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onScheduled={() => {
          // Mutate/refresh handled inside ComposeModal via window dispatch or SWR
        }}
      />
    </div>
  );
}

