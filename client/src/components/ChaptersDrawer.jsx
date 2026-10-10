import React, { useState, useEffect } from 'react';
import { X, Layers, Search, CheckCircle2, ChevronRight, Hash } from 'lucide-react';

export default function ChaptersDrawer({
  isOpen,
  onClose,
  novelId,
  currentChapterNum,
  onSelectChapter
}) {
  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [jumpInput, setJumpInput] = useState('');

  // Fetch novel details for ranges
  useEffect(() => {
    if (!isOpen || !novelId) return;

    fetch(`/api/novels/${novelId}`)
      .then(res => res.json())
      .then(data => {
        setNovel(data);
        if (data.ranges && data.ranges.length > 0) {
          const matched = data.ranges.find(r => currentChapterNum >= r.from && currentChapterNum <= r.to);
          setSelectedRange(matched || data.ranges[0]);
        }
      })
      .catch(err => console.error('Error fetching novel in drawer:', err));
  }, [isOpen, novelId, currentChapterNum]);

  // Fetch chapters
  useEffect(() => {
    if (!isOpen || !novelId) return;
    setLoading(true);

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
      .catch(err => console.error('Error fetching chapters in drawer:', err))
      .finally(() => setLoading(false));
  }, [isOpen, novelId, selectedRange, searchQuery]);

  if (!isOpen) return null;

  const handleJump = (e) => {
    e.preventDefault();
    const num = parseInt(jumpInput, 10);
    if (!isNaN(num) && num >= 1 && num <= (novel?.totalChapters || 99999)) {
      onSelectChapter(num);
      onClose();
    }
  };

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
            <Layers className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm sm:text-base">Table of Contents</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 active:scale-90 transition-all opacity-70 hover:opacity-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Jump & Search Controls */}
        <div className="p-3 border-b space-y-2.5" style={{ borderColor: 'var(--reader-border)' }}>
          <div className="flex items-center gap-2">
            <form onSubmit={handleJump} className="relative flex-1 flex items-center">
              <input
                type="number"
                min="1"
                placeholder="Jump to chapter #"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                className="w-full pl-3 pr-10 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                style={{
                  backgroundColor: 'var(--reader-bg)',
                  border: '1px solid var(--reader-border)',
                  color: 'var(--reader-text)'
                }}
              />
              <button
                type="submit"
                className="absolute right-1 px-2 py-0.5 text-[10px] font-bold rounded-lg bg-sky-600 text-white"
              >
                Go
              </button>
            </form>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            <input
              type="text"
              placeholder="Search title/keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/50"
              style={{
                backgroundColor: 'var(--reader-bg)',
                border: '1px solid var(--reader-border)',
                color: 'var(--reader-text)'
              }}
            />
          </div>

          {/* Range Pills */}
          {!searchQuery && novel?.ranges && novel.ranges.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {novel.ranges.map((r) => {
                const isSelected = selectedRange?.from === r.from;
                return (
                  <button
                    key={r.label}
                    onClick={() => setSelectedRange(r)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-sky-500 text-white font-bold'
                        : 'border opacity-70 hover:opacity-100'
                    }`}
                    style={!isSelected ? { borderColor: 'var(--reader-border)' } : {}}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Chapter List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <div className="py-12 text-center text-xs opacity-60">Loading chapters...</div>
          ) : chapters.length === 0 ? (
            <div className="py-12 text-center text-xs opacity-60">No chapters found.</div>
          ) : (
            chapters.map((ch) => {
              const isCurrent = ch.number === currentChapterNum;
              return (
                <button
                  key={ch.number}
                  onClick={() => {
                    onSelectChapter(ch.number);
                    onClose();
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left text-xs transition-all active:scale-[0.99] border ${
                    isCurrent
                      ? 'bg-sky-500/20 border-sky-400 font-bold text-sky-400'
                      : ch.isCompleted
                      ? 'border-transparent opacity-65 hover:opacity-100'
                      : 'border-transparent hover:bg-white/5'
                  }`}
                  style={!isCurrent ? { color: 'var(--reader-text)' } : {}}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="w-6 text-[11px] opacity-70 shrink-0">#{ch.number}</span>
                    <span className="truncate">{ch.title || `Chapter ${ch.number}`}</span>
                  </div>
                  {ch.isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
