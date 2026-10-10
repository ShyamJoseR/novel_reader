import React from 'react';
import { BookOpen, ChevronRight, Play, CheckCircle2 } from 'lucide-react';

export default function NovelCard({ novel, onSelectNovel, onReadChapter }) {
  const { title, totalChapters, history, completedCount, palette, id } = novel;

  const currentChapter = history?.chapterNumber || 1;
  const progressPercent = totalChapters > 0
    ? Math.min(100, Math.round((currentChapter / totalChapters) * 100))
    : 0;

  const hasHistory = !!history;

  return (
    <div
      className="group relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
      style={{
        backgroundColor: 'var(--reader-surface)',
        border: '1px solid var(--reader-border)'
      }}
    >
      {/* Procedural Book Cover Banner */}
      <div
        onClick={() => onSelectNovel(id)}
        className={`relative h-44 sm:h-48 w-full p-4 flex flex-col justify-between cursor-pointer overflow-hidden bg-gradient-to-br ${palette?.gradient || 'from-slate-800 to-slate-950'}`}
      >
        {/* Book Spine Texture Effect */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/25 shadow-inner border-r border-white/10" />

        {/* Decorative corner ornament */}
        <div className="absolute top-2 right-2 opacity-15 pointer-events-none">
          <BookOpen className="w-20 h-20 text-white transform rotate-12" />
        </div>

        {/* Top Badges */}
        <div className="relative z-10 flex items-center justify-between pl-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white/90 border border-white/15">
            {palette?.tag || 'Novel'}
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-white/90">
            {totalChapters.toLocaleString()} Chapters
          </span>
        </div>

        {/* Title on cover */}
        <div className="relative z-10 pl-2">
          <h3 className="text-base sm:text-lg font-bold text-white leading-snug drop-shadow line-clamp-2">
            {title}
          </h3>
          {hasHistory && (
            <p className="text-[11px] text-white/80 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ch. {currentChapter} ({progressPercent}%)
            </p>
          )}
        </div>
      </div>

      {/* Novel Body Details */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs" style={{ color: 'var(--reader-muted)' }}>
              <span>Progress</span>
              <span className="font-medium" style={{ color: 'var(--reader-text)' }}>
                {hasHistory ? `Ch. ${currentChapter} / ${totalChapters}` : `${totalChapters} Chapters`}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-700/30 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-sky-500"
                style={{ width: `${hasHistory ? progressPercent : 0}%` }}
              />
            </div>
          </div>

          {/* Quick stats tags */}
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--reader-muted)' }}>
            {completedCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {completedCount} read
              </span>
            )}
            {history?.lastReadAt && (
              <span className="opacity-70 text-[11px]">
                Active: {new Date(history.lastReadAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t" style={{ borderColor: 'var(--reader-border)' }}>
          <button
            onClick={() => onReadChapter(id, currentChapter)}
            className="w-full py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-md active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{hasHistory ? 'Resume' : 'Read'}</span>
          </button>

          <button
            onClick={() => onSelectNovel(id)}
            className="w-full py-2 px-3 rounded-xl flex items-center justify-center gap-1 text-xs font-medium transition-all active:scale-95"
            style={{
              backgroundColor: 'var(--reader-surface)',
              border: '1px solid var(--reader-border)',
              color: 'var(--reader-text)'
            }}
          >
            <span>Chapters</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
      </div>
    </div>
  );
}
