import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, Search, CheckCircle2, BookOpen, Layers, ChevronRight, Hash } from 'lucide-react';
import { useReader } from '../context/ReaderContext';

export default function NovelDetailView({ novelId, onBack, onReadChapter }) {
  const { userData } = useReader();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null); // { from, to, label }
  const [searchQuery, setSearchQuery] = useState('');
  const [jumpInput, setJumpInput] = useState('');

  // Fetch novel details
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/novels/${novelId}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        setNovel(data);
        if (data.ranges && data.ranges.length > 0) {
          // If user has read history, default to range containing current chapter
          const historyCh = data.history?.chapterNumber;
          if (historyCh) {
            const matchedRange = data.ranges.find(r => historyCh >= r.from && historyCh <= r.to);
            setSelectedRange(matchedRange || data.ranges[0]);
          } else {
            setSelectedRange(data.ranges[0]);
          }
        }
      })
      .catch(err => console.error('Error fetching novel details:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [novelId]);

  // Fetch chapters for selected range or search
  const loadChapters = useCallback(() => {
    if (!novelId) return;
    setLoadingChapters(true);

    let url = `/api/novels/${novelId}/chapters?`;
    if (searchQuery.trim()) {
      url += `search=${encodeURIComponent(searchQuery.trim())}&limit=200`;
    } else if (selectedRange) {
      url += `from=${selectedRange.from}&to=${selectedRange.to}&limit=200`;
    } else {
      url += `page=1&limit=100`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setChapters(data.chapters || []);
      })
      .catch(err => console.error('Error loading chapters:', err))
      .finally(() => setLoadingChapters(false));
  }, [novelId, selectedRange, searchQuery]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(jumpInput, 10);
    if (!isNaN(num) && num >= 1 && num <= (novel?.totalChapters || 99999)) {
      onReadChapter(novelId, num);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm" style={{ color: 'var(--reader-muted)' }}>Loading novel details...</p>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-red-400">Novel not found.</p>
        <button onClick={onBack} className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs">
          Back to Library
        </button>
      </div>
    );
  }

  const currentChapter = novel.history?.chapterNumber || 1;
  const progressPercent = novel.totalChapters > 0
    ? Math.min(100, Math.round((currentChapter / novel.totalChapters) * 100))
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7 animate-fadeIn">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors hover:text-sky-400 active:scale-95"
        style={{ color: 'var(--reader-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </button>

      {/* Novel Header Hero Card */}
      <div
        className="rounded-3xl p-6 sm:p-8 border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        style={{
          backgroundColor: 'var(--reader-surface)',
          borderColor: 'var(--reader-border)'
        }}
      >
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/25">
              {novel.totalChapters.toLocaleString()} Chapters
            </span>
            {novel.completedCount > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {novel.completedCount} read
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight" style={{ color: 'var(--reader-text)' }}>
            {novel.title}
          </h1>

          {/* Reading Progress */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs" style={{ color: 'var(--reader-muted)' }}>
              <span>Reading Progress: {progressPercent}%</span>
              <span>Currently at Ch. {currentChapter}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-700/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Read Actions */}
        <div className="w-full md:w-auto flex flex-row md:flex-col gap-2.5">
          <button
            onClick={() => onReadChapter(novelId, currentChapter)}
            className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{novel.history ? `Resume Ch. ${currentChapter}` : 'Start Chapter 1'}</span>
          </button>
          {novel.history && (
            <button
              onClick={() => onReadChapter(novelId, 1)}
              className="px-4 py-2.5 rounded-2xl text-xs font-medium transition-all active:scale-95"
              style={{
                backgroundColor: 'var(--reader-bg)',
                border: '1px solid var(--reader-border)',
                color: 'var(--reader-text)'
              }}
            >
              Start From Chapter 1
            </button>
          )}
        </div>
      </div>

      {/* Chapters Table of Contents Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2" style={{ color: 'var(--reader-text)' }}>
            <Layers className="w-5 h-5 text-sky-400" />
            Table of Contents
          </h2>

          {/* Jump to Chapter input & Chapter search */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleJumpSubmit} className="relative flex items-center">
              <input
                type="number"
                min="1"
                max={novel.totalChapters}
                placeholder="Jump to Ch. #"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                className="w-28 pl-3 pr-8 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                style={{
                  backgroundColor: 'var(--reader-surface)',
                  border: '1px solid var(--reader-border)',
                  color: 'var(--reader-text)'
                }}
              />
              <button
                type="submit"
                className="absolute right-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-500 active:scale-90"
              >
                Go
              </button>
            </form>

            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
              <input
                type="text"
                placeholder="Search title/number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                style={{
                  backgroundColor: 'var(--reader-surface)',
                  border: '1px solid var(--reader-border)',
                  color: 'var(--reader-text)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Range Chips (e.g. 1-100, 101-200, ...) */}
        {!searchQuery && novel.ranges && novel.ranges.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {novel.ranges.map((range) => {
              const isSelected = selectedRange?.from === range.from;
              return (
                <button
                  key={range.label}
                  onClick={() => setSelectedRange(range)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 font-semibold'
                      : 'hover:opacity-100 opacity-75'
                  }`}
                  style={!isSelected ? {
                    backgroundColor: 'var(--reader-surface)',
                    border: '1px solid var(--reader-border)',
                    color: 'var(--reader-text)'
                  } : {}}
                >
                  Ch. {range.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Chapter List */}
        {loadingChapters ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs" style={{ color: 'var(--reader-muted)' }}>Loading chapters...</p>
          </div>
        ) : chapters.length === 0 ? (
          <div className="p-8 text-center text-xs opacity-60">
            No chapters found matching your query.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {chapters.map((ch) => (
              <button
                key={ch.number}
                onClick={() => onReadChapter(novelId, ch.number)}
                className={`p-3 rounded-xl flex items-center justify-between text-left transition-all hover:translate-x-1 active:scale-[0.99] border group ${
                  ch.isCurrent
                    ? 'border-sky-500 bg-sky-500/10'
                    : ch.isCompleted
                    ? 'opacity-70'
                    : ''
                }`}
                style={{
                  backgroundColor: ch.isCurrent ? undefined : 'var(--reader-surface)',
                  borderColor: ch.isCurrent ? undefined : 'var(--reader-border)',
                  color: 'var(--reader-text)'
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    ch.isCurrent
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-700/20 text-sky-400'
                  }`}>
                    {ch.number}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate group-hover:text-sky-400 transition-colors">
                      {ch.title || `Chapter ${ch.number}`}
                    </p>
                    <span className="text-[10px] opacity-60 flex items-center gap-1">
                      {ch.isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {ch.isCurrent ? 'Currently Reading' : ch.isCompleted ? 'Completed' : 'Unread'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 shrink-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
