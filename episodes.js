const axios = require('axios');
const { initTokens, authHeaders } = require('./config');

async function getSeasons(showId) {
  await initTokens();
  const r = await axios.get(`https://gwapi.zee5.com/content/tvshow/${showId}`, {
    params: {
      translation: 'en',
      country: 'in',
      version: 14,
      platform: 'androidtv',
    },
    headers: authHeaders(),
    timeout: 15000,
  });
  return r.data;
}

async function getEpisodes(seasonId, limit = 25, page = 0) {
  await initTokens();
  const r = await axios.get('https://gwapi.zee5.com/content/tvshow/', {
    params: {
      season_id: seasonId,
      type: 'episode',
      translation: 'en',
      country: 'in',
      on_air: 'false',
      version: 14,
      asset_subtype: 'tvshow',
      limit,
      page,
    },
    headers: authHeaders(),
  });
  return r.data;
}

module.exports = { getSeasons, getEpisodes };
