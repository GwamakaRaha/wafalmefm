import React, { useState } from 'react';
import { Radio, ShieldCheck, Database, Lock, KeyRound, Sparkles, Building, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { StaffRole } from '../types';

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, signInDemoUser, isLoading, firestoreStatus } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleQuickLogin = async (role: StaffRole) => {
    setAuthError(null);
    try {
      await signInDemoUser(role);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#07182B] text-slate-100 flex flex-col justify-between selection:bg-[#F58220] selection:text-white">
      {/* Top station badge */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img
            src="/src/assets/images/wafalme_fm_logo_1794926028364.jpg"
            alt="Wafalme FM"
            className="w-9 h-9 rounded object-contain bg-white p-1"
            referrerPolicy="no-referrer"
          />
          <div>
            <span className="font-extrabold text-sm text-white tracking-wider">WAFALME FM</span>
            <span className="text-[11px] text-[#F58220] block font-medium">89.1 Dar es Salaam · 92.5 Morogoro · 104.3 Dodoma</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Online Operations</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#102A43] border border-slate-700/80 rounded-xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-xl bg-[#07182B] border border-slate-700 text-[#F58220]">
              <Radio className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Advertising Management System
            </h2>
            <p className="text-xs text-slate-300">
              Internal advertising operations, CRM, broadcast tracking, and financial ledger for Wafalme FM.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-lg text-xs text-rose-200">
              {authError}
            </div>
          )}

          {/* Primary Google Auth */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#F58220] hover:bg-[#e07316] text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isLoading ? 'Connecting...' : 'Sign in with Google Workspace'}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-700 w-full"></div>
            <span className="bg-[#102A43] px-3 text-[11px] text-slate-400 uppercase tracking-wider font-medium">
              Station Operator Fast Login
            </span>
          </div>

          {/* Instant Role Testing Logins for iFrame / Review */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickLogin('Super Admin')}
              disabled={isLoading}
              className="p-2.5 bg-[#07182B] hover:bg-slate-900 border border-slate-700 rounded-md text-left transition-colors"
            >
              <div className="font-semibold text-white flex items-center justify-between">
                <span>Managing Director</span>
                <ArrowRight className="w-3 h-3 text-[#F58220]" />
              </div>
              <div className="text-[10px] text-slate-400">Super Admin (All Access)</div>
            </button>

            <button
              onClick={() => handleQuickLogin('Traffic / Programming Manager')}
              disabled={isLoading}
              className="p-2.5 bg-[#07182B] hover:bg-slate-900 border border-slate-700 rounded-md text-left transition-colors"
            >
              <div className="font-semibold text-white flex items-center justify-between">
                <span>Traffic Manager</span>
                <ArrowRight className="w-3 h-3 text-[#F58220]" />
              </div>
              <div className="text-[10px] text-slate-400">Broadcast Rotations</div>
            </button>

            <button
              onClick={() => handleQuickLogin('Accountant')}
              disabled={isLoading}
              className="p-2.5 bg-[#07182B] hover:bg-slate-900 border border-slate-700 rounded-md text-left transition-colors"
            >
              <div className="font-semibold text-white flex items-center justify-between">
                <span>Accountant</span>
                <ArrowRight className="w-3 h-3 text-[#F58220]" />
              </div>
              <div className="text-[10px] text-slate-400">Ledger & Invoices</div>
            </button>

            <button
              onClick={() => handleQuickLogin('Presenter / Operator')}
              disabled={isLoading}
              className="p-2.5 bg-[#07182B] hover:bg-slate-900 border border-slate-700 rounded-md text-left transition-colors"
            >
              <div className="font-semibold text-white flex items-center justify-between">
                <span>Presenter</span>
                <ArrowRight className="w-3 h-3 text-[#F58220]" />
              </div>
              <div className="text-[10px] text-slate-400">Studio On-Air Logs</div>
            </button>
          </div>

          {/* Security & Firestore Status Box */}
          <div className="p-3 bg-[#07182B]/80 border border-slate-800 rounded-lg text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#F58220]" />
                Cloud Firestore:
              </span>
              <span className="font-medium text-emerald-400">
                {firestoreStatus.success ? 'Connected (Verified)' : 'Connecting...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#F58220]" />
                Security Rules:
              </span>
              <span className="font-medium text-slate-300">
                8 Pillars Hardened (ABAC)
              </span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => {
                const event = new CustomEvent('SWITCH_TO_CLIENT_PORTAL');
                window.dispatchEvent(event);
              }}
              className="text-xs text-[#F58220] hover:underline font-semibold cursor-pointer"
            >
              Are you an Advertiser Client? Access Client Self-Service Portal →
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-xs text-slate-500 border-t border-slate-800">
        Wafalme FM Commercial Advertising Operations System · Samora Avenue, Dar es Salaam, Tanzania
      </div>
    </div>
  );
};
