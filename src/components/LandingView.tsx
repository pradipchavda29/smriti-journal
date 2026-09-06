import React from 'react';
import { Lock, Compass, BookOpen, ShieldCheck, ArrowRight } from 'lucide-react';

interface LandingViewProps {
  onSignIn: () => void;
  isSigningIn: boolean;
}

export const LandingView: React.FC<LandingViewProps> = ({ onSignIn, isSigningIn }) => {
  return (
    <div className="min-h-[calc(100vh-65px)] bg-stone-100/60 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3.5 py-1 text-xs font-medium text-stone-700 shadow-2xs mb-6">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Private, user-isolated storage</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl font-serif">
          A journal that remembers.
        </h1>
        <p className="mt-4 text-lg leading-8 text-stone-600 max-w-2xl mx-auto">
          Most journals become archives you never open again. Smriti turns your past entries into searchable memory — ask your own history a question and get an answer grounded only in what you actually wrote.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="hero-sign-in-btn"
            onClick={onSignIn}
            disabled={isSigningIn}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-xl bg-amber-800 px-6 py-3.5 text-base font-semibold text-white shadow-md hover:bg-amber-900 active:scale-98 transition disabled:opacity-60"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isSigningIn ? 'Opening Google Auth...' : 'Continue with Google'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Feature pillars */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 text-left">
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800 mb-4">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-stone-900">Ask Your Past Self</h3>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Retrieve past decisions, feelings, and recurring themes using vector similarity. Answers are strictly grounded in your actual entries with dates and citations.
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800 mb-4">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-stone-900">Isolated &amp; Private</h3>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Every entry lives under your authenticated UID in Firestore. No global ranking, no cross-user leaks, and strict owner-bound rules protect your writing.
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800 mb-4">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-stone-900">Continuous History</h3>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Write stream-of-consciousness entries, unpack complex choices, and follow up anytime. Your history stays intact and searchable across sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
