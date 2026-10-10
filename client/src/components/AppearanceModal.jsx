import React from 'react';
import { X, Check, Type, Palette, AlignLeft, AlignJustify, Eye, Gauge } from 'lucide-react';
import { useReader } from '../context/ReaderContext';

const THEMES = [
  { id: 'dark', label: 'Dark Slate', bg: '#0f172a', text: '#e2e8f0', border: '#334155' },
  { id: 'oled', label: 'OLED Black', bg: '#000000', text: '#e4e4e7', border: '#27272a' },
  { id: 'light', label: 'Paper Light', bg: '#f8fafc', text: '#1e293b', border: '#cbd5e1' },
  { id: 'sepia', label: 'Sepia Warm', bg: '#fbf0d9', text: '#3d2b1f', border: '#dec69f' },
  { id: 'forest', label: 'Night Forest', bg: '#0a1612', text: '#d1e7dd', border: '#1e3f34' },
  { id: 'latte', label: 'Cafe Latte', bg: '#1c1512', text: '#ebdcd2', border: '#42332c' }
];

const FONTS = [
  { id: 'serif', label: 'Serif (Classic)', font: 'font-serif' },
  { id: 'sans', label: 'Sans (Modern)', font: 'font-sans' },
  { id: 'mono', label: 'Monospace', font: 'font-mono' },
  { id: 'dyslexic', label: 'Dyslexic Friendly', font: 'font-dyslexic' }
];

export default function AppearanceModal({ isOpen, onClose }) {
  const { settings, updateSettings } = useReader();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal / Bottom Sheet */}
      <div
        className="relative z-10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-6"
        style={{
          backgroundColor: 'var(--reader-surface)',
          border: '1px solid var(--reader-border)',
          color: 'var(--reader-text)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--reader-border)' }}>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-base sm:text-lg">Appearance & Reading Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 active:scale-90 transition-all opacity-70 hover:opacity-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Themes Grid */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
            Color Themes
          </label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => {
              const isSelected = settings.theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => updateSettings({ theme: t.id })}
                  className={`p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs font-medium border active:scale-95 ${
                    isSelected ? 'ring-2 ring-sky-400 shadow-md' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: t.bg,
                    color: t.text,
                    borderColor: isSelected ? '#38bdf8' : t.border
                  }}
                >
                  <span className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-[10px]">
                    {isSelected && <Check className="w-3 h-3 text-sky-400" />}
                  </span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Typography / Font Families */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-sky-400" />
            Font Family
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FONTS.map((f) => {
              const isSelected = settings.fontFamily === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => updateSettings({ fontFamily: f.id })}
                  className={`py-2 px-3 rounded-xl text-xs text-left transition-all border ${f.font} ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-400 text-sky-400 font-bold'
                      : 'border-transparent hover:bg-white/5 opacity-80'
                  }`}
                  style={{
                    backgroundColor: isSelected ? undefined : 'var(--reader-bg)',
                    borderColor: isSelected ? undefined : 'var(--reader-border)'
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Font Size Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-70">
            <span>Font Size</span>
            <span className="text-sky-400 font-bold normal-case">{settings.fontSize}px</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold border active:scale-95"
              style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--reader-border)' }}
            >
              A-
            </button>
            <input
              type="range"
              min="14"
              max="32"
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value, 10) })}
              className="flex-1 accent-sky-500 cursor-pointer"
            />
            <button
              onClick={() => updateSettings({ fontSize: Math.min(32, settings.fontSize + 1) })}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold border active:scale-95"
              style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--reader-border)' }}
            >
              A+
            </button>
          </div>
        </div>

        {/* 4. Line Spacing & Alignment */}
        <div className="grid grid-cols-2 gap-4">
          {/* Line Height */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
              Line Spacing
            </label>
            <div className="flex items-center gap-1 rounded-xl p-1 border" style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--reader-border)' }}>
              {[1.4, 1.6, 1.8, 2.0].map((lh) => (
                <button
                  key={lh}
                  onClick={() => updateSettings({ lineHeight: lh })}
                  className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${
                    settings.lineHeight === lh ? 'bg-sky-500 text-white font-bold' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {lh}x
                </button>
              ))}
            </div>
          </div>

          {/* Alignment */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
              Alignment
            </label>
            <div className="flex items-center gap-1 rounded-xl p-1 border" style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--reader-border)' }}>
              <button
                onClick={() => updateSettings({ textAlign: 'left' })}
                className={`flex-1 py-1 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                  settings.textAlign === 'left' ? 'bg-sky-500 text-white font-bold' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateSettings({ textAlign: 'justify' })}
                className={`flex-1 py-1 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                  settings.textAlign === 'justify' ? 'bg-sky-500 text-white font-bold' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <AlignJustify className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 5. Reading Column Width */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
            Reading Width
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'compact', label: 'Compact' },
              { id: 'medium', label: 'Medium' },
              { id: 'wide', label: 'Wide' },
              { id: 'full', label: 'Full' }
            ].map((w) => (
              <button
                key={w.id}
                onClick={() => updateSettings({ contentWidth: w.id })}
                className={`py-1.5 text-xs rounded-xl font-medium transition-all border ${
                  settings.contentWidth === w.id
                    ? 'bg-sky-500 text-white border-sky-400 font-bold'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={settings.contentWidth !== w.id ? {
                  backgroundColor: 'var(--reader-bg)',
                  borderColor: 'var(--reader-border)',
                  color: 'var(--reader-text)'
                } : {}}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Auto-Scroll Speed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-70">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              Auto-Scroll Speed
            </span>
            <span className="text-sky-400 font-bold normal-case">{settings.autoScrollSpeed} px/sec</span>
          </div>
          <input
            type="range"
            min="15"
            max="120"
            step="5"
            value={settings.autoScrollSpeed}
            onChange={(e) => updateSettings({ autoScrollSpeed: parseInt(e.target.value, 10) })}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </div>

        {/* Done Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/25 active:scale-95 transition-all"
        >
          Apply & Return to Reading
        </button>
      </div>
    </div>
  );
}
