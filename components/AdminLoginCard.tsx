'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowRight, Lock } from 'lucide-react';

type AdminLoginCardProps = {
  errorMessage?: string | null;
  callbackUrl?: string;
};

export default function AdminLoginCard({ errorMessage = null, callbackUrl = '/admin' }: AdminLoginCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="premium-card p-10 sm:p-12 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 h-64 w-64 bg-emerald-500/5 blur-[80px] pointer-events-none" />
      
      <div className="flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
          <ShieldAlert className="h-10 w-10" />
        </div>
        
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-500">Moderation Gateway</p>
          <h1 className="mt-4 font-display text-4xl text-white">Protected Area</h1>
          <p className="mt-6 max-w-lg mx-auto text-zinc-400 leading-relaxed">
            Administrative access is restricted to verified Townadmins and System Supervisors. Please authenticate via the secure login portal.
          </p>
        </div>

        <div className="mt-10 w-full space-y-6">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3 text-zinc-500">
            <Lock className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium text-left">Your identity must be whitelisted in the system database prior to authentication.</span>
          </div>
          
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-sm">
              {errorMessage}
            </div>
          )}

          <Link 
            href={`/login?intent=townadmin&callbackUrl=${encodeURIComponent(callbackUrl)}`} 
            className="group w-full flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-5 text-sm font-bold text-zinc-950 transition-all hover:bg-zinc-200 hover:scale-[1.02]"
          >
            Authenticate Identity
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}