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
  const [userData, setUserData] = useState({
    history: {},
    bookmarks: [],
    completedChapters: {},
    settings: DEFAULT_SETTINGS
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

  // Load user data from server on startup
  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
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
    // Update local state immediately
    setUserData(prev => ({
      ...prev,
      history: {
        ...prev.history,
        [novelId]: {
          chapterNumber,
          scrollPercent,
          novelTitle,
          chapterTitle,
          lastReadAt: new Date().toISOString()
        }
      }
    }));

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
      console.warn('Failed to save progress to server:', err);
    }
  }, []);

  // Toggle bookmark
  const toggleBookmark = useCallback(async (bookmarkData) => {
    try {
      const res = await fetch('/api/user/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookmarkData)
      });
      if (res.ok) {
        const data = await res.json();
        setUserData(prev => ({ ...prev, bookmarks: data.bookmarks }));
        return data.bookmarks;
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
    return null;
  }, []);

  const isBookmarked = useCallback((novelId, chapterNumber, paragraphIndex = null) => {
    return userData.bookmarks.some(
      b => b.novelId === novelId &&
           b.chapterNumber === chapterNumber &&
           (paragraphIndex === null || b.paragraphIndex === paragraphIndex)
    );
  }, [userData.bookmarks]);

  return (
    <ReaderContext.Provider
      value={{
        novels,
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
