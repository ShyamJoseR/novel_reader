const express = require('express');
const router = express.Router();
const indexer = require('../indexer');
const storage = require('../storage');

// Palette styling generators for procedural book covers
const COVER_PALETTES = [
  { gradient: 'from-amber-700 via-orange-800 to-amber-950', accent: '#f59e0b', tag: 'Fantasy' },
  { gradient: 'from-indigo-900 via-purple-950 to-slate-950', accent: '#818cf8', tag: 'Cultivation' },
  { gradient: 'from-emerald-900 via-teal-950 to-slate-950', accent: '#34d399', tag: 'Adventure' },
  { gradient: 'from-rose-900 via-red-950 to-slate-950', accent: '#f43f5e', tag: 'Action' },
  { gradient: 'from-cyan-900 via-blue-950 to-slate-950', accent: '#38bdf8', tag: 'System' },
];

/**
 * GET /api/novels
 * List all novels with dynamic scanning & reading progress
 */
router.get('/novels', (req, res) => {
  try {
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const novels = indexer.scanNovels(forceRefresh);
    const userData = storage.readUserData();

    const result = novels.map((novel, index) => {
      const palette = COVER_PALETTES[index % COVER_PALETTES.length];
      const history = userData.history[novel.id] || null;
      const completedList = userData.completedChapters[novel.id] || [];

      return {
        id: novel.id,
        title: novel.title,
        folderName: novel.folderName,
        totalChapters: novel.totalChapters,
        firstChapter: novel.firstChapter,
        lastChapter: novel.lastChapter,
        palette,
        history,
        completedCount: completedList.length,
        progressPercent: novel.totalChapters > 0
          ? Math.min(100, Math.round(((history?.chapterNumber || 0) / novel.totalChapters) * 100))
          : 0
      };
    });

    res.json({ novels: result });
  } catch (err) {
    console.error('Error fetching novels:', err);
    res.status(500).json({ error: 'Failed to scan novels' });
  }
});

/**
 * GET /api/novels/:novelId
 * Get details of a single novel
 */
router.get('/novels/:novelId', (req, res) => {
  try {
    const novel = indexer.getNovel(req.params.novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const userData = storage.readUserData();
    const history = userData.history[novel.id] || null;
    const completedList = userData.completedChapters[novel.id] || [];

    // Calculate chapter ranges (e.g., 1-100, 101-200)
    const chunkSize = 100;
    const ranges = [];
    const total = novel.totalChapters;

    for (let start = 1; start <= total; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, total);
      ranges.push({
        from: start,
        to: end,
        label: `${start} - ${end}`
      });
    }

    res.json({
      id: novel.id,
      title: novel.title,
      folderName: novel.folderName,
      totalChapters: novel.totalChapters,
      firstChapter: novel.firstChapter,
      lastChapter: novel.lastChapter,
      ranges,
      history,
      completedCount: completedList.length
    });
  } catch (err) {
    console.error('Error fetching novel:', err);
    res.status(500).json({ error: 'Failed to fetch novel details' });
  }
});

/**
 * GET /api/novels/:novelId/chapters
 * Paginated and range-filtered chapter listing
 */
router.get('/novels/:novelId/chapters', (req, res) => {
  try {
    const novel = indexer.getNovel(req.params.novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const userData = storage.readUserData();
    const completedList = new Set(userData.completedChapters[novel.id] || []);

    let chapters = [...novel.chaptersList];

    // Filter by search query if provided
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';
    if (search) {
      chapters = chapters.filter(c => {
        if (c.number.toString().includes(search)) return true;
        const title = indexer.getChapterTitle(novel, c.number).toLowerCase();
        return title.includes(search);
      });
    }

    // Filter by explicit range 'from' and 'to'
    const from = req.query.from ? parseInt(req.query.from, 10) : null;
    const to = req.query.to ? parseInt(req.query.to, 10) : null;

    if (from !== null && to !== null) {
      chapters = chapters.filter(c => c.number >= from && c.number <= to);
    }

    const totalFiltered = chapters.length;

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const startIndex = (page - 1) * limit;
    const paginated = chapters.slice(startIndex, startIndex + limit);

    // Attach titles and read status
    const resultChapters = paginated.map(c => ({
      number: c.number,
      filename: c.filename,
      title: indexer.getChapterTitle(novel, c.number),
      isCompleted: completedList.has(c.number),
      isCurrent: userData.history[novel.id]?.chapterNumber === c.number
    }));

    res.json({
      total: totalFiltered,
      totalNovelChapters: novel.totalChapters,
      page,
      limit,
      totalPages: Math.ceil(totalFiltered / limit),
      chapters: resultChapters
    });
  } catch (err) {
    console.error('Error fetching chapters:', err);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

/**
 * GET /api/novels/:novelId/chapters/:chapterNum
 * Get full chapter content and navigation
 */
router.get('/novels/:novelId/chapters/:chapterNum', (req, res) => {
  try {
    const chapter = indexer.getChapterContent(req.params.novelId, req.params.chapterNum);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    res.json(chapter);
  } catch (err) {
    console.error('Error fetching chapter content:', err);
    res.status(500).json({ error: 'Failed to load chapter content' });
  }
});

/**
 * GET /api/user
 * Get reading history, bookmarks, settings
 */
router.get('/user', (req, res) => {
  try {
    const data = storage.readUserData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read user data' });
  }
});

/**
 * POST /api/user/progress
 * Update reading progress
 */
router.post('/user/progress', (req, res) => {
  try {
    const { novelId, chapterNumber, scrollPercent, novelTitle, chapterTitle } = req.body;
    if (!novelId || !chapterNumber) {
      return res.status(400).json({ error: 'novelId and chapterNumber required' });
    }
    const data = storage.updateProgress(novelId, parseInt(chapterNumber, 10), scrollPercent, novelTitle, chapterTitle);
    res.json({ success: true, history: data.history[novelId] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

/**
 * POST /api/user/bookmarks
 * Toggle bookmark
 */
router.post('/user/bookmarks', (req, res) => {
  try {
    const { novelId, chapterNumber, paragraphIndex, text, novelTitle, chapterTitle } = req.body;
    if (!novelId || !chapterNumber) {
      return res.status(400).json({ error: 'novelId and chapterNumber required' });
    }
    const bookmarks = storage.toggleBookmark({
      novelId,
      chapterNumber: parseInt(chapterNumber, 10),
      paragraphIndex,
      text,
      novelTitle,
      chapterTitle
    });
    res.json({ success: true, bookmarks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

/**
 * POST /api/user/settings
 * Update settings
 */
router.post('/user/settings', (req, res) => {
  try {
    const settings = storage.updateSettings(req.body);
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * POST /api/refresh
 * Invalidate cache and rescan novels directory
 */
router.post('/refresh', (req, res) => {
  try {
    const novels = indexer.scanNovels(true);
    res.json({ success: true, count: novels.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh library' });
  }
});

module.exports = router;
