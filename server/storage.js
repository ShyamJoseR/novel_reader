const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, 'data', 'user-data.json');

const DEFAULT_DATA = {
  history: {}, // { [novelId]: { chapterNumber, scrollPercent, lastReadAt, novelTitle, chapterTitle } }
  bookmarks: [], // Array of { id, novelId, novelTitle, chapterNumber, chapterTitle, paragraphIndex, text, createdAt }
  completedChapters: {}, // { [novelId]: [chapterNumbers] }
  settings: {
    theme: 'dark', // 'dark', 'oled', 'light', 'sepia', 'forest', 'latte'
    fontFamily: 'serif', // 'sans', 'serif', 'mono', 'dyslexic'
    fontSize: 18, // 14 to 32
    lineHeight: 1.75, // 1.4 to 2.2
    contentWidth: 'medium', // 'compact', 'medium', 'wide', 'full'
    textAlign: 'left', // 'left', 'justify'
    indentParagraphs: false,
    autoScrollSpeed: 40, // pixels per second
    // TTS audio settings
    audioRate: 1.0,
    audioPitch: 1.0,
    audioVoice: '',
    audioAutoAdvance: true,
    audioSleepTimerMinutes: 0
  }
};

function readUserData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf8');
      return DEFAULT_DATA;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      history: parsed.history || {},
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      completedChapters: parsed.completedChapters || {},
      settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) }
    };
  } catch (err) {
    console.error('[Storage] Error reading user data:', err);
    return DEFAULT_DATA;
  }
}

function saveUserData(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[Storage] Error saving user data:', err);
  }
}

function updateProgress(novelId, chapterNumber, scrollPercent = 0, novelTitle = '', chapterTitle = '') {
  const data = readUserData();
  data.history[novelId] = {
    chapterNumber,
    scrollPercent,
    novelTitle: novelTitle || data.history[novelId]?.novelTitle || novelId,
    chapterTitle: chapterTitle || `Chapter ${chapterNumber}`,
    lastReadAt: new Date().toISOString()
  };

  // Mark chapter as completed if read > 85%
  if (scrollPercent >= 85) {
    if (!data.completedChapters[novelId]) {
      data.completedChapters[novelId] = [];
    }
    if (!data.completedChapters[novelId].includes(chapterNumber)) {
      data.completedChapters[novelId].push(chapterNumber);
    }
  }

  saveUserData(data);
  return data;
}

function toggleBookmark(bookmark) {
  const data = readUserData();
  const existingIndex = data.bookmarks.findIndex(
    b => b.novelId === bookmark.novelId &&
         b.chapterNumber === bookmark.chapterNumber &&
         (bookmark.paragraphIndex === undefined || b.paragraphIndex === bookmark.paragraphIndex)
  );

  if (existingIndex >= 0) {
    // Remove
    data.bookmarks.splice(existingIndex, 1);
  } else {
    // Add
    data.bookmarks.unshift({
      id: 'bm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      novelId: bookmark.novelId,
      novelTitle: bookmark.novelTitle || bookmark.novelId,
      chapterNumber: bookmark.chapterNumber,
      chapterTitle: bookmark.chapterTitle || `Chapter ${bookmark.chapterNumber}`,
      paragraphIndex: bookmark.paragraphIndex ?? null,
      text: bookmark.text ? bookmark.text.substring(0, 160) : '',
      createdAt: new Date().toISOString()
    });
  }

  saveUserData(data);
  return data.bookmarks;
}

function updateSettings(settings) {
  const data = readUserData();
  data.settings = { ...data.settings, ...settings };
  saveUserData(data);
  return data.settings;
}

module.exports = {
  readUserData,
  saveUserData,
  updateProgress,
  toggleBookmark,
  updateSettings
};
