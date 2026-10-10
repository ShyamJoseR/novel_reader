/**
 * Cloudflare Pages Function: /api/* Catch-All Edge Route Handler
 * Serves catalog, chapter lists, search, pagination, and chapter content
 * seamlessly from static pre-rendered chunks in env.ASSETS.
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);

  try {
    // 1. GET /api/novels
    if (pathParts.length === 0 || (pathParts[0] === 'novels' && pathParts.length === 1)) {
      const assetRes = await env.ASSETS.fetch(new URL('/data/novels.json', url.origin));
      if (!assetRes.ok) {
        return jsonResponse({ novels: [] });
      }
      const data = await assetRes.json();
      return jsonResponse(data);
    }

    // 2. GET /api/novels/:novelId
    if (pathParts[0] === 'novels' && pathParts.length === 2) {
      const novelId = pathParts[1];
      const assetRes = await env.ASSETS.fetch(new URL(`/data/${novelId}/meta.json`, url.origin));
      if (!assetRes.ok) {
        return jsonResponse({ error: 'Novel not found' }, 404);
      }
      const data = await assetRes.json();
      return jsonResponse(data);
    }

    // 3. GET /api/novels/:novelId/chapters
    if (pathParts[0] === 'novels' && pathParts.length === 3 && pathParts[2] === 'chapters') {
      const novelId = pathParts[1];
      const chaptersRes = await env.ASSETS.fetch(new URL(`/data/${novelId}/chapters.json`, url.origin));
      if (!chaptersRes.ok) {
        return jsonResponse({ error: 'Chapters not found' }, 404);
      }

      let chapters = await chaptersRes.json();
      const totalNovelChapters = chapters.length;

      // Filter: Search
      const search = url.searchParams.get('search')?.trim().toLowerCase() || '';
      if (search) {
        chapters = chapters.filter(c => 
          c.number.toString().includes(search) || 
          c.title.toLowerCase().includes(search)
        );
      }

      // Filter: Range 'from' & 'to'
      const from = url.searchParams.get('from') ? parseInt(url.searchParams.get('from'), 10) : null;
      const to = url.searchParams.get('to') ? parseInt(url.searchParams.get('to'), 10) : null;
      if (from !== null && to !== null) {
        chapters = chapters.filter(c => c.number >= from && c.number <= to);
      }

      const totalFiltered = chapters.length;
      const page = parseInt(url.searchParams.get('page'), 10) || 1;
      const limit = parseInt(url.searchParams.get('limit'), 10) || 100;
      const startIndex = (page - 1) * limit;
      const paginated = chapters.slice(startIndex, startIndex + limit);

      return jsonResponse({
        total: totalFiltered,
        totalNovelChapters,
        page,
        limit,
        totalPages: Math.ceil(totalFiltered / limit),
        chapters: paginated.map(c => ({
          number: c.number,
          filename: c.filename,
          title: c.title,
          isCompleted: false,
          isCurrent: false
        }))
      });
    }

    // 4. GET /api/novels/:novelId/chapters/:chapterNum
    if (pathParts[0] === 'novels' && pathParts.length === 4 && pathParts[2] === 'chapters') {
      const novelId = pathParts[1];
      const chapterNum = parseInt(pathParts[3], 10);
      const chunkSize = 50;
      const chunkIdx = Math.floor((chapterNum - 1) / chunkSize) + 1;

      const chunkRes = await env.ASSETS.fetch(new URL(`/data/${novelId}/chunk-${chunkIdx}.json`, url.origin));
      if (!chunkRes.ok) {
        return jsonResponse({ error: 'Chapter not found' }, 404);
      }

      const chunkData = await chunkRes.json();
      const chapter = chunkData[chapterNum];
      if (!chapter) {
        return jsonResponse({ error: 'Chapter not found' }, 404);
      }

      return jsonResponse(chapter);
    }

    // 5. User Data Fallbacks for Cloudflare Pages
    if (pathParts[0] === 'user') {
      if (request.method === 'GET') {
        return jsonResponse({
          history: {},
          bookmarks: [],
          completedChapters: {},
          settings: {
            theme: 'dark',
            fontFamily: 'serif',
            fontSize: 18,
            lineHeight: 1.75,
            contentWidth: 'medium',
            textAlign: 'left',
            indentParagraphs: false,
            autoScrollSpeed: 40,
            audioRate: 1.0,
            audioPitch: 1.0,
            audioVoice: '',
            audioAutoAdvance: true,
            audioSleepTimerMinutes: 0
          }
        });
      }

      // POST /api/user/* -> Success acknowledgement (Client stores in localStorage)
      return jsonResponse({ success: true });
    }

    // 6. POST /api/refresh
    if (pathParts[0] === 'refresh') {
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Endpoint not found' }, 404);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Internal server error' }, 500);
  }
}
