import React, { useState, useMemo } from 'react';
import { Search, Sparkles, BookOpen, Clock, ArrowRight, RotateCw, Library } from 'lucide-react';
import { useReader } from '../context/ReaderContext';
import NovelCard from './NovelCard';

export default function LibraryView({ onSelectNovel, onReadChapter }) {
  const { novels, loadingNovels, refreshNovels, userData } = useReader();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'chapters', 'title'

  // Determine most recently read novel for Continue Reading hero
  const continueReadingData = useMemo(() => {
    if (!userData.history || Object.keys(userData.history).length === 0) return null;

    // Find history entry with newest lastReadAt
    let latest = null;
    let latestNovelId = null;

    for (const [novelId, h] of Object.entries(userData.history)) {
      if (!latest || new Date(h.lastReadAt) > new Date(latest.lastReadAt)) {
        latest = h;
        latestNovelId = novelId;
      }
    }

    if (!latestNovelId) return null;
    const novelObj = novels.find(n => n.id === latestNovelId);
    if (!novelObj) return null;

    return {
      novel: novelObj,
      history: latest
    };
  }, [userData.history, novels]);

  // Filtered and sorted novels
  const processedNovels = useMemo(() => {
    let list = [...novels];

    // Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(n => n.title.toLowerCase().includes(q));
    }

    // Sort
    if (sortBy === 'chapters') {
      list.sort((a, b) => b.totalChapters - a.totalChapters);
    } else if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'recent') {
      list.sort((a, b) => {
        const timeA = userData.history[a.id]?.lastReadAt ? new Date(userData.history[a.id].lastReadAt).getTime() : 0;
        const timeB = userData.history[b.id]?.lastReadAt ? new Date(userData.history[b.id].lastReadAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    return list;
  }, [novels, searchQuery, sortBy, userData.history]);

  // Total library statistics
  const totalChaptersAcrossAll = useMemo(() => {
    return novels.reduce((acc, curr) => acc + (curr.totalChapters || 0), 0);
  }, [novels]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 animate-fadeIn">
      {/* Continue Reading Hero (if any active reading history) */}
      {continueReadingData && (
        <section
          className="relative rounded-3xl p-5 sm:p-7 overflow-hidden border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          style={{
            backgroundColor: 'var(--reader-surface)',
            borderColor: 'var(--reader-border)'
          }}
        >
          {/* Ambient Glow */}
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Continue Reading
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--reader-text)' }}>
              {continueReadingData.novel.title}
            </h2>

            <p className="text-sm line-clamp-1" style={{ color: 'var(--reader-muted)' }}>
              {continueReadingData.history.chapterTitle || `Chapter ${continueReadingData.history.chapterNumber}`}
            </p>

            <div className="flex items-center gap-3 text-xs pt-1" style={{ color: 'var(--reader-muted)' }}>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Read {new Date(continueReadingData.history.lastReadAt).toLocaleDateString()}
              </span>
              <span>•</span>
              <span>
                Ch. {continueReadingData.history.chapterNumber} of {continueReadingData.novel.totalChapters}
              </span>
            </div>
          </div>

          <div className="relative z-10 w-full md:w-auto flex items-center gap-3">
            <button
              onClick={() => onReadChapter(continueReadingData.novel.id, continueReadingData.history.chapterNumber)}
              className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>Resume Reading</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectNovel(continueReadingData.novel.id)}
              className="px-4 py-3 rounded-2xl font-medium text-sm transition-all active:scale-95"
              style={{
                backgroundColor: 'var(--reader-bg)',
                border: '1px solid var(--reader-border)',
                color: 'var(--reader-text)'
              }}
            >
              Browse Chapters
            </button>
          </div>
        </section>
      )}

      {/* Header & Search / Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5" style={{ color: 'var(--reader-text)' }}>
            <Library className="w-7 h-7 text-sky-400" />
            Novel Library
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--reader-muted)' }}>
            {novels.length} Novels • {totalChaptersAcrossAll.toLocaleString()} Chapters in total
          </p>
        </div>

        {/* Search & Sort Bar */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
            <input
              type="text"
              placeholder="Search novels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              style={{
                backgroundColor: 'var(--reader-surface)',
                border: '1px solid var(--reader-border)',
                color: 'var(--reader-text)'
              }}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="py-2 px-3 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/50 cursor-pointer"
            style={{
              backgroundColor: 'var(--reader-surface)',
              border: '1px solid var(--reader-border)',
              color: 'var(--reader-text)'
            }}
          >
            <option value="recent">Recently Read</option>
            <option value="chapters">Most Chapters</option>
            <option value="title">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Novel Cards Grid */}
      {loadingNovels ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RotateCw className="w-8 h-8 text-sky-400 animate-spin" />
          <p className="text-sm" style={{ color: 'var(--reader-muted)' }}>Scanning novel directories...</p>
        </div>
      ) : processedNovels.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center space-y-3"
          style={{ backgroundColor: 'var(--reader-surface)', border: '1px solid var(--reader-border)' }}
        >
          <BookOpen className="w-12 h-12 mx-auto text-sky-400/50" />
          <h3 className="text-base font-bold" style={{ color: 'var(--reader-text)' }}>
            No novels found
          </h3>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--reader-muted)' }}>
            {searchQuery ? `No novels matched "${searchQuery}".` : 'No novel folders were found in the novels/ directory.'}
          </p>
          <button
            onClick={() => refreshNovels(true)}
            className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500 transition-all active:scale-95"
          >
            Rescan Library
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {processedNovels.map((novel) => (
            <NovelCard
              key={novel.id}
              novel={novel}
              onSelectNovel={onSelectNovel}
              onReadChapter={onReadChapter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
