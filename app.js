(() => {
  'use strict';
  const grid = document.querySelector('#skin-grid');
  const count = document.querySelector('#skin-count');
  const emptyState = document.querySelector('#empty-state');
  const emptyMessage = document.querySelector('#empty-message');
  const retry = document.querySelector('#retry');
  const search = document.querySelector('#search');
  const themeToggle = document.querySelector('#theme-toggle');
  const detailDialog = document.querySelector('#detail-dialog');
  let entries = [];
  let themeChanging = false;
  const normalize = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLocaleLowerCase('vi');
  const titleCase = (value) => String(value).toLocaleLowerCase('vi').replace(/(^|[\s•—-])\p{L}/gu, (letter) => letter.toLocaleUpperCase('vi'));

  function syncThemeButton(button, dark) {
    const label = dark ? 'Bật giao diện sáng' : 'Bật giao diện tối';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.setAttribute('aria-pressed', String(dark));
  }

  function syncTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    syncThemeButton(themeToggle, dark);
    document.querySelector('meta[name="theme-color"]').content = dark ? '#161618' : '#ececf1';
  }

  async function toggleTheme() {
    if (themeChanging) return;
    const root = document.documentElement;
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const applyTheme = () => {
      root.dataset.theme = theme;
      try { localStorage.setItem('skin-theme', theme); } catch {}
      syncTheme();
    };

    const button = themeToggle.getBoundingClientRect();
    const x = button.left + button.width / 2;
    const y = button.top + button.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const main = document.querySelector('main');
    const mainRect = main.getBoundingClientRect();
    const searchRect = document.querySelector('.search-row').getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.className = 'theme-reveal';
    overlay.dataset.theme = theme;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.inert = true;
    overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;
    const snapshot = main.cloneNode(true);
    snapshot.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    snapshot.style.cssText = `position:absolute;top:${mainRect.top}px;left:${mainRect.left}px;width:${mainRect.width}px;max-width:none;margin:0`;
    snapshot.querySelector('input').value = search.value;
    syncThemeButton(snapshot.querySelector('.theme-toggle'), theme === 'dark');
    const snapshotSearch = snapshot.querySelector('.search-row');
    snapshotSearch.style.position = 'relative';
    snapshotSearch.style.top = '0';
    // Keep the transition layer small; cards outside the viewport only need their space.
    const cards = [...main.querySelectorAll('.skin-card')];
    snapshot.querySelectorAll('.skin-card').forEach((card, index) => {
      const rect = cards[index].getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) {
        card.replaceChildren();
        card.style.height = `${rect.height}px`;
      }
    });
    overlay.append(snapshot);
    themeChanging = true;
    root.classList.add('theme-transitioning');
    document.body.append(overlay);
    snapshotSearch.style.transform = `translateY(${searchRect.top - snapshotSearch.getBoundingClientRect().top}px)`;
    try {
      // Let the browser prepare the layer before starting the reveal.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await overlay.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 500, easing: 'linear', fill: 'both' }
      ).finished;
    } catch {
      // Still apply the selected theme if an animation is interrupted.
    } finally {
      applyTheme();
      overlay.remove();
      root.classList.remove('theme-transitioning');
      themeChanging = false;
    }
  }

  function openDetail(mod) {
    const image = document.querySelector('#detail-image');
    image.onerror = () => { image.onerror = null; image.src = 'assets/placeholder.svg'; };
    image.src = /^data:image\/(jpeg|png|webp|gif);base64,/i.test(mod.image || '') ? mod.image : safeLink(mod.image) || 'assets/placeholder.svg';
    image.alt = `${titleCase(mod.hero)} — ${titleCase(mod.skin)}`;
    image.style.objectPosition = /^(center|top|bottom|left|right|[\d.%\s]+)$/.test(mod.position || '') ? mod.position : 'center';
    document.querySelector('#detail-hero').textContent = mod.hero;
    document.querySelector('#detail-title').textContent = titleCase(mod.skin);
    document.querySelector('#detail-category').textContent = mod.category || 'MOD';
    document.querySelector('#detail-description').textContent = mod.description || `Trang phục ${titleCase(mod.skin)} dành cho ${titleCase(mod.hero)}.`;
    const download = document.querySelector('#detail-download');
    const url = safeLink(mod.link_android);
    if (url) { download.href = url; download.removeAttribute('aria-disabled'); }
    else { download.removeAttribute('href'); download.setAttribute('aria-disabled', 'true'); }
    detailDialog.showModal();
    detailDialog.scrollTop = 0;
  }

  function filterSkins() {
    const words = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    let visible = 0;
    entries.forEach(({card, text}) => {
      const matches = words.every((word) => text.includes(word));
      card.hidden = !matches;
      if (matches) visible++;
    });
    grid.hidden = visible === 0;
    count.textContent = words.length ? `${visible} / ${entries.length} skin` : `${entries.length} skin`;
    emptyState.hidden = visible > 0;
    retry.hidden = true;
    emptyMessage.textContent = entries.length ? 'Không tìm thấy skin. Thử tên tướng hoặc từ khóa khác nhé.' : 'Chưa có skin nào.';
  }

  function safeLink(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  }

  function createCard(mod, index) {
    const card = document.createElement('article');
    card.className = 'skin-card';
    card.dataset.modIndex = index;
    const preview = document.createElement('button');
    preview.type = 'button';
    preview.className = 'skin-preview';
    preview.setAttribute('aria-label', `Xem ${titleCase(mod.hero)} — ${titleCase(mod.skin)}`);
    preview.setAttribute('aria-haspopup', 'dialog');
    preview.setAttribute('aria-controls', 'detail-dialog');
    const image = document.createElement('img');
    image.className = 'skin-image';
    image.alt = `${titleCase(mod.hero)} — ${titleCase(mod.skin)}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.onerror = () => { image.onerror = null; image.src = 'assets/placeholder.svg'; };
    image.src = /^data:image\/(jpeg|png|webp|gif);base64,/i.test(mod.image || '') ? mod.image : safeLink(mod.image) || 'assets/placeholder.svg';
    if (/^(center|top|bottom|left|right|[\d.%\s]+)$/.test(mod.position || '')) image.style.objectPosition = mod.position;

    const info = document.createElement('div');
    info.className = 'skin-info';
    const hero = document.createElement('p');
    hero.className = 'hero-name';
    hero.textContent = mod.hero;
    const name = document.createElement('h2');
    name.className = 'skin-name';
    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'skin-title-button';
    title.textContent = titleCase(mod.skin);
    title.setAttribute('aria-haspopup', 'dialog');
    title.setAttribute('aria-controls', 'detail-dialog');
    name.append(title);
    const bottom = document.createElement('div');
    bottom.className = 'skin-bottom';
    const platform = document.createElement('span');
    platform.className = 'platform';
    platform.textContent = 'Android';
    bottom.append(platform);

    const details = document.createElement('button');
    details.type = 'button';
    details.className = 'download';
    details.setAttribute('aria-label', `Xem chi tiết ${titleCase(mod.hero)} — ${titleCase(mod.skin)}`);
    details.setAttribute('aria-haspopup', 'dialog');
    details.setAttribute('aria-controls', 'detail-dialog');
    details.innerHTML = 'Chi tiết <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
    bottom.append(details);
    info.append(hero, name, bottom);
    preview.append(image);
    card.append(preview, info);
    return card;
  }

  async function loadMods() {
    grid.setAttribute('aria-busy', 'true');
    count.textContent = 'Đang tải…';
    emptyState.hidden = true;
    search.disabled = true;
    try {
      const response = await fetch('mods.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('mods.json must contain an array');
      const mods = data.filter((mod) => mod && typeof mod.hero === 'string' && typeof mod.skin === 'string');
      entries = mods.map((mod, index) => ({mod, card: createCard(mod, index), text: normalize(`${mod.hero} ${mod.skin}`)}));
      grid.replaceChildren(...entries.map(({card}) => card));
      search.disabled = false;
      filterSkins();
    } catch (error) {
      grid.hidden = true;
      count.textContent = 'Chưa tải được';
      emptyState.hidden = false;
      retry.hidden = false;
      emptyMessage.textContent = location.protocol === 'file:' ? 'Chạy npm start rồi mở http://localhost:3000 để xem danh sách skin.' : 'Không thể tải danh sách skin. Vui lòng thử lại.';
      console.error('Unable to load mods.json:', error);
    } finally { grid.setAttribute('aria-busy', 'false'); }
  }
  retry.addEventListener('click', loadMods);
  search.addEventListener('input', filterSkins);
  themeToggle.addEventListener('click', toggleTheme);
  grid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-mod-index]');
    if (card) openDetail(entries[Number(card.dataset.modIndex)].mod);
  });
  document.querySelector('#close-detail').addEventListener('click', () => detailDialog.close());
  detailDialog.addEventListener('click', (event) => {
    if (event.target !== detailDialog) return;
    const rect = detailDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) detailDialog.close();
  });
  syncTheme();
  loadMods();
})();
