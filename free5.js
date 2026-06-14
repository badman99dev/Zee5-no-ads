const axios = require('axios');
const { initTokens, authHeaders } = require('./config');

const FREE5_ID = '0-8-5011';

const COLLECTIONS = {
  free5: '0-8-5011',
  home: '0-8-homepage',
  movies: '0-8-movies',
  tvshows: '0-8-tvshows',
  premium: '0-8-premiumcontents',
  sports: '0-8-3z5266344',
  news: '0-8-626',
  music: '0-8-2707',
  freemovies: '0-8-5016',
  freetvshows: '0-8-5794',
  fifa2026: '0-8-3z5977322',
  trending_free: '0-8-3z5517520',
  south_free: '0-8-3z5861709',
  kannada_free: '0-8-3z5778362',
  korean_free: '0-8-3z5375722',
  toprated_free: '0-8-3z5957768',
  popular_movies: '0-8-5020',
  kids_free: '0-8-3z5882645',
};

async function getCollection(collectionId, page = 0, limit = 25) {
  await initTokens();
  const cid = COLLECTIONS[collectionId] || collectionId;
  const r = await axios.get(`https://gwapi.zee5.com/content/collection/${cid}`, {
    params: { translation: 'en', country: 'IN', version: '14', limit, page },
    headers: authHeaders(),
  });
  return r.data;
}

async function getFree5(page = 0, lang) {
  await initTokens();
  const params = { translation: 'en', country: 'IN', version: '14', limit: 20, page };
  if (lang) params.languages = lang;
  const r = await axios.get(`https://gwapi.zee5.com/content/collection/${FREE5_ID}`, {
    params,
    headers: authHeaders(),
  });
  return r.data;
}

module.exports = { getCollection, getFree5, COLLECTIONS };
