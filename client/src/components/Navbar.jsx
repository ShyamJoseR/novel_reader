import React from 'react';
import { BookOpen, RefreshCw, Bookmark, SlidersHorizontal, SunMedium } from 'lucide-react';
import { useReader } from '../context/ReaderContext';

export default function Navbar({ onOpenBookmarks, onOpenSettings, currentView, onGoHome }) {
  const { refreshNovels, loadingNovels, userData } = useReader();

  const handleRefresh = async () => {
    await refreshNovels(true);
  };

  const bookmarksCount = userData.bookmarks?.length || 0;

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-opacity-80 border-b transition-colors duration-200"
      style={{
        backgroundColor: 'var(--reader-bg)',
        borderColor: 'var(--reader-border)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-2.5 group text-left cursor-pointer transition-transform active:scale-95"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
            style={{ backgroundColor: 'var(--reader-surface)', border: '1px solid var(--reader-border)' }}
          >
            <BookOpen className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold tracking-tight leading-tight flex items-center gap-1.5"
              style={{ color: 'var(--reader-text)' }}
            >
              NovelReader
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] hidden sm:block opacity-60 leading-none"
              style={{ color: 'var(--reader-muted)' }}
            >
              Immersive Reading & Audio TTS
            </p>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Refresh Library (Rescans for newly added novel folders / chapters) */}
          <button
            onClick={handleRefresh}
            title="Scan library for new chapters and novels"
            className="p-2 sm:px-3 sm:py-2 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95"
            style={{
              backgroundColor: 'var(--reader-surface)',
              border: '1px solid var(--reader-border)',
              color: 'var(--reader-text)'
            }}
          >
            <RefreshCw className={`w-4 h-4 text-sky-400 ${loadingNovels ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Rescan Library</span>
          </button>

          {/* Bookmarks Drawer Toggle */}
          <button
            onClick={onOpenBookmarks}
            title="Saved Bookmarks"
            className="p-2 sm:px-3 sm:py-2 rounded-lg relative flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95"
            style={{
              backgroundColor: 'var(--reader-surface)',
              border: '1px solid var(--reader-border)',
              color: 'var(--reader-text)'
            }}
          >
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Bookmarks</span>
            {bookmarksCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500 text-slate-950 font-bold">
                {bookmarksCount}
              </span>
            )}
          </button>

          {/* Settings / Appearance Toggle */}
          <button
            onClick={onOpenSettings}
            title="Appearance & Typography"
            className="p-2 sm:px-3 sm:py-2 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95"
            style={{
              backgroundColor: 'var(--reader-surface)',
              border: '1px solid var(--reader-border)',
              color: 'var(--reader-text)'
            }}
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Appearance</span>
          </button>
        </div>
      </div>
    </header>
  );
}
