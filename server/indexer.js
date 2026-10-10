const fs = require('fs');
const path = require('path');

const NOVELS_DIR = path.resolve(__dirname, '..', 'novels');

// In-memory cache
let novelsCache = null;
let lastScanTime = 0;
const titleCache = new Map(); // key: `${novelId}:${chapterNum}` -> title

/**
 * Slugify novel name for URL safety, but keep mapping to real folder name
 */
function createNovelId(folderName) {
  return folderName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-');
}

/**
 * Fast scan of the novels directory.
 * Rescans dynamically whenever folders change or cache is invalidated.
 */
function scanNovels(forceRefresh = false) {
  const now = Date.now();
  // Check if force refresh or cache expired (or if novelsCache is null)
  if (!forceRefresh && novelsCache && (now - lastScanTime < 3000)) {
    return novelsCache;
  }

  if (!fs.existsSync(NOVELS_DIR)) {
    console.warn(`[Indexer] Novels directory not found at: ${NOVELS_DIR}`);
    return [];
  }

  const entries = fs.readdirSync(NOVELS_DIR, { withFileTypes: true });
  const novelDirs = entries.filter(e => e.isDirectory());

  const novelList = [];

  for (const dir of novelDirs) {
    const fullDirPath = path.join(NOVELS_DIR, dir.name);
    const files = fs.readdirSync(fullDirPath);

    const chapters = [];
    for (const f of files) {
      if (!f.endsWith('.md')) continue;
      const numMatch = f.match(/Chapter-(\d+)\.md/i) || f.match(/(\d+)/);
      const num = numMatch ? parseInt(numMatch[1], 10) : 0;
      chapters.push({
        filename: f,
        number: num
      });
    }

    // Sort chapters numerically
    chapters.sort((a, b) => a.number - b.number);

    const novelId = createNovelId(dir.name);

    novelList.push({
      id: novelId,
      title: dir.name,
      folderName: dir.name,
      totalChapters: chapters.length,
      firstChapter: chapters.length > 0 ? chapters[0].number : 1,
      lastChapter: chapters.length > 0 ? chapters[chapters.length - 1].number : 1,
      chaptersList: chapters
    });
  }

  // Sort novels alphabetically by title
  novelList.sort((a, b) => a.title.localeCompare(b.title));

  novelsCache = novelList;
  lastScanTime = now;
  return novelsCache;
}

// Watch novels directory for additions/removals
try {
  if (fs.existsSync(NOVELS_DIR)) {
    const watcher = fs.watch(NOVELS_DIR, { recursive: true }, (eventType, filename) => {
      // Invalidate cache on file/folder changes
      novelsCache = null;
      lastScanTime = 0;
      if (filename) {
        titleCache.delete(filename);
      }
    });
    if (watcher && typeof watcher.unref === 'function') {
      watcher.unref();
    }
  }
} catch (err) {
  console.warn('[Indexer] fs.watch not fully supported in this environment, falling back to mtime polling.');
}

/**
 * Find novel by ID or folder name
 */
function getNovel(novelId) {
  const novels = scanNovels();
  return novels.find(n => n.id === novelId || n.folderName === novelId);
}

/**
 * Get chapter title quickly by reading only the first few bytes of the file
 */
function getChapterTitle(novel, chapterNum) {
  const cacheKey = `${novel.id}:${chapterNum}`;
  if (titleCache.has(cacheKey)) {
    return titleCache.get(cacheKey);
  }

  const chapterEntry = novel.chaptersList.find(c => c.number === chapterNum);
  if (!chapterEntry) return `Chapter ${chapterNum}`;

  const filePath = path.join(NOVELS_DIR, novel.folderName, chapterEntry.filename);
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(300);
    const bytesRead = fs.readSync(fd, buf, 0, 300, 0);
    fs.closeSync(fd);

    const chunk = buf.toString('utf8', 0, bytesRead);
    const firstLine = chunk.split('\n')[0].replace(/^#\s*/, '').trim();
    const title = firstLine || `Chapter ${chapterNum}`;
    titleCache.set(cacheKey, title);
    return title;
  } catch (err) {
    return `Chapter ${chapterNum}`;
  }
}

/**
 * Get chapter content and full metadata
 */
function getChapterContent(novelId, chapterNum) {
  const novel = getNovel(novelId);
  if (!novel) return null;

  const targetNum = parseInt(chapterNum, 10);
  const currentIndex = novel.chaptersList.findIndex(c => c.number === targetNum);
  if (currentIndex === -1) return null;

  const chapterEntry = novel.chaptersList[currentIndex];
  const filePath = path.join(NOVELS_DIR, novel.folderName, chapterEntry.filename);

  if (!fs.existsSync(filePath)) return null;

  const rawContent = fs.readFileSync(filePath, 'utf8');
  const lines = rawContent.split(/\r?\n/);

  // Extract header
  let title = `Chapter ${targetNum}`;
  let contentStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('#')) {
      title = trimmed.replace(/^#+\s*/, '').trim();
      contentStartIndex = i + 1;
      break;
    } else if (trimmed.length > 0) {
      break;
    }
  }

  // Parse paragraphs
  const rawParagraphs = lines.slice(contentStartIndex).join('\n').split(/\n\s*\n/);
  const paragraphs = [];

  for (const p of rawParagraphs) {
    const trimmed = p.trim();
    // Exclude markdown dividing rules like --- or ***
    if (trimmed && !/^[*-=_]{3,}$/.test(trimmed)) {
      paragraphs.push(trimmed);
    }
  }

  // Calculate word count
  const allText = paragraphs.join(' ');
  const wordCount = allText.split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 220));

  const prevChapter = currentIndex > 0 ? novel.chaptersList[currentIndex - 1].number : null;
  const nextChapter = currentIndex < novel.chaptersList.length - 1 ? novel.chaptersList[currentIndex + 1].number : null;

  return {
    novelId: novel.id,
    novelTitle: novel.title,
    chapterNumber: targetNum,
    title,
    filename: chapterEntry.filename,
    paragraphs,
    wordCount,
    estimatedMinutes,
    prevChapter,
    nextChapter,
    totalChapters: novel.totalChapters,
    index: currentIndex + 1
  };
}

module.exports = {
  NOVELS_DIR,
  scanNovels,
  getNovel,
  getChapterTitle,
  getChapterContent
};
