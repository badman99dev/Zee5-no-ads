const axios = require('axios');
const { initTokens, authHeaders, cleanM3u8, proxiedM3u8 } = require('./config');

async function getContentDetails(contentId) {
  await initTokens();
  const r = await axios.get(`https://gwapi.zee5.com/content/details/${contentId}`, {
    params: { translation: 'en', country: 'IN', version: '2' },
    headers: authHeaders(),
  });

  const d = r.data;
  return {
    id: d.id,
    title: d.title || '',
    description: d.description || d.short_description || '',
    businessType: d.business_type || d.businessType || '',
    duration: d.duration || 0,
    ageRating: d.age_rating || '',
    releaseDate: d.release_date || d.zee5_release_date || '',
    languages: d.audio_languages || d.languages || [],
    assetType: d.asset_type || 0,
    image: d.image?.list || d.image?.cover || '',
  };
}

async function getM3u8(contentId, useProxy = false) {
  await initTokens();
  const r = await axios.get(`https://gwapi.zee5.com/content/details/${contentId}`, {
    params: { translation: 'en', country: 'IN', version: '2' },
    headers: authHeaders(),
  });

  const d = r.data;
  const hls = d.hls;
  const biz = d.business_type || d.businessType || '';
  const isFree = ['advertisement_downloadable', 'advertisement', 'free', 'free_downloadable'].includes(biz);

  return {
    id: d.id,
    title: d.title || '',
    businessType: biz,
    free: isFree,
    direct: useProxy ? proxiedM3u8(hls) : cleanM3u8(hls),
    proxied: proxiedM3u8(hls),
    drm: hls ? (Array.isArray(hls) ? hls[0] : hls) : null,
  };
}

module.exports = { getContentDetails, getM3u8 };
