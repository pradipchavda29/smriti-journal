import React, { useState, useEffect } from 'react';
import { User } from '../lib/firebase';
import { JournalInteraction, AskResponse, AskSource } from '../types';
import { formatErrorMessage } from '../lib/sanitizer';
import {
  Compass,
  Search,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Calendar,
  FileText,
  Loader2,
  BookOpen,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';

interface AskPastSelfViewProps {
  user: User;
  entries: JournalInteraction[];
  onSelectEntry: (entry: JournalInteraction) => void;
  onNewEntry: () => void;
  initialQuery?: string | null;
}

const SAMPLE_QUESTIONS = [
  'What were my main sources of stress and how did I cope?',
  'What goals or habits have I been focusing on lately?',
  'What did I reflect on regarding my career or creative projects?',
  'What moments brought me gratitude or happiness recently?',
];

export const AskPastSelfView: React.FC<AskPastSelfViewProps> = ({
  user,
  entries,
  onSelectEntry,
  onNewEntry,
  initialQuery,
}) => {
  const [question, setQuestion] = useState(initialQuery || '');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<string>('');

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || question).trim();
    if (!q || isSearching) return;

    setIsSearching(true);
    setError(null);
    setActiveQuery(q);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.code === 'PROMPT_INJECTION_REJECTED') {
          throw new Error('Security Notice: Prompt injection detected. System role or instruction overrides are prohibited.');
        }
        const errText = formatErrorMessage(errJson.error || `Server returned error (${res.status})`);
        throw new Error(errText);
      }

      const data: AskResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error('Error in Ask My Past Self:', err);
      setError(formatErrorMessage(err, 'Failed to retrieve answers from past reflections.'));
      setResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuestion(initialQuery.trim());
      handleAsk(initialQuery.trim());
    }
  }, [initialQuery]);

  const handleSourceClick = (source: AskSource) => {
    const found = entries.find((e) => e.id === source.interactionId);
    if (found) {
      onSelectEntry(found);
    } else {
      // Create a temporary viewable entry object if entry not currently loaded in memory
      const fallbackEntry: JournalInteraction = {
        id: source.interactionId,
        userId: user.uid,
        title: source.title,
        content: source.snippet,
        response: '',
        mode: 'reflect',
        messages: [],
        createdAt: source.date,
        updatedAt: source.date,
      };
      onSelectEntry(fallbackEntry);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-900 shadow-2xs">
            <Compass className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold tracking-wider text-amber-900 uppercase">
            Grounded Retrieval-Augmented Q&amp;A
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
          Ask My Past Self
        </h1>
        <p className="mt-1.5 text-sm text-stone-600 leading-relaxed max-w-2xl">
          Search your past entries using vector similarity. Answers are synthesized strictly from what you actually wrote, with dates and direct citations.
        </p>
      </div>

      {/* Empty History State */}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800 mb-4">
            <BookOpen className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-stone-900">Your journal has no entries yet</h2>
          <p className="mt-2 text-sm text-stone-600 max-w-md mx-auto">
            Write your first entry to start building your searchable history.
            Each entry is indexed privately under your authenticated account.
          </p>
          <button
            id="ask-past-self-first-entry-btn"
            onClick={onNewEntry}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-800 transition active:scale-95"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            Write an Entry
          </button>
        </div>
      ) : (
        <>
          {/* Question Form */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs mb-6">
            <label htmlFor="ask-past-self-input" className="block text-xs font-semibold text-stone-700 uppercase tracking-wide mb-2">
              What would you like to recall from your reflections?
            </label>
            <div className="relative">
              <textarea
                id="ask-past-self-input"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                placeholder="Ask about themes, decisions, habits, or emotions (e.g. 'What did I learn about work-life balance?')"
                className="w-full resize-none rounded-lg border border-stone-300 px-3.5 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
              />
            </div>

            {/* Quick Sample Questions */}
            <div className="mt-3">
              <span className="text-[11px] font-medium text-stone-500 block mb-1.5">
                Suggested questions from your journal:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_QUESTIONS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuestion(sample);
                      handleAsk(sample);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100 transition text-left"
                  >
                    <Search className="h-3 w-3 text-stone-400" />
                    <span>{sample}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
              <span className="text-xs text-stone-400 hidden sm:inline">
                Press <kbd className="rounded border border-stone-200 bg-stone-100 px-1 py-0.5 text-[10px] font-mono">⌘/Ctrl + Enter</kbd> to ask
              </span>
              <div className="flex items-center gap-2 ml-auto">
                {question && (
                  <button
                    type="button"
                    onClick={() => setQuestion('')}
                    className="rounded-lg px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700 transition"
                  >
                    Clear
                  </button>
                )}
                <button
                  id="ask-past-self-submit-btn"
                  type="button"
                  onClick={() => handleAsk()}
                  disabled={!question.trim() || isSearching}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-amber-900 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Searching Memories...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <span>Ask My Past Self</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {isSearching && (
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs text-center mb-6">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800 animate-pulse">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    Retrieving and Grounding Reflections
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm">
                    1. Embedding question with <code className="bg-stone-100 px-1 py-0.5 rounded text-[11px]">gemini-embedding-001</code> (768-dim)<br />
                    2. Ranking past journal entries by cosine similarity (threshold ≥ 0.55)<br />
                    3. Synthesizing citations from your verified user data
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && !isSearching && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 mb-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-red-900">Retrieval Error</h3>
                <p className="text-sm mt-0.5 text-red-800">{error}</p>
                <button
                  onClick={() => handleAsk()}
                  className="mt-2 text-xs font-semibold text-red-900 underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Results State */}
          {result && !isSearching && (
            <div className="space-y-6">
              {result.emptyHistory ? (
                /* Single Empty-State Card when emptyHistory is true */
                <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/80 p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800 mb-4">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold text-stone-900">
                    No reflections recorded yet
                  </h3>
                  <p className="mt-2 text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                    {result.answer}
                  </p>
                  <button
                    id="ask-past-self-empty-write-btn"
                    onClick={onNewEntry}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-stone-800 transition active:scale-95"
                  >
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    Write a Reflection
                  </button>
                </div>
              ) : (
                <>
                  {/* Answer Card */}
                  <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                          <Sparkles className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-semibold text-stone-900">
                          Recalled from Your Journal
                        </span>
                      </div>
                      {result.modelUsed && result.modelUsed !== 'none' && (
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                          Model: {result.modelUsed}
                        </span>
                      )}
                    </div>

                    <div className="prose prose-stone max-w-none text-stone-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {result.answer}
                    </div>

                    {/* Question queried badge */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-400">
                      <HelpCircle className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                      <span className="italic truncate">"{activeQuery}"</span>
                    </div>
                  </div>

                  {/* Source Entries Section */}
                  {result.sources && result.sources.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-semibold text-stone-900">
                            Source Entries Grounding this Answer
                          </h2>
                          <span className="rounded-full bg-amber-100 text-amber-900 text-xs px-2 py-0.5 font-medium">
                            {result.sources.length} matching {result.sources.length === 1 ? 'entry' : 'entries'}
                          </span>
                        </div>
                        <span className="text-xs text-stone-500">
                          Threshold: ≥ 55% similarity
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-1">
                        {result.sources.map((source) => {
                          const percentage = Math.round(source.similarity * 100);
                          const formattedDate = new Date(source.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          });

                          return (
                            <div
                              key={source.interactionId}
                              id={`source-card-${source.interactionId}`}
                              onClick={() => handleSourceClick(source)}
                              className="group relative cursor-pointer rounded-xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-amber-700 hover:shadow-xs transition"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="flex items-center gap-1 text-[11px] font-medium text-stone-500">
                                      <Calendar className="h-3 w-3 text-stone-400" />
                                      {formattedDate}
                                    </span>
                                  </div>
                                  <h3 className="text-sm font-semibold text-stone-900 group-hover:text-amber-900 transition">
                                    {source.title}
                                  </h3>
                                  <p className="mt-1.5 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                                    {source.snippet}
                                  </p>
                                </div>

                                {/* Deliberate Similarity Score Presentation */}
                                <div className="flex flex-col items-end shrink-0 pl-2">
                                  <div className="flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 border border-stone-200 text-right">
                                    <TrendingUp className="h-3 w-3 text-amber-700" />
                                    <span className="font-mono text-xs font-semibold text-stone-800">
                                      {percentage}%
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-stone-400 mt-1 font-mono">
                                    score: {source.similarity.toFixed(3)}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2 text-[11px]">
                                <span className="text-stone-400 font-mono text-[10px]">
                                  ID: {source.interactionId.slice(0, 16)}...
                                </span>
                                <span className="inline-flex items-center gap-1 font-medium text-amber-800 group-hover:underline">
                                  Open full reflection
                                  <ArrowRight className="h-3 w-3" />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* No Match State: guarded to render only when result.noMatch && !result.emptyHistory */
                    result.noMatch && !result.emptyHistory && (
                      <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-6 text-center">
                        <FileText className="mx-auto h-8 w-8 text-stone-400 mb-2" />
                        <h3 className="text-sm font-semibold text-stone-800">
                          No matching entries found
                        </h3>
                        <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                          Nothing in your journal history scored above the similarity threshold for this topic.
                          To keep answers accurate, Smriti only answers when there is an actual recorded entry to cite.
                        </p>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
