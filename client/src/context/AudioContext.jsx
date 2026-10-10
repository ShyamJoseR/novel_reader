import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(-1);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState(0);
  const [isAudioBarOpen, setIsAudioBarOpen] = useState(false);

  // References to keep mutable state for event listeners
  const paragraphsRef = useRef([]);
  const currentParaIndexRef = useRef(-1);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const onChapterEndCallbackRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);
  const sleepTimerIntervalRef = useRef(null);
  const activeUtteranceRef = useRef(null);
  const metadataRef = useRef({ title: '', novelTitle: '' });

  // Load available speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length > 0) {
        // Sort: English voices first, then others
        const sorted = [...allVoices].sort((a, b) => {
          const aEn = a.lang.startsWith('en');
          const bEn = b.lang.startsWith('en');
          if (aEn && !bEn) return -1;
          if (!aEn && bEn) return 1;
          return a.name.localeCompare(b.name);
        });
        setVoices(sorted);

        // Auto-select a high quality natural English voice if none selected
        if (!selectedVoiceURI) {
          const naturalVoice = sorted.find(v =>
            v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Guy') || v.name.includes('Jenny'))
          ) || sorted.find(v => v.lang.startsWith('en')) || sorted[0];

          if (naturalVoice) {
            setSelectedVoiceURI(naturalVoice.voiceURI);
          }
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [selectedVoiceURI]);

  // Keep-alive timer for Chrome SpeechSynthesis bug (pauses after 14s)
  const startKeepAlive = () => {
    stopKeepAlive();
    keepAliveIntervalRef.current = setInterval(() => {
      if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  };

  const stopKeepAlive = () => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  };

  // Clean text for speech
  const sanitizeTextForSpeech = (text) => {
    return text
      .replace(/[*_#`~>[\]]/g, '') // remove markdown symbols
      .replace(/https?:\/\/\S+/g, '') // remove links
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Stop everything
  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopKeepAlive();
    setIsPlaying(false);
    setIsPaused(false);
    isPlayingRef.current = false;
    isPausedRef.current = false;
    activeUtteranceRef.current = null;
    setCurrentParagraphIndex(-1);
    currentParaIndexRef.current = -1;
  }, []);

  // Speak a specific paragraph index
  const speakParagraph = useCallback((index) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const list = paragraphsRef.current;
    if (!list || list.length === 0) return;

    if (index >= list.length) {
      // Reached the end of current chapter!
      stop();
      if (autoAdvance && onChapterEndCallbackRef.current) {
        onChapterEndCallbackRef.current();
      }
      return;
    }

    if (index < 0) {
      index = 0;
    }

    // Cancel current utterance
    window.speechSynthesis.cancel();

    currentParaIndexRef.current = index;
    setCurrentParagraphIndex(index);
    isPlayingRef.current = true;
    isPausedRef.current = false;
    setIsPlaying(true);
    setIsPaused(false);

    // Auto-scroll paragraph into view
    const elem = document.getElementById(`para-${index}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const rawText = list[index];
    const cleanText = sanitizeTextForSpeech(rawText);

    if (!cleanText) {
      // Skip empty or purely symbol lines
      speakParagraph(index + 1);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtteranceRef.current = utterance;

    // Apply voice
    if (selectedVoiceURI) {
      const voiceObj = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (voiceObj) utterance.voice = voiceObj;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onend = () => {
      // Advance to next paragraph if still playing
      if (isPlayingRef.current && !isPausedRef.current) {
        speakParagraph(index + 1);
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('SpeechSynthesis error:', e.error);
        if (isPlayingRef.current && !isPausedRef.current) {
          speakParagraph(index + 1);
        }
      }
    };

    startKeepAlive();
    window.speechSynthesis.speak(utterance);
    updateMediaSession();
  }, [voices, selectedVoiceURI, rate, pitch, autoAdvance, stop]);

  // Pause speech
  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
    stopKeepAlive();
    setIsPaused(true);
    isPausedRef.current = true;
    updateMediaSession();
  }, []);

  // Resume speech
  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        startKeepAlive();
        setIsPaused(false);
        isPausedRef.current = false;
      } else if (currentParaIndexRef.current >= 0) {
        speakParagraph(currentParaIndexRef.current);
      } else {
        speakParagraph(0);
      }
    }
    updateMediaSession();
  }, [speakParagraph]);

  // Play / Toggle Play
  const play = useCallback((startIndex = null) => {
    setIsAudioBarOpen(true);
    if (isPaused) {
      resume();
      return;
    }
    const targetIdx = startIndex !== null ? startIndex : (currentParaIndexRef.current >= 0 ? currentParaIndexRef.current : 0);
    speakParagraph(targetIdx);
  }, [isPaused, resume, speakParagraph]);

  // Skip Next Paragraph
  const nextParagraph = useCallback(() => {
    const nextIdx = currentParaIndexRef.current + 1;
    if (nextIdx < paragraphsRef.current.length) {
      speakParagraph(nextIdx);
    } else if (autoAdvance && onChapterEndCallbackRef.current) {
      onChapterEndCallbackRef.current();
    }
  }, [speakParagraph, autoAdvance]);

  // Skip Prev Paragraph
  const prevParagraph = useCallback(() => {
    const prevIdx = Math.max(0, currentParaIndexRef.current - 1);
    speakParagraph(prevIdx);
  }, [speakParagraph]);

  // Set Chapter Data
  const setChapterData = useCallback((paragraphs, metadata = {}, onChapterEnd = null) => {
    paragraphsRef.current = paragraphs || [];
    metadataRef.current = metadata;
    onChapterEndCallbackRef.current = onChapterEnd;
  }, []);

  // Media Session lock-screen & headphone controls
  const updateMediaSession = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      const { title, novelTitle } = metadataRef.current;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Novel Reader',
        artist: novelTitle || 'Reading Audio',
        album: `Paragraph ${(currentParaIndexRef.current + 1)} of ${paragraphsRef.current.length}`,
        artwork: [
          { src: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=512', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => resume());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevParagraph());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextParagraph());
    }
  }, [resume, pause, prevParagraph, nextParagraph]);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerMinutes > 0) {
      setSleepTimerSecondsLeft(sleepTimerMinutes * 60);

      if (sleepTimerIntervalRef.current) clearInterval(sleepTimerIntervalRef.current);

      sleepTimerIntervalRef.current = setInterval(() => {
        setSleepTimerSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(sleepTimerIntervalRef.current);
            stop();
            setSleepTimerMinutes(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (sleepTimerIntervalRef.current) clearInterval(sleepTimerIntervalRef.current);
      setSleepTimerSecondsLeft(0);
    }

    return () => {
      if (sleepTimerIntervalRef.current) clearInterval(sleepTimerIntervalRef.current);
    };
  }, [sleepTimerMinutes, stop]);

  return (
    <AudioContext.Provider
      value={{
        voices,
        selectedVoiceURI,
        setSelectedVoiceURI,
        rate,
        setRate,
        pitch,
        setPitch,
        isPlaying,
        isPaused,
        currentParagraphIndex,
        autoAdvance,
        setAutoAdvance,
        sleepTimerMinutes,
        setSleepTimerMinutes,
        sleepTimerSecondsLeft,
        isAudioBarOpen,
        setIsAudioBarOpen,
        play,
        pause,
        resume,
        stop,
        nextParagraph,
        prevParagraph,
        playFromParagraph: speakParagraph,
        setChapterData
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
