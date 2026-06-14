const axios = require('axios');
const { initTokens, authHeaders } = require('./config');

const GQL_TVSHOW_DOC = `query tvShowRelatedDetails($id: ID!, $country: String, $translation: String, $platform: String, $profileType: Int, $planId: String) { tvShowRelatedContent(id: $id, country: $country, translation: $translation, platform: $platform, profileType: $profileType, planId: $planId) { id title seasons { id title totalEpisodes nextEpisodesApi } } }`;

async function getSeasons(showId) {
  await initTokens();
  const r = await axios.post('https://artemis.zee5.com/artemis/graphql', {
    operationName: 'tvShowRelatedDetails',
    query: GQL_TVSHOW_DOC,
    variables: {
      id: showId,
      country: 'IN',
      translation: 'en',
      platform: 'androidtv',
      profileType: 1,
    },
  }, {
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  const show = r.data?.data?.tvShowRelatedContent;
  if (!show) {
    if (r.data?.errors) console.error('[episodes] GQL errors:', JSON.stringify(r.data.errors.slice(0, 2)));
    return null;
  }

  return {
    id: show.id,
    title: show.title,
    seasons: (show.seasons || []).map(s => ({
      id: s.id,
      title: s.title,
      totalEpisodes: s.totalEpisodes,
    })),
  };
}

async function getEpisodes(seasonId, limit = 100) {
  await initTokens();
  const r = await axios.get('https://gwapi.zee5.com/content/tvshow/', {
    params: {
      season_id: seasonId,
      type: 'episode',
      translation: 'en',
      country: 'in',
      on_air: 'false',
      version: '14',
      limit,
    },
    headers: authHeaders(),
  });

  const episodes = r.data.episodes || [];
  return episodes.map(ep => ({
    id: ep.id,
    title: ep.title || '',
    episodeNumber: ep.episode_number || ep.episodeNumber || 0,
    businessType: ep.business_type || ep.businessType || '',
    duration: ep.duration || 0,
    image: ep.image?.list || '',
  }));
}

module.exports = { getSeasons, getEpisodes };
