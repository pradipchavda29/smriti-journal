import React, { useState } from 'react';
import { JournalInteraction, ReflectionMode } from '../types';
import { Sparkles, Calendar, Trash2, Send, CornerDownLeft, FileText, Lightbulb, User, Bot, ArrowLeft, ShieldAlert } from 'lucide-react';

interface EntryDetailViewProps {
  entry: JournalInteraction;
  onFollowUp: (prompt: string) => Promise<void>;
  isResponding: boolean;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const EntryDetailView: React.FC<EntryDetailViewProps> = ({
  entry,
  onFollowUp,
  isResponding,
  onDelete,
  onClose,
}) => {
  const [followUpText, setFollowUpText] = useState('');

  const getModeIcon = (mode: ReflectionMode) => {
    switch (mode) {
      case 'summarize':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'brainstorm':
        return <Lightbulb className="h-4 w-4 text-amber-600" />;
      case 'reflect':
      default:
        return <Sparkles className="h-4 w-4 text-purple-600" />;
    }
  };

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpText.trim() || isResponding) return;
    const textToSend = followUpText;
    setFollowUpText('');
    await onFollowUp(textToSend);
  };

  const formattedDate = new Date(entry.createdAt).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Top action header */}
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Entries</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 capitalize">
              {getModeIcon(entry.mode)}
              {entry.mode}
            </span>

            {entry.modelUsed && (
              <span className="text-[11px] font-mono text-stone-400 hidden sm:inline">
                {entry.modelUsed}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="delete-detail-entry-btn"
            onClick={() => onDelete(entry.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Delete Entry</span>
          </button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Entry Title & Meta */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 leading-tight">
            {entry.title || 'Journal Reflection'}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-xs text-stone-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Flagged informational banner */}
        {entry.flagged && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 flex items-start gap-3">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950">Excluded from AI Context &amp; Semantic Retrieval</p>
              <p className="text-amber-800 leading-relaxed">
                Your writing has been securely preserved in your private journal vault. Because phrasing resembling system instructions or role overrides was detected ({entry.flagReason || 'instruction_override'}), AI reflection was bypassed and no vector embedding was generated.
              </p>
            </div>
          </div>
        )}

        {/* Turn 1: User Reflection */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 text-stone-800">
              <User className="h-3.5 w-3.5" />
            </div>
            <span>Your Reflection</span>
          </div>
          <div className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
            {entry.content}
          </div>
        </div>

        {/* Turn 1: Gemini Response */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-800 text-white shadow-xs">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <span>Gemini Insights &amp; Reflection</span>
          </div>
          <div className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed prose prose-stone max-w-none">
            {entry.response}
          </div>
        </div>

        {/* Subsequent Multi-turn messages */}
        {entry.messages &&
          entry.messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-2xl p-5 shadow-2xs ${
                msg.role === 'user'
                  ? 'border border-stone-200 bg-stone-50/70'
                  : 'border border-amber-200/80 bg-amber-50/40'
              }`}
            >
              <div
                className={`flex items-center gap-2 text-xs font-semibold mb-2 ${
                  msg.role === 'user' ? 'text-stone-700' : 'text-amber-900'
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    msg.role === 'user'
                      ? 'bg-stone-200 text-stone-800'
                      : 'bg-amber-800 text-white shadow-xs'
                  }`}
                >
                  {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                <span>{msg.role === 'user' ? 'You' : 'Gemini'}</span>
                <span className="text-[10px] text-stone-400 font-normal">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </div>
            </div>
          ))}

        {isResponding && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-800 border-t-transparent" />
            <span>Gemini is considering your reflection...</span>
          </div>
        )}
      </div>

      {/* Follow-up Interactive Input Bar */}
      <div className="border-t border-stone-200 bg-stone-50/60 p-4">
        <form onSubmit={handleSendFollowUp} className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            id="followup-input"
            type="text"
            placeholder="Ask a follow-up question or continue the reflection with Gemini..."
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            disabled={isResponding}
            className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700 shadow-2xs"
          />
          <button
            id="send-followup-btn"
            type="submit"
            disabled={isResponding || !followUpText.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-900 active:scale-95 transition disabled:opacity-50"
          >
            <span>Send</span>
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
