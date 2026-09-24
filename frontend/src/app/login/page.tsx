'use client';

import React from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'authenticated') {
    router.push('/');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 blur-3xl rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-md space-y-8 bg-slate-900/80 p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-2">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            ReachInbox
          </h1>
          <p className="text-sm text-slate-400">
            Sign in to access your distributed email scheduler dashboard
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white font-medium transition shadow-sm hover:shadow group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Sign in with Google</span>
            <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition" />
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-xs text-slate-500 font-mono uppercase">Or Quick Test</span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          <button
            onClick={() => signIn('credentials', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-lg shadow-indigo-600/20"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Developer Test Account Sign In</span>
          </button>
        </div>

        <div className="text-center pt-2">
          <span className="text-xs text-slate-500 font-mono">
            Powered by NextAuth.js &bull; BullMQ &bull; PostgreSQL
          </span>
        </div>
      </div>
    </div>
  );
}
