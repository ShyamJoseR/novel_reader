import React, { useState, useEffect, useCallback } from 'react';
import { ReaderProvider } from './context/ReaderContext';
import { AudioProvider } from './context/AudioContext';
import Navbar from './components/Navbar';
import LibraryView from './components/LibraryView';
import NovelDetailView from './components/NovelDetailView';
import ReaderView from './components/ReaderView';
import BookmarksDrawer from './components/BookmarksDrawer';
import AppearanceModal from './components/AppearanceModal';

function MainApp() {
  // Navigation State
  const [currentView, setCurrentView] = useState('library'); // 'library' | 'novel' | 'reader'
  const [activeNovelId, setActiveNovelId] = useState(null);
  const [activeChapterNum, setActiveChapterNum] = useState(1);

  // Global Drawers
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // URL Hash Sync for Browser Back/Forward navigation on mobile and desktop
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash) {
        setCurrentView('library');
        setActiveNovelId(null);
        return;
      }

      // Pattern: novel/:novelId/chapter/:chapterNum
      const chapterMatch = hash.match(/^novel\/([^/]+)\/chapter\/(\d+)$/);
      if (chapterMatch) {
        setCurrentView('reader');
        setActiveNovelId(chapterMatch[1]);
        setActiveChapterNum(parseInt(chapterMatch[2], 10));
        return;
      }

      // Pattern: novel/:novelId
      const novelMatch = hash.match(/^novel\/([^/]+)$/);
      if (novelMatch) {
        setCurrentView('novel');
        setActiveNovelId(novelMatch[1]);
        return;
      }

      setCurrentView('library');
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run on mount

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToLibrary = useCallback(() => {
    window.location.hash = '';
    setCurrentView('library');
    setActiveNovelId(null);
  }, []);

  const navigateToNovel = useCallback((novelId) => {
    window.location.hash = `novel/${novelId}`;
    setActiveNovelId(novelId);
    setCurrentView('novel');
  }, []);

  const navigateToChapter = useCallback((novelId, chapterNum) => {
    window.location.hash = `novel/${novelId}/chapter/${chapterNum}`;
    setActiveNovelId(novelId);
    setActiveChapterNum(chapterNum);
    setCurrentView('reader');
  }, []);

  const handleNavigateToBookmark = useCallback((novelId, chapterNumber) => {
    navigateToChapter(novelId, chapterNumber);
  }, [navigateToChapter]);

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar is visible on Library and Novel Detail views */}
      {currentView !== 'reader' && (
        <Navbar
          currentView={currentView}
          onGoHome={navigateToLibrary}
          onOpenBookmarks={() => setShowBookmarks(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Main View Router */}
      <div className="flex-1">
        {currentView === 'library' && (
          <LibraryView
            onSelectNovel={navigateToNovel}
            onReadChapter={navigateToChapter}
          />
        )}

        {currentView === 'novel' && activeNovelId && (
          <NovelDetailView
            novelId={activeNovelId}
            onBack={navigateToLibrary}
            onReadChapter={navigateToChapter}
          />
        )}

        {currentView === 'reader' && activeNovelId && (
          <ReaderView
            novelId={activeNovelId}
            chapterNum={activeChapterNum}
            onBack={() => navigateToNovel(activeNovelId)}
            onNavigateChapter={navigateToChapter}
          />
        )}
      </div>

      {/* Global Bookmarks Drawer */}
      <BookmarksDrawer
        isOpen={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        onNavigateToBookmark={handleNavigateToBookmark}
      />

      {/* Global Appearance Settings Modal */}
      <AppearanceModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReaderProvider>
      <AudioProvider>
        <MainApp />
      </AudioProvider>
    </ReaderProvider>
  );
}
