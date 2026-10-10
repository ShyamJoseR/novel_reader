const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

// Serve static
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

const server = app.listen(3088, async () => {
  try {
    console.log('--- E2E INTEGRATION TEST ---');

    // 1. Verify frontend index.html served
    const resHtml = await fetch('http://localhost:3088/');
    const textHtml = await resHtml.text();
    console.log('1. Frontend index.html served:', resHtml.status, 'Contains root div:', textHtml.includes('id="root"'));
    if (!textHtml.includes('id="root"')) throw new Error('Frontend index.html failed to serve');

    // 2. Verify API returns 5 novels
    const resNovels = await fetch('http://localhost:3088/api/novels');
    const dataNovels = await resNovels.json();
    console.log('2. Novels count:', dataNovels.novels.length);
    if (dataNovels.novels.length !== 5) throw new Error('Expected 5 novels');

    // 3. Verify novel chapter ranges
    const shadowSlave = dataNovels.novels.find(n => n.title.includes('Shadow Slave'));
    console.log('3. Shadow Slave detected:', shadowSlave.title, 'Total Chapters:', shadowSlave.totalChapters);

    // 4. Test Dynamic Novel Addition (User requirement!)
    console.log('4. Testing dynamic novel addition...');
    const testNovelFolder = path.resolve(__dirname, '..', 'novels', 'Z_Auto_Test_Novel');
    fs.mkdirSync(testNovelFolder, { recursive: true });
    fs.writeFileSync(
      path.join(testNovelFolder, 'Chapter-1.md'),
      '# Chapter 1: The New Journey Begins\n\nThis is a brand new dynamically added chapter.',
      'utf8'
    );

    // Call API with refresh
    const resAfterAdd = await fetch('http://localhost:3088/api/novels?refresh=1');
    const dataAfterAdd = await resAfterAdd.json();
    const foundNewNovel = dataAfterAdd.novels.find(n => n.folderName === 'Z_Auto_Test_Novel');
    console.log('   Dynamic novel detected in API:', !!foundNewNovel, 'Title:', foundNewNovel?.title);

    if (!foundNewNovel) throw new Error('Dynamic novel detection failed');

    // Test Reading content of new dynamic chapter
    const resNewCh = await fetch(`http://localhost:3088/api/novels/${foundNewNovel.id}/chapters/1`);
    const dataNewCh = await resNewCh.json();
    console.log('   Dynamic chapter content:', dataNewCh.title, 'Paragraphs:', dataNewCh.paragraphs?.length);

    // Clean up test novel
    fs.rmSync(testNovelFolder, { recursive: true, force: true });
    const resAfterCleanup = await fetch('http://localhost:3088/api/novels?refresh=1');
    const dataAfterCleanup = await resAfterCleanup.json();
    console.log('   Cleaned up test novel. Total novels now:', dataAfterCleanup.novels.length);

    console.log('\n✅ ALL E2E & DYNAMIC NOVEL DETECTION TESTS PASSED!\n');
  } catch (err) {
    console.error('E2E Test Failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
