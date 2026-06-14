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
    endpoints: {
      search: 'GET /search?q=query',
      free5: 'GET /free5',
      collection: 'GET /collection/:id?page=0&limit=25',
      details: 'GET /details/:id',
      seasons: 'GET /seasons/:showId',
      episodes: 'GET /episodes/:seasonId?limit=100',
      m3u8: 'GET /m3u8/:id?proxy=0',
      collections: 'GET /collections',
    },
  });
});

app.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'q param required' });
    const results = await search(q, req.query.lang);
    res.json({ query: q, count: results.length, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/free5', async (req, res) => {
  try {
    const rails = await getFree5();
    res.json({ rails });
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
    if (!data) return res.status(404).json({ error: 'show not found' });
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
    res.json({ seasonId: req.params.seasonId, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/m3u8/:id', async (req, res) => {
  try {
    const useProxy = req.query.proxy === '1';
    const data = await getM3u8(req.params.id, useProxy);
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
