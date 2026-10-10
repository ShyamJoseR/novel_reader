const fs = require('fs');
const path = require('path');

const NOVELS_DIR = path.resolve(__dirname, '..', 'novels');
const OUT_DIR = path.resolve(__dirname, '..', 'client', 'dist', 'data');
const CHUNK_SIZE = 50;

const COVER_PALETTES = [
  { gradient: 'from-amber-700 via-orange-800 to-amber-950', accent: '#f59e0b', tag: 'Fantasy' },
  { gradient: 'from-indigo-900 via-purple-950 to-slate-950', accent: '#818cf8', tag: 'Cultivation' },
  { gradient: 'from-emerald-900 via-teal-950 to-slate-950', accent: '#34d399', tag: 'Adventure' },
  { gradient: 'from-rose-900 via-red-950 to-slate-950', accent: '#f43f5e', tag: 'Action' },
  { gradient: 'from-cyan-900 via-blue-950 to-slate-950', accent: '#38bdf8', tag: 'System' },
];

function createNovelId(folderName) {
  return folderName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-');
}

function parseChapterFile(filePath, targetNum) {
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const lines = rawContent.split(/\r?\n/);

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

  const rawParagraphs = lines.slice(contentStartIndex).join('\n').split(/\n\s*\n/);
  const paragraphs = [];

  for (const p of rawParagraphs) {
    const trimmed = p.trim();
    if (trimmed && !/^[*-=_]{3,}$/.test(trimmed)) {
      paragraphs.push(trimmed);
    }
  }

  const allText = paragraphs.join(' ');
  const wordCount = allText.split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 220));

  return { title, paragraphs, wordCount, estimatedMinutes };
}

function buildStaticData() {
  console.log('--- Generating Static Novel Data for Cloudflare ---');
  const startTime = Date.now();

  if (!fs.existsSync(NOVELS_DIR)) {
    console.error('Novels directory not found at:', NOVELS_DIR);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const entries = fs.readdirSync(NOVELS_DIR, { withFileTypes: true });
  const novelDirs = entries.filter(e => e.isDirectory());

  const novelsCatalog = [];

  for (let idx = 0; idx < novelDirs.length; idx++) {
    const dir = novelDirs[idx];
    const fullDirPath = path.join(NOVELS_DIR, dir.name);
    const files = fs.readdirSync(fullDirPath).filter(f => f.endsWith('.md'));

    const chapters = [];
    for (const f of files) {
      const numMatch = f.match(/Chapter-(\d+)\.md/i) || f.match(/(\d+)/);
      const num = numMatch ? parseInt(numMatch[1], 10) : 0;
      chapters.push({ filename: f, number: num });
    }

    chapters.sort((a, b) => a.number - b.number);

    const novelId = createNovelId(dir.name);
    const palette = COVER_PALETTES[idx % COVER_PALETTES.length];
    const totalChapters = chapters.length;
    const firstChapter = totalChapters > 0 ? chapters[0].number : 1;
    const lastChapter = totalChapters > 0 ? chapters[totalChapters - 1].number : 1;

    console.log(`Processing "${dir.name}" (${totalChapters} chapters)...`);

    // Calculate ranges (1-100, 101-200, etc.)
    const chunkSizeRange = 100;
    const ranges = [];
    for (let start = 1; start <= totalChapters; start += chunkSizeRange) {
      const end = Math.min(start + chunkSizeRange - 1, totalChapters);
      ranges.push({
        from: start,
        to: end,
        label: `${start} - ${end}`
      });
    }

    const novelOutDir = path.join(OUT_DIR, novelId);
    fs.mkdirSync(novelOutDir, { recursive: true });

    // 1. Process all chapters, extract titles & write chunks
    const chaptersMetaList = [];
    let currentChunk = {};
    let currentChunkIndex = 1;

    for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
      const chap = chapters[cIdx];
      const filePath = path.join(fullDirPath, chap.filename);
      const parsed = parseChapterFile(filePath, chap.number);

      const prevChapter = cIdx > 0 ? chapters[cIdx - 1].number : null;
      const nextChapter = cIdx < chapters.length - 1 ? chapters[cIdx + 1].number : null;

      chaptersMetaList.push({
        number: chap.number,
        filename: chap.filename,
        title: parsed.title
      });

      const chunkIdx = Math.floor(cIdx / CHUNK_SIZE) + 1;
      if (chunkIdx !== currentChunkIndex) {
        // Write previous chunk
        fs.writeFileSync(
          path.join(novelOutDir, `chunk-${currentChunkIndex}.json`),
          JSON.stringify(currentChunk),
          'utf8'
        );
        currentChunk = {};
        currentChunkIndex = chunkIdx;
      }

      currentChunk[chap.number] = {
        novelId,
        novelTitle: dir.name,
        chapterNumber: chap.number,
        title: parsed.title,
        filename: chap.filename,
        paragraphs: parsed.paragraphs,
        wordCount: parsed.wordCount,
        estimatedMinutes: parsed.estimatedMinutes,
        prevChapter,
        nextChapter,
        totalChapters,
        index: cIdx + 1
      };
    }

    // Write final chunk
    if (Object.keys(currentChunk).length > 0) {
      fs.writeFileSync(
        path.join(novelOutDir, `chunk-${currentChunkIndex}.json`),
        JSON.stringify(currentChunk),
        'utf8'
      );
    }

    // 2. Write novel meta
    const novelMeta = {
      id: novelId,
      title: dir.name,
      folderName: dir.name,
      totalChapters,
      firstChapter,
      lastChapter,
      ranges,
      chunkSize: CHUNK_SIZE,
      totalChunks: currentChunkIndex,
      history: null,
      completedCount: 0
    };
    fs.writeFileSync(
      path.join(novelOutDir, 'meta.json'),
      JSON.stringify(novelMeta),
      'utf8'
    );

    // 3. Write novel chapters listing
    fs.writeFileSync(
      path.join(novelOutDir, 'chapters.json'),
      JSON.stringify(chaptersMetaList),
      'utf8'
    );

    novelsCatalog.push({
      id: novelId,
      title: dir.name,
      folderName: dir.name,
      totalChapters,
      firstChapter,
      lastChapter,
      palette,
      history: null,
      completedCount: 0,
      progressPercent: 0
    });
  }

  // Sort novels alphabetically by title
  novelsCatalog.sort((a, b) => a.title.localeCompare(b.title));

  // Write master catalog
  fs.writeFileSync(
    path.join(OUT_DIR, 'novels.json'),
    JSON.stringify({ novels: novelsCatalog }, null, 2),
    'utf8'
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Static data generation complete in ${duration}s! Output: ${OUT_DIR}`);
}

buildStaticData();
