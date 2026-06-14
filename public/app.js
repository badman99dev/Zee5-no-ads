// === CONFIG ===
const API = 'https://zee5-no-ads.vercel.app';
const IMG_VER = 'v1557819982';
const IMG_BASE = 'https://akamaividz2.zee5.com/image/upload';
const ITEMS_PER_RAIL = 25;
const EPISODES_PER_PAGE = 25;
const HERO_AUTOPLAY_INTERVAL = 5000;

// === IMAGE HELPERS ===
function imgHash(img, type = 'list') {
  if (!img) return '';
  if (typeof img === 'string') return img;
  if (type === 'portrait') return img.portrait || img.portraitclean || img.list || img.cover || '';
  return img.list || img.cover || '';
}

function imgPort(id, h) { return h ? `${IMG_BASE}/w_400,h_600,c_scale/${IMG_VER}/resources/${id}/portrait/${h}.jpg` : null; }
function imgLand(id, h) { return h ? `${IMG_BASE}/w_800,h_450,c_scale/${IMG_VER}/resources/${id}/list/${h}.jpg` : null; }
function imgHero(id, h) { return h ? `${IMG_BASE}/w_1920,h_800,c_scale/${IMG_VER}/resources/${id}/list/${h}.jpg` : null; }

function getImageUrl(item, type = 'portrait') {
  if (!item) return null;
  if (type === 'portrait') return item.imageUrl || item.imageUrlLandscape || null;
  return item.imageUrlLandscape || item.imageUrl || null;
}

function isFree(biz) {
  if (!biz) return false;
  const t = biz.toLowerCase();
  return t.includes('advertisement') || t.includes('free_downloadable') || t === 'free';
}

// === DOM ===
const $ = id => document.getElementById(id);

// === STATE ===
let currentHero = null, heroInterval = null, heroCurrentIndex = 0;
let free5State = { nextIdx: 0, total: 0, loading: false, seenIds: new Set() };
let currentTab = 'home';
let collectionPageState = { id: null, title: '', page: 0, limit: 25, total: 0, loading: false };
let currentSeasonId = null, currentEpPage = 0, totalEpisodes = 0, loadedEpisodes = 0, seenEpIds = new Set();
let selectedLangs = new Set();

const LANGUAGES = [
  { code: 'hi', label: 'Hindi' }, { code: 'hr', label: 'Bhojpuri' },
  { code: 'mr', label: 'Marathi' }, { code: 'te', label: 'Telugu' },
  { code: 'ta', label: 'Tamil' }, { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' }, { code: 'bn', label: 'Bengali' },
  { code: 'pa', label: 'Punjabi' }, { code: 'en', label: 'English' },
  { code: 'gu', label: 'Gujarati' }, { code: 'od', label: 'Odia' }
];

// === FETCH ===
async function api(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// === LANG PICKER ===
function initLangPicker() {
  const opts = $('langOptions');
  opts.innerHTML = '';
  LANGUAGES.forEach(l => {
    const opt = document.createElement('div');
    opt.className = 'lang-option';
    opt.dataset.code = l.code;
    opt.innerHTML = `<div class="lang-checkbox">✓</div><span class="lang-option-label">${l.label}</span><span class="lang-option-code">${l.code}</span>`;
    opt.onclick = e => {
      e.stopPropagation();
      if (selectedLangs.has(l.code)) { selectedLangs.delete(l.code); opt.classList.remove('selected'); }
      else { selectedLangs.add(l.code); opt.classList.add('selected'); }
      updateLangTrigger();
    };
    opts.appendChild(opt);
  });
  updateLangTrigger();
}

function updateLangTrigger() {
  const t = $('langTriggerText');
  if (selectedLangs.size === 0) t.textContent = 'All Languages';
  else if (selectedLangs.size === 1) {
    const l = LANGUAGES.find(x => x.code === [...selectedLangs][0]);
    t.textContent = l ? l.label : [...selectedLangs][0];
  } else t.textContent = `${selectedLangs.size} Languages`;
}

function getLang() { return selectedLangs.size ? [...selectedLangs].join(',') : ''; }

function toggleLangDropdown() {
  const open = $('langDropdown').classList.toggle('open');
  $('langTrigger').classList.toggle('open', open);
}

function closeLangDropdown() {
  $('langDropdown').classList.remove('open');
  $('langTrigger').classList.remove('open');
}

// === HERO CAROUSEL ===
function initHeroCarousel(items) {
  const container = $('heroCarousel');
  const dots = $('heroDots');
  container.innerHTML = '';
  dots.innerHTML = '';
  
  const freeItems = items.filter(i => isFree(i.business_type || i.businessType || ''));
  if (!freeItems.length) return;
  
  freeItems.slice(0, 8).forEach((item, idx) => {
    const slide = document.createElement('div');
    slide.className = 'hero-slide' + (idx === 0 ? ' active' : '');
    slide.dataset.index = idx;
    slide.dataset.id = item.id;
    
    const bgUrl = getImageUrl(item, 'landscape');
    
    const biz = item.business_type || item.businessType || '';
    const meta = [];
    if (item.asset_subtype) meta.push(item.asset_subtype);
    if (item.duration) meta.push(`${Math.round(item.duration/60)} min`);
    if (item.age_rating) meta.push(item.age_rating);
    if (item.release_date) meta.push(new Date(item.release_date).getFullYear());
    
    slide.innerHTML = `
      <div class="hero-bg" style="${bgUrl ? `background-image:url(${bgUrl})` : `background:linear-gradient(135deg,hsl(${(item.title||'X').length*30},50%,20%),hsl(${(item.title||'X').length*30+40},40%,10%))`}"></div>
      <div class="hero-gradient"></div>
      <div class="hero-content">
        <div class="hero-badge">${isFree(biz) ? 'FREE' : 'PREMIUM'}</div>
        <h1 class="hero-title">${item.title || 'Untitled'}</h1>
        <div class="hero-meta">${meta.map(x => `<span>${x}</span>`).join(' <span style="color:var(--text-dim)">·</span> ')}</div>
        <p class="hero-desc">${item.description || item.short_description || ''}</p>
        <div class="hero-actions">
          <button class="btn-watch" onclick="playHeroItem(${idx})">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
            Watch Now
          </button>
          <button class="btn-secondary" onclick="showHeroDetail(${idx})">More Info</button>
        </div>
      </div>
    `;
    container.appendChild(slide);
    
    const dot = document.createElement('button');
    dot.className = 'hero-dot' + (idx === 0 ? ' active' : '');
    dot.onclick = () => goToHeroSlide(idx);
    dots.appendChild(dot);
  });
  
  heroCurrentIndex = 0;
  startHeroAutoplay();
}

function goToHeroSlide(idx) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  slides.forEach((s, i) => s.classList.toggle('active', i === idx));
  dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  heroCurrentIndex = idx;
}

function startHeroAutoplay() {
  if (heroInterval) clearInterval(heroInterval);
  heroInterval = setInterval(() => {
    const slides = document.querySelectorAll('.hero-slide');
    if (!slides.length) return;
    heroCurrentIndex = (heroCurrentIndex + 1) % slides.length;
    goToHeroSlide(heroCurrentIndex);
  }, HERO_AUTOPLAY_INTERVAL);
}

function stopHeroAutoplay() {
  if (heroInterval) clearInterval(heroInterval);
}

function playHeroItem(idx) {
  const slides = document.querySelectorAll('.hero-slide');
  const item = slides[idx]?.dataset?.id ? { id: slides[idx].dataset.id } : null;
  if (item) openPlayer(item.id);
}

function showHeroDetail(idx) {
  const slides = document.querySelectorAll('.hero-slide');
  const id = slides[idx]?.dataset?.id;
  if (id) openDetail(id);
}

// === CARDS ===
function makeCard(item) {
  if (!item || !item.id) return document.createElement('span');
  const card = document.createElement('div');
  card.className = 'content-card';
  card.dataset.id = item.id;
  
  const isEpisode = (item.assetSubType || item.asset_subtype || '').toLowerCase() === 'episode';
  const url = getImageUrl(item, isEpisode ? 'landscape' : 'portrait');
  const biz = item.business_type || item.businessType || '';
  
  const meta = [];
  if (item.asset_subtype) meta.push(item.asset_subtype);
  if (item.duration) meta.push(`${Math.round(item.duration/60)}m`);
  
  card.innerHTML = `
    <div class="card-image${isEpisode ? ' landscape' : ''}">
      ${url ? `<img src="${url}" alt="${item.title}" loading="lazy" onerror="this.style.display='none';this.parentElement.style.background='linear-gradient(135deg,hsl(${(item.title||'X').length*30},50%,20%),hsl(${(item.title||'X').length*30+40},40%,10%)')">` : ''}
      <div class="card-gradient"></div>
      <div class="card-popup">
        <div class="card-popup-title">${item.title || 'Untitled'}</div>
        <div class="card-popup-meta">${meta.join(' · ')}</div>
        <div class="card-popup-actions">
          <button class="btn-popup-watch" onclick="event.stopPropagation();openPlayer('${item.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg> Watch
          </button>
          <button class="btn-popup-share" onclick="event.stopPropagation()">Share</button>
        </div>
      </div>
    </div>
    <div class="card-info">
      <div class="card-title">${item.title || 'Untitled'}</div>
      <div class="card-meta">
        ${isFree(biz) ? '<span class="card-badge">FREE</span>' : ''}
        <span>${item.asset_subtype || ''}</span>
      </div>
    </div>
  `;
  
  card.onclick = () => openDetail(item.id);
  return card;
}

// === RAILS ===
function makeRail(title, items, total, collId) {
  const rail = document.createElement('div');
  rail.className = 'rail';
  
  const freeItems = items.filter(i => isFree(i.business_type || i.businessType || ''));
  if (!freeItems.length) return null;
  
  const header = document.createElement('div');
  header.className = 'rail-header';
  header.innerHTML = `<h3 class="rail-title">${title}</h3>`;
  if (collId && total > freeItems.length) {
    const moreLink = document.createElement('a');
    moreLink.href = '#';
    moreLink.className = 'rail-more';
    moreLink.textContent = 'More →';
    moreLink.onclick = e => { e.preventDefault(); openCollectionPage(collId, title); };
    header.appendChild(moreLink);
  }
  rail.appendChild(header);
  
  const wrapper = document.createElement('div');
  wrapper.className = 'rail-wrapper';
  
  const slider = document.createElement('div');
  slider.className = 'rail-slider';
  freeItems.forEach(it => slider.appendChild(makeCard(it)));
  wrapper.appendChild(slider);
  
  const chevronLeft = document.createElement('button');
  chevronLeft.className = 'rail-chevron rail-chevron-left';
  chevronLeft.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"></path></svg>';
  chevronLeft.onclick = () => slider.scrollBy({ left: -slider.offsetWidth * 0.8, behavior: 'smooth' });
  wrapper.appendChild(chevronLeft);
  
  const chevronRight = document.createElement('button');
  chevronRight.className = 'rail-chevron rail-chevron-right';
  chevronRight.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"></path></svg>';
  chevronRight.onclick = () => slider.scrollBy({ left: slider.offsetWidth * 0.8, behavior: 'smooth' });
  wrapper.appendChild(chevronRight);
  
  rail.appendChild(wrapper);
  return rail;
}

// === HOME ===
async function loadHome() {
  try {
    const lang = getLang();
    // Load homepage content (not FREE5 - general curated content)
    const home = await api(`${API}/collection/0-8-homepage?limit=${ITEMS_PER_RAIL}`);
    const buckets = home.buckets || [];
    
    const heroItems = [];
    const rails = $('contentRails');
    rails.innerHTML = '';
    
    for (const b of buckets) {
      const bid = b.id || b.collection_id;
      if (!bid) continue;
      
      try {
        const c = await api(`${API}/collection/${bid}?limit=${ITEMS_PER_RAIL}`);
        const cb = c.buckets || [];
        const items = cb.length ? cb.flatMap(x => x.items || []) : (c.items || []);
        const freeItems = items.filter(i => isFree(i.business_type || i.businessType || ''));
        if (!freeItems.length) continue;
        
        heroItems.push(...freeItems.slice(0, 2));
        const total = b.total_items || c.total || freeItems.length;
        const rail = makeRail(b.title || c.title, freeItems, total, bid);
        if (rail) rails.appendChild(rail);
      } catch(e) { console.log('Rail fail', bid); }
    }
    
    // Init hero with first 8 free items from all rails
    if (heroItems.length) initHeroCarousel(heroItems.slice(0, 8));
    else $('heroSection').style.display = 'none';
    
    $('loadMoreBtn').style.display = 'none';
    
  } catch(e) {
    console.error('Home fail', e);
    $('contentRails').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Failed to load. Please refresh.</p></div>';
  }
}

async function loadFreeTab() {
  try {
    const lang = getLang();
    $('heroSection').style.display = 'none';
    const free5 = await api(`${API}/free5?page=0${lang ? '&lang='+lang : ''}`);
    const buckets = free5.buckets || [];
    free5State.total = free5.total || 0;
    free5State.nextIdx = 1;
    free5State.seenIds = new Set();
    
    const rails = $('contentRails');
    rails.innerHTML = '';
    
    for (const b of buckets) {
      const bid = b.id || b.collection_id;
      if (!bid || free5State.seenIds.has(bid)) continue;
      free5State.seenIds.add(bid);
      
      try {
        const c = await api(`${API}/collection/${bid}?limit=${ITEMS_PER_RAIL}`);
        const cb = c.buckets || [];
        const items = cb.length ? cb.flatMap(x => x.items || []) : (c.items || []);
        const freeItems = items.filter(i => isFree(i.business_type || i.businessType || ''));
        if (!freeItems.length) continue;
        
        const total = b.total_items || c.total || freeItems.length;
        const rail = makeRail(b.title || c.title, freeItems, total, bid);
        if (rail) rails.appendChild(rail);
      } catch(e) { console.log('Rail fail', bid); }
    }
    
    // Load more button
    const btn = $('loadMoreBtn');
    if (free5State.seenIds.size < free5State.total) {
      btn.style.display = 'inline-block';
      btn.textContent = `Load More Categories (${free5State.total - free5State.seenIds.size})`;
      btn.onclick = loadMoreCategories;
    } else btn.style.display = 'none';
    
  } catch(e) {
    console.error('Free tab fail', e);
    $('contentRails').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Failed to load FREE content. Please refresh.</p></div>';
  }
}

async function loadFifaTab() {
  try {
    $('heroSection').style.display = 'none';
    const data = await api(`${API}/collection/0-8-3z5977322?limit=${ITEMS_PER_RAIL}`);
    const buckets = data.buckets || [];
    
    const rails = $('contentRails');
    rails.innerHTML = '';
    
    for (const b of buckets) {
      const bid = b.id || b.collection_id;
      if (!bid) continue;
      
      try {
        const c = await api(`${API}/collection/${bid}?limit=${ITEMS_PER_RAIL}`);
        const cb = c.buckets || [];
        const items = cb.length ? cb.flatMap(x => x.items || []) : (c.items || []);
        const freeItems = items.filter(i => isFree(i.business_type || i.businessType || ''));
        if (!freeItems.length) continue;
        
        const total = b.total_items || c.total || freeItems.length;
        const rail = makeRail(b.title || c.title, freeItems, total, bid);
        if (rail) rails.appendChild(rail);
      } catch(e) { console.log('Rail fail', bid); }
    }
    
    $('loadMoreBtn').style.display = 'none';
    
  } catch(e) {
    console.error('FIFA tab fail', e);
    $('contentRails').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Failed to load FIFA content. Please refresh.</p></div>';
  }
}

async function loadMoviesTab() {
  try {
    $('heroSection').style.display = 'none';
    const data = await api(`${API}/collection/0-8-5016?limit=${ITEMS_PER_RAIL}`);
    const buckets = data.buckets || [];
    
    const rails = $('contentRails');
    rails.innerHTML = '';
    
    for (const b of buckets) {
      const bid = b.id || b.collection_id;
      if (!bid) continue;
      
      try {
        const c = await api(`${API}/collection/${bid}?limit=${ITEMS_PER_RAIL}`);
        const cb = c.buckets || [];
        const items = cb.length ? cb.flatMap(x => x.items || []) : (c.items || []);
        const freeItems = items.filter(i => isFree(i.business_type || i.businessType || ''));
        if (!freeItems.length) continue;
        
        const total = b.total_items || c.total || freeItems.length;
        const rail = makeRail(b.title || c.title, freeItems, total, bid);
        if (rail) rails.appendChild(rail);
      } catch(e) { console.log('Rail fail', bid); }
    }
    
    $('loadMoreBtn').style.display = 'none';
    
  } catch(e) {
    console.error('Movies tab fail', e);
    $('contentRails').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Failed to load Movies. Please refresh.</p></div>';
  }
}

async function loadTvShowsTab() {
  try {
    $('heroSection').style.display = 'none';
    const data = await api(`${API}/collection/0-8-5794?limit=${ITEMS_PER_RAIL}`);
    const buckets = data.buckets || [];
    
    const rails = $('contentRails');
    rails.innerHTML = '';
    
    for (const b of buckets) {
      const bid = b.id || b.collection_id;
      if (!bid) continue;
      
      try {
        const c = await api(`${API}/collection/${bid}?limit=${ITEMS_PER_RAIL}`);
        const cb = c.buckets || [];
        const items = cb.length ? cb.flatMap(x => x.items || []) : (c.items || []);
        const freeItems = items.filter(i => isFree(i.business_type || i.businessType || ''));
        if (!freeItems.length) continue;
        
        const total = b.total_items || c.total || freeItems.length;
        const rail = makeRail(b.title || c.title, freeItems, total, bid);
        if (rail) rails.appendChild(rail);
      } catch(e) { console.log('Rail fail', bid); }
    }
    
    $('loadMoreBtn').style.display = 'none';
    
  } catch(e) {
    console.error('TV Shows tab fail', e);
    $('contentRails').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Failed to load TV Shows. Please refresh.</p></div>';
  }
}

async function loadMoreTab() {
  try {
    $('heroSection').style.display = 'none';
    const rails = $('contentRails');
    rails.innerHTML = '';
    
    // Add popular collections
    const collections = [
      { id: '0-8-5016', title: 'Free Movies' },
      { id: '0-8-5794', title: 'Free TV Shows' },
      { id: '0-8-3z5266344', title: 'Sports' },
      { id: '0-8-626', title: 'News' },
      { id: '0-8-2707', title: 'Music' },
      { id: '0-8-3z5517520', title: 'Trending Free' },
      { id: '0-8-3z5861709', title: 'South Free' },
      { id: '0-8-3z5882645', title: 'Kids Free' },
    ];
    
    for (const col of collections) {
      try {
        const c = await api(`${API}/collection/${col.id}?limit=${ITEMS_PER_RAIL}`);
        const cb = c.buckets || [];
        const items = cb.length ? cb.flatMap(x => x.items || []) : (c.items || []);
        const freeItems = items.filter(i => isFree(i.business_type || i.businessType || ''));
        if (!freeItems.length) continue;
        
        const total = c.total || freeItems.length;
        const rail = makeRail(col.title, freeItems, total, col.id);
        if (rail) rails.appendChild(rail);
      } catch(e) { console.log('Collection fail', col.id); }
    }
    
    $('loadMoreBtn').style.display = 'none';
    
  } catch(e) {
    console.error('More tab fail', e);
    $('contentRails').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Failed to load content. Please refresh.</p></div>';
  }
}

async function loadMoreCategories() {
  const btn = $('loadMoreBtn');
  if (free5State.loading || !btn) return;
  free5State.loading = true;
  btn.textContent = 'Loading...';
  
  try {
    const lang = getLang();
    free5State.nextIdx++;
    const free5 = await api(`${API}/free5?page=${free5State.nextIdx}${lang ? '&lang='+lang : ''}`);
    const buckets = free5.buckets || [];
    if (!buckets.length) { btn.style.display = 'none'; free5State.loading = false; return; }
    
    const prevSize = free5State.seenIds.size;
    const rails = $('contentRails');
    
    for (const b of buckets) {
      const bid = b.id || b.collection_id;
      if (!bid || free5State.seenIds.has(bid)) continue;
      free5State.seenIds.add(bid);
      
      try {
        const c = await api(`${API}/collection/${bid}?limit=${ITEMS_PER_RAIL}`);
        const cb = c.buckets || [];
        const items = cb.length ? cb.flatMap(x => x.items || []) : (c.items || []);
        const freeItems = items.filter(i => isFree(i.business_type || i.businessType || ''));
        if (!freeItems.length) continue;
        
        const total = b.total_items || c.total || freeItems.length;
        const rail = makeRail(b.title || c.title, freeItems, total, bid);
        if (rail) rails.appendChild(rail);
      } catch(e) { console.log('Rail fail', bid); }
    }
    
    if (free5State.seenIds.size === prevSize && free5State.seenIds.size < free5State.total) {
      free5State.loading = false;
      return loadMoreCategories();
    }
    
    if (free5State.seenIds.size < free5State.total) {
      btn.textContent = `Load More Categories (${free5State.total - free5State.seenIds.size})`;
    } else btn.style.display = 'none';
    
  } catch(e) { console.error('Load more fail', e); btn.textContent = 'Failed. Retry?'; }
  free5State.loading = false;
}

// === SEARCH ===
async function doSearch(query) {
  if (!query.trim()) return;
  $('mainContent').style.display = 'none';
  $('searchOverlay').style.display = 'block';
  $('searchContent').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Searching...</p></div>';
  
  try {
    const gql = await api(`${API}/search?q=${encodeURIComponent(query)}&lang=hi,en`);
    const content = $('searchContent');
    content.innerHTML = '';
    
    const rails = gql?.data?.hybridSearchResults?.rails || [];
    if (!rails.length) {
      content.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px">No results found</p>';
      return;
    }
    
    for (const rail of rails) {
      const contents = rail.contents || [];
      const freeContents = contents.filter(c => {
        const data = c.movie || c.episode || c.tvShowDetails || c;
        return isFree(data.business_type || data.businessType || '');
      });
      if (!freeContents.length) continue;
      
      const title = document.createElement('h3');
      title.className = 'search-rail-title';
      title.textContent = `${rail.title} (${freeContents.length})`;
      content.appendChild(title);
      
      const row = document.createElement('div');
      row.className = 'search-row';
      freeContents.forEach(c => {
        const data = c.movie || c.episode || c.tvShowDetails || c;
        if (data && data.id) row.appendChild(makeCard(data));
      });
      content.appendChild(row);
    }
  } catch(e) {
    $('searchContent').innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px">Search failed</p>';
  }
}

// === COLLECTION PAGE ===
async function openCollectionPage(id, title) {
  collectionPageState = { id, title, page: 0, limit: 25, total: 0, loading: false };
  $('mainContent').style.display = 'none';
  $('searchOverlay').style.display = 'none';
  $('collectionOverlay').style.display = 'block';
  $('collectionTitle').textContent = title || 'Collection';
  $('collectionGrid').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading...</p></div>';
  
  try {
    const data = await api(`${API}/collection/${id}?limit=${collectionPageState.limit}&page=0`);
    collectionPageState.total = data.total || 0;
    collectionPageState.page = 0;
    
    const buckets = data.buckets || [];
    const items = buckets.length ? buckets.flatMap(b => b.items || []) : (data.items || []);
    const freeItems = items.filter(i => isFree(i.business_type || i.businessType || ''));
    
    const grid = $('collectionGrid');
    grid.innerHTML = '';
    freeItems.forEach(it => { if (it && it.id) grid.appendChild(makeCard(it)); });
    
    if (freeItems.length < collectionPageState.total) {
      const lmb = document.createElement('button');
      lmb.className = 'btn-load-more';
      lmb.textContent = `Load More (${collectionPageState.total - freeItems.length})`;
      lmb.onclick = loadMoreCollection;
      grid.appendChild(lmb);
    }
  } catch(e) { $('collectionGrid').innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px">Failed to load</p>'; }
}

async function loadMoreCollection() {
  const btn = document.querySelector('.collection-grid .btn-load-more');
  if (!btn || collectionPageState.loading) return;
  collectionPageState.loading = true;
  btn.textContent = 'Loading...';
  
  try {
    collectionPageState.page++;
    const data = await api(`${API}/collection/${collectionPageState.id}?limit=${collectionPageState.limit}&page=${collectionPageState.page}`);
    const buckets = data.buckets || [];
    const items = buckets.length ? buckets.flatMap(b => b.items || []) : (data.items || []);
    const freeItems = items.filter(i => isFree(i.business_type || i.businessType || ''));
    
    btn.remove();
    const grid = $('collectionGrid');
    freeItems.forEach(it => { if (it && it.id) grid.appendChild(makeCard(it)); });
    
    const loaded = (collectionPageState.page + 1) * collectionPageState.limit;
    if (loaded < collectionPageState.total) {
      const lmb = document.createElement('button');
      lmb.className = 'btn-load-more';
      lmb.textContent = `Load More (${collectionPageState.total - loaded})`;
      lmb.onclick = loadMoreCollection;
      grid.appendChild(lmb);
    }
  } catch(e) { console.log('Load more fail', e); btn.textContent = 'Failed. Retry?'; }
  collectionPageState.loading = false;
}

// === DETAIL MODAL ===
async function openDetail(id) {
  $('detailOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  $('detailTitle').textContent = 'Loading...';
  $('detailMeta').innerHTML = '';
  $('detailDesc').textContent = '';
  $('detailSeasons').style.display = 'none';
  $('detailEpisodes').style.display = 'none';
  $('btnWatch').onclick = () => watchNow(id);
  $('btnCopy').onclick = () => copyM3u8(id);
  
  try {
    const d = await api(`${API}/details/${id}`);
    const url = getImageUrl(d, 'landscape');
    if (url) {
      $('detailHero').setAttribute('style', `background-image:url(${url});background-size:cover;background-position:center;`);
    } else {
      $('detailHero').setAttribute('style', `background:linear-gradient(135deg,hsl(${(d.title||'X').length*30},50%,20%),hsl(${(d.title||'X').length*30+40},40%,10%));background-size:cover;background-position:center;`);
    }
    
    $('detailTitle').textContent = d.title || d.original_title || 'Untitled';
    
    const biz = d.business_type || d.businessType || '';
    const m = [];
    if (d.asset_subtype) m.push(d.asset_subtype);
    if (d.duration) m.push(`${Math.round(d.duration/60)} min`);
    if (d.age_rating) m.push(d.age_rating);
    if (d.release_date) m.push(new Date(d.release_date).getFullYear());
    if (biz) m.push(`<span class="badge">${isFree(biz)?'FREE':'PREMIUM'}</span>`);
    if (d.audio_languages?.length) m.push(d.audio_languages.join(', '));
    $('detailMeta').innerHTML = m.join(' <span style="color:var(--text-dim)">·</span> ');
    $('detailDesc').textContent = d.description || d.short_description || '';
    
    if (d.asset_type === 6 || d.asset_subtype === 'tvshow') {
      try {
        const sd = await api(`${API}/seasons/${id}`);
        const seasons = sd.seasons || [];
        if (seasons.length > 0) {
          $('detailSeasons').style.display = 'block';
          const sl = $('seasonsList');
          sl.innerHTML = '';
          seasons.forEach((s, idx) => {
            const btn = document.createElement('button');
            btn.className = 'season-btn' + (idx === 0 ? ' active' : '');
            btn.textContent = s.title || `Season ${s.index}`;
            btn.onclick = () => {
              document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              loadEpisodesFirst(s.id, s.total_episodes || 0);
            };
            sl.appendChild(btn);
          });
          loadEpisodesFirst(seasons[0].id, seasons[0].total_episodes || 0);
        }
      } catch(e) { console.log('No seasons', e); }
    }
  } catch(e) { $('detailTitle').textContent = 'Error'; $('detailDesc').textContent = 'Failed to load details.'; }
}

async function watchNow(id) {
  // Show loading state
  $('btnWatch').textContent = 'Loading...';
  $('btnWatch').disabled = true;
  
  try {
    // Check if it's a TV show with seasons
    if ($('detailSeasons').style.display === 'block') {
      // Get the first season's episodes
      const activeSeason = document.querySelector('.season-btn.active');
      if (activeSeason) {
        // Find the season ID from the active button
        const seasonBtns = document.querySelectorAll('.season-btn');
        const seasonIndex = Array.from(seasonBtns).indexOf(activeSeason);
        
        // Get seasons data from API again
        const sd = await api(`${API}/seasons/${id}`);
        const seasons = sd.seasons || [];
        if (seasons.length > 0 && seasons[seasonIndex]) {
          const seasonId = seasons[seasonIndex].id;
          
          // Get episodes
          const epData = await api(`${API}/episodes/${seasonId}?limit=1&page=0`);
          const eps = (epData.episode || epData.episodes || []);
          
          if (eps.length > 0) {
            // Play Episode 1
            openPlayer(eps[0].id);
          } else {
            // No episodes found, try to play the show ID directly
            openPlayer(id);
          }
        }
      } else {
        // No active season, try direct play
        openPlayer(id);
      }
    } else {
      // It's a movie, play directly
      openPlayer(id);
    }
  } catch(e) {
    console.error('Watch Now error:', e);
    // Fallback: try direct play
    openPlayer(id);
  } finally {
    $('btnWatch').textContent = 'Watch Now';
    $('btnWatch').disabled = false;
  }
}

function closeDetail() {
  $('detailOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

// === EPISODES ===
async function loadEpisodesFirst(seasonId, total) {
  currentSeasonId = seasonId;
  currentEpPage = 0;
  totalEpisodes = total;
  loadedEpisodes = 0;
  seenEpIds = new Set();
  $('detailEpisodes').style.display = 'block';
  $('episodesList').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading episodes...</p></div>';
  $('episodesCount').textContent = '';
  $('loadMoreEpisodes').style.display = 'none';
  
  try {
    const data = await api(`${API}/episodes/${seasonId}?limit=${EPISODES_PER_PAGE}&page=${currentEpPage}`);
    const eps = (data.episode || data.episodes || []).sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
    totalEpisodes = data.total || data.total_episodes || total;
    eps.forEach(ep => seenEpIds.add(ep.id));
    loadedEpisodes = seenEpIds.size;
    
    $('episodesList').innerHTML = '';
    $('episodesCount').textContent = `${loadedEpisodes} / ${totalEpisodes}`;
    renderEpisodes(eps);
    
    if (loadedEpisodes < totalEpisodes) {
      $('loadMoreEpisodes').style.display = 'inline-block';
      $('loadMoreEpisodes').textContent = `Load More (${totalEpisodes - loadedEpisodes})`;
      $('loadMoreEpisodes').onclick = loadMoreEpisodes;
    }
  } catch(e) {
    $('episodesList').innerHTML = '<p style="color:var(--text-muted);padding:20px">Failed to load episodes</p>';
  }
}

async function loadMoreEpisodes() {
  if (!currentSeasonId) return;
  $('loadMoreEpisodes').textContent = 'Loading...';
  
  try {
    currentEpPage++;
    const data = await api(`${API}/episodes/${currentSeasonId}?limit=${EPISODES_PER_PAGE}&page=${currentEpPage}`);
    const eps = (data.episode || data.episodes || []).sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
    const prevSize = seenEpIds.size;
    eps.forEach(ep => seenEpIds.add(ep.id));
    
    if (seenEpIds.size === prevSize && seenEpIds.size < totalEpisodes) {
      return loadMoreEpisodes();
    }
    
    loadedEpisodes = seenEpIds.size;
    renderEpisodes(eps);
    $('episodesCount').textContent = `${loadedEpisodes} / ${totalEpisodes}`;
    
    if (loadedEpisodes < totalEpisodes) {
      $('loadMoreEpisodes').textContent = `Load More (${totalEpisodes - loadedEpisodes})`;
    } else $('loadMoreEpisodes').style.display = 'none';
  } catch(e) { $('loadMoreEpisodes').textContent = 'Failed. Retry?'; }
}

function renderEpisodes(eps) {
  const list = $('episodesList');
  eps.forEach(ep => {
    const item = document.createElement('div');
    item.className = 'episode-item';
    const biz = ep.business_type || ep.businessType || '';
    const thumb = getImageUrl(ep, 'landscape');
    
    item.innerHTML = `
      <div class="episode-thumb">${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : ''}</div>
      <div class="episode-info">
        <div class="episode-title">${ep.title || ep.original_title || 'Untitled'} ${isFree(biz) ? '<span class="card-badge" style="margin-left:6px">FREE</span>' : ''}</div>
        <div class="episode-meta">Ep ${ep.episode_number || '?'}${ep.duration ? ` · ${Math.round(ep.duration/60)} min` : ''}${ep.release_date ? ` · ${new Date(ep.release_date).toLocaleDateString()}` : ''}</div>
      </div>
      <button class="episode-play" onclick="event.stopPropagation();openPlayer('${ep.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
      </button>
    `;
    item.onclick = () => openPlayer(ep.id);
    list.appendChild(item);
  });
}

// === VIDEO PLAYER WITH PLYR + HLS ===
let plyrPlayer = null;

async function openPlayer(id) {
  $('playerOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  $('playerFallback').style.display = 'none';
  $('videoPlayer').style.display = 'none';
  
  // Destroy existing Plyr instance
  if (plyrPlayer) { plyrPlayer.destroy(); plyrPlayer = null; }
  
  try {
    const data = await api(`${API}/m3u8/${id}`);
    const url = data.proxied || data.direct || (Array.isArray(data.hls) ? data.hls[0] : data.hls);
    if (!url) { showPlayerFallback('No video URL available'); return; }
    $('fallbackUrl').textContent = url;
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        enableWorker: true,
        lowLatencyMode: true
      });
      
      hls.loadSource(url);
      hls.attachMedia($('videoPlayer'));
      
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const levels = data.levels.map((level, index) => ({
          label: `${level.height}p`,
          value: index
        }));
        
        // Initialize Plyr with quality options
        plyrPlayer = new Plyr($('videoPlayer'), {
          controls: [
            'play-large', 'play', 'progress', 'current-time', 'duration',
            'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
          ],
          settings: ['quality', 'speed', 'captions'],
          quality: {
            default: levels.length - 1,
            options: levels.map(l => l.value),
            forced: true,
            onChange: (value) => {
              hls.currentLevel = value;
            }
          },
          speed: {
            selected: 1,
            options: [0.5, 0.75, 1, 1.25, 1.5, 2]
          },
          keyboard: { focused: true, global: true },
          tooltips: { controls: true, seek: true },
          i18n: {
            qualityLabel: {
              0: 'Auto'
            }
          }
        });
        
        // Add quality labels to Plyr
        plyrPlayer.quality = {
          default: levels.length - 1,
          options: levels.map(l => l.value),
          forced: true,
          onChange: (value) => {
            hls.currentLevel = value;
          }
        };
        
        $('videoPlayer').style.display = 'block';
        plyrPlayer.play().catch(() => {});
      });
      
      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal) showPlayerFallback('Playback error. Use URL in external player.');
      });
      
      window.currentHls = hls;
    } else if ($('videoPlayer').canPlayType('application/vnd.apple.mpegurl')) {
      $('videoPlayer').src = url;
      plyrPlayer = new Plyr($('videoPlayer'), {
        controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
        settings: ['speed', 'captions'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] }
      });
      $('videoPlayer').style.display = 'block';
      plyrPlayer.play().catch(() => {});
    } else showPlayerFallback('Browser does not support HLS');
  } catch(e) { showPlayerFallback('Failed to load video'); }
}

function showPlayerFallback(msg) {
  $('videoPlayer').style.display = 'none';
  $('playerFallback').style.display = 'block';
  $('playerFallback').querySelector('p').textContent = msg || 'Playback not available';
}

function closePlayer() {
  if (plyrPlayer) { plyrPlayer.destroy(); plyrPlayer = null; }
  if (window.currentHls) { window.currentHls.destroy(); window.currentHls = null; }
  $('videoPlayer').pause();
  $('videoPlayer').removeAttribute('src');
  $('videoPlayer').load();
  $('playerOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

async function copyM3u8(id) {
  try {
    const data = await api(`${API}/m3u8/${id}`);
    const url = data.proxied || data.direct || (Array.isArray(data.hls) ? data.hls[0] : data.hls);
    if (url) { await navigator.clipboard.writeText(url); $('btnCopy').textContent = 'Copied!'; setTimeout(() => $('btnCopy').textContent = 'Copy M3U8', 2000); }
  } catch(e) {}
}

// === EVENTS ===
$('searchBtn').onclick = () => doSearch($('searchInput').value);
$('searchInput').onkeydown = e => { if (e.key === 'Enter') doSearch($('searchInput').value); };

$('searchClose').onclick = () => {
  $('searchOverlay').style.display = 'none'; $('mainContent').style.display = 'block'; $('searchInput').value = '';
};

$('collectionClose').onclick = () => {
  $('collectionOverlay').style.display = 'none'; $('mainContent').style.display = 'block';
};

$('detailClose').onclick = closeDetail;
$('detailOverlay').onclick = e => { if (e.target === $('detailOverlay')) closeDetail(); };

$('playerClose').onclick = closePlayer;
$('playerOverlay').onclick = e => { if (e.target === $('playerOverlay')) closePlayer(); };

$('langTrigger').onclick = e => { e.stopPropagation(); toggleLangDropdown(); };
$('langClear').onclick = e => {
  e.stopPropagation(); selectedLangs.clear();
  document.querySelectorAll('.lang-option').forEach(o => o.classList.remove('selected'));
  updateLangTrigger();
};
$('langApply').onclick = e => {
  e.stopPropagation(); closeLangDropdown();
  free5State = { nextIdx: 0, total: 0, loading: false, seenIds: new Set() };
  $('contentRails').innerHTML = '';
  stopHeroAutoplay();
  loadHome();
};

document.addEventListener('click', e => {
  if (!e.target.closest('#langPicker')) closeLangDropdown();
});

// Mobile menu
$('hamburger').onclick = () => $('mobileMenu').classList.add('open');
$('mobileMenuClose').onclick = () => $('mobileMenu').classList.remove('open');

// Tab switching
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  
  $('searchOverlay').style.display = 'none';
  $('collectionOverlay').style.display = 'none';
  $('mainContent').style.display = 'block';
  
  $('heroSection').style.display = 'block';
  $('contentRails').innerHTML = '';
  $('loadMoreBtn').style.display = 'none';
  free5State = { nextIdx: 0, total: 0, loading: false, seenIds: new Set() };
  
  if (tab === 'home') loadHome();
  else if (tab === 'free') loadFreeTab();
  else if (tab === 'fifa') loadFifaTab();
  else if (tab === 'movies') loadMoviesTab();
  else if (tab === 'tvshows') loadTvShowsTab();
  else if (tab === 'more') loadMoreTab();
}

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.onclick = () => switchTab(tab.dataset.tab);
});

// Nav links
document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
  link.onclick = e => {
    e.preventDefault();
    document.querySelectorAll('.nav-link, .mobile-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    $('mobileMenu').classList.remove('open');
    const p = link.dataset.page;
    if (p === 'home') { switchTab('home'); }
    else if (p === 'movies') openCollectionPage('0-8-5016', 'Movies');
    else if (p === 'tv') openCollectionPage('0-8-5794', 'TV Shows');
    else if (p === 'collections') openCollectionPage('0-8-5011', 'Collections');
  };
});

// Scroll
window.onscroll = () => {
  $('navbar').classList.toggle('scrolled', window.scrollY > 50);
};

// Hero hover
$('heroSection').onmouseenter = stopHeroAutoplay;
$('heroSection').onmouseleave = startHeroAutoplay;

$('heroArrowLeft').onclick = () => {
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length) goToHeroSlide((heroCurrentIndex - 1 + slides.length) % slides.length);
};

$('heroArrowRight').onclick = () => {
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length) goToHeroSlide((heroCurrentIndex + 1) % slides.length);
};

// Keyboard
document.onkeydown = e => {
  if (e.key === 'Escape') {
    if ($('playerOverlay').style.display === 'flex') closePlayer();
    else if ($('detailOverlay').style.display === 'flex') closeDetail();
    else if ($('mobileMenu').classList.contains('open')) $('mobileMenu').classList.remove('open');
  }
};

// Init
initLangPicker();
loadHome();
