const axios = require('axios');
const { initTokens, authHeaders, cleanM3u8, proxiedM3u8, mapImages } = require('./config');

async function getContentDetails(contentId) {
  await initTokens();
  const r = await axios.get(`https://gwapi.zee5.com/content/details/${contentId}`, {
    params: { translation: 'en', country: 'IN', version: '2' },
    headers: authHeaders(),
  });
  return mapImages(r.data);
}

async function getM3u8(contentId) {
  await initTokens();
  const r = await axios.get(`https://gwapi.zee5.com/content/details/${contentId}`, {
    params: { translation: 'en', country: 'IN', version: '2' },
    headers: authHeaders(),
  });
  const d = r.data;
  const hls = d.hls;
  const biz = d.business_type || d.businessType || '';
  const isFree = ['advertisement_downloadable', 'advertisement', 'free', 'free_downloadable'].includes(biz);
  return mapImages({
    ...d,
    free: isFree,
    direct: cleanM3u8(hls),
    proxied: proxiedM3u8(hls),
  });
}

module.exports = { getContentDetails, getM3u8 };
