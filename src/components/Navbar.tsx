import React from 'react';
import { User } from '../lib/firebase';
import { Sparkles, LogOut, ShieldCheck, UserCircle, BookOpen, Compass, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isSigningIn: boolean;
  onNewEntry: () => void;
  onOpenSecurityModal: () => void;
  onOpenDashboard?: () => void;
  onOpenAskPastSelf?: () => void;
  onOpenAdmin?: () => void;
  isAdmin?: boolean;
  activeView?: 'journal' | 'ask' | 'admin' | 'dashboard';
  activeModel?: string;
}

const formatModelName = (model?: string) => {
  if (!model || model === 'none') return 'Gemini 3.6 Flash';
  if (model === 'gemini-3.6-flash') return 'Gemini 3.6 Flash';
  if (model === 'gemini-3.1-flash-lite') return 'Gemini 3.1 Flash-Lite';
  if (model === 'gemini-flash-latest') return 'Gemini Flash';
  if (model === 'gemini-3.7-flash') return 'Gemini 3.7 Flash';
  return model;
};

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignIn,
  onSignOut,
  isSigningIn,
  onNewEntry,
  onOpenSecurityModal,
  onOpenDashboard,
  onOpenAskPastSelf,
  onOpenAdmin,
  isAdmin = false,
  activeView = 'journal',
  activeModel = 'gemini-3.6-flash',
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-stone-200 bg-stone-50/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-700 text-stone-50 shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight text-stone-900">Smriti</span>
              <span
                id="active-model-badge"
                title={`Active Gemini Model: ${activeModel}`}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
              >
                <Sparkles className="h-3 w-3 text-amber-700" />
                {formatModelName(activeModel)}
              </span>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">A journal that remembers</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="security-controls-btn"
            onClick={onOpenSecurityModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100/80 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 transition"
            title="View Security & Defense Architecture"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="hidden md:inline">Security Shield</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Admin Dashboard button - shown only when verified token carries role === 'admin' */}
              {isAdmin && onOpenAdmin && (
                <button
                  id="navbar-admin-btn"
                  onClick={onOpenAdmin}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition active:scale-95 ${
                    activeView === 'admin'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                  title="Admin Governance Dashboard"
                >
                  <ShieldCheck className={`h-4 w-4 ${activeView === 'admin' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span>Admin</span>
                </button>
              )}

              {onOpenDashboard && (
                <button
                  id="navbar-dashboard-btn"
                  onClick={onOpenDashboard}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition active:scale-95 ${
                    activeView === 'dashboard'
                      ? 'bg-amber-800 text-white shadow-xs'
                      : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                  title="Personal insights, trends, and action items"
                >
                  <LayoutDashboard className={`h-4 w-4 ${activeView === 'dashboard' ? 'text-amber-300' : 'text-amber-700'}`} />
                  <span>Dashboard</span>
                </button>
              )}

              {onOpenAskPastSelf && (
                <button
                  id="navbar-ask-past-self-btn"
                  onClick={onOpenAskPastSelf}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition active:scale-95 ${
                    activeView === 'ask'
                      ? 'bg-amber-800 text-white shadow-xs'
                      : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                  title="Grounded retrieval over your journal history"
                >
                  <Compass className={`h-4 w-4 ${activeView === 'ask' ? 'text-amber-300' : 'text-amber-700'}`} />
                  <span>Ask Past Self</span>
                </button>
              )}

              <button
                id="navbar-new-entry-btn"
                onClick={onNewEntry}
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                  activeView === 'journal'
                    ? 'bg-stone-900 text-white shadow-sm hover:bg-stone-800'
                    : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>New Reflection</span>
              </button>

              <div className="flex items-center gap-2.5 rounded-full border border-stone-200 bg-white py-1 pl-1.5 pr-3 shadow-xs">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-stone-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                    <UserCircle className="h-5 w-5" />
                  </div>
                )}
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-stone-900 leading-tight">
                    {user.displayName || 'Journalist'}
                  </span>
                  <span className="text-[10px] text-stone-500 leading-tight truncate max-w-[120px]">
                    {user.email}
                  </span>
                </div>
              </div>

              <button
                id="sign-out-btn"
                onClick={onSignOut}
                title="Sign out from Smriti"
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-100 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-600 bg-stone-200/60 rounded-full px-2.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>User Isolated Firestore</span>
              </div>
              <button
                id="sign-in-btn"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-800 active:scale-95 transition disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                <span>{isSigningIn ? 'Connecting...' : 'Sign In with Google'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
