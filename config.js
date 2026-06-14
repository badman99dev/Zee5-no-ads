const axios = require('axios');

const G_ID = 'b52f2dd8-b853-4df8-9580-2c134cc325e1';
const ESK_SECRET = 'HOBNPuy7H3T5meJJAfyLkJlHaX2dXeEB';
const APP_VERSION = '5.79.9';
const XFF_IP = '103.48.198.48';
const CF_PROXY = 'https://zee5stream-proxy.badman993944.workers.dev';

let platformToken = '';
let guestToken = '';
let deviceId = '';
let tokenExpiry = 0;

function generateDeviceId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function commonHeaders() {
  return {
    'X-Z5-Appversion': APP_VERSION,
    'X-Z5-Appversionnumber': '203230889',
    'X-Z5-AppPlatform': 'androidtv',
    'User-Agent': `com.graymatrix.did;androidtv;${APP_VERSION}(203230889);Android(14);Google(Pixel 7)`,
    'G_ID': G_ID,
    'X-Forwarded-For': XFF_IP,
  };
}

function authHeaders() {
  return {
    ...commonHeaders(),
    'X-ACCESS-TOKEN': platformToken,
    'X-Z5-Guest-Token': guestToken,
    'x-z5-device-id': deviceId,
  };
}

async function initTokens() {
  if (platformToken && guestToken && Date.now() < tokenExpiry) return;

  if (!deviceId) deviceId = generateDeviceId();

  const r1 = await axios.get('https://launchapi.zee5.com/launch?platform_name=androidtv', {
    headers: commonHeaders(),
  });
  platformToken = r1.data.platform_token?.token || r1.data.token || '';

  const r2 = await axios.post('https://useraction.zee5.com/user/', {
    user: { apikey: '', aid: deviceId },
  }, {
    headers: {
      ...commonHeaders(),
      'X-ACCESS-TOKEN': platformToken,
      'X-User-Type': 'guest',
      'x-z5-device-id': deviceId,
      'Content-Type': 'application/json',
    },
  });
  guestToken = r2.data.guest_user || r2.data.token || '';
  tokenExpiry = Date.now() + 86400000;
  console.log(`[config] tokens refreshed | platform=${platformToken.slice(0, 20)}... | guest=${guestToken.slice(0, 20)}...`);
}

function cleanM3u8(hls) {
  if (!hls) return null;
  const path = Array.isArray(hls) ? hls[0] : hls;
  if (!path) return null;
  const clean = path.replace('/drm1/', '/hls1/');
  return `https://zee5vod.akamaized.net${clean}`;
}

function proxiedM3u8(hls) {
  if (!hls) return null;
  const path = Array.isArray(hls) ? hls[0] : hls;
  if (!path) return null;
  const clean = path.replace('/drm1/', '/hls1/');
  return `${CF_PROXY}/https://zee5vod.akamaized.net${clean}`;
}

module.exports = {
  initTokens,
  commonHeaders,
  authHeaders,
  cleanM3u8,
  proxiedM3u8,
  G_ID,
  ESK_SECRET,
  APP_VERSION,
  XFF_IP,
  CF_PROXY,
};
