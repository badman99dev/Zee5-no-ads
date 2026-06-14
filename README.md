# ZEE5 No Ads API ·

Reverse-engineered ZEE5 API — search, browse, play free content without ads or DRM.

No login required. No official SDK. Just clean JSON endpoints.

<!-- 
Vercel auto-deploy config
Email: badman993944@gmail.com
Username: badman99dev
-->

## Quick Start

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`

## API Endpoints

### `GET /`

API index with all endpoint listing.

### `GET /search?q=<query>&lang=hi,en`

Search movies, shows, episodes.

```bash
curl "http://localhost:3000/search?q=mahabharat"
```

Returns: `[{ id, title, type, businessType, image }]`

### `GET /free5`

Get all Free5 tab rails (buckets).

```bash
curl "http://localhost:3000/free5"
```

Returns: `[{ id, title, total }]`

### `GET /collection/:id?page=0&limit=25`

Get items from any collection. Supports both named aliases and raw IDs.

```bash
# Named aliases
curl "http://localhost:3000/collection/free5"
curl "http://localhost:3000/collection/movies"
curl "http://localhost:3000/collection/freemovies"

# Raw collection ID
curl "http://localhost:3000/collection/0-8-5016?limit=10"
```

Returns: `{ id, title, total, items: [{ id, title, businessType, image }] }`

### `GET /collections`

List all named collection aliases.

```bash
curl "http://localhost:3000/collections"
```

### `GET /details/:id`

Content details for any movie/episode/show.

```bash
curl "http://localhost:3000/details/0-6-3331"
```

Returns: `{ id, title, description, businessType, duration, ageRating, releaseDate, languages, image }`

### `GET /seasons/:showId`

Get seasons list for a TV show.

```bash
curl "http://localhost:3000/seasons/0-6-3331"
```

Returns: `{ id, title, seasons: [{ id, title, totalEpisodes }] }`

### `GET /episodes/:seasonId?limit=100`

Get episodes for a season.

```bash
curl "http://localhost:3000/episodes/0-2-3300"
```

Returns: `{ seasonId, count, episodes: [{ id, title, episodeNumber, businessType, duration, image }] }`

### `GET /m3u8/:id?proxy=0`

Get clean m3u8 URL for any content. DRM bypassed via `/drm1/` → `/hls1/` path swap.

```bash
# Direct CDN URL
curl "http://localhost:3000/m3u8/0-0-1z5830530"

# With CF Worker proxy (for browser/VLC)
curl "http://localhost:3000/m3u8/0-0-1z5830530?proxy=1"
```

Returns: `{ id, title, businessType, free, direct, proxied, drm }`

Play with VLC:
```bash
vlc "$(curl -s 'http://localhost:3000/m3u8/0-0-1z5830530' | jq -r .direct)"
```

Download with ffmpeg:
```bash
ffmpeg -i "$(curl -s 'http://localhost:3000/m3u8/0-0-1z5830530' | jq -r .direct)" -c copy output.mp4
```

## Collection Aliases

| Alias | Collection ID | Description |
|-------|--------------|-------------|
| `free5` | `0-8-5011` | FREE5 tab (all free content) |
| `home` | `0-8-homepage` | Homepage |
| `movies` | `0-8-movies` | Movies |
| `tvshows` | `0-8-tvshows` | TV Shows |
| `premium` | `0-8-premiumcontents` | Premium |
| `sports` | `0-8-3z5266344` | Sports |
| `news` | `0-8-626` | News |
| `music` | `0-8-2707` | Music |
| `freemovies` | `0-8-5016` | FREE5 Movies Slider |
| `freetvshows` | `0-8-5794` | Free TV Shows |
| `fifa2026` | `0-8-3z5977322` | FIFA World Cup 2026 |
| `trending_free` | `0-8-3z5517520` | Trending on FREE5 |
| `south_free` | `0-8-3z5861709` | South Superhits Free |
| `kannada_free` | `0-8-3z5778362` | Free Kannada TV |
| `korean_free` | `0-8-3z5375722` | Free Korean Drama |
| `toprated_free` | `0-8-3z5957768` | Top 10 on FREE5 |
| `popular_movies` | `0-8-5020` | Popular Movies |
| `kids_free` | `0-8-3z5882645` | Play Free on KidZ |

## How It Works

1. **Token Flow** — Auto-generates platform + guest tokens on startup (no login needed)
2. **Akamai WAF Bypass** — `X-Forwarded-For: 103.48.198.48` header bypasses HTTP 475
3. **DRM Bypass** — `/drm1/` → `/hls1/` CDN path swap gives clean non-DRM HLS
4. **Segment 404 Fix** — CF Worker proxy at `zee5stream-proxy.badman993944.workers.dev` fixes false-404 segments for browser playback
5. **Free Content Detection** — `businessType` ∈ {`advertisement_downloadable`, `advertisement`, `free`, `free_downloadable`} = free

## Files

| File | Purpose |
|------|---------|
| `config.js` | Tokens, constants, headers, m3u8 helpers |
| `search.js` | GraphQL search endpoint |
| `free5.js` | Collection & Free5 browsing |
| `episodes.js` | TV show seasons & episodes |
| `playback.js` | Content details & m3u8 extraction |
| `index.js` | Express server & routes |

## Notes

- Free content only — premium content m3u8 won't play via `/hls1/` trick
- Tokens auto-refresh (platform ~24hr, guest ~30 days)
- India geo — CDN geo-block not an issue
- CF Worker proxy handles Akamai's false-404 segments for browser/VLC playback
