const express = require('express');
const { initTokens, authHeaders, redis, getTokens } = require('./config');
const { search } = require('./search');
const { getCollection, getFree5, COLLECTIONS } = require('./free5');
const { getSeasons, getEpisodes } = require('./episodes');
const { getContentDetails, getM3u8 } = require('./playback');

const app = express();
const PORT = process.env.PORT || 3000;

function isFreeContent(biz) {
  if (!biz) return false;
  const t = biz.toLowerCase();
  return t.includes('advertisement') || t.includes('free_downloadable') || t === 'free';
}

function isPlayable(item) {
  const subtype = (item.asset_subtype || item.assetSubType || '').toLowerCase();
  return subtype !== 'external_link' && subtype !== 'link';
}

function isLiveContent(item) {
  const type = item.asset_type || item.assetType;
  return type === 9 || type === '9';
}

function isSportsContent(item) {
  const subtype = (item.asset_subtype || item.assetSubType || '').toLowerCase();
  return subtype.includes('sports');
}

function isTrailerContent(item) {
  const url = item.stream_url_hls || item.stream_url || item.hls || item.video || '';
  const path = (typeof url === 'string' ? url : JSON.stringify(url)).toLowerCase();
  return path.includes('trailers') || path.includes('promos');
}

function isFreeContent(biz) {
  if (!biz) return false;
  const t = biz.toLowerCase();
  return t.includes('advertisement') || t.includes('free_downloadable') || t === 'free';
}

function filterPremium(data) {
  if (!data) return data;
  
  // Handle search results (rails)
  if (data.data && data.data.hybridSearchResults && data.data.hybridSearchResults.rails) {
    data.data.hybridSearchResults.rails.forEach(rail => {
      if (rail.contents) {
        rail.contents = rail.contents.filter(item => {
          const data = item.movie || item.episode || item.tvShowDetails || item;
          return isFreeContent(data.business_type || data.businessType || '') && isPlayable(data) && !isLiveContent(data) && !isSportsContent(data) && !isTrailerContent(data);
        });
      }
    });
    // Remove empty rails
    data.data.hybridSearchResults.rails = data.data.hybridSearchResults.rails.filter(rail => 
      rail.contents && rail.contents.length > 0
    );
  }
  
  // Handle collection buckets
  if (data.buckets) {
    data.buckets.forEach(bucket => {
      if (bucket.items) {
        bucket.items = bucket.items.filter(item => 
          isFreeContent(item.business_type || item.businessType || '') && isPlayable(item) && !isLiveContent(item) && !isSportsContent(item) && !isTrailerContent(item)
        );
      }
    });
    // Remove buckets that became empty after filtering out premium content
    data.buckets = data.buckets.filter(bucket => 
      bucket.items && bucket.items.length > 0
    );
  }
  
  // Handle direct items array
  if (data.items) {
    data.items = data.items.filter(item => 
      isFreeContent(item.business_type || item.businessType || '') && isPlayable(item) && !isLiveContent(item) && !isSportsContent(item) && !isTrailerContent(item)
    );
  }
  
  // Handle episodes
  if (data.episode) {
    data.episode = data.episode.filter(item => 
      isFreeContent(item.business_type || item.businessType || '') && isPlayable(item) && !isLiveContent(item) && !isSportsContent(item) && !isTrailerContent(item)
    );
  }
  
  return data;
}

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
    res.json(filterPremium(data));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/free5', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const lang = req.query.lang || '';
    const cacheKey = `zee5:cache:free5:${page}:${lang}`;

    const cached = await redis('GET', cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const data = filterPremium(await getFree5(page, lang));
    await redis('SETEX', cacheKey, '21600', JSON.stringify(data));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/collection/:id', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 25;
    const lang = req.query.languages || '';
    const cacheKey = `zee5:cache:collection:${req.params.id}:${page}:${limit}:${lang}`;

    const cached = await redis('GET', cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const data = filterPremium(await getCollection(req.params.id, page, limit, lang));
    await redis('SETEX', cacheKey, '21600', JSON.stringify(data));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/collections', (req, res) => {
  res.json(COLLECTIONS);
});

app.get('/tokens', async (req, res) => {
  try {
    const tokens = await getTokens();
    res.json(tokens);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
