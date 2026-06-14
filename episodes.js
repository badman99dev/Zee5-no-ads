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

  const data = r.data;
  const seasons = data.seasons || [];
  return {
    id: data.id,
    title: data.title,
    totalSeasons: data.total_seasons || seasons.length,
    seasons: seasons.map(s => ({
      id: s.id,
      title: s.title,
      index: s.index,
      totalEpisodes: s.total_episodes || 0,
      episodeCount: (s.episodes || []).length,
      nextEpisodesApi: s.next_episodes_api || null,
    })),
  };
}

async function getEpisodes(seasonId, limit = 25, page = 0) {
  await initTokens();
  const r = await axios.get('https://gwapi.zee5.com/content/tvshow/', {
    params: {
      season_id: seasonId,
      type: 'episode',
      translation: 'en',
      country: 'in',
      on_air: 'true',
      version: 14,
      asset_subtype: 'tvshow',
      limit,
      page,
    },
    headers: authHeaders(),
  });

  const data = r.data;
  const episodes = data.episode || data.episodes || [];
  return {
    total: data.total || data.total_episodes || 0,
    page: data.page || page,
    nextPage: data.next_episodes_api || null,
    episodes: episodes.map(ep => ({
      id: ep.id,
      title: ep.title || '',
      episodeNumber: ep.episode_number || 0,
      businessType: ep.business_type || '',
      duration: ep.duration || 0,
      image: ep.image?.list || ep.list_image || '',
      releaseDate: ep.release_date || '',
    })),
  };
}

module.exports = { getSeasons, getEpisodes };
