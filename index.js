const express = require('express');
const { initTokens } = require('./config');
const { search } = require('./search');
const { getCollection, getFree5, COLLECTIONS } = require('./free5');
const { getSeasons, getEpisodes } = require('./episodes');
const { getContentDetails, getM3u8 } = require('./playback');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/', (req, res) => {
  res.json({
    name: 'ZEE5 No Ads API',
    note: 'All endpoints return raw ZEE5 response. Tokens managed internally.',
    endpoints: {
      search: 'GET /search?q=query&lang=hi,en',
      free5: 'GET /free5?page=0&lang=hi,hr (paginated buckets, lang=ZEE5 language codes)',
      collection: 'GET /collection/:id?page=0&limit=25',
      details: 'GET /details/:id',
      seasons: 'GET /seasons/:showId',
      episodes: 'GET /episodes/:seasonId?limit=25&page=0',
      m3u8: 'GET /m3u8/:id (raw details + direct/proxied/free)',
      collections: 'GET /collections',
    },
  });
});

app.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'q param required' });
    const data = await search(q, req.query.lang);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/free5', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const lang = req.query.lang || '';
    const data = await getFree5(page, lang);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/collection/:id', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 25;
    const data = await getCollection(req.params.id, page, limit);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/collections', (req, res) => {
  res.json(COLLECTIONS);
});

app.get('/details/:id', async (req, res) => {
  try {
    const data = await getContentDetails(req.params.id);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/seasons/:showId', async (req, res) => {
  try {
    const data = await getSeasons(req.params.showId);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/episodes/:seasonId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 25;
    const page = parseInt(req.query.page) || 0;
    const data = await getEpisodes(req.params.seasonId, limit, page);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/m3u8/:id', async (req, res) => {
  try {
    const data = await getM3u8(req.params.id);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, async () => {
  console.log(`[server] running on port ${PORT}`);
  await initTokens();
  console.log('[server] tokens ready');
});
