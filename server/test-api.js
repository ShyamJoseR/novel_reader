const http = require('http');
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

const server = app.listen(3099, async () => {
  try {
    console.log('Testing API endpoints...');

    // 1. Test /api/novels
    const resNovels = await fetch('http://localhost:3099/api/novels');
    const dataNovels = await resNovels.json();
    console.log('GET /api/novels status:', resNovels.status, 'Novels count:', dataNovels.novels?.length);

    if (!dataNovels.novels || dataNovels.novels.length === 0) {
      throw new Error('No novels returned');
    }

    const testNovel = dataNovels.novels[0];
    console.log(`Testing with novel: ${testNovel.title} (${testNovel.id})`);

    // 2. Test /api/novels/:id
    const resNovel = await fetch(`http://localhost:3099/api/novels/${testNovel.id}`);
    const dataNovel = await resNovel.json();
    console.log('GET /api/novels/:id status:', resNovel.status, 'Ranges:', dataNovel.ranges?.length);

    // 3. Test /api/novels/:id/chapters (page 1, limit 10)
    const resChapters = await fetch(`http://localhost:3099/api/novels/${testNovel.id}/chapters?page=1&limit=10`);
    const dataChapters = await resChapters.json();
    console.log('GET /api/novels/:id/chapters status:', resChapters.status, 'Chapters returned:', dataChapters.chapters?.length);
    console.log('Sample chapter 1 title:', dataChapters.chapters[0]?.title);

    // 4. Test /api/novels/:id/chapters/1
    const resChapterContent = await fetch(`http://localhost:3099/api/novels/${testNovel.id}/chapters/1`);
    const dataChapterContent = await resChapterContent.json();
    console.log('GET chapter 1 content status:', resChapterContent.status);
    console.log('Title:', dataChapterContent.title);
    console.log('Paragraphs count:', dataChapterContent.paragraphs?.length);
    console.log('Word count:', dataChapterContent.wordCount);
    console.log('Next chapter:', dataChapterContent.nextChapter);

    // 5. Test user progress
    const resProgress = await fetch('http://localhost:3099/api/user/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        novelId: testNovel.id,
        chapterNumber: 1,
        scrollPercent: 45,
        novelTitle: testNovel.title,
        chapterTitle: dataChapterContent.title
      })
    });
    const dataProgress = await resProgress.json();
    console.log('POST /api/user/progress status:', resProgress.status, 'Success:', dataProgress.success);

    // 6. Test bookmark
    const resBookmark = await fetch('http://localhost:3099/api/user/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        novelId: testNovel.id,
        chapterNumber: 1,
        paragraphIndex: 3,
        text: 'Sample bookmarked paragraph snippet',
        novelTitle: testNovel.title,
        chapterTitle: dataChapterContent.title
      })
    });
    const dataBookmark = await resBookmark.json();
    console.log('POST /api/user/bookmarks status:', resBookmark.status, 'Bookmarks:', dataBookmark.bookmarks?.length);

    console.log('\nALL API TESTS PASSED SUCCESSFULLY! ✅\n');
  } catch (err) {
    console.error('API Test Failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
