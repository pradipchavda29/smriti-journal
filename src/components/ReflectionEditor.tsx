import React, { useState } from 'react';
import { ReflectionMode } from '../types';
import { Sparkles, FileText, Lightbulb, Send, AlertTriangle, RefreshCw, PenLine } from 'lucide-react';
import { validateEntryBoundaries } from '../lib/sanitizer';

interface ReflectionEditorProps {
  onSubmit: (content: string, mode: ReflectionMode, title?: string) => Promise<void>;
  isSubmitting: boolean;
  saveError: string | null;
  onRetry: () => void;
}

export const ReflectionEditor: React.FC<ReflectionEditorProps> = ({
  onSubmit,
  isSubmitting,
  saveError,
  onRetry,
}) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<ReflectionMode>('reflect');
  const [validationError, setValidationError] = useState<string | null>(null);

  const promptStarters: Record<ReflectionMode, string[]> = {
    reflect: [
      'Today I noticed a recurring tension when...',
      'Something that truly energized me this week was...',
      'I am struggling to make a decision about...',
    ],
    summarize: [
      'Here is everything that happened in my meeting and project today...',
      'Key thoughts from the book I read today...',
      'A recap of my personal goals for this quarter...',
    ],
    brainstorm: [
      'I want to explore 5 different ways to solve...',
      'What are some wild ideas for a weekend project...',
      'How might I redesign my morning routine for deeper focus...',
    ],
  };

  const handleApplyStarter = (starter: string) => {
    setContent((prev) => (prev ? `${prev}\n${starter}` : starter));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const validation = validateEntryBoundaries(content, title);
    if (!validation.valid) {
      setValidationError(validation.error || 'Please provide valid reflection content.');
      return;
    }

    try {
      await onSubmit(content, mode, title.trim() || undefined);
      // NOTE: Input buffer is ONLY cleared upon confirmed success in parent component!
      setContent('');
      setTitle('');
    } catch (err) {
      // Input remains preserved in buffer so user never loses their writing!
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      {/* Mode Selector Cards */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
          Select Reflection Focus
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            id="mode-reflect-btn"
            onClick={() => setMode('reflect')}
            className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
              mode === 'reflect'
                ? 'border-purple-600 bg-purple-50/70 ring-1 ring-purple-600 text-purple-950 shadow-xs'
                : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className={`h-4 w-4 ${mode === 'reflect' ? 'text-purple-700' : 'text-stone-400'}`} />
              <span className="text-xs font-bold">Deep Reflection</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Unpack emotions, uncover underlying motives, and gain self-awareness.
            </p>
          </button>

          <button
            type="button"
            id="mode-summarize-btn"
            onClick={() => setMode('summarize')}
            className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
              mode === 'summarize'
                ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 text-blue-950 shadow-xs'
                : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText className={`h-4 w-4 ${mode === 'summarize' ? 'text-blue-700' : 'text-stone-400'}`} />
              <span className="text-xs font-bold">Synthesize &amp; Summarize</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Condense stream-of-consciousness thoughts into structured takeaways.
            </p>
          </button>

          <button
            type="button"
            id="mode-brainstorm-btn"
            onClick={() => setMode('brainstorm')}
            className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
              mode === 'brainstorm'
                ? 'border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 text-amber-950 shadow-xs'
                : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className={`h-4 w-4 ${mode === 'brainstorm' ? 'text-amber-700' : 'text-stone-400'}`} />
              <span className="text-xs font-bold">Creative Brainstorm</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Generate unconventional angles, fresh prompts, and forward steps.
            </p>
          </button>
        </div>
      </div>

      {/* Editor Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        {/* Title (Optional) */}
        <div className="mb-4">
          <input
            id="entry-title-input"
            type="text"
            placeholder="Title or theme (optional - Gemini will auto-title if blank)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full border-b border-stone-200 py-1.5 text-base font-semibold text-stone-900 placeholder-stone-400 focus:border-amber-700 focus:outline-none"
          />
        </div>

        {/* Content Area */}
        <div className="relative mb-3">
          <textarea
            id="entry-content-textarea"
            rows={7}
            placeholder="Write your reflection, thoughts, feelings, or scenario here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            maxLength={10000}
            className="w-full resize-y rounded-xl border border-stone-200 bg-stone-50/50 p-4 text-sm text-stone-900 placeholder-stone-400 focus:border-amber-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700 leading-relaxed font-sans"
          />
        </div>

        {/* Word count & starters */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 mb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-stone-400">Prompt Starters:</span>
            {promptStarters[mode].map((starter, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleApplyStarter(starter)}
                className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600 hover:bg-stone-200 transition"
              >
                "{starter.slice(0, 26)}..."
              </button>
            ))}
          </div>

          <div className="text-[11px] font-mono text-stone-400">
            {content.length} / 10,000 chars
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Save Error & Retry Banner */}
        {saveError && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{saveError} (Your writing is safely preserved in the editor)</span>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded bg-amber-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-900 transition"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry Save</span>
            </button>
          </div>
        )}

        {/* Submit Bar */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-4">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <PenLine className="h-3.5 w-3.5 text-stone-400" />
            <span>Saved securely to Cloud Firestore</span>
          </div>

          <button
            id="submit-reflection-btn"
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-900 active:scale-95 transition disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Gemini is reflecting...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Reflect with Gemini</span>
                <Send className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
