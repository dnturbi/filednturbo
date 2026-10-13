document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="./image-layout.css?v=8">');
document.querySelector('.notice')?.remove();
requestAnimationFrame(() => document.body.classList.add('page-loaded'));

const grid = document.querySelector('#mod-grid');
const dialog = document.querySelector('#download-dialog');
const PAGE_SIZE = 12;
let filteredMods = [];
let visibleCount = PAGE_SIZE;
const loadMoreButton = document.createElement('button');
loadMoreButton.className = 'load-more';
loadMoreButton.type = 'button';
loadMoreButton.innerHTML = '<span>XEM THÊM</span><small></small><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
grid.after(loadMoreButton);
const appPromo = document.createElement('section');
appPromo.className = 'app-promo reveal';
appPromo.innerHTML = `
  <div class="app-glow" aria-hidden="true"></div>
  <div class="phone-mockup" aria-hidden="true">
    <div class="phone-screen">
      <span class="phone-camera"></span>
      <img src="./assets/logo.svg" alt="">
      <strong>DN TURBO</strong>
      <small>GAME BOOSTER</small>
      <div class="boost-ring"><b>BOOST</b></div>
    </div>
  </div>
  <div class="app-copy">
    <p class="kicker"><span></span>ỨNG DỤNG DN TURBO</p>
    <h2>TỐI ƯU TRẢI NGHIỆM<br><em>CHƠI GAME CỦA BẠN</em></h2>
    <p>Tải DN Turbo Game Booster và xem hướng dẫn MOD file đầy đủ từ kênh DN Turbo.</p>
    <div class="app-actions">
      <a class="store-button" href="https://play.google.com/store/apps/details?id=com.modaov.turbogamebooster" target="_blank" rel="noopener noreferrer">
        <img class="google-play-badge" src="https://play.google.com/intl/vi/badges/static/images/badges/vi_badge_web_generic.png" alt="Tải ứng dụng trên Google Play">
      </a>
      <a class="guide-button" href="https://youtu.be/X6D03XFG8cc" target="_blank" rel="noopener noreferrer">
        <span class="play-icon"><i></i></span>
        <span><small>XEM HƯỚNG DẪN TRÊN</small><strong>YouTube</strong></span>
      </a>
    </div>
  </div>`;
document.querySelector('.hero').append(appPromo);
const defaultLink = document.querySelector('#bypass-link');
const linkBox = document.createElement('div');
linkBox.className = 'modal-links';
defaultLink.before(linkBox);
defaultLink.remove();
const searchBox = document.createElement('div');
searchBox.className = 'search-box';
searchBox.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg><input id="mod-search" type="search" placeholder="Tìm tên MOD, mã hoặc thể loại..." autocomplete="off" aria-label="Tìm kiếm MOD"><span id="search-count"></span>`;
document.querySelector('.section-head > p').replaceWith(searchBox);
let mods = [];
let trigger;
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -30px' });

function observeReveals(elements) {
  elements.forEach((element, index) => {
    element.classList.add('reveal');
    element.style.setProperty('--reveal-delay', `${Math.min(index * 70, 280)}ms`);
    revealObserver.observe(element);
  });
}

function getModTitle(mod) {
  if (mod.hero && mod.skin) return `${mod.hero} — ${mod.skin}`;
  return mod.hero || mod.skin || mod.title || `MOD ${mod.id}`;
}

function renderDownloadLinks(mod) {
  const links = [
    { url: mod.link_android, label: 'TẢI ANDROID', icon: './assets/logo-android.svg' },
    { url: mod.link_ios, label: 'TẢI IOS', icon: './assets/logo-ios.svg' },
    { url: mod.link_3105, label: 'TẢI BẢN .3105', icon: './assets/logo-3105.svg' }
  ].filter(item => item.url);

  if (!links.length) {
    linkBox.innerHTML = '<button class="button coming-soon" type="button" disabled>SẮP RA MẮT</button>';
    return;
  }

  linkBox.innerHTML = links.map(item => `
    <a class="button primary" href="${item.url}" target="_blank" rel="noopener noreferrer">
      <img class="platform-logo" src="${item.icon}" alt="">
      ${item.label}
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/></svg>
    </a>`).join('');
}

function renderBadges(mod) {
  const badges = document.querySelector('.badges');
  const items = [
    { visible: mod.link_android, label: 'ANDROID', icon: './assets/logo-android.svg' },
    { visible: mod.link_ios, label: 'IOS', icon: './assets/logo-ios.svg' },
    { visible: mod.link_3105, label: 'BẢN .3105', icon: './assets/logo-3105.svg' }
  ].filter(item => item.visible);

  badges.innerHTML = items.map(item => `<span><img class="platform-logo" src="${item.icon}" alt="">${item.label}</span>`).join('');
  badges.hidden = items.length === 0;
}

function createCard(mod, index) {
  const title = getModTitle(mod);
  const card = document.createElement('article');
  card.className = 'mod-card';
  card.innerHTML = `<div class="card-image"><img src="${mod.image}" alt="${title}" style="object-position:${mod.position || 'center'}" ${index > 2 ? 'loading="lazy"' : ''}><span class="number">${mod.id}</span><span class="category">${mod.category}</span></div><div class="card-body"><div><p>MOD #${mod.id}</p><h3>${title}</h3></div><button data-mod="${mod.id}" aria-label="Tải file ${title}"><svg viewBox="0 0 24 24"><path d="M12 4v12m0 0 5-5m-5 5-5-5M5 20h14"/></svg></button></div>`;
  return card;
}

async function loadMods() {
  try {
    const response = await fetch('./mods.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    mods = data.map((mod, index) => ({
      ...mod,
      id: String(index + 1).padStart(3, '0')
    }));
    updateStats();
    filteredMods = mods;
    renderCards();
  } catch (error) {
    console.error('Không thể tải mods.json:', error);
    grid.innerHTML = '<p class="load-error">Không thể tải danh sách MOD. Vui lòng thử lại sau.</p>';
  }
}

function updateStats() {
  const values = document.querySelectorAll('.stats strong');
  const linkTypes = ['link_android', 'link_ios', 'link_3105'];
  const availableTypes = linkTypes.filter(type => mods.some(mod => mod[type])).length;

  values[0].textContent = String(mods.length).padStart(2, '0');
  values[1].textContent = String(availableTypes).padStart(2, '0');
}

function renderCards() {
  const items = filteredMods.slice(0, visibleCount);
  grid.replaceChildren();
  items.forEach((mod, index) => grid.append(createCard(mod, index)));
  observeReveals([...grid.querySelectorAll('.mod-card')]);
  document.querySelector('#search-count').textContent = `${filteredMods.length}/${mods.length}`;
  if (!filteredMods.length) grid.innerHTML = '<p class="load-error">Không tìm thấy MOD phù hợp.</p>';

  const remaining = filteredMods.length - items.length;
  loadMoreButton.hidden = remaining <= 0;
  loadMoreButton.querySelector('small').textContent = remaining > 0 ? `+${Math.min(PAGE_SIZE, remaining)} MOD` : '';
}

document.querySelector('#mod-search').addEventListener('input', event => {
  const keyword = event.target.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  filteredMods = mods.filter(mod => `${mod.id} ${mod.hero || ''} ${mod.skin || ''} ${mod.title || ''} ${mod.category}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(keyword));
  visibleCount = PAGE_SIZE;
  renderCards();
});

loadMoreButton.addEventListener('click', () => {
  visibleCount += PAGE_SIZE;
  renderCards();
  const firstNewCard = grid.children[visibleCount - PAGE_SIZE];
  firstNewCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

grid.addEventListener('click', event => {
  const button = event.target.closest('[data-mod]');
  if (!button) return;
  const mod = mods.find(item => item.id === button.dataset.mod);
  if (!mod) return;

  trigger = button;
  const title = getModTitle(mod);
  const image = document.querySelector('#dialog-image');
  image.src = mod.image;
  image.alt = title;
  image.style.objectPosition = mod.position || 'center';
  document.querySelector('#dialog-code').textContent = `MOD ${mod.id}`;
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-description').textContent = mod.description;
  renderBadges(mod);
  renderDownloadLinks(mod);
  dialog.showModal();
  document.body.classList.add('modal-open');
});

document.querySelector('.modal-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  if (event.target === dialog && outside) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  trigger?.focus();
});

loadMods();

observeReveals([
  document.querySelector('.section-head'),
  document.querySelector('.app-promo'),
  document.querySelector('.guide')
].filter(Boolean));
