import React, { useState } from 'react';
import { JournalInteraction, ReflectionMode } from '../types';
import { Search, Sparkles, BookOpen, Lightbulb, FileText, Calendar, Trash2, ShieldAlert } from 'lucide-react';

interface HistoryListProps {
  entries: JournalInteraction[];
  selectedId: string | null;
  onSelect: (entry: JournalInteraction) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  isLoading: boolean;
  onNewEntry: () => void;
  missingEmbeddingCount?: number;
  isBackfilling?: boolean;
  backfillProgress?: { current: number; total: number } | null;
  onBackfill?: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  entries,
  selectedId,
  onSelect,
  onDelete,
  isLoading,
  onNewEntry,
  missingEmbeddingCount = 0,
  isBackfilling = false,
  backfillProgress = null,
  onBackfill,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(search.toLowerCase()) ||
      entry.content.toLowerCase().includes(search.toLowerCase()) ||
      entry.response.toLowerCase().includes(search.toLowerCase());

    const matchesMode = filterMode === 'all' || entry.mode === filterMode;

    return matchesSearch && matchesMode;
  });

  const getModeIcon = (mode: ReflectionMode) => {
    switch (mode) {
      case 'summarize':
        return <FileText className="h-3.5 w-3.5 text-blue-600" />;
      case 'brainstorm':
        return <Lightbulb className="h-3.5 w-3.5 text-amber-600" />;
      case 'reflect':
      default:
        return <Sparkles className="h-3.5 w-3.5 text-purple-600" />;
    }
  };

  const getModeBadge = (mode: ReflectionMode) => {
    switch (mode) {
      case 'summarize':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'brainstorm':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'reflect':
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-stone-200 bg-stone-50/50">
      {/* Header & Search */}
      <div className="p-4 border-b border-stone-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-stone-700" />
            <h2 className="font-semibold text-stone-900 text-sm">Past Reflections</h2>
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-700">
              {entries.length}
            </span>
          </div>
          <button
            id="history-new-btn"
            onClick={onNewEntry}
            className="text-xs font-medium text-amber-800 hover:text-amber-900 transition flex items-center gap-1"
          >
            <span>+ Write New</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <input
            id="search-entries-input"
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white py-1.5 pl-8 pr-3 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
          />
        </div>

        {/* Mode filter pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] py-1 no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'reflect', label: 'Reflect' },
            { id: 'summarize', label: 'Summary' },
            { id: 'brainstorm', label: 'Ideas' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterMode(item.id)}
              className={`rounded-md px-2 py-0.5 whitespace-nowrap transition ${
                filterMode === item.id
                  ? 'bg-stone-900 text-white font-medium'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Retrieval Security Guarantee Badge */}
        <div className="mt-2.5 flex items-center justify-between rounded bg-stone-100/90 px-2 py-1 text-[10px] text-stone-600 border border-stone-200/60">
          <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-800 font-semibold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
            UID Scoped
          </span>
          <span className="truncate text-stone-500" title="Pre-filtered by authenticated UID before ranking. Never ranked globally.">
            Pre-filtered before ranking
          </span>
        </div>

        {/* Backfill Embeddings Banner */}
        {(missingEmbeddingCount > 0 || isBackfilling) && (
          <div className="mt-2 rounded-lg bg-amber-50/90 border border-amber-200 p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-900 font-medium truncate">
                {isBackfilling ? (
                  <div className="h-3 w-3 shrink-0 animate-spin rounded-full border border-amber-800 border-t-transparent" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                )}
                <span className="truncate">
                  {isBackfilling
                    ? `Embedding ${backfillProgress?.current || 0} of ${backfillProgress?.total || 0}...`
                    : `${missingEmbeddingCount} un-embedded entries`}
                </span>
              </div>
              {!isBackfilling && onBackfill && (
                <button
                  id="backfill-embeddings-btn"
                  onClick={onBackfill}
                  className="shrink-0 rounded bg-amber-800 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-amber-900 transition shadow-xs"
                >
                  Backfill
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-stone-500">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-amber-700 border-t-transparent mb-2" />
            <p>Syncing Firestore entries...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400">
            {search || filterMode !== 'all' ? (
              <p>No matching entries found.</p>
            ) : (
              <div>
                <Sparkles className="h-6 w-6 text-stone-300 mx-auto mb-2" />
                <p className="font-medium text-stone-600">No entries yet</p>
                <p className="mt-1 text-stone-400">Write an entry to start building your journal memory.</p>
              </div>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = selectedId === entry.id;
            const dateStr = new Date(entry.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={entry.id}
                id={`entry-item-${entry.id}`}
                onClick={() => onSelect(entry)}
                className={`group relative flex flex-col rounded-xl p-3 text-left transition cursor-pointer border ${
                  isSelected
                    ? 'border-amber-700 bg-amber-50/70 shadow-xs'
                    : 'border-transparent bg-white hover:border-stone-200 hover:bg-stone-100/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-xs text-stone-900 line-clamp-1">
                    {entry.title || 'Untitled Reflection'}
                  </span>
                  <button
                    id={`delete-entry-${entry.id}`}
                    onClick={(e) => onDelete(entry.id, e)}
                    title="Delete reflection"
                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-600 transition p-0.5 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="mt-1 text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                  {entry.content}
                </p>

                {entry.flagged && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50/90 border border-amber-200/70 rounded-md px-1.5 py-0.5 w-fit">
                    <ShieldAlert className="h-3 w-3 text-amber-600 shrink-0" />
                    <span className="font-medium">Excluded from AI context</span>
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-stone-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{dateStr}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {entry.messages && entry.messages.length > 0 && (
                      <span className="text-[10px] text-stone-500">
                        {entry.messages.length + 1} turns
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${getModeBadge(
                        entry.mode
                      )}`}
                    >
                      {getModeIcon(entry.mode)}
                      {entry.mode}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
