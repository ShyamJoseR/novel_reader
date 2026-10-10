import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ReaderContext = createContext(null);

const DEFAULT_SETTINGS = {
  theme: 'dark', // 'dark', 'oled', 'light', 'sepia', 'forest', 'latte'
  fontFamily: 'serif', // 'sans', 'serif', 'mono', 'dyslexic'
  fontSize: 18,
  lineHeight: 1.75,
  contentWidth: 'medium', // 'compact', 'medium', 'wide', 'full'
  textAlign: 'left',
  indentParagraphs: false,
  autoScrollSpeed: 40,
  autoHideControls: true,
  swipeNavigation: true
};

export function ReaderProvider({ children }) {
  const [novels, setNovels] = useState([]);
  const [loadingNovels, setLoadingNovels] = useState(true);

  // Initialize userData from localStorage (for mobile/offline/Cloudflare Pages)
  const [userData, setUserData] = useState(() => {
    try {
      const local = localStorage.getItem('novel_reader_user_data');
      if (local) {
        const parsed = JSON.parse(local);
        return {
          history: parsed.history || {},
          bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
          completedChapters: parsed.completedChapters || {},
          settings: DEFAULT_SETTINGS
        };
      }
    } catch (e) {
      console.warn('Could not parse local user data:', e);
    }
    return {
      history: {},
      bookmarks: [],
      completedChapters: {},
      settings: DEFAULT_SETTINGS
    };
  });

  const [settings, setSettings] = useState(() => {
    try {
      const local = localStorage.getItem('novel_reader_settings');
      return local ? { ...DEFAULT_SETTINGS, ...JSON.parse(local) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Apply theme class to document body
  useEffect(() => {
    document.body.className = `theme-${settings.theme} antialiased selection:bg-sky-500/30 select-text overflow-x-hidden min-h-screen`;
  }, [settings.theme]);

  // Load user data from server on startup if available, merging with localStorage
  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        setUserData(prev => {
          const merged = {
            history: { ...prev.history, ...(data.history || {}) },
            bookmarks: data.bookmarks && data.bookmarks.length > 0 ? data.bookmarks : prev.bookmarks,
            completedChapters: { ...prev.completedChapters, ...(data.completedChapters || {}) },
            settings: prev.settings
          };
          localStorage.setItem('novel_reader_user_data', JSON.stringify(merged));
          return merged;
        });
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
    } catch (err) {
      console.warn('Could not load user data from server, using local state:', err);
    }
  }, []);

  // Fetch novels list
  const fetchNovels = useCallback(async (force = false) => {
    setLoadingNovels(true);
    try {
      const url = force ? '/api/novels?refresh=1' : '/api/novels';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNovels(data.novels || []);
      }
    } catch (err) {
      console.error('Failed to fetch novels:', err);
    } finally {
      setLoadingNovels(false);
    }
  }, []);

  useEffect(() => {
    fetchNovels();
    fetchUserData();
  }, [fetchNovels, fetchUserData]);

  // Update user settings
  const updateSettings = useCallback(async (newPartial) => {
    setSettings(prev => {
      const updated = { ...prev, ...newPartial };
      localStorage.setItem('novel_reader_settings', JSON.stringify(updated));
      return updated;
    });

    try {
      await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPartial)
      });
    } catch (err) {
      // Non-blocking
    }
  }, []);

  // Save progress
  const saveProgress = useCallback(async (novelId, chapterNumber, scrollPercent, novelTitle, chapterTitle) => {
    setUserData(prev => {
      const updatedHistory = {
        ...prev.history,
        [novelId]: {
          chapterNumber,
          scrollPercent,
          novelTitle: novelTitle || prev.history[novelId]?.novelTitle || novelId,
          chapterTitle: chapterTitle || `Chapter ${chapterNumber}`,
          lastReadAt: new Date().toISOString()
        }
      };

      const updatedCompleted = { ...prev.completedChapters };
      if (scrollPercent >= 85) {
        const list = updatedCompleted[novelId] || [];
        if (!list.includes(chapterNumber)) {
          updatedCompleted[novelId] = [...list, chapterNumber];
        }
      }

      const updated = {
        ...prev,
        history: updatedHistory,
        completedChapters: updatedCompleted
      };

      try {
        localStorage.setItem('novel_reader_user_data', JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });

    try {
      await fetch('/api/user/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelId,
          chapterNumber,
          scrollPercent,
          novelTitle,
          chapterTitle
        })
      });
    } catch (err) {
      // Non-blocking
    }
  }, []);

  // Toggle bookmark
  const toggleBookmark = useCallback(async (bookmarkData) => {
    let newBookmarks = [];
    setUserData(prev => {
      const existingIndex = prev.bookmarks.findIndex(
        b => b.novelId === bookmarkData.novelId &&
             b.chapterNumber === bookmarkData.chapterNumber &&
             (bookmarkData.paragraphIndex === undefined || b.paragraphIndex === bookmarkData.paragraphIndex)
      );

      if (existingIndex >= 0) {
        newBookmarks = prev.bookmarks.filter((_, i) => i !== existingIndex);
      } else {
        const newBm = {
          id: 'bm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          novelId: bookmarkData.novelId,
          novelTitle: bookmarkData.novelTitle || bookmarkData.novelId,
          chapterNumber: bookmarkData.chapterNumber,
          chapterTitle: bookmarkData.chapterTitle || `Chapter ${bookmarkData.chapterNumber}`,
          paragraphIndex: bookmarkData.paragraphIndex ?? null,
          text: bookmarkData.text ? bookmarkData.text.substring(0, 160) : '',
          createdAt: new Date().toISOString()
        };
        newBookmarks = [newBm, ...prev.bookmarks];
      }

      const updated = { ...prev, bookmarks: newBookmarks };
      try {
        localStorage.setItem('novel_reader_user_data', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch('/api/user/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookmarkData)
      });
    } catch (err) {
      // Non-blocking
    }
    return newBookmarks;
  }, []);

  const isBookmarked = useCallback((novelId, chapterNumber, paragraphIndex = null) => {
    return userData.bookmarks.some(
      b => b.novelId === novelId &&
           b.chapterNumber === chapterNumber &&
           (paragraphIndex === null || b.paragraphIndex === paragraphIndex)
    );
  }, [userData.bookmarks]);

  // Enrich novels list with current user reading history & progress
  const enrichedNovels = React.useMemo(() => {
    return novels.map(n => {
      const hist = userData.history?.[n.id] || n.history || null;
      const completed = userData.completedChapters?.[n.id] || [];
      const currentChapter = hist?.chapterNumber || 1;
      const progressPercent = n.totalChapters > 0
        ? Math.min(100, Math.round((currentChapter / n.totalChapters) * 100))
        : 0;

      return {
        ...n,
        history: hist,
        completedCount: completed.length,
        progressPercent
      };
    });
  }, [novels, userData]);

  return (
    <ReaderContext.Provider
      value={{
        novels: enrichedNovels,
        loadingNovels,
        refreshNovels: fetchNovels,
        userData,
        settings,
        updateSettings,
        saveProgress,
        toggleBookmark,
        isBookmarked
      }}
    >
      {children}
    </ReaderContext.Provider>
  );
}

export function useReader() {
  const context = useContext(ReaderContext);
  if (!context) {
    throw new Error('useReader must be used within a ReaderProvider');
  }
  return context;
}
