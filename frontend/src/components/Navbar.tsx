'use client';

import React, { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Mail, LogOut, ExternalLink, Slack, CheckCircle, AlertCircle } from 'lucide-react';

interface NavbarProps {
  onOpenCompose?: () => void;
}

export function Navbar({ onOpenCompose }: NavbarProps = {}) {
  const { data: session } = useSession();
  const [slackConnected, setSlackConnected] = useState<boolean>(false);
  const userId = (session?.user as any)?.id || '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    // Check Slack connection status
    fetch(`http://localhost:5000/api/slack/connect?userId=${userId}`, { method: 'HEAD' })
      .then(() => setSlackConnected(false))
      .catch(() => setSlackConnected(false));
  }, [userId]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">ReachInbox</h1>
            <p className="text-xs text-slate-400 font-mono">Email Scheduler</p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          {/* Bull Board Admin Dashboard Link */}
          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition"
            title="Open Bull Board Queue Monitor"
          >
            <span>Bull Board</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Slack Connect Button / Status */}
          <a
            href={`http://localhost:5000/api/slack/connect?userId=${userId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition"
            title="Connect Slack for Rate Limit Alerts"
          >
            <Slack className="w-3.5 h-3.5 text-emerald-400" />
            <span>Connect Slack</span>
          </a>

          {/* User Profile */}
          {session?.user && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <img
                src={session.user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.name}`}
                alt={session.user.name || 'User Avatar'}
                className="h-8 w-8 rounded-full border border-slate-700 object-cover"
              />
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-white">{session.user.name}</div>
                <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{session.user.email}</div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
