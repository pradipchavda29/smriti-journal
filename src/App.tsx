import React, { useState, useEffect, useRef } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  doc,
  testConnection,
  handleFirestoreError,
  User,
} from './lib/firebase';
import { JournalInteraction, ReflectionMode, OperationType, ChatMessage } from './types';
import { sanitizePayload, formatErrorMessage } from './lib/sanitizer';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { HistoryList } from './components/HistoryList';
import { ReflectionEditor } from './components/ReflectionEditor';
import { EntryDetailView } from './components/EntryDetailView';
import { SecurityModal } from './components/SecurityModal';
import { AskPastSelfView } from './components/AskPastSelfView';
import { AdminDashboard } from './components/AdminDashboard';
import { DashboardView } from './components/DashboardView';
import { AlertCircle, Menu, X, ShieldAlert, Sparkles } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'journal' | 'ask' | 'admin' | 'dashboard'>('journal');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeModel, setActiveModel] = useState<string>('gemini-3.6-flash');
  const [initialAskQuery, setInitialAskQuery] = useState<string | null>(null);

  // Journal entries state
  const [entries, setEntries] = useState<JournalInteraction[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  // Submission & AI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isRespondingFollowUp, setIsRespondingFollowUp] = useState(false);

  // Mobile sidebar toggle
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Embedding backfill state
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{ current: number; total: number } | null>(null);
  const [missingEmbeddingCount, setMissingEmbeddingCount] = useState<number>(0);

  // Cached pending payload for retry save capability
  const pendingPayloadRef = useRef<{
    content: string;
    mode: ReflectionMode;
    title?: string;
  } | null>(null);

  // Check for interactions missing matching embedding document (excluding flagged entries)
  const checkMissingEmbeddings = async () => {
    if (!user || entries.length === 0) {
      setMissingEmbeddingCount(0);
      return;
    }
    try {
      const embeddingsSnap = await getDocs(collection(db, 'users', user.uid, 'embeddings'));
      const existingIds = new Set(embeddingsSnap.docs.map((d) => d.id));
      // Flagged entries are strictly excluded from embedding generation
      const missing = entries.filter((e) => !e.flagged && !existingIds.has(e.id));
      setMissingEmbeddingCount(missing.length);
    } catch (err) {
      console.warn('Failed to check existing embeddings:', err);
    }
  };

  useEffect(() => {
    checkMissingEmbeddings();
  }, [user, entries]);

  // One-time backfill action: sequentially embeds interactions missing an embedding document
  // Skips flagged entries to keep the semantic retrieval corpus clean
  const handleBackfillEmbeddings = async () => {
    if (!user || isBackfilling || entries.length === 0) return;

    setIsBackfilling(true);
    setGlobalError(null);

    try {
      const embeddingsSnap = await getDocs(collection(db, 'users', user.uid, 'embeddings'));
      const existingIds = new Set(embeddingsSnap.docs.map((d) => d.id));
      const missing = entries.filter((e) => !e.flagged && !existingIds.has(e.id));

      if (missing.length === 0) {
        setMissingEmbeddingCount(0);
        setIsBackfilling(false);
        return;
      }

      setBackfillProgress({ current: 0, total: missing.length });

      let processed = 0;
      for (const entry of missing) {
        try {
          const token = await user.getIdToken();
          const embRes = await fetch('/api/embeddings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              interactionId: entry.id,
              text: `${entry.title}: ${entry.content.slice(0, 500)}`,
            }),
          });

          if (embRes.ok) {
            const embData = await embRes.json();
            if (embData.embedding) {
              const cleanEmb = sanitizePayload(embData.embedding);
              // Document ID strictly matches interactionId
              await setDoc(doc(db, 'users', user.uid, 'embeddings', entry.id), cleanEmb);
            }
          } else {
            console.warn(`Backfill embedding failed for ${entry.id}: status ${embRes.status}`);
          }
        } catch (itemErr) {
          console.warn(`Backfill embedding error for ${entry.id}:`, itemErr);
        }

        processed++;
        setBackfillProgress({ current: processed, total: missing.length });

        // Sequential delay (350ms) to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      await checkMissingEmbeddings();
    } catch (err: any) {
      console.error('Embedding backfill failed:', err);
      setGlobalError(formatErrorMessage(err, 'Embedding backfill process failed.'));
    } finally {
      setIsBackfilling(false);
      setBackfillProgress(null);
    }
  };

  // Admin role check from cryptographically verified Firebase ID token claims
  const checkAdminRole = async (currentUser: User | null, forceRefresh = false) => {
    if (!currentUser) {
      setIsAdmin(false);
      return;
    }
    try {
      const tokenResult = await currentUser.getIdTokenResult(forceRefresh);
      const role =
        (tokenResult.claims.role as string) || (tokenResult.claims.admin ? 'admin' : undefined);
      setIsAdmin(role === 'admin');
    } catch (err) {
      console.warn('Failed to evaluate admin role from token claims:', err);
      setIsAdmin(false);
    }
  };

  // Auth state listener & connection verification
  useEffect(() => {
    testConnection().catch((err) => console.warn('Connection check warning:', err));

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setEntries([]);
        setSelectedEntryId(null);
        setIsAdmin(false);
      } else {
        await checkAdminRole(currentUser);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firestore Real-Time Subscription
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setEntriesLoading(false);
      return;
    }

    setEntriesLoading(true);
    const collectionPath = `users/${user.uid}/interactions`;
    const interactionsRef = collection(db, 'users', user.uid, 'interactions');
    const q = query(interactionsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: JournalInteraction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            userId: data.userId || user.uid,
            title: data.title || 'Untitled Reflection',
            content: data.content || '',
            response: data.response || '',
            mode: data.mode || 'reflect',
            messages: Array.isArray(data.messages) ? data.messages : [],
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            modelUsed: data.modelUsed,
            flagged: Boolean(data.flagged),
            flagReason: data.flagReason || undefined,
          });
        });
        setEntries(loaded);
        setEntriesLoading(false);
      },
      (error) => {
        setEntriesLoading(false);
        try {
          handleFirestoreError(error, OperationType.LIST, collectionPath);
        } catch (wrapped) {
          setGlobalError(
            'Unable to load your private entries from Firestore. Please verify permissions or network status.'
          );
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle Google Sign In
  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setGlobalError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setGlobalError(formatErrorMessage(err, 'Google Sign-In was cancelled or failed.'));
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      setSelectedEntryId(null);
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  // Submit new reflection with Gemini & Firestore
  const handleCreateReflection = async (
    content: string,
    mode: ReflectionMode,
    customTitle?: string
  ) => {
    if (!user) {
      setGlobalError('Please sign in to write reflections.');
      return;
    }

    setIsSubmitting(true);
    setSaveError(null);
    pendingPayloadRef.current = { content, mode, title: customTitle };

    try {
      // Obtain verified Firebase ID token
      const idToken = await user.getIdToken();

      // 1. Call server-side API with resilient Gemini fallback ladder and verified ID token
      const apiRes = await fetch('/api/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          prompt: content,
          mode,
          existingTitle: customTitle,
        }),
      });

      if (!apiRes.ok) {
        const errorData = await apiRes.json().catch(() => ({}));
        if (errorData.code === 'PROMPT_INJECTION_REJECTED') {
          throw new Error('Security Exception: Prompt injection detected. System role/instruction overrides are prohibited. Your input draft was kept intact.');
        }
        const errorMsg = formatErrorMessage(errorData.error || `Server returned error status ${apiRes.status}`);
        throw new Error(errorMsg);
      }

      const { response: aiResponse, title: aiTitle, modelUsed, flagged, flagReason } = await apiRes.json();
      if (modelUsed && modelUsed !== 'none') {
        setActiveModel(modelUsed);
      }

      // 2. Persist to Firestore under isolated path /users/{userId}/interactions/{interactionId}
      const entryId = 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const collectionPath = `users/${user.uid}/interactions/${entryId}`;

      const interactionData: JournalInteraction = {
        id: entryId,
        userId: user.uid,
        title: customTitle || aiTitle || (flagged ? 'Journal Entry (Saved)' : 'Journal Reflection'),
        content,
        response: aiResponse,
        mode,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        modelUsed: modelUsed || 'none',
        flagged: Boolean(flagged),
        flagReason: flagReason || undefined,
      };

      const cleanPayload = sanitizePayload(interactionData);

      try {
        await setDoc(doc(db, 'users', user.uid, 'interactions', entryId), cleanPayload);
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.WRITE, collectionPath);
      }

      // 3. Retrieval Security: Generate and store embedding strictly under /users/{uid}/embeddings/{entryId}
      // Document ID strictly matches interactionId for 1:1 direct relationship.
      // MANDATE: Skip embedding generation for flagged entries so they never enter the retrieval corpus.
      if (!flagged) {
        try {
          const embToken = await user.getIdToken();
          const embRes = await fetch('/api/embeddings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${embToken}`,
            },
            body: JSON.stringify({
              interactionId: entryId,
              text: `${interactionData.title}: ${content.slice(0, 500)}`,
            }),
          });
          if (embRes.ok) {
            const embData = await embRes.json();
            if (embData.embedding) {
              const cleanEmb = sanitizePayload(embData.embedding);
              console.log('[DIAGNOSTIC] Writing embedding document to Firestore:', `users/${user.uid}/embeddings/${entryId}`);
              // Save with document ID strictly equal to entryId (interactionId)
              await setDoc(doc(db, 'users', user.uid, 'embeddings', entryId), cleanEmb);
              console.log('[DIAGNOSTIC] Successfully wrote embedding to Firestore for entryId:', entryId);
            } else {
              console.error('[DIAGNOSTIC] /api/embeddings response missing embedding object:', embData);
            }
          } else {
            const errBody = await embRes.text();
            console.error('[DIAGNOSTIC] /api/embeddings request failed:', {
              status: embRes.status,
              statusText: embRes.statusText,
              body: errBody,
            });
          }
        } catch (embErr: any) {
          console.error('[DIAGNOSTIC] Embedding write path exception:', {
            message: embErr?.message || embErr,
            code: embErr?.code,
            stack: embErr?.stack,
          });
        }
      }

      // Confirmed write success: clear pending cache, update missing count, & select entry
      pendingPayloadRef.current = null;
      setSelectedEntryId(entryId);
      checkMissingEmbeddings().catch(() => {});
    } catch (err: any) {
      console.error('Error creating reflection:', err);
      setSaveError(
        formatErrorMessage(err, 'Failed to generate response or save reflection to Firestore.')
      );
      throw err; // Re-throw so ReflectionEditor knows NOT to clear buffer
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retry save callback if prior save encountered network / db issue
  const handleRetrySave = async () => {
    if (!pendingPayloadRef.current) return;
    const { content, mode, title } = pendingPayloadRef.current;
    await handleCreateReflection(content, mode, title);
  };

  // Handle follow-up multi-turn conversation
  const handleFollowUp = async (prompt: string) => {
    const selectedEntry = entries.find((e) => e.id === selectedEntryId);
    if (!selectedEntry || !user) return;

    setIsRespondingFollowUp(true);
    setGlobalError(null);

    try {
      // Build conversation history array
      const history = [
        { role: 'user', content: selectedEntry.content },
        { role: 'model', content: selectedEntry.response },
        ...selectedEntry.messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const idToken = await user.getIdToken();
      const apiRes = await fetch('/api/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          prompt,
          conversation: history,
          mode: selectedEntry.mode,
          existingTitle: selectedEntry.title,
        }),
      });

      if (!apiRes.ok) {
        const errJson = await apiRes.json().catch(() => ({}));
        const errText = formatErrorMessage(errJson.error || 'Failed to receive reply from Gemini.');
        throw new Error(errText);
      }

      const { response: aiReply, modelUsed, flagged, flagReason } = await apiRes.json();

      const userMsg: ChatMessage = {
        id: 'msg_' + Date.now(),
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
      };

      const modelMsg: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'model',
        content: aiReply,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...(selectedEntry.messages || []), userMsg, modelMsg];
      const docPath = `users/${user.uid}/interactions/${selectedEntry.id}`;

      const updateData = sanitizePayload({
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
        modelUsed: modelUsed || selectedEntry.modelUsed,
        ...(flagged ? { flagged: true, flagReason: flagReason || 'instruction_override' } : {}),
      });

      try {
        await updateDoc(doc(db, 'users', user.uid, 'interactions', selectedEntry.id), updateData);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, docPath);
      }
    } catch (err: any) {
      console.error('Follow-up error:', err);
      setGlobalError(formatErrorMessage(err, 'Could not send follow-up message.'));
    } finally {
      setIsRespondingFollowUp(false);
    }
  };

  // Delete an entry
  const handleDeleteEntry = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;

    if (!window.confirm('Are you sure you want to delete this reflection?')) return;

    const docPath = `users/${user.uid}/interactions/${id}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'interactions', id));
      if (selectedEntryId === id) {
        setSelectedEntryId(null);
      }
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, docPath);
      } catch (wrapped) {
        setGlobalError('Failed to delete reflection from Firestore.');
      }
    }
  };

  const selectedEntry = entries.find((e) => e.id === selectedEntryId);

  return (
    <div className="flex min-h-screen flex-col bg-stone-100 text-stone-900 font-sans">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isSigningIn={isSigningIn}
        isAdmin={isAdmin}
        onNewEntry={() => {
          setSelectedEntryId(null);
          setActiveView('journal');
          setMobileSidebarOpen(false);
        }}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onOpenDashboard={() => {
          setActiveView('dashboard');
          setSelectedEntryId(null);
          setMobileSidebarOpen(false);
        }}
        onOpenAskPastSelf={() => {
          setActiveView('ask');
          setInitialAskQuery(null);
          setSelectedEntryId(null);
          setMobileSidebarOpen(false);
        }}
        onOpenAdmin={() => {
          setActiveView('admin');
          setSelectedEntryId(null);
          setMobileSidebarOpen(false);
        }}
        activeView={activeView}
        activeModel={activeModel}
      />

      {/* Global Error Banner */}
      {globalError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {authLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-amber-800 border-t-transparent mb-3" />
            <p className="text-xs font-medium text-stone-500">Checking authentication...</p>
          </div>
        </div>
      ) : !user ? (
        /* Landing View when unauthenticated */
        <LandingView onSignIn={handleSignIn} isSigningIn={isSigningIn} />
      ) : (
        /* Authenticated Dashboard */
        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile sidebar toggle button */}
          <div className="lg:hidden absolute bottom-4 right-4 z-40">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-white shadow-lg active:scale-95 transition"
            >
              {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Left History Panel (Desktop & Mobile Drawer) */}
          <div
            className={`fixed inset-y-0 left-0 z-30 w-72 sm:w-80 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
              mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <HistoryList
              entries={entries}
              selectedId={selectedEntryId}
              onSelect={(entry) => {
                setSelectedEntryId(entry.id);
                setActiveView('journal');
                setMobileSidebarOpen(false);
              }}
              onDelete={handleDeleteEntry}
              isLoading={entriesLoading}
              onNewEntry={() => {
                setSelectedEntryId(null);
                setActiveView('journal');
                setMobileSidebarOpen(false);
              }}
              missingEmbeddingCount={missingEmbeddingCount}
              isBackfilling={isBackfilling}
              backfillProgress={backfillProgress}
              onBackfill={handleBackfillEmbeddings}
            />
          </div>

          {/* Backdrop for mobile sidebar */}
          {mobileSidebarOpen && (
            <div
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 z-20 bg-stone-900/20 backdrop-blur-xs lg:hidden"
            />
          )}

          {/* Right Main Stage (Admin Dashboard, Ask Past Self, Entry Detail, or Editor) */}
          <main className="flex-1 overflow-y-auto bg-white">
            {activeView === 'admin' ? (
              <AdminDashboard
                user={user}
                onBackToJournal={() => setActiveView('journal')}
                onRefreshRole={async () => {
                  if (user) await checkAdminRole(user, true);
                }}
              />
            ) : activeView === 'dashboard' ? (
              <DashboardView
                user={user}
                onNewEntry={() => {
                  setSelectedEntryId(null);
                  setActiveView('journal');
                }}
                onSelectTheme={(themeLabel) => {
                  setInitialAskQuery(themeLabel);
                  setActiveView('ask');
                }}
              />
            ) : activeView === 'ask' ? (
              <AskPastSelfView
                user={user}
                entries={entries}
                initialQuery={initialAskQuery}
                onSelectEntry={(entry) => {
                  setSelectedEntryId(entry.id);
                  setActiveView('journal');
                }}
                onNewEntry={() => {
                  setSelectedEntryId(null);
                  setActiveView('journal');
                }}
              />
            ) : selectedEntry ? (
              <EntryDetailView
                entry={selectedEntry}
                onFollowUp={handleFollowUp}
                isResponding={isRespondingFollowUp}
                onDelete={(id) => handleDeleteEntry(id)}
                onClose={() => setSelectedEntryId(null)}
              />
            ) : (
              <div className="h-full">
                <div className="border-b border-stone-200 bg-stone-50/50 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-700" />
                    <h2 className="text-sm font-semibold text-stone-900">New Reflection</h2>
                  </div>
                  <span className="text-xs text-stone-400">
                    Isolated to your Google ID: <span className="font-mono text-[11px]">{user.email}</span>
                  </span>
                </div>
                <ReflectionEditor
                  onSubmit={handleCreateReflection}
                  isSubmitting={isSubmitting}
                  saveError={saveError}
                  onRetry={handleRetrySave}
                />
              </div>
            )}
          </main>
        </div>
      )}

      {/* Security & Governance Modal */}
      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        user={user}
      />
    </div>
  );
}
