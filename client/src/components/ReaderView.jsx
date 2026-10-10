import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Headphones, Layers, SlidersHorizontal, Bookmark,
  Maximize2, Minimize2, ChevronLeft, ChevronRight, Play, Pause,
  CheckCircle2, Share2, Copy, Sparkles, BookOpen, Clock
} from 'lucide-react';
import { useReader } from '../context/ReaderContext';
import { useAudio } from '../context/AudioContext';
import AudioPlayerBar from './AudioPlayerBar';
import AppearanceModal from './AppearanceModal';
import ChaptersDrawer from './ChaptersDrawer';

export default function ReaderView({ novelId, chapterNum, onBack, onNavigateChapter }) {
  const { settings, saveProgress, toggleBookmark, isBookmarked } = useReader();
  const {
    play,
    stop,
    isPlaying,
    isPaused,
    currentParagraphIndex,
    isAudioBarOpen,
    setIsAudioBarOpen,
    setChapterData,
    playFromParagraph
  } = useAudio();

  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showChrome, setShowChrome] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  // Modals & Drawers
  const [showAppearance, setShowAppearance] = useState(false);
  const [showChaptersDrawer, setShowChaptersDrawer] = useState(false);

  // Active selected paragraph popup
  const [selectedParagraph, setSelectedParagraph] = useState(null); // { index, text, x, y }

  // Touch gesture tracking for swipes
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const autoScrollRafRef = useRef(null);

  // Load Chapter Content
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setSelectedParagraph(null);

    fetch(`/api/novels/${novelId}/chapters/${chapterNum}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        setChapter(data);
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Register chapter paragraphs with AudioContext
        if (data.paragraphs) {
          setChapterData(data.paragraphs, {
            title: data.title,
            novelTitle: data.novelTitle
          }, () => {
            // Callback when chapter ends in audio TTS mode
            if (data.nextChapter) {
              onNavigateChapter(novelId, data.nextChapter);
            }
          });
        }
      })
      .catch(err => console.error('Error loading chapter:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [novelId, chapterNum, setChapterData, onNavigateChapter]);

  // Track scroll position & update progress
  useEffect(() => {
    let timeoutId = null;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = totalHeight > 0 ? Math.min(100, Math.round((scrollY / totalHeight) * 100)) : 0;
      setScrollProgress(percent);

      // Auto-hide top/bottom chrome on scroll down, show on scroll up
      if (settings.autoHideControls) {
        if (scrollY > lastScrollYRef.current && scrollY > 80) {
          setShowChrome(false);
        } else if (scrollY < lastScrollYRef.current - 10) {
          setShowChrome(true);
        }
      }
      lastScrollYRef.current = scrollY;

      // Throttle save progress to server
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (chapter) {
          saveProgress(novelId, parseInt(chapterNum, 10), percent, chapter.novelTitle, chapter.title);
        }
      }, 2000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [novelId, chapterNum, chapter, saveProgress, settings.autoHideControls]);

  // Hands-free Auto-Scroll Animation Engine
  useEffect(() => {
    if (!isAutoScrolling) {
      if (autoScrollRafRef.current) cancelAnimationFrame(autoScrollRafRef.current);
      return;
    }

    let lastTimestamp = performance.now();
    const speedPxPerSec = settings.autoScrollSpeed || 40;

    const scrollStep = (timestamp) => {
      const elapsed = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      const pixels = speedPxPerSec * elapsed;
      window.scrollBy(0, pixels);

      // Stop if reached the end
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 5) {
        setIsAutoScrolling(false);
        return;
      }

      autoScrollRafRef.current = requestAnimationFrame(scrollStep);
    };

    autoScrollRafRef.current = requestAnimationFrame(scrollStep);

    return () => {
      if (autoScrollRafRef.current) cancelAnimationFrame(autoScrollRafRef.current);
    };
  }, [isAutoScrolling, settings.autoScrollSpeed]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft' || e.key === 'j') {
        if (chapter?.prevChapter) onNavigateChapter(novelId, chapter.prevChapter);
      } else if (e.key === 'ArrowRight' || e.key === 'k') {
        if (chapter?.nextChapter) onNavigateChapter(novelId, chapter.nextChapter);
      } else if (e.key === ' ') {
        e.preventDefault();
        window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
      } else if (e.key === 't' || e.key === 'T') {
        setShowChaptersDrawer(prev => !prev);
      } else if (e.key === 's' || e.key === 'S') {
        setShowAppearance(prev => !prev);
      } else if (e.key === 'a' || e.key === 'A') {
        setIsAudioBarOpen(prev => !prev);
        if (!isAudioBarOpen) play();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapter, novelId, onNavigateChapter, isAudioBarOpen, play]);

  // Touch Swipe navigation handlers
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (!settings.swipeNavigation) return;
    const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
    const diffY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Must be primarily horizontal and > 75px
    if (Math.abs(diffX) > 75 && Math.abs(diffY) < 60) {
      if (diffX < 0 && chapter?.nextChapter) {
        // Swipe left -> Next Chapter
        onNavigateChapter(novelId, chapter.nextChapter);
      } else if (diffX > 0 && chapter?.prevChapter) {
        // Swipe right -> Prev Chapter
        onNavigateChapter(novelId, chapter.prevChapter);
      }
    }
  };

  // Tap zones handler
  const handleContentClick = (e) => {
    // If clicking a paragraph or control, skip
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.interactive-paragraph-pill')) {
      return;
    }

    const clickX = e.clientX;
    const width = window.innerWidth;

    // Center 60% toggles chrome
    if (clickX >= width * 0.25 && clickX <= width * 0.75) {
      setShowChrome(prev => !prev);
      setSelectedParagraph(null);
    } else if (clickX < width * 0.25) {
      // Tap Left 25% -> Page Up
      window.scrollBy({ top: -window.innerHeight * 0.75, behavior: 'smooth' });
    } else if (clickX > width * 0.75) {
      // Tap Right 25% -> Page Down
      window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' });
    }
  };

  // Toggle chapter bookmark
  const handleToggleChapterBookmark = () => {
    if (!chapter) return;
    toggleBookmark({
      novelId,
      chapterNumber: parseInt(chapterNum, 10),
      novelTitle: chapter.novelTitle,
      chapterTitle: chapter.title
    });
  };

  // Paragraph click handler (opens floating action menu)
  const handleParagraphClick = (e, index, text) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setSelectedParagraph({
      index,
      text,
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY - 10
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium" style={{ color: 'var(--reader-muted)' }}>
          Preparing chapter...
        </p>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center space-y-4">
        <p className="text-red-400 font-medium">Failed to load chapter.</p>
        <button onClick={onBack} className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs">
          Back to Novel
        </button>
      </div>
    );
  }

  const isCurrentChapterBookmarked = isBookmarked(novelId, parseInt(chapterNum, 10));

  // Determine width class
  const maxWidthClass = {
    compact: 'max-w-xl',
    medium: 'max-w-2xl',
    wide: 'max-w-4xl',
    full: 'max-w-full px-4 sm:px-8'
  }[settings.contentWidth] || 'max-w-2xl';

  // Font family class
  const fontClass = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
    dyslexic: 'font-dyslexic'
  }[settings.fontFamily] || 'font-serif';

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleContentClick}
      className={`min-h-screen select-text relative transition-colors duration-200 ${fontClass}`}
      style={{
        backgroundColor: 'var(--reader-bg)',
        color: 'var(--reader-text)'
      }}
    >
      {/* Top Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Top Floating App Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b transition-all duration-300 ${
          showChrome ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{
          backgroundColor: 'var(--reader-surface)',
          borderColor: 'var(--reader-border)',
          paddingTop: 'max(env(safe-area-inset-top), 0.25rem)'
        }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-13 sm:h-14 flex items-center justify-between gap-2">
          {/* Back button & Title */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBack}
              title="Back to Novel"
              className="p-2 rounded-xl hover:bg-white/10 active:scale-90 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-sky-400" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate leading-tight">
                {chapter.title}
              </p>
              <p className="text-[11px] opacity-60 truncate leading-none mt-0.5">
                {chapter.novelTitle} • {scrollProgress}%
              </p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Audio Reader Toggle */}
            <button
              onClick={() => {
                if (!isAudioBarOpen) {
                  setIsAudioBarOpen(true);
                  play();
                } else {
                  setIsAudioBarOpen(false);
                }
              }}
              title="Audio Reader (Text-to-Speech)"
              className={`p-2 rounded-xl transition-all active:scale-90 ${
                isAudioBarOpen || isPlaying
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 font-bold'
                  : 'hover:bg-white/10 opacity-80 hover:opacity-100'
              }`}
            >
              <Headphones className={`w-4 h-4 ${isPlaying && !isPaused ? 'animate-bounce' : ''}`} />
            </button>

            {/* Bookmark Chapter */}
            <button
              onClick={handleToggleChapterBookmark}
              title="Bookmark Chapter"
              className={`p-2 rounded-xl transition-all active:scale-90 ${
                isCurrentChapterBookmarked
                  ? 'text-amber-400 bg-amber-500/15'
                  : 'hover:bg-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isCurrentChapterBookmarked ? 'fill-current' : ''}`} />
            </button>

            {/* Table of Contents Drawer */}
            <button
              onClick={() => setShowChaptersDrawer(true)}
              title="Table of Contents"
              className="p-2 rounded-xl hover:bg-white/10 active:scale-90 opacity-80 hover:opacity-100 transition-all"
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Appearance Settings */}
            <button
              onClick={() => setShowAppearance(true)}
              title="Reading Appearance (Aa)"
              className="p-2 rounded-xl hover:bg-white/10 active:scale-90 opacity-80 hover:opacity-100 transition-all"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              className="p-2 rounded-xl hover:bg-white/10 active:scale-90 opacity-80 hover:opacity-100 transition-all hidden sm:block"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Reading Canvas */}
      <main className={`mx-auto pt-20 sm:pt-24 pb-36 px-4 sm:px-6 transition-all duration-150 ${maxWidthClass}`}>
        {/* Chapter Header Card */}
        <div className="mb-10 pb-6 border-b space-y-3" style={{ borderColor: 'var(--reader-border)' }}>
          <div className="flex items-center gap-2 text-xs opacity-60">
            <span className="font-semibold text-sky-400">Chapter {chapter.chapterNumber}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              ~{chapter.estimatedMinutes} min read
            </span>
            <span>•</span>
            <span>{chapter.wordCount.toLocaleString()} words</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
            {chapter.title}
          </h1>
        </div>

        {/* Story Paragraphs */}
        <div
          className={`space-y-6 ${settings.textAlign === 'justify' ? 'text-justify' : 'text-left'}`}
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight
          }}
        >
          {chapter.paragraphs.map((p, idx) => {
            const isSpeaking = currentParagraphIndex === idx && (isPlaying || isPaused);

            return (
              <p
                key={idx}
                id={`para-${idx}`}
                data-para-index={idx}
                onClick={(e) => handleParagraphClick(e, idx, p)}
                className={`reading-paragraph transition-all duration-200 cursor-pointer rounded-lg p-1 -m-1 hover:bg-sky-500/5 ${
                  isSpeaking ? 'tts-speaking-paragraph' : ''
                } ${settings.indentParagraphs ? 'indent-6' : ''}`}
              >
                {p}
              </p>
            );
          })}
        </div>

        {/* End of Chapter Navigation Controls */}
        <div className="mt-16 pt-8 border-t space-y-6" style={{ borderColor: 'var(--reader-border)' }}>
          <div className="text-center space-y-1">
            <p className="text-xs uppercase tracking-widest font-bold opacity-60">
              End of Chapter {chapter.chapterNumber}
            </p>
            <p className="text-sm font-medium opacity-80">
              {chapter.nextChapter ? `Next: Chapter ${chapter.nextChapter}` : 'You have reached the latest chapter!'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={!chapter.prevChapter}
              onClick={() => onNavigateChapter(novelId, chapter.prevChapter)}
              className="py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold border disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
              style={{
                backgroundColor: 'var(--reader-surface)',
                borderColor: 'var(--reader-border)',
                color: 'var(--reader-text)'
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Chapter</span>
            </button>

            <button
              disabled={!chapter.nextChapter}
              onClick={() => onNavigateChapter(novelId, chapter.nextChapter)}
              className="py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all shadow-lg shadow-sky-600/20"
            >
              <span>Next Chapter</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Floating Bottom Navigation Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl border-t transition-all duration-300 ${
          showChrome && !isAudioBarOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{
          backgroundColor: 'var(--reader-surface)',
          borderColor: 'var(--reader-border)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)'
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-xs">
          {/* Prev Chapter */}
          <button
            disabled={!chapter.prevChapter}
            onClick={() => onNavigateChapter(novelId, chapter.prevChapter)}
            className="p-2 rounded-xl flex items-center gap-1 font-medium disabled:opacity-30 hover:bg-white/10 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Chapter drawer trigger pill */}
          <button
            onClick={() => setShowChaptersDrawer(true)}
            className="px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border active:scale-95 transition-all"
            style={{
              backgroundColor: 'var(--reader-bg)',
              borderColor: 'var(--reader-border)',
              color: 'var(--reader-text)'
            }}
          >
            <span>Ch. {chapter.chapterNumber} / {chapter.totalChapters}</span>
          </button>

          {/* Auto-scroll toggle pill */}
          <button
            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
              isAutoScrolling
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'hover:bg-white/10 opacity-70'
            }`}
          >
            {isAutoScrolling ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Auto-Scroll</span>
          </button>

          {/* Next Chapter */}
          <button
            disabled={!chapter.nextChapter}
            onClick={() => onNavigateChapter(novelId, chapter.nextChapter)}
            className="p-2 rounded-xl flex items-center gap-1 font-medium disabled:opacity-30 hover:bg-white/10 active:scale-95 transition-all"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Action Pill on Selected Paragraph */}
      {selectedParagraph && (
        <div
          className="interactive-paragraph-pill fixed z-50 transform -translate-x-1/2 bottom-20 left-1/2 sm:bottom-24 bg-slate-900 text-white rounded-2xl shadow-2xl p-1.5 flex items-center gap-1.5 border border-slate-700 animate-slideUp text-xs font-semibold"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              playFromParagraph(selectedParagraph.index);
              setIsAudioBarOpen(true);
              setSelectedParagraph(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white flex items-center gap-1.5 transition-all"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Listen from here</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark({
                novelId,
                chapterNumber: parseInt(chapterNum, 10),
                paragraphIndex: selectedParagraph.index,
                text: selectedParagraph.text,
                novelTitle: chapter.novelTitle,
                chapterTitle: chapter.title
              });
              setSelectedParagraph(null);
            }}
            className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-amber-300 flex items-center gap-1.5 transition-all"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmark</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard?.writeText(selectedParagraph.text);
              setSelectedParagraph(null);
            }}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 transition-all"
            title="Copy text"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Audio Player Bar */}
      <AudioPlayerBar
        totalParagraphs={chapter.paragraphs.length}
        chapterTitle={chapter.title}
      />

      {/* Appearance Modal */}
      <AppearanceModal
        isOpen={showAppearance}
        onClose={() => setShowAppearance(false)}
      />

      {/* Chapters Table of Contents Drawer */}
      <ChaptersDrawer
        isOpen={showChaptersDrawer}
        onClose={() => setShowChaptersDrawer(false)}
        novelId={novelId}
        currentChapterNum={parseInt(chapterNum, 10)}
        onSelectChapter={(num) => onNavigateChapter(novelId, num)}
      />
    </div>
  );
}
