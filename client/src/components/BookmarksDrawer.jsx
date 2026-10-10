import React from 'react';
import { X, Bookmark, Trash2, ArrowUpRight, BookOpen } from 'lucide-react';
import { useReader } from '../context/ReaderContext';

export default function BookmarksDrawer({ isOpen, onClose, onNavigateToBookmark }) {
  const { userData, toggleBookmark } = useReader();

  if (!isOpen) return null;

  const bookmarks = userData.bookmarks || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer */}
      <div
        className="relative z-10 w-full sm:w-96 h-full flex flex-col shadow-2xl animate-slideLeft"
        style={{
          backgroundColor: 'var(--reader-surface)',
          borderLeft: '1px solid var(--reader-border)',
          color: 'var(--reader-text)'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--reader-border)' }}>
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-400 fill-current" />
            <h3 className="font-bold text-sm sm:text-base">Saved Bookmarks</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
              {bookmarks.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 active:scale-90 transition-all opacity-70 hover:opacity-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bookmarks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {bookmarks.length === 0 ? (
            <div className="py-20 text-center space-y-3 opacity-60">
              <Bookmark className="w-10 h-10 mx-auto opacity-40 text-amber-400" />
              <p className="text-sm font-medium">No bookmarks saved yet</p>
              <p className="text-xs max-w-xs mx-auto">
                While reading any chapter, tap the bookmark icon or click a paragraph to save your spot!
              </p>
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                className="p-3.5 rounded-2xl border transition-all hover:border-amber-400/50 space-y-2 group"
                style={{
                  backgroundColor: 'var(--reader-bg)',
                  borderColor: 'var(--reader-border)'
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 block truncate">
                      {bm.novelTitle}
                    </span>
                    <h4 className="text-xs sm:text-sm font-semibold truncate leading-tight mt-0.5">
                      {bm.chapterTitle || `Chapter ${bm.chapterNumber}`}
                    </h4>
                  </div>

                  <button
                    onClick={() => toggleBookmark(bm)}
                    title="Remove Bookmark"
                    className="p-1.5 rounded-lg opacity-40 hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {bm.text && (
                  <p className="text-xs opacity-75 line-clamp-2 italic border-l-2 pl-2 border-amber-400/50">
                    "{bm.text}"
                  </p>
                )}

                <div className="pt-1 flex items-center justify-between text-[11px] opacity-60">
                  <span>{new Date(bm.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => {
                      onNavigateToBookmark(bm.novelId, bm.chapterNumber, bm.paragraphIndex);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-sky-400 hover:underline"
                  >
                    <span>Jump to reader</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
