import React, { useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Square, Volume2,
  Clock, FastForward, ChevronUp, ChevronDown, X, Settings2
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';

export default function AudioPlayerBar({ totalParagraphs, chapterTitle }) {
  const {
    isPlaying,
    isPaused,
    currentParagraphIndex,
    play,
    pause,
    resume,
    stop,
    nextParagraph,
    prevParagraph,
    rate,
    setRate,
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    autoAdvance,
    setAutoAdvance,
    sleepTimerMinutes,
    setSleepTimerMinutes,
    sleepTimerSecondsLeft,
    isAudioBarOpen,
    setIsAudioBarOpen
  } = useAudio();

  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  if (!isAudioBarOpen) return null;

  const currentParaNum = currentParagraphIndex >= 0 ? currentParagraphIndex + 1 : 1;
  const progressPercent = totalParagraphs > 0 ? Math.round((currentParaNum / totalParagraphs) * 100) : 0;

  // Format seconds left for sleep timer
  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlayPause = () => {
    if (isPlaying && !isPaused) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      play();
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t shadow-2xl transition-all duration-300"
      style={{
        backgroundColor: 'var(--reader-surface)',
        borderColor: 'var(--reader-border)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)'
      }}
    >
      {/* Top progress bar for spoken chapter progress */}
      <div className="w-full h-1 bg-slate-700/20 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-2.5 sm:py-3 space-y-2">
        {/* Main Audio Controls Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Chapter & Paragraph Progress Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 shrink-0">
                <Volume2 className="w-4 h-4 animate-pulse" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: 'var(--reader-text)' }}>
                  {chapterTitle || 'Audio Reader'}
                </p>
                <p className="text-[11px] opacity-70" style={{ color: 'var(--reader-muted)' }}>
                  Paragraph {currentParaNum} of {totalParagraphs || 1} • {progressPercent}%
                </p>
              </div>
            </div>
          </div>

          {/* Core Playback Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Prev Paragraph */}
            <button
              onClick={prevParagraph}
              title="Previous Paragraph"
              className="p-2 rounded-xl transition-all active:scale-90 hover:bg-white/10"
              style={{ color: 'var(--reader-text)' }}
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play / Pause */}
            <button
              onClick={handlePlayPause}
              title={isPlaying && !isPaused ? 'Pause' : 'Play'}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-105 active:scale-95"
            >
              {isPlaying && !isPaused ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Paragraph */}
            <button
              onClick={nextParagraph}
              title="Next Paragraph"
              className="p-2 rounded-xl transition-all active:scale-90 hover:bg-white/10"
              style={{ color: 'var(--reader-text)' }}
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Stop */}
            <button
              onClick={stop}
              title="Stop Speech"
              className="p-2 rounded-xl opacity-70 hover:opacity-100 transition-all active:scale-90 hover:bg-white/10"
              style={{ color: 'var(--reader-text)' }}
            >
              <Square className="w-4 h-4 fill-current text-rose-400" />
            </button>
          </div>

          {/* Settings & Close */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Speed pills */}
            <div className="hidden sm:flex items-center gap-1 rounded-xl p-0.5 bg-black/20 border border-white/5">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setRate(s)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    rate === s ? 'bg-sky-500 text-white' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={rate !== s ? { color: 'var(--reader-text)' } : {}}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Expand Voice Settings button */}
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              title="Audio Voice & Timer Settings"
              className={`p-2 rounded-xl transition-all active:scale-90 ${
                showVoiceSettings ? 'bg-sky-500/20 text-sky-400' : 'hover:bg-white/10'
              }`}
              style={{ color: 'var(--reader-text)' }}
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* Close Bar */}
            <button
              onClick={() => {
                stop();
                setIsAudioBarOpen(false);
              }}
              title="Close Audio Reader"
              className="p-2 rounded-xl opacity-60 hover:opacity-100 transition-all active:scale-90"
              style={{ color: 'var(--reader-text)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Voice & Sleep Timer Settings Drawer */}
        {showVoiceSettings && (
          <div
            className="pt-3 pb-1 border-t grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-fadeIn"
            style={{ borderColor: 'var(--reader-border)' }}
          >
            {/* Voice Selector */}
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold opacity-70 uppercase tracking-wider" style={{ color: 'var(--reader-muted)' }}>
                Speech Voice
              </label>
              <select
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                className="w-full py-1.5 px-2 rounded-lg text-xs truncate focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                style={{
                  backgroundColor: 'var(--reader-bg)',
                  border: '1px solid var(--reader-border)',
                  color: 'var(--reader-text)'
                }}
              >
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Speed Rate (Mobile visible) & Auto-advance */}
            <div className="space-y-1 flex flex-col justify-between">
              <label className="block text-[10px] font-semibold opacity-70 uppercase tracking-wider" style={{ color: 'var(--reader-muted)' }}>
                Speed: {rate}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.25"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] pt-1">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  className="rounded accent-sky-500"
                />
                <span style={{ color: 'var(--reader-text)' }}>Autoplay Next Chapter</span>
              </label>
            </div>

            {/* Sleep Timer */}
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold opacity-70 uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--reader-muted)' }}>
                <span>Sleep Timer</span>
                {sleepTimerSecondsLeft > 0 && (
                  <span className="text-sky-400 font-bold">{formatTimer(sleepTimerSecondsLeft)}</span>
                )}
              </label>
              <div className="flex items-center gap-1">
                {[0, 15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setSleepTimerMinutes(mins)}
                    className={`flex-1 py-1 text-[10px] rounded-lg font-medium transition-all ${
                      sleepTimerMinutes === mins
                        ? 'bg-sky-500 text-white font-bold'
                        : 'border hover:bg-white/5 opacity-70'
                    }`}
                    style={sleepTimerMinutes !== mins ? {
                      borderColor: 'var(--reader-border)',
                      color: 'var(--reader-text)'
                    } : {}}
                  >
                    {mins === 0 ? 'Off' : `${mins}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
