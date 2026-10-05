/*
 * קרן וולף | לוגיקת האתר.
 * אין כאן טקסטים לעריכה: הטקסטים נמצאים ב-content/site.js וב-content/recipes.js.
 */
(() => {
  'use strict';

  const S = window.SITE;
  const RAW = window.RECIPES;
  const IN_VIEWER = !!window.__VIEWER__; // באתר המוצג בתוך Claude אי אפשר להדפיס
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).toLowerCase().replace(/[֑-ׇ]/g, '').replace(/["'׳״`’]/g, '').replace(/\s+/g, ' ').trim();
  const main = $('#main');
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2400);
  }
  async function copyText(text, okMsg) {
    try { await navigator.clipboard.writeText(text); toast(okMsg); return; } catch (e) { /* fall through */ }
    const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0';
    document.body.append(t); t.select();
    try { document.execCommand('copy'); toast(okMsg); } catch (e) { toast('לא הצלחתי להעתיק'); }
    t.remove();
  }
  const ic = d => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    search: ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.3C1.7 8 3.6 5 6.7 5c1.9 0 3.5 1 5.3 3 1.8-2 3.4-3 5.3-3 3.1 0 5 3 3.9 6.2-1.7 4.7-9.2 9.3-9.2 9.3z"/></svg>',
    dice: ic('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r=".8" fill="currentColor"/><circle cx="15.5" cy="8.5" r=".8" fill="currentColor"/><circle cx="12" cy="12" r=".8" fill="currentColor"/><circle cx="8.5" cy="15.5" r=".8" fill="currentColor"/><circle cx="15.5" cy="15.5" r=".8" fill="currentColor"/>'),
    timer: ic('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/>'),
    cook: ic('<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M7 7h4M17 21V3c-2 1-3.500 4-3.500 8 0 1.500.8 2 2 2H17"/>'),
    print: ic('<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/>'),
    link: ic('<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3A4 4 0 0 0 11 18.700l1-1"/>'),
    wa: ic('<path d="M3 21l1.600-4.600A8.500 8.500 0 1 1 8 19.600L3 21z"/><path d="M9 8.500c0 3.500 3 6.500 6.500 6.500l1-1.500-2-1-1 .8c-1-.4-2-1.400-2.400-2.400l.8-1-1-2L9 8.500z"/>'),
    list: ic('<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>'),
    x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    ing: ic('<path d="M4 11h16l-1.500 8a2 2 0 0 1-2 1.500H7.500a2 2 0 0 1-2-1.500L4 11zM8 11c0-4 1.500-6 4-6s4 2 4 6"/>'),
    steps: ic('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.500 5.500 5 7l2-3M3.500 11.500 5 13l2-3M3.500 17.500 5 19l2-3"/>'),
    back: ic('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  };

  // ---------- data ----------
  const CATS = S.categories;
  const catByKey = Object.fromEntries(CATS.map(c => [c.key, c]));
  const items = r => (r.ingredients || []).filter(x => typeof x === 'string');
  const RECIPES = RAW.map((r, i) => {
    const cat = catByKey[r.category] || CATS[CATS.length - 1];
    const its = items(r);
    const cats = [r.category, ...(r.also || [])];
    const text = (r.blocks || []).map(b => b.p || '');
    return { ...r, i, cat, cats, steps: r.steps || [], count: its.length, hay: norm([r.title, r.tagline || '', cat.name, ...its, ...text].join(' ')) };
  });
  const bySlug = Object.fromEntries(RECIPES.map(r => [r.slug, r]));
  const usedCats = CATS.filter(c => RECIPES.some(r => r.cats.includes(c.key)));
  const catCount = key => RECIPES.filter(r => r.cats.includes(key)).length;
  const plain = RECIPES.filter(r => !r.type); // מתכונים רגילים, בלי כרטיסים חיצוניים ומאמרים
  const href = r => '#/recipe/' + encodeURIComponent(r.slug);

  // ---------- favorites ----------
  let favs = new Set(store.get('kw:favs', []));
  function updateFavCount(pop) {
    const b = $('[data-favcount]'); b.textContent = favs.size; b.hidden = favs.size === 0;
    if (pop) { const l = $('.favlink'); l.classList.remove('pop'); void l.offsetWidth; l.classList.add('pop'); }
  }
  function toggleFav(slug, btn) {
    if (favs.has(slug)) favs.delete(slug); else favs.add(slug);
    store.set('kw:favs', [...favs]);
    $$(`[data-fav="${CSS.escape(slug)}"]`).forEach(b => {
      b.setAttribute('aria-pressed', String(favs.has(slug)));
      if (b.dataset.favLabel != null) b.querySelector('span').textContent = favs.has(slug) ? 'שמור' : 'שמירה';
    });
    if (btn) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
    updateFavCount(true);
    toast(favs.has(slug) ? 'נשמר במועדפים' : 'הוסר מהמועדפים');
    if (currentView === 'recipes' && $('[data-favonly][aria-pressed="true"]')) renderList();
  }

  // ---------- fridge ("מה יש לכם במקרר?") ----------
  const FR = S.fridge.map(f => ({ ...f, kw: f.match.map(norm) }));
  const frByLabel = Object.fromEntries(FR.map(f => [f.label, f]));
  let fridgeSel = new Set();
  function fridgeResults(sel) {
    const chosen = [...sel].map(l => frByLabel[l]).filter(Boolean);
    if (!chosen.length) return [];
    return RECIPES.map(r => ({ r, score: chosen.filter(f => f.kw.some(k => r.hay.includes(k))).length }))
      .filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.r.i - b.r.i);
  }
  const fridgeChips = () => FR.map(f => `<button class="chip" type="button" data-fridge="${esc(f.label)}" aria-pressed="${fridgeSel.has(f.label)}">${esc(f.label)}</button>`).join('');

  // ---------- cards ----------
  const card = (r, score, total) => {
    const ext = r.type === 'external', art = r.type === 'article';
    const link = ext ? `href="${esc(r.externalUrl)}" target="_blank" rel="noopener"` : `href="${href(r)}"`;
    const meta = ext ? `<span>${ICON.link}למתכון באתר mako</span>` : art ? '<span>מאמר</span>' : `<span>${ICON.ing}${r.count} מרכיבים</span><span>${ICON.steps}${r.steps.length} שלבים</span>`;
    return `
    <article class="card">
      <div class="card__media">
        <img src="${esc(r.image)}" alt="" loading="lazy" width="600" height="600">
        ${score ? `<span class="card__score">${score} מתוך ${total} במקרר</span>` : ''}
      </div>
      <button class="fav" type="button" data-fav="${esc(r.slug)}" aria-pressed="${favs.has(r.slug)}" aria-label="שמירת ${esc(r.title)} במועדפים">${ICON.heart}</button>
      <div class="card__body">
        <span class="tag tag--${esc(r.cat.key)}">${esc(r.cat.name)}</span>
        <h3><a ${link}>${esc(r.title)}</a></h3>
        ${r.tagline ? `<p class="card__tag">${esc(r.tagline)}</p>` : ''}
        <div class="card__meta">${meta}</div>
      </div>
    </article>`;
  };

  // ---------- timers ----------
  const timers = [];
  let tickId = null, audio = null;
  function stepMinutes(text) {
    let m = text.match(/(\d+)\s*[-–]\s*(\d+)\s*דקות/);
    if (m) return Math.max(+m[1], +m[2]);
    m = text.match(/(\d+)\s*דקות/);
    if (m) return +m[1];
    if (/חצי שעה/.test(text)) return 30;
    if (/(^|\s)[כל]?שעה(?=[\s.,]|$)/.test(text)) return 60;
    return 0;
  }
  function beep() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const now = audio.currentTime;
      [0, .35, .7].forEach(t => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = 'sine'; o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
        g.gain.setValueAtTime(.0001, now + t); g.gain.exponentialRampToValueAtTime(.4, now + t + .03); g.gain.exponentialRampToValueAtTime(.0001, now + t + .28);
        o.start(now + t); o.stop(now + t + .3);
      });
    } catch (e) { /* no audio */ }
    try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* ignore */ }
  }
  const fmt = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); };
  function renderTimers() {
    const box = $('#timers');
    box.innerHTML = timers.map(t => `<div class="tm ${t.ring ? 'ring' : ''}" data-tm="${t.id}"><b>${t.ring ? 'הסתיים' : fmt((t.end - Date.now()) / 1000)}</b><span>${esc(t.label)}</span><button type="button" data-tm-x="${t.id}" aria-label="${t.ring ? 'סגירת ההתראה' : 'ביטול הטיימר'}">${ICON.x}</button></div>`).join('');
  }
  function tick() {
    let changed = false;
    timers.forEach(t => { if (!t.ring && Date.now() >= t.end) { t.ring = true; changed = true; beep(); toast('הטיימר הסתיים: ' + t.label); } });
    const box = $('#timers');
    timers.forEach(t => { const el = box.querySelector(`[data-tm="${t.id}"] b`); if (el && !t.ring) el.textContent = fmt((t.end - Date.now()) / 1000); });
    if (changed) renderTimers();
    if (!timers.length) { clearInterval(tickId); tickId = null; }
  }
  function startTimer(min, label) {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume && audio.resume(); } catch (e) { /* ignore */ }
    timers.push({ id: Date.now() + Math.random(), end: Date.now() + min * 60000, label, ring: false });
    renderTimers();
    if (!tickId) tickId = setInterval(tick, 250);
    toast(`טיימר של ${min} דקות התחיל`);
  }
  // זמן כולל בדקות -> "כ-45 דקות", "כשעה וחצי". הערכה בלבד.
  function fmtTime(m) {
    if (m < 60) return `כ-${m} דקות`;
    const h = Math.round(m / 30) / 2;
    const whole = Math.floor(h), half = h % 1 !== 0;
    if (!half) return whole === 1 ? 'כשעה' : whole === 2 ? 'כשעתיים' : `כ-${whole} שעות`;
    return whole === 1 ? 'כשעה וחצי' : whole === 2 ? 'כשעתיים וחצי' : `כ-${whole} שעות וחצי`;
  }
  const timerBtn = (r, n, text) => {
    const m = stepMinutes(text);
    return m ? `<button class="btn btn--sm timer-btn" type="button" data-timer="${m}" data-label="${esc(r.title)} · שלב ${n}">${ICON.timer}טיימר ל-${m >= 60 ? (m === 60 ? 'שעה' : m / 60 + ' שעות') : m + ' דקות'}</button>` : '';
  };

  // ---------- views ----------
  let currentView = '';

  function homeView() {
    const pick = ['קובה-צהובה-במרק-חמצמץ', 'פסטה-שמנת-פטריות-קלאסית', 'עוגיות-עם-3-סוגי-שוקולד-צ-יפס', 'בורקס-פילו-תפו-א-ופטריות'].map(sl => bySlug[sl]).filter(Boolean);
    const latest = plain.slice(0, 4);
    const few = plain.filter(r => !latest.includes(r) && r.count <= S.sections.fewMax).sort((a, b) => a.count - b.count || a.i - b.i).slice(0, 4);
    const mc = S.masterchef;
    return {
      title: 'קרן וולף | מתכונים טבעוניים פשוטים',
      html: `
      <section class="hero">
        <div class="wrap hero__grid">
          <div>
            ${S.hero.eyebrow ? `<span class="eyebrow">${esc(S.hero.eyebrow)}</span>` : ''}
            <h1>${esc(S.hero.title)}</h1>
            <p class="hero__lead">${esc(S.hero.lead)}</p>
            <form class="bigsearch" role="search" data-hero-search>
              ${ICON.search}
              <label class="sr" for="hero-q">חיפוש מתכון</label>
              <input id="hero-q" name="q" type="search" placeholder="${esc(S.hero.searchPlaceholder)}" autocomplete="off">
              <button class="btn btn--solid btn--sm" type="submit">חיפוש</button>
            </form>
            <div class="fridge">
              <details class="fmenu" data-fmenu>
                <summary class="fmenu__btn"><span>${esc(S.hero.fridgeTitle)}</span><b class="fmenu__count" data-fcount></b><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.500" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
                <div class="fmenu__panel">
                  <p class="fmenu__hint">${esc(S.hero.fridgeHint)}</p>
                  <div class="fridge__chips" role="group" aria-label="${esc(S.hero.fridgeTitle)}">${fridgeChips()}</div>
                </div>
              </details>
              <div class="fridge__out" data-fridge-out aria-live="polite"></div>
            </div>
            <div class="hero__actions"><button class="btn" type="button" data-surprise>${ICON.dice}${esc(S.hero.surprise)}</button></div>
          </div>
          <div class="arches" aria-label="כמה מהמתכונים">
            ${pick.map(r => `<a class="arch" href="${href(r)}"><img src="${esc(r.image)}" alt="" width="400" height="533"><span>${esc(r.title)}</span></a>`).join('')}
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="cats-h">
        <div class="wrap">
          <div class="section__head"><h2 id="cats-h">${esc(S.sections.categoriesTitle)}</h2></div>
          <div class="rail">
            ${usedCats.map(c => { const f = plain.find(r => r.cat.key === c.key) || RECIPES.find(r => r.cats.includes(c.key)); const n = catCount(c.key); return `<a class="rail__item" href="#/recipes?cat=${c.key}"><img src="${esc(f.image)}" alt="" width="104" height="104" loading="lazy"><b>${esc(c.name)}</b><small>${n} ${n === 1 ? 'מתכון' : 'מתכונים'}</small></a>`; }).join('')}
          </div>
        </div>
      </section>

      <section class="section" style="padding-top:0" aria-labelledby="latest-h">
        <div class="wrap">
          <div class="section__head">
            <h2 id="latest-h">${esc(S.sections.latestTitle)}</h2>
            <a class="more" href="#/recipes">לכל ${plain.length} המתכונים ${ICON.back}</a>
          </div>
          <div class="grid">${latest.map(r => card(r)).join('')}</div>
        </div>
      </section>

      ${few.length ? `<section class="section section--tint" aria-labelledby="few-h">
        <div class="wrap">
          <div class="section__head"><div><h2 id="few-h">${esc(S.sections.fewTitle)}</h2><p>${esc(S.sections.fewLead)}</p></div><a class="more" href="#/recipes?few=1">להצגת כולם ${ICON.back}</a></div>
          <div class="grid">${few.map(r => card(r)).join('')}</div>
        </div>
      </section>` : ''}

      <section class="section about">
        <div class="wrap about__grid">
          <div><img class="about__logo" src="assets/logo/logo-full-cream.svg" alt="קרן וולף" width="240" height="400"></div>
          <div>
            <h2>${esc(S.about.teaserTitle)}</h2>
            <div style="margin-top:14px">${S.about.teaser.map(p => `<p>${esc(p)}</p>`).join('')}</div>
            <a class="btn btn--cream" href="#/about">קצת יותר עליי</a>
          </div>
        </div>
      </section>

      ${mc && mc.enabled ? masterchefBlock(mc) : ''}`,
      after() { bindHeroSearch(); renderFridgeOut(); },
    };
  }

  function masterchefBlock(mc) {
    const ext = RECIPES.filter(r => r.type === 'external');
    return `<section class="section mc" aria-labelledby="mc-h">
      <div class="wrap">
        <div class="mc__head">
          ${mc.eyebrow ? `<span class="eyebrow">${esc(mc.eyebrow)}</span>` : ''}
          <h2 id="mc-h">${esc(mc.title)}</h2>
          ${(mc.text || []).map(p => `<p>${esc(p)}</p>`).join('')}
          ${mc.quote ? `<blockquote class="mc__quote">${esc(mc.quote)}</blockquote>` : ''}
          ${(mc.facts || []).length ? `<div class="facts">${mc.facts.map(f => `<div class="fact"><small>${esc(f.label)}</small><b>${esc(f.value)}</b></div>`).join('')}</div>` : ''}
        </div>
        ${ext.length ? `<div class="mc__cards">${ext.map(r => `<a class="mc__card" href="${esc(r.externalUrl)}" target="_blank" rel="noopener"><img src="${esc(r.image)}" alt="" loading="lazy" width="400" height="400"><span><b>${esc(r.title)}</b><small>${esc(mc.cardCta || 'למתכון המלא')}</small></span></a>`).join('')}</div>` : ''}
        ${(mc.links || []).length ? `<div class="mc__links">${mc.links.map(l => `<a class="btn btn--sm" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</div>` : ''}
      </div>
    </section>`;
  }

  // list page state
  let L = { q: '', cat: '', fav: false, few: false, short: false, fridge: new Set() };
  let limit = 24, lastKey = '';

  function recipesView(query) {
    L = {
      q: query.get('q') || '', cat: query.get('cat') || '', fav: query.get('fav') === '1', few: query.get('few') === '1',
      short: query.get('short') === '1', fridge: new Set((query.get('fridge') || '').split(',').filter(l => frByLabel[l])),
    };
    fridgeSel = L.fridge;
    return {
      title: 'כל המתכונים | קרן וולף',
      html: `
      <section class="wrap page-head">
        <h1>כל המתכונים</h1>
        <p>חפשו לפי שם המנה, לפי מרכיב, או סמנו מה יש לכם במקרר.</p>
        <div class="toolbar">
          <form class="bigsearch" role="search" data-live>
            ${ICON.search}
            <label class="sr" for="q">חיפוש מתכון</label>
            <input id="q" type="search" name="q" value="${esc(L.q)}" placeholder="למשל: פטריות, שוקולד, פסטה…" autocomplete="off">
          </form>
          <div class="chips" role="group" aria-label="קטגוריות">
            <button class="chip" type="button" data-cat="" aria-pressed="${!L.cat}">הכול <small>${RECIPES.length}</small></button>
            ${usedCats.map(c => `<button class="chip" type="button" data-cat="${c.key}" aria-pressed="${L.cat === c.key}">${esc(c.name)} <small>${catCount(c.key)}</small></button>`).join('')}
          </div>
          <div class="chips" role="group" aria-label="סינונים נוספים">
            <button class="chip" type="button" data-few aria-pressed="${L.few}">עד ${S.sections.fewMax} מרכיבים</button>
            <button class="chip" type="button" data-short aria-pressed="${L.short}">עד 7 שלבים</button>
            <button class="chip" type="button" data-favonly aria-pressed="${L.fav}">${ICON.heart.replace('<svg', '<svg width="16" height="16" style="fill:none;stroke:currentColor;stroke-width:2"')} השמורים שלי</button>
          </div>
          <details class="fridge" ${L.fridge.size ? 'open' : ''} style="margin:0">
            <summary class="fridge__title" style="cursor:pointer">${esc(S.hero.fridgeTitle)} <small>${esc(S.hero.fridgeHint)}</small></summary>
            <div class="fridge__chips" role="group" aria-label="${esc(S.hero.fridgeTitle)}">${fridgeChips()}</div>
          </details>
        </div>
      </section>
      <section class="wrap" style="padding-bottom:clamp(48px,8vw,96px)">
        <p class="count" data-count role="status" aria-live="polite"></p>
        <div class="grid" data-results></div>
      </section>`,
      after() {
        const input = $('#q');
        input.addEventListener('input', () => { L.q = input.value; renderList(); });
        $('[data-live]').addEventListener('submit', e => e.preventDefault());
        renderList();
        if (query.get('focus')) input.focus();
      },
    };
  }

  function renderList() {
    const out = $('[data-results]'), cnt = $('[data-count]'); if (!out) return;
    const terms = norm(L.q).split(' ').filter(Boolean);
    const key = JSON.stringify([L.q, L.cat, L.fav, L.few, L.short, [...L.fridge]]);
    if (key !== lastKey) { limit = 24; lastKey = key; }
    let list = RECIPES.map(r => ({ r, score: 0 }));
    if (L.fridge.size) list = fridgeResults(L.fridge);
    list = list.filter(({ r }) =>
      (!L.cat || r.cats.includes(L.cat)) && (!L.fav || favs.has(r.slug)) && (!L.few || r.count <= S.sections.fewMax) &&
      (!L.short || r.steps.length <= 7) && terms.every(t => r.hay.includes(t)));
    const total = L.fridge.size;
    cnt.textContent = !list.length ? '' : list.length === RECIPES.length ? `${list.length} מתכונים` : `נמצאו ${list.length} ${list.length === 1 ? 'מתכון' : 'מתכונים'}`;
    const shown = list.slice(0, limit);
    out.innerHTML = list.length ? shown.map(({ r, score }) => card(r, score, total)).join('') + (list.length > limit ? `<div class="empty" style="background:none;border:0;padding:12px"><button class="btn btn--solid" type="button" data-more>הצגת עוד (${list.length - limit})</button></div>` : '') : `
      <div class="empty"><h2>${L.fav && !favs.size ? 'עוד לא שמרתם מתכונים' : 'לא מצאתי כזה עדיין'}</h2>
      <p>${L.fav && !favs.size ? 'לחצו על הלב בכרטיס של מתכון כדי לשמור אותו כאן.' : 'נסו מילה אחרת, או הורידו כמה סינונים.'}</p>
      <button class="btn btn--solid" type="button" data-reset>לכל המתכונים</button></div>`;
    $$('[data-cat]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === L.cat)));
    $('[data-few]').setAttribute('aria-pressed', String(L.few));
    $('[data-short]').setAttribute('aria-pressed', String(L.short));
    $('[data-favonly]').setAttribute('aria-pressed', String(L.fav));
    $$('[data-fridge]').forEach(b => b.setAttribute('aria-pressed', String(L.fridge.has(b.dataset.fridge))));
    const p = new URLSearchParams();
    if (L.q) p.set('q', L.q); if (L.cat) p.set('cat', L.cat); if (L.fav) p.set('fav', '1'); if (L.few) p.set('few', '1'); if (L.short) p.set('short', '1');
    if (L.fridge.size) p.set('fridge', [...L.fridge].join(','));
    try { history.replaceState(null, '', '#/recipes' + (p.toString() ? '?' + p : '')); } catch (e) { /* ignore */ }
  }

  function renderFridgeOut() {
    const cnt = $('[data-fcount]'); if (cnt) cnt.textContent = fridgeSel.size ? `(${fridgeSel.size})` : '';
    const out = $('[data-fridge-out]'); if (!out) return;
    if (!fridgeSel.size) { out.innerHTML = ''; return; }
    const res = fridgeResults(fridgeSel);
    out.innerHTML = res.length
      ? `<div class="minis">${res.slice(0, 4).map(({ r, score }) => `<a class="mini" href="${href(r)}"><img src="${esc(r.image)}" alt="" width="58" height="58"><span><b>${esc(r.title)}</b><small>${score} מתוך ${fridgeSel.size} במקרר</small></span></a>`).join('')}</div>
         <p style="margin-top:10px"><a class="more" href="#/recipes?fridge=${encodeURIComponent([...fridgeSel].join(','))}">לכל התוצאות (${res.length}) ${ICON.back}</a></p>`
      : '<p class="fridge__empty">אין עדיין מתכון עם השילוב הזה. נסו להוריד מרכיב.</p>';
  }

  function recipeView(slug) {
    const r = bySlug[slug];
    if (!r) return notFound();
    if (r.type === 'article') return articleView(r);
    if (r.type === 'external') return externalView(r);
    const checked = new Set(store.get('kw:ing:' + r.slug, []));
    const done = new Set(store.get('kw:step:' + r.slug, []));
    const related = [...plain.filter(x => x !== r && x.cat.key === r.cat.key), ...plain.filter(x => x !== r && x.cat.key !== r.cat.key)].slice(0, 4);
    let ix = -1;
    const shareUrl = window.SITE_URL ? `${window.SITE_URL}/recipe/${encodeURIComponent(r.slug)}/` : location.href.split('#')[0] + href(r);
    return {
      title: `${r.title} | קרן וולף`,
      html: `
      <div class="wrap">
        <nav class="crumbs" aria-label="פירורי לחם"><a href="#/">ראשי</a><i>/</i><a href="#/recipes">מתכונים</a><i>/</i><span aria-current="page">${esc(r.title)}</span></nav>
        <article>
          <header class="rhero">
            <div>
              <a class="tag tag--${esc(r.cat.key)}" href="#/recipes?cat=${esc(r.cat.key)}" style="text-decoration:none">${esc(r.cat.name)}</a>
              <h1>${esc(r.title)}</h1>
              ${r.tagline ? `<p class="rhero__lead">${esc(r.tagline)}</p>` : ''}
              <p class="rhero__by">מאת קרן וולף</p>
              <div class="pills">${r.time ? `<span class="pill" title="הערכה">${ICON.timer}${fmtTime(r.time)}</span>` : ''}${r.yield ? `<span class="pill" title="הערכה">${esc(r.yield)}</span>` : ''}<span class="pill">${ICON.ing}${r.count} מרכיבים</span><span class="pill">${ICON.steps}${r.steps.length} שלבים</span><span class="pill">טבעוני</span></div>
              <div class="actions">
                <button class="btn btn--solid" type="button" data-jump>${ICON.list}למרכיבים ולהכנה</button>
                <button class="btn" type="button" data-cook>${ICON.cook}מצב בישול</button>
                <button class="btn fav-btn" type="button" data-fav="${esc(r.slug)}" data-fav-label aria-pressed="${favs.has(r.slug)}">${ICON.heart.replace('<svg', '<svg width="20" height="20" style="stroke:currentColor;stroke-width:2;fill:none"')}<span>${favs.has(r.slug) ? 'שמור' : 'שמירה'}</span></button>
                ${IN_VIEWER ? '' : `<button class="btn" type="button" data-print>${ICON.print}הדפסה</button>`}
                <button class="btn" type="button" data-copy>${ICON.link}העתקת קישור</button>
                <a class="btn" href="https://wa.me/?text=${encodeURIComponent(r.title + ' ' + shareUrl)}" target="_blank" rel="noopener">${ICON.wa}וואטסאפ</a>
              </div>
            </div>
            <div class="rhero__img"><img src="${esc(r.image)}" alt="${esc(r.imageAlt || r.title)}" width="1000" height="1100"></div>
          </header>

          ${(r.gallery || []).length ? `<div class="gallery" aria-label="עוד תמונות">${r.gallery.map((g, k) => `<img src="${esc(g)}" alt="${esc(r.title)}, תמונה ${k + 2}" loading="lazy" width="600" height="600">`).join('')}</div>` : ''}

          <div class="rbody" id="recipe-body">
            <aside class="ings" aria-labelledby="ing-h">
              <h2 id="ing-h">מה צריך?</h2>
              <ul>${r.ingredients.map(t => typeof t === 'string'
                ? `<li><label class="ing"><input type="checkbox" data-i="${++ix}" ${checked.has(ix) ? 'checked' : ''}><span>${esc(t)}</span></label></li>`
                : `<li class="h">${esc(t.heading)}</li>`).join('')}</ul>
              <div class="ings__tools"><button class="btn btn--sm" type="button" data-shop>${ICON.list}העתקת רשימת קניות</button></div>
            </aside>
            <div>
              <div class="steps-head">
                <h2>יאללה, לעבודה</h2>
                <div class="progress"><small data-prog-text></small><div class="bar" aria-hidden="true"><i data-prog-bar></i></div></div>
              </div>
              <ol class="steps">${r.steps.map((s, n) => `
                <li class="step ${done.has(n) ? 'done' : ''}" data-step="${n}">
                  <button class="step__n" type="button" aria-pressed="${done.has(n)}" aria-label="שלב ${n + 1}: סימון כבוצע"><span class="num">${n + 1}</span><svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.500 4.500 4.500L19 7.500"/></svg></button>
                  <div><p class="step__txt">${esc(s)}</p>${timerBtn(r, n + 1, s)}</div>
                </li>`).join('')}</ol>
              ${S.recipeOutro ? `<p class="outro">${esc(S.recipeOutro)} <a href="${esc(S.instagram)}" target="_blank" rel="noopener" dir="ltr">${esc(S.instagramHandle)}</a></p>` : ''}
            </div>
          </div>
        </article>
      </div>
      <section class="section related" aria-labelledby="rel-h">
        <div class="wrap">
          <div class="section__head"><h2 id="rel-h">עוד דברים שתאהבו</h2><a class="more" href="#/recipes">כל המתכונים ${ICON.back}</a></div>
          <div class="grid">${related.map(x => card(x)).join('')}</div>
        </div>
      </section>`,
      after() {
        const prog = () => {
          const n = $$('.step.done').length, t = r.steps.length;
          $('[data-prog-text]').textContent = n ? (n === t ? 'סיימתם. בתיאבון!' : `הושלמו ${n} מתוך ${t}`) : `${t} שלבים`;
          $('[data-prog-bar]').style.width = (n / t * 100) + '%';
        };
        prog();
        $$('.ing input').forEach(cb => cb.addEventListener('change', () => store.set('kw:ing:' + r.slug, $$('.ing input:checked').map(x => +x.dataset.i))));
        $$('.step__n').forEach(b => b.addEventListener('click', () => {
          const li = b.closest('.step'); li.classList.toggle('done'); b.setAttribute('aria-pressed', String(li.classList.contains('done')));
          store.set('kw:step:' + r.slug, $$('.step.done').map(x => +x.dataset.step)); prog();
        }));
        const pr = $('[data-print]'); if (pr) pr.addEventListener('click', () => window.print());
        $('[data-copy]').addEventListener('click', () => copyText(shareUrl, 'הקישור הועתק'));
        $('[data-shop]').addEventListener('click', () => {
          const list = items(r).filter((_, k) => !$(`.ing input[data-i="${k}"]`).checked);
          if (!list.length) return toast('סימנתם שיש הכול. אין מה לקנות!');
          copyText(`רשימת קניות: ${r.title}\n` + list.map(t => '• ' + t).join('\n'), 'רשימת הקניות הועתקה');
        });
        $('[data-cook]').addEventListener('click', () => cookMode(r));
      },
    };
  }

  function articleView(r) {
    return {
      title: `${r.title} | קרן וולף`,
      html: `
      <div class="wrap">
        <nav class="crumbs" aria-label="פירורי לחם"><a href="#/">ראשי</a><i>/</i><a href="#/recipes">מתכונים</a><i>/</i><span aria-current="page">${esc(r.title)}</span></nav>
        <article class="article">
          <header class="article__head">
            <span class="tag tag--${esc(r.cat.key)}">${esc(r.cat.name)}</span>
            <h1>${esc(r.title)}</h1>
            <p class="rhero__by">מאת קרן וולף</p>
          </header>
          <div class="article__cover"><img src="${esc(r.image)}" alt="${esc(r.imageAlt || r.title)}" width="1000" height="1000"></div>
          <div class="article__body">${(r.blocks || []).map(b => b.img ? `<img src="${esc(b.img)}" alt="${esc(b.alt || '')}" loading="lazy" width="800" height="800">` : `<p>${esc(b.p)}</p>`).join('')}</div>
        </article>
      </div>
      <div class="section"></div>`,
    };
  }

  function externalView(r) {
    return {
      title: `${r.title} | קרן וולף`,
      html: `
      <div class="wrap">
        <nav class="crumbs" aria-label="פירורי לחם"><a href="#/">ראשי</a><i>/</i><a href="#/recipes">מתכונים</a><i>/</i><span aria-current="page">${esc(r.title)}</span></nav>
        <header class="rhero">
          <div>
            <span class="tag tag--${esc(r.cat.key)}">${esc(r.cat.name)}</span>
            <h1>${esc(r.title)}</h1>
            ${r.tagline ? `<p class="rhero__lead">${esc(r.tagline)}</p>` : ''}
            <div class="actions"><a class="btn btn--solid" href="${esc(r.externalUrl)}" target="_blank" rel="noopener">${ICON.link}למתכון המלא באתר mako</a></div>
          </div>
          <div class="rhero__img"><img src="${esc(r.image)}" alt="${esc(r.imageAlt || r.title)}" width="1000" height="1100"></div>
        </header>
      </div>
      <div class="section"></div>`,
    };
  }

  function aboutView() {
    const a = S.about, mc = S.masterchef;
    return {
      title: 'קצת עליי | קרן וולף',
      html: `
      <section class="wrap page-head about-head">
        <div><span class="eyebrow">${esc(a.eyebrow)}</span><h1>${esc(a.title)}</h1></div>
        ${a.portrait ? `<div class="portrait"><img src="${esc(a.portrait)}" alt="קרן וולף" width="600" height="600"></div>` : ''}
      </section>
      <div class="wrap prose">
        <p class="lead">${esc(a.lead)}</p>
        ${a.body.map(p => `<p>${esc(p)}</p>`).join('')}
        <a class="btn btn--solid" href="#/recipes">${esc(a.cta)}</a>
      </div>
      ${mc && mc.enabled ? masterchefBlock(mc) : ''}`,
    };
  }

  function contactView() {
    const c = S.contact;
    return {
      title: 'יצירת קשר | קרן וולף',
      html: `
      <section class="wrap page-head"><h1>${esc(c.title)}</h1><p>${esc(c.lead)}</p></section>
      <div class="wrap contact">
        <div class="contact-card">
          <div><small>אימייל</small><a class="big" href="mailto:${esc(S.email)}" dir="ltr">${esc(S.email)}</a>
            <div class="row"><button class="btn btn--sm btn--solid" type="button" data-copyemail>העתקת הכתובת</button><a class="btn btn--sm" href="mailto:${esc(S.email)}">פתיחה באפליקציית המייל</a></div></div>
          <div><small>אינסטגרם</small><a class="big" href="${esc(S.instagram)}" target="_blank" rel="noopener" dir="ltr">${esc(S.instagramHandle)}</a></div>
        </div>
        <div class="contact-card"><p>הכי קל לכתוב לי במייל או בהודעה באינסטגרם. אני קוראת הכול.</p></div>
      </div>`,
      after() { $('[data-copyemail]').addEventListener('click', () => copyText(S.email, 'הכתובת הועתקה')); },
    };
  }

  function legalView(key) {
    const p = S.pages[key];
    return {
      title: `${p.title} | קרן וולף`,
      html: `<section class="wrap page-head"><h1>${esc(p.title)}</h1></section>
      <div class="wrap prose">${p.blocks.map(b => b.h ? `<h2>${esc(b.h)}</h2>` : `<p>${esc(b.p)}</p>`).join('')}
        <p>${esc(S.instagramHandle)} · <a href="mailto:${esc(S.email)}" dir="ltr">${esc(S.email)}</a></p>
        ${p.updated ? `<p>${esc(p.updated)}</p>` : ''}</div>`,
    };
  }

  function notFound() {
    return { title: 'לא מצאנו | קרן וולף', html: `<section class="wrap page-head" style="padding-bottom:88px"><h1>הדף הזה יצא מהתנור</h1><p>לא מצאתי את מה שחיפשתם. אולי כדאי להתחיל מהמתכונים?</p><p style="margin-top:20px"><a class="btn btn--solid" href="#/recipes">לכל המתכונים</a></p></section>` };
  }

  // ---------- forms ----------
  function bindHeroSearch() {
    const f = $('[data-hero-search]'); if (!f) return;
    f.addEventListener('submit', e => { e.preventDefault(); go('#/recipes' + qs({ q: new FormData(f).get('q').toString().trim() })); });
  }
  const qs = o => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => v && p.set(k, v)); return p.toString() ? '?' + p : ''; };

  // ---------- surprise ----------
  function surprise() {
    const target = plain[Math.floor(Math.random() * plain.length)];
    if (reduceMotion) return go(href(target));
    const box = document.createElement('div');
    box.className = 'dice'; box.setAttribute('role', 'status');
    box.innerHTML = `<div class="dice__card"><img src="${esc(plain[0].image)}" alt=""><b>מערבבים…</b><p>&nbsp;</p></div>`;
    document.body.append(box);
    const img = $('img', box), title = $('b', box), sub = $('p', box);
    let n = 0;
    const iv = setInterval(() => {
      const r = plain[n++ % plain.length]; img.src = r.image;
      if (n > 14) {
        clearInterval(iv); img.src = target.image; title.textContent = target.title; sub.textContent = 'זה מה שמכינים היום';
        setTimeout(() => { box.remove(); go(href(target)); }, 1100);
      }
    }, 110);
  }

  // ---------- cooking mode ----------
  function cookMode(r) {
    const prev = document.activeElement, N = r.steps.length;
    let i = 0, lock = null;
    const el = document.createElement('div');
    el.className = 'cook'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'מצב בישול: ' + r.title);
    el.innerHTML = `
      <div class="cook__top">
        <span class="cook__title">${esc(r.title)}</span>
        <button class="btn btn--sm" type="button" data-ings aria-expanded="false">מרכיבים</button>
        <button class="btn btn--sm" type="button" data-x>${ICON.x}יציאה</button>
      </div>
      <div class="cook__bar" aria-hidden="true"><i></i></div>
      <div class="cook__stage" aria-live="polite"></div>
      <div class="cook__nav">
        <button class="btn" type="button" data-prev>הקודם</button>
        <button class="btn btn--cream" type="button" data-next>הבא</button>
      </div>
      <aside class="cook__ings" hidden aria-label="מרכיבים">
        <h2>מה צריך? <button class="btn btn--sm" type="button" data-ings-x>סגירה</button></h2>
        <ul>${r.ingredients.map(t => typeof t === 'string' ? `<li>${esc(t)}</li>` : `<li class="h">${esc(t.heading)}</li>`).join('')}</ul>
      </aside>`;
    document.body.append(el); document.body.classList.add('lock', 'cook-open');
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => {});
    const stage = $('.cook__stage', el), bar = $('.cook__bar i', el), pv = $('[data-prev]', el), nx = $('[data-next]', el), drawer = $('.cook__ings', el), ingBtn = $('[data-ings]', el);
    function show() {
      const done = i >= N;
      bar.style.width = (Math.min(i, N) / N * 100) + '%';
      stage.innerHTML = done
        ? `<div class="cook__n">סיימנו</div><div class="cook__text">בתיאבון!</div>${S.recipeOutro ? `<p style="font-family:var(--font-hand)">${esc(S.recipeOutro)}</p>` : ''}`
        : `<div class="cook__n">שלב ${i + 1} מתוך ${N}</div><div class="cook__text">${esc(r.steps[i])}</div>${timerBtn(r, i + 1, r.steps[i]).replace('btn btn--sm', 'btn')}`;
      pv.disabled = i === 0;
      nx.textContent = done ? 'יציאה' : i === N - 1 ? 'סיום' : 'הבא';
    }
    function close() {
      document.removeEventListener('keydown', onKey); window.removeEventListener('popstate', close);
      el.remove(); document.body.classList.remove('lock', 'cook-open');
      if (lock) lock.release().catch(() => {});
      if (prev && prev.focus) prev.focus();
    }
    function toggleIngs(on) { drawer.hidden = !on; ingBtn.setAttribute('aria-expanded', String(on)); (on ? $('[data-ings-x]', el) : ingBtn).focus(); }
    function onKey(e) {
      if (e.key === 'Escape') { drawer.hidden ? close() : toggleIngs(false); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); nx.click(); }   // RTL: קדימה = שמאלה
      else if (e.key === 'ArrowRight') { e.preventDefault(); pv.click(); }
      else if (e.key === 'Tab') {
        const f = $$('button:not([disabled]), a[href]', el).filter(x => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    pv.addEventListener('click', () => { if (i > 0) { i--; show(); } });
    nx.addEventListener('click', () => { if (i >= N) close(); else { i++; show(); } });
    $('[data-x]', el).addEventListener('click', close);
    ingBtn.addEventListener('click', () => toggleIngs(drawer.hidden));
    $('[data-ings-x]', el).addEventListener('click', () => toggleIngs(false));
    document.addEventListener('keydown', onKey); window.addEventListener('popstate', close);
    show(); nx.focus();
  }

  // ---------- global events ----------
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const fm = $('[data-fmenu][open]'); if (fm) { fm.open = false; const s = $('summary', fm); if (s) s.focus(); }
  });
  document.addEventListener('click', e => {
    const t = e.target;
    const fm0 = $('[data-fmenu]'); if (fm0 && fm0.open && !fm0.contains(t)) fm0.open = false;
    const a = t.closest('a[href^="#/"]');
    if (a && !e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); go(a.getAttribute('href')); return; }
    const fav = t.closest('[data-fav]');
    if (fav) { e.preventDefault(); toggleFav(fav.dataset.fav, fav); return; }
    const fr = t.closest('[data-fridge]');
    if (fr) {
      const l = fr.dataset.fridge; if (fridgeSel.has(l)) fridgeSel.delete(l); else fridgeSel.add(l);
      $$(`[data-fridge="${CSS.escape(l)}"]`).forEach(b => b.setAttribute('aria-pressed', String(fridgeSel.has(l))));
      if (currentView === 'recipes') { L.fridge = fridgeSel; renderList(); } else renderFridgeOut();
      return;
    }
    const cat = t.closest('[data-cat]'); if (cat && currentView === 'recipes') { L.cat = cat.dataset.cat; renderList(); return; }
    if (t.closest('[data-more]')) { limit += 24; renderList(); return; }
    if (t.closest('[data-few]')) { L.few = !L.few; renderList(); return; }
    if (t.closest('[data-short]')) { L.short = !L.short; renderList(); return; }
    if (t.closest('[data-favonly]')) { L.fav = !L.fav; renderList(); return; }
    if (t.closest('[data-reset]')) { L = { q: '', cat: '', fav: false, few: false, short: false, fridge: new Set() }; fridgeSel = L.fridge; const q = $('#q'); if (q) q.value = ''; renderList(); return; }
    if (t.closest('[data-surprise]')) { surprise(); return; }
    if (t.closest('[data-jump]')) { const b = $('#recipe-body'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const tm =t.closest('[data-timer]'); if (tm) { startTimer(+tm.dataset.timer, tm.dataset.label); return; }
    const tx = t.closest('[data-tm-x]'); if (tx) { const id = +tx.dataset.tmX; const k = timers.findIndex(x => x.id === id); if (k >= 0) timers.splice(k, 1); renderTimers(); return; }
    if (t.closest('[data-skip]')) { e.preventDefault(); main.focus(); }
  });
  $('[data-top-search]').addEventListener('submit', e => {
    e.preventDefault(); const q = new FormData(e.target).get('q').toString().trim(); e.target.reset(); go('#/recipes' + qs({ q }));
  });

  // ---------- router ----------
  // בעמודים שנבנו מראש (scripts/build-static.mjs) המסלול מגיע מתגית meta, ולא מה-hash
  const metaRoute = (document.querySelector('meta[name="kw-route"]') || {}).content || '';
  let cur = location.hash || metaRoute;
  function route() {
    const raw = cur.replace(/^#\/?/, '');
    const [path, q = ''] = raw.split('?');
    const query = new URLSearchParams(q);
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    let v, name = parts[0] || 'home';
    if (name === 'home') v = homeView();
    else if (name === 'recipes') v = recipesView(query);
    else if (name === 'recipe') v = recipeView(parts[1]);
    else if (name === 'about') v = aboutView();
    else if (name === 'contact') v = contactView();
    else if (name === 'privacy' || name === 'accessibility' || name === 'terms') v = legalView(name);
    else { v = notFound(); name = '404'; }
    currentView = name;
    main.innerHTML = v.html;
    document.title = v.title;
    $$('.nav a').forEach(a => a.removeAttribute('aria-current'));
    const nav = { recipes: 'recipes', recipe: 'recipes', about: 'about', contact: 'contact' }[name];
    if (nav) $(`.nav a[data-nav="${nav}"]`).setAttribute('aria-current', 'page');
    if (name !== 'home' && name !== 'recipes') fridgeSel = new Set();
    if (v.after) v.after();
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!query.get('focus')) main.focus({ preventScroll: true });
  }
  function go(h) {
    if (h === cur) return route();
    cur = h;
    try { history.pushState(null, '', h); } catch (e) { /* the viewer frame may refuse this */ }
    route();
  }
  window.addEventListener('popstate', () => { if (/^#\//.test(location.hash) || !location.hash) { cur = location.hash || metaRoute; route(); } });

  updateFavCount(false);
  route();
})();
