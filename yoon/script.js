/* script.js – logique de Yoon : navigation, lecteur audio, likes, playlists, recherche */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const byId = id => songs.find(s => s.id === id);

/* ---------- Stockage (localStorage protégé par try/catch) ---------- */
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignoré */ } }
};

/* ---------- Icônes (SVG en ligne, même épaisseur de trait) ---------- */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  library: '<path d="M4 4v16M9 4v16M14 6l5 14"/>',
  playlist: '<path d="M3 6h13M3 12h13M3 18h8"/><path d="M19 8v9a2 2 0 1 1-2-2"/>',
  heart: '<path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.7A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  next: '<path d="M5 4l10 8-10 8zM19 4v16"/>',
  prev: '<path d="M19 4L9 12l10 8zM5 4v16"/>',
  shuffle: '<path d="M3 6h4l10 12h4M3 18h4l3-4M14 10l3-4h4M18 3l3 3-3 3M18 15l3 3-3 3"/>',
  repeat: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9zM17 8a5 5 0 0 1 0 8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
};
const icon = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------- État (clés "v2" : évite les anciennes données du navigateur) ---------- */
let likes = store.get('yoon_v3_likes', []);
let myPlaylists = store.get('yoon_v3_playlists', null) || playlists.map(p => ({ ...p }));
let recents = store.get('yoon_v3_recents', [1, 2, 3, 4, 5]);
const filters = { tab: 'titres', country: null, style: null, sort: 'title' };
let openPl = null;        // id de la playlist ouverte
let chooserSong = null;   // morceau à ajouter via la fenêtre « Ajouter à une playlist »
const savePl = () => store.set('yoon_v3_playlists', myPlaylists);

/* ---------- Gabarits HTML ---------- */
const likeBtn = id => `<button class="btn btn--icon like${likes.includes(id) ? ' liked' : ''}" data-like="${id}" aria-label="Aimer ce titre">${icon('heart')}</button>`;
const songRow = (s, extra = '') => `<div class="song-row" data-play="${s.id}" tabindex="0"><div class="song-row__cover" style="background:${s.cover}"></div><div class="song-row__info"><span class="song-row__title">${esc(s.title)}</span><span class="song-row__artist">${esc(s.artist)}</span></div><span class="song-row__dur">${fmt(s.duration)}</span>${likeBtn(s.id)}${extra}</div>`;
const songCard = s => `<div class="card" data-play="${s.id}" tabindex="0"><div class="card__cover" style="background:${s.cover}"></div><p class="card__title">${esc(s.title)}</p><p class="card__sub">${esc(s.artist)}</p></div>`;
const albumCard = a => `<div class="card" data-album="${a.id}" tabindex="0"><div class="card__cover" style="background:${a.cover}"></div><p class="card__title">${esc(a.title)}</p><p class="card__sub">${esc(a.artist)}</p></div>`;
const rapperCard = r => `<div class="card card--rapper" data-rapper="${r.id}" tabindex="0"><div class="card__cover" style="background:${r.cover}"></div><p class="card__title">${esc(r.name)}</p><p class="card__sub">${esc(r.country || 'Artiste')}</p></div>`;
const tile = (kind, v, i) => `<button class="tile" style="background:${cover('song', i % 24 + 1)}" data-tile-${kind}="${esc(v)}">${esc(v)}</button>`;

// Remplit un conteneur avec une liste de morceaux et mémorise la file (data-ids)
function list(el, arr, fn = songRow) {
  el.innerHTML = arr.map(s => fn(s)).join('');
  el.dataset.ids = arr.map(s => s.id).join(',');
}

/* ---------- Navigation ---------- */
const SCREENS = ['accueil', 'recherche', 'bibliotheque', 'lecteur', 'playlists'];
function route() {
  const h = location.hash.slice(1);
  const name = SCREENS.includes(h) ? h : 'accueil';
  $$('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === name));
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === name));
  document.body.dataset.screen = name;
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

/* ---------- Accueil ---------- */
function renderHome() {
  $('#rowAlbums').innerHTML = albums.map(albumCard).join('');
  $('#rowRappers').innerHTML = rappers.map(rapperCard).join('');
  list($('#rowGalsen'), songs.filter(s => s.style === 'Rap Galsen'), songCard);
  list($('#rowFree'), songs.filter(s => s.style === 'Freestyle'), songCard);
  renderRecents();
}
function renderRecents() { list($('#listRecent'), recents.map(byId).filter(Boolean)); }

/* ---------- Bibliothèque ---------- */
function renderLibrary() {
  $$('[data-tab]').forEach(b => b.classList.toggle('tab--active', b.dataset.tab === filters.tab));
  $('#chipsWrap').classList.toggle('hidden', filters.tab !== 'titres');
  const chip = (k, v) => `<button class="chip${filters[k] === v ? ' chip--active' : ''}" data-f${k}="${esc(v)}">${esc(v)}</button>`;
  $('#chipsCountry').innerHTML = countries.map(c => chip('country', c)).join('');
  $('#chipsStyle').innerHTML = styles.map(c => chip('style', c)).join('');
  const box = $('#libContent');
  if (filters.tab === 'titres') {
    let arr = songs.filter(s => (!filters.country || s.country === filters.country) && (!filters.style || s.style === filters.style));
    arr.sort((a, b) => filters.sort === 'duration' ? a.duration - b.duration : a[filters.sort].localeCompare(b[filters.sort], 'fr'));
    box.className = 'songlist';
    if (arr.length) list(box, arr); else box.innerHTML = '<p class="empty">Aucun résultat. Retire un filtre pour voir plus de titres.</p>';
  } else if (filters.tab === 'albums') {
    box.className = 'grid'; box.innerHTML = albums.map(albumCard).join('');
  } else if (filters.tab === 'rappeurs') {
    box.className = 'grid'; box.innerHTML = rappers.map(rapperCard).join('');
  } else {
    box.className = 'grid'; box.innerHTML = styles.map((s, i) => tile('style', s, i)).join('');
  }
}

/* ---------- Recherche ---------- */
function renderSearch() {
  const q = $('#searchInput').value.trim().toLowerCase();
  $('#browse').classList.toggle('hidden', !!q);
  const out = $('#searchResults');
  if (!q) { out.innerHTML = ''; return; }
  const ss = songs.filter(s => [s.title, s.artist, s.album].some(x => x.toLowerCase().includes(q)));
  const rr = rappers.filter(r => r.name.toLowerCase().includes(q));
  const aa = albums.filter(a => (a.title + ' ' + a.artist).toLowerCase().includes(q));
  if (!ss.length && !rr.length && !aa.length) {
    out.innerHTML = `<p class="empty">Aucun résultat pour « ${esc(q)} ». Essaie un autre titre ou un autre rappeur.</p>`; return;
  }
  out.innerHTML =
    (ss.length ? '<div class="section"><h2 class="section-title">Titres</h2><div class="songlist" id="resSongs"></div></div>' : '') +
    (rr.length ? `<div class="section"><h2 class="section-title">Rappeurs</h2><div class="grid">${rr.map(rapperCard).join('')}</div></div>` : '') +
    (aa.length ? `<div class="section"><h2 class="section-title">Albums</h2><div class="grid">${aa.map(albumCard).join('')}</div></div>` : '');
  if (ss.length) list($('#resSongs'), ss);
}

/* ---------- Lecteur ----------
   - song.audio : fichier mp3 lu par la balise <audio>
   - sinon      : lecture simulée par un minuteur */
const P = { queue: songs.map(s => s.id), i: 0, playing: false, time: 0, shuffle: false, repeat: 'off', vol: 70, timer: null };
const audio = new Audio();
const cur = () => byId(P.queue[P.i]) || songs[0];

audio.addEventListener('timeupdate', () => { P.time = audio.currentTime; updateProgress(); });
audio.addEventListener('ended', () => next(true));
audio.addEventListener('loadedmetadata', () => {
  if (isFinite(audio.duration)) { cur().duration = Math.round(audio.duration); updateProgress(); }
});

/* --- Lecture --- */
function startPlayback() {
  clearInterval(P.timer); audio.pause();
  const s = cur();
  if (!P.playing) return;
  if (s.audio) { audio.volume = P.vol / 100; const pr = audio.play(); if (pr && pr.catch) pr.catch(() => {}); return; }
  P.timer = setInterval(() => { P.time++; if (P.time >= s.duration) next(true); else updateProgress(); }, 1000);
}
function playSong(id, queue) {
  if (queue && queue.length) P.queue = queue;
  let i = P.queue.indexOf(id);
  if (i < 0) { P.queue = [id]; i = 0; }
  P.i = i; P.time = 0; P.playing = true;
  const s = cur();
  if (s.audio) audio.src = s.audio;
  recents = [id, ...recents.filter(x => x !== id)].slice(0, 6);
  store.set('yoon_v3_recents', recents);
  renderPlayer(); startPlayback(); renderRecents();
}
function togglePlay() { P.playing = !P.playing; startPlayback(); renderPlayer(); }
function next(auto) {
  if (auto && P.repeat === 'one') { seek(0); startPlayback(); return; }
  let i;
  if (P.shuffle && P.queue.length > 1) { do { i = Math.floor(Math.random() * P.queue.length); } while (i === P.i); }
  else {
    i = P.i + 1;
    if (i >= P.queue.length) {
      if (auto && P.repeat === 'off') { P.playing = false; P.time = 0; startPlayback(); renderPlayer(); return; }
      i = 0;
    }
  }
  playSong(P.queue[i]);
}
function prev() {
  if (P.time > 3) { seek(0); return; }
  P.i = (P.i - 1 + P.queue.length) % P.queue.length;
  playSong(P.queue[P.i]);
}
function seek(sec) {
  P.time = sec;
  const s = cur();
  if (s.audio) audio.currentTime = sec;
  updateProgress();
}
function updateProgress() {
  const d = cur().duration;
  $$('.bar__fill').forEach(f => f.style.width = Math.min(100, P.time / d * 100) + '%');
  $('#tCur').textContent = fmt(P.time);
  $('#tDur').textContent = fmt(d);
}
function renderPlayer() {
  const s = cur();
  ['p', 'm'].forEach(p => { $(`#${p}Cover`).style.background = s.cover; $(`#${p}Title`).textContent = s.title; $(`#${p}Artist`).textContent = s.artist; });
  $$('[data-toggle-play]').forEach(b => { b.innerHTML = icon(P.playing ? 'pause' : 'play'); b.setAttribute('aria-label', P.playing ? 'Pause' : 'Lecture'); });
  $('#btnShuffle').classList.toggle('on', P.shuffle);
  const rb = $('#btnRepeat');
  rb.classList.toggle('on', P.repeat !== 'off'); rb.dataset.mode = P.repeat;
  rb.setAttribute('aria-label', { off: 'Répéter : désactivé', all: 'Répéter : tout', one: 'Répéter : un titre' }[P.repeat]);
  $$('[data-like-cur]').forEach(b => { b.dataset.like = s.id; b.classList.toggle('liked', likes.includes(s.id)); });
  $('#lyrics').innerHTML = s.lyrics.map(l => `<p>${esc(l)}</p>`).join('');
  list($('#queue'), P.queue.map(byId).filter(Boolean));
  const row = $$('#queue .song-row')[P.i]; if (row) row.classList.add('song-row--current');
  updateProgress();
}

/* ---------- Likes ---------- */
function toggleLike(id) {
  likes = likes.includes(id) ? likes.filter(x => x !== id) : [...likes, id];
  store.set('yoon_v3_likes', likes);
  $$(`[data-like="${id}"]`).forEach(b => b.classList.toggle('liked', likes.includes(id)));
}

/* ---------- Playlists ---------- */
const plSongs = p => p.songIds.map(byId).filter(Boolean);
const plCover = p => { const s = plSongs(p); return s.length ? s[0].cover : cover('album', (p.id - 1) % 8 + 1); };
function renderPlaylists() {
  $('#plGrid').innerHTML = myPlaylists.map(p => `<div class="card" data-pl="${p.id}" tabindex="0"><div class="card__cover" style="background:${plCover(p)}"></div><p class="card__title">${esc(p.name)}</p><p class="card__sub">${plSongs(p).length} titres</p></div>`).join('')
    || '<p class="empty">Aucune playlist pour l’instant. Crée la première avec « Créer une playlist ».</p>';
  const p = myPlaylists.find(x => x.id === openPl);
  if (openPl !== null && !p) openPl = null;
  $('#plList').classList.toggle('hidden', openPl !== null);
  $('#plDetail').classList.toggle('hidden', openPl === null);
  if (!p) return;
  const ss = plSongs(p), total = ss.reduce((t, s) => t + s.duration, 0);
  $('#plDetail').innerHTML = `
    <button class="btn btn--secondary" data-pl-back>${icon('back')}Retour</button>
    <div class="pl-head"><div class="pl-head__cover" style="background:${plCover(p)}"></div>
      <div><h1 class="page-title" style="margin-bottom:8px">${esc(p.name)}</h1>
        <p class="muted">${esc(p.description || 'Aucune description')}</p>
        <p class="muted">${ss.length} titres · ${Math.round(total / 60)} min</p>
        <div class="pl-head__actions"><button class="btn btn--primary" data-pl-play>${icon('play')}Lecture</button>
        <button class="btn btn--secondary" data-pl-delete>${icon('trash')}Supprimer</button></div></div></div>
    <div class="songlist" id="plSongs"></div>`;
  const rm = s => `<button class="btn btn--icon" data-remove="${s.id}" aria-label="Retirer de la playlist">${icon('trash')}</button>`;
  if (ss.length) list($('#plSongs'), ss, s => songRow(s, rm(s)));
  else $('#plSongs').innerHTML = '<p class="empty">Cette playlist est vide. Ajoute des titres depuis le lecteur.</p>';
}

/* ---------- Fenêtres et notifications ---------- */
function openOverlay(id) { $(id).classList.remove('hidden'); }
function closeOverlays() { $$('.overlay').forEach(o => o.classList.add('hidden')); }
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200); }
function openChooser(songId) {
  chooserSong = songId;
  $('#chooserList').innerHTML = myPlaylists.length
    ? myPlaylists.map(p => `<button class="btn btn--secondary" data-add-to="${p.id}">${esc(p.name)}</button>`).join('')
    : '<p class="empty">Aucune playlist. Ferme cette fenêtre et crée-en une.</p>';
  openOverlay('#chooser');
}

/* ---------- Événements (délégation) ---------- */
document.addEventListener('click', e => {
  const t = e.target, c = sel => t.closest(sel);
  let el;
  if ((el = c('[data-like]'))) return toggleLike(+el.dataset.like);
  if ((el = c('[data-remove]'))) {
    const p = myPlaylists.find(x => x.id === openPl);
    p.songIds = p.songIds.filter(id => id !== +el.dataset.remove); savePl(); renderPlaylists(); return toast('Titre retiré');
  }
  if ((el = c('[data-play]'))) {
    const box = el.closest('[data-ids]');
    playSong(+el.dataset.play, box ? box.dataset.ids.split(',').map(Number) : null);
    location.hash = '#lecteur'; return;
  }
  if ((el = c('[data-album]'))) {
    const a = albums.find(x => x.id === +el.dataset.album), q = songs.filter(s => s.album === a.title).map(s => s.id);
    if (!q.length) return toast('Aucun titre pour cet album');
    playSong(q[0], q); location.hash = '#lecteur'; return;
  }
  if ((el = c('[data-rapper]'))) {
    const r = rappers.find(x => x.id === +el.dataset.rapper), q = songs.filter(s => s.artist === r.name).map(s => s.id);
    if (!q.length) return toast('Aucun titre pour ce rappeur');
    playSong(q[0], q); location.hash = '#lecteur'; return;
  }
  if ((el = c('[data-tile-country]'))) { Object.assign(filters, { tab: 'titres', country: el.dataset.tileCountry, style: null }); renderLibrary(); location.hash = '#bibliotheque'; return; }
  if ((el = c('[data-tile-style]'))) { Object.assign(filters, { tab: 'titres', style: el.dataset.tileStyle, country: null }); renderLibrary(); location.hash = '#bibliotheque'; return; }
  if ((el = c('[data-fcountry]'))) { filters.country = filters.country === el.dataset.fcountry ? null : el.dataset.fcountry; return renderLibrary(); }
  if ((el = c('[data-fstyle]'))) { filters.style = filters.style === el.dataset.fstyle ? null : el.dataset.fstyle; return renderLibrary(); }
  if ((el = c('[data-tab]'))) { filters.tab = el.dataset.tab; return renderLibrary(); }
  if ((el = c('[data-ptab]'))) {
    $$('[data-ptab]').forEach(b => b.classList.toggle('tab--active', b === el));
    $('#queue').classList.toggle('hidden', el.dataset.ptab !== 'queue');
    $('#lyrics').classList.toggle('hidden', el.dataset.ptab !== 'lyrics'); return;
  }
  if ((el = c('[data-pl]'))) { openPl = +el.dataset.pl; return renderPlaylists(); }
  if (c('[data-pl-back]')) { openPl = null; return renderPlaylists(); }
  if (c('[data-pl-play]')) { const p = myPlaylists.find(x => x.id === openPl), q = plSongs(p).map(s => s.id); if (!q.length) return toast('Playlist vide'); playSong(q[0], q); location.hash = '#lecteur'; return; }
  if (c('[data-pl-delete]')) {
    const p = myPlaylists.find(x => x.id === openPl);
    if (confirm(`Supprimer la playlist « ${p.name} » ?`)) { myPlaylists = myPlaylists.filter(x => x.id !== openPl); openPl = null; savePl(); renderPlaylists(); toast('Playlist supprimée'); }
    return;
  }
  if ((el = c('[data-add-to]'))) {
    const p = myPlaylists.find(x => x.id === +el.dataset.addTo);
    if (p.songIds.includes(chooserSong)) toast('Déjà dans cette playlist');
    else { p.songIds.push(chooserSong); savePl(); renderPlaylists(); toast(`Ajouté à ${p.name}`); }
    return closeOverlays();
  }
  if (c('[data-close]') || t.classList.contains('overlay')) return closeOverlays();
  if (c('[data-toggle-play]')) return togglePlay();
  if (c('[data-open-player]')) { location.hash = '#lecteur'; return; }
  if (c('[data-back]')) { history.length > 1 ? history.back() : (location.hash = '#accueil'); }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeOverlays();
  if (e.code === 'Space' && !e.target.closest('input,textarea,select,button,a')) { e.preventDefault(); togglePlay(); }
  if (e.key === 'Enter' && e.target.matches('[data-play],[data-album],[data-rapper],[data-pl],[data-open-player]')) e.target.click();
});

/* Contrôles du lecteur */
$('#btnPrev').onclick = $('#mPrev').onclick = prev;
$('#btnNext').onclick = $('#mNext').onclick = () => next(false);
$('#btnShuffle').onclick = () => { P.shuffle = !P.shuffle; renderPlayer(); };
$('#btnRepeat').onclick = () => { P.repeat = { off: 'all', all: 'one', one: 'off' }[P.repeat]; renderPlayer(); };
$('#vol').oninput = e => { P.vol = +e.target.value; audio.volume = P.vol / 100; };
$('#pBar').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * cur().duration); });
$('#btnAddPl').onclick = () => openChooser(cur().id);
$('#heroPlay').onclick = () => { playSong(1, songs.map(s => s.id)); location.hash = '#lecteur'; };

/* Recherche, tri, création de playlist */
$('#searchInput').addEventListener('input', renderSearch);
$('#topSearch').addEventListener('input', e => { $('#searchInput').value = e.target.value; if (location.hash !== '#recherche') location.hash = '#recherche'; renderSearch(); });
$('#sortSelect').onchange = e => { filters.sort = e.target.value; renderLibrary(); };
$('#btnCreate').onclick = () => { $('#plName').value = ''; $('#plDesc').value = ''; $('#modalErr').textContent = ''; openOverlay('#modal'); $('#plName').focus(); };
$('#modalForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#plName').value.trim();
  if (!name) { $('#modalErr').textContent = 'Donne un nom à ta playlist.'; $('#plName').focus(); return; }
  myPlaylists.push({ id: Date.now(), name, description: $('#plDesc').value.trim(), songIds: [] });
  savePl(); renderPlaylists(); closeOverlays(); toast('Playlist créée');
});

/* ---------- Démarrage ---------- */
$$('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
$('#tilesCountry').innerHTML = countries.map((c, i) => tile('country', c, i)).join('');
$('#tilesStyle').innerHTML = styles.map((s, i) => tile('style', s, i + 3)).join('');
renderHome(); renderLibrary(); renderPlaylists(); renderPlayer(); route();
