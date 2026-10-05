/* תפריט נגישות: התאמות תצוגה שנשמרות בדפדפן של המשתמש (localStorage). בלי תלויות. */
(function () {
  'use strict';
  var KEY = 'kw:a11y';
  var root = document.documentElement;
  var DEFAULTS = { fs: 0, contrast: false, links: false, readable: false, motion: false };
  var FS_LABELS = ['רגיל', 'גדול', 'גדול מאוד', 'ענק'];

  function load() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }

  var state = load();
  state.fs = Math.max(0, Math.min(3, +state.fs || 0));

  function apply() {
    for (var i = 0; i <= 3; i++) root.classList.toggle('a11y-fs-' + i, state.fs === i && i > 0);
    root.classList.toggle('a11y-contrast', !!state.contrast);
    root.classList.toggle('a11y-links', !!state.links);
    root.classList.toggle('a11y-readable', !!state.readable);
    root.classList.toggle('a11y-nomotion', !!state.motion);
    refreshButtons();
  }

  var panel, toggleBtn, status;
  var buttons = {};

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) { n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function refreshButtons() {
    if (!panel) return;
    buttons.contrast.setAttribute('aria-pressed', String(!!state.contrast));
    buttons.links.setAttribute('aria-pressed', String(!!state.links));
    buttons.readable.setAttribute('aria-pressed', String(!!state.readable));
    buttons.motion.setAttribute('aria-pressed', String(!!state.motion));
    buttons.bigger.disabled = state.fs >= 3;
    buttons.smaller.disabled = state.fs <= 0;
    status.textContent = 'גודל טקסט: ' + FS_LABELS[state.fs];
  }

  function change(fn, msg) {
    fn(); save(state); apply();
    if (msg) status.textContent = msg;
  }

  function open() {
    panel.hidden = false;
    toggleBtn.setAttribute('aria-expanded', 'true');
    var first = panel.querySelector('button');
    if (first) first.focus();
  }
  function close(returnFocus) {
    panel.hidden = true;
    toggleBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggleBtn.focus();
  }

  function option(key, label, onClick) {
    var b = el('button', { type: 'button', class: 'a11y-opt', 'aria-pressed': 'false' }, [label]);
    b.addEventListener('click', onClick);
    buttons[key] = b;
    return b;
  }

  function build() {
    var wrap = el('div', { class: 'a11y-root' });

    toggleBtn = el('button', { type: 'button', class: 'a11y-toggle', 'aria-expanded': 'false', 'aria-controls': 'a11y-panel', 'aria-label': 'תפריט נגישות' });
    toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><circle cx="12" cy="4.500" r="2" fill="currentColor"/><path d="M5 8.500h14M12 8.500v5m0 0-3.500 6.500M12 13.500l3.500 6.500" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    toggleBtn.addEventListener('click', function () { panel.hidden ? open() : close(false); });

    panel = el('div', { id: 'a11y-panel', class: 'a11y-panel', role: 'dialog', 'aria-label': 'תפריט נגישות' });
    panel.hidden = true;

    var head = el('div', { class: 'a11y-head' }, [el('b', {}, ['התאמות נגישות'])]);
    var closeBtn = el('button', { type: 'button', class: 'a11y-close', 'aria-label': 'סגירת תפריט הנגישות' }, ['✕']);
    closeBtn.addEventListener('click', function () { close(true); });
    head.appendChild(closeBtn);

    var fsRow = el('div', { class: 'a11y-row', role: 'group', 'aria-label': 'גודל טקסט' });
    buttons.bigger = el('button', { type: 'button', class: 'a11y-opt' }, ['הגדלת טקסט  A+']);
    buttons.smaller = el('button', { type: 'button', class: 'a11y-opt' }, ['הקטנת טקסט  A−']);
    buttons.bigger.addEventListener('click', function () { change(function () { state.fs = Math.min(3, state.fs + 1); }); });
    buttons.smaller.addEventListener('click', function () { change(function () { state.fs = Math.max(0, state.fs - 1); }); });
    fsRow.appendChild(buttons.bigger); fsRow.appendChild(buttons.smaller);

    status = el('p', { class: 'a11y-status', role: 'status', 'aria-live': 'polite' });

    var reset = el('button', { type: 'button', class: 'a11y-opt a11y-reset' }, ['איפוס כל ההתאמות']);
    reset.addEventListener('click', function () { change(function () { state = Object.assign({}, DEFAULTS); }, 'ההתאמות אופסו'); });

    var link = el('a', { class: 'a11y-link', href: '#/accessibility' }, ['להצהרת הנגישות']);
    link.addEventListener('click', function () { close(false); });

    [head, fsRow,
      option('contrast', 'ניגודיות גבוהה', function () { change(function () { state.contrast = !state.contrast; }); }),
      option('links', 'הדגשת קישורים', function () { change(function () { state.links = !state.links; }); }),
      option('readable', 'גופן קריא', function () { change(function () { state.readable = !state.readable; }); }),
      option('motion', 'עצירת אנימציות', function () { change(function () { state.motion = !state.motion; }); }),
      reset, status, link
    ].forEach(function (n) { panel.appendChild(n); });

    wrap.appendChild(toggleBtn); wrap.appendChild(panel);
    document.body.appendChild(wrap);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); close(true); }
    });
    document.addEventListener('click', function (e) {
      if (!panel.hidden && !wrap.contains(e.target)) close(false);
    });
  }

  function init() { build(); apply(); }
  apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
