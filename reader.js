
/* ==========================================================
   IELTS Grammar Lab | Complete reading tools
   File: reader.js
   Features:
   Reading settings, themes, focus mode, progress, resume,
   text to speech, section navigation, highlights and notes.
   Self-contained. Works on pages containing a <main> element.
   ========================================================== */

(function () {
  'use strict';

  var KEY = 'ielts-gl-reader';
  var DEF = {
    fs: 0,
    font: 'serif',
    lh: 'normal',
    w: 'normal',
    theme: 'light',
    focus: false,
    rate: 1
  };

  var root = document.documentElement;
  var S = loadSettings();

  function loadSettings() {
    var saved = {};

    try {
      saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch (e) {}

    Object.keys(DEF).forEach(function (key) {
      if (!(key in saved)) saved[key] = DEF[key];
    });

    return saved;
  }

  function saveSettings() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {}
  }

  function applyThemeEarly() {
    root.classList.remove('rd-sepia', 'rd-dark');

    if (S.theme === 'sepia' || S.theme === 'dark') {
      root.classList.add('rd-' + S.theme);
    }
  }

  applyThemeEarly();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var body = document.body;
var main = document.querySelector('main');

if (!main) return;

if (
  document.getElementById('rd-fab') &&
  document.getElementById('rd-panel')
) {
  return;
}

    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var base = parseFloat(getComputedStyle(body).fontSize) || 18;
    var qf = document.getElementById('qf');

    var speaking = false;
    var paused = false;
    var idx = -1;
    var marked = null;
    var cur = null;
    var ticking = false;
    var saveT;
    var msgT;
    var easyLoaded = false;

    var blocks = [];
    var h2s = [];
    var ui;
    var panel;
    var fab;
    var topBtn;
    var prog;
    var listenBtn;
    var noteArea;
    var P;
    var pkey = 'rd-hl:' + location.pathname;

    var canSpeak = 'speechSynthesis' in window &&
      'SpeechSynthesisUtterance' in window;

    /* ------------------------------------------------------
       CSS
       ------------------------------------------------------ */

    var css = `
      .rd-ui {
        --rd-bg: #ffffff;
        --rd-fg: #222936;
        --rd-line: rgba(30, 41, 59, .18);
        --rd-ac: #1f2a44;
        color: var(--rd-fg);
        font: 500 14px/1.45 Inter, system-ui, sans-serif;
      }

      html.rd-sepia .rd-ui {
        --rd-bg: #fbf4e4;
        --rd-fg: #3a3125;
        --rd-line: rgba(58, 49, 37, .25);
        --rd-ac: #5b4636;
      }

      html.rd-dark .rd-ui {
        --rd-bg: #23262d;
        --rd-fg: #eceae4;
        --rd-line: rgba(255, 255, 255, .22);
        --rd-ac: #cdd6ff;
      }

      .rd-ui button {
        font: inherit;
        cursor: pointer;
        border: 1px solid var(--rd-line);
        border-radius: 8px;
        padding: 7px 11px;
        min-height: 36px;
        background: transparent;
        color: var(--rd-fg);
      }

      .rd-ui button[aria-pressed="true"] {
        background: var(--rd-ac);
        color: var(--rd-bg);
        border-color: var(--rd-ac);
      }

      .rd-ui button:focus-visible,
      .rd-jump a:focus-visible,
      .rd-study-tools textarea:focus-visible {
        outline: 3px solid #5275bd;
        outline-offset: 3px;
      }

      .rd-fab,
      .rd-top {
        position: fixed;
        bottom: 16px;
        width: 48px;
        height: 48px;
        border-radius: 50% !important;
        padding: 0 !important;
        font-weight: 700 !important;
        background: var(--rd-bg, #fff) !important;
        border: 2px solid var(--rd-ac, #1f2a44) !important;
        color: var(--rd-ac, #1f2a44) !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, .2);
        z-index: 10000;
      }

      .rd-fab {
        right: 16px;
        font-size: 17px !important;
      }

      .rd-top {
        left: 16px;
        font-size: 20px !important;
      }

      .rd-panel {
        position: fixed;
        right: 16px;
        bottom: 74px;
        width: min(390px, calc(100vw - 32px));
        max-height: 78vh;
        overflow: auto;
        box-sizing: border-box;
        background: var(--rd-bg);
        color: var(--rd-fg);
        border: 1px solid var(--rd-line);
        border-radius: 14px;
        padding: 14px 16px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, .25);
        z-index: 10001;
        overscroll-behavior: contain;
      }

      .rd-panel[hidden],
      .rd-top[hidden],
      .rd-toast[hidden] {
        display: none !important;
      }

      .rd-row {
        margin: 0 0 14px;
      }

      .rd-lab {
        display: block;
        font-size: 12px;
        font-weight: 700;
        opacity: .75;
        margin: 0 0 6px;
      }

      .rd-seg {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .rd-seg button {
        flex: 1 1 auto;
      }

      .rd-jump {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 0;
      }

      .rd-jump a {
        color: var(--rd-fg) !important;
        text-decoration: none;
        padding: 7px 8px;
        border-radius: 6px;
        font-size: 14px;
        overflow-wrap: anywhere;
      }

      .rd-jump a:hover {
        background: var(--rd-line);
      }

      .rd-note {
        font-size: 12px;
        opacity: .75;
        margin: 6px 0 0;
      }

      .rd-prog {
        position: fixed;
        left: 0;
        top: 0;
        height: 4px;
        width: 0;
        background: var(--a, #1f2a44);
        z-index: 10002;
        pointer-events: none;
      }

      .rd-toast {
        position: fixed;
        left: 50%;
        bottom: 76px;
        transform: translateX(-50%);
        background: var(--rd-bg, #fff);
        color: var(--rd-fg, #222936);
        border: 1px solid var(--rd-line, #ddd);
        border-radius: 12px;
        padding: 10px 14px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        z-index: 10003;
        box-shadow: 0 6px 20px rgba(0, 0, 0, .2);
        max-width: calc(100vw - 24px);
      }

      .rd-meta {
        font: 600 .85rem Inter, system-ui, sans-serif;
        opacity: .7;
        margin: -10px 0 20px;
      }

      .rd-speak {
        background: rgba(191, 153, 59, .22) !important;
        border-radius: 4px;
        box-shadow: 0 0 0 3px rgba(191, 153, 59, .22);
      }

      html.rd-focus .rd-b {
        opacity: .28;
        transition: opacity .2s;
      }

      html.rd-focus .rd-b.rd-cur,
      html.rd-focus .rd-b.rd-speak {
        opacity: 1;
      }

      html.rd-sepia {
        color-scheme: light;
        --bg: #f3ead7;
        --paper: #f3ead7;
      }

      html.rd-sepia body {
        background: #f3ead7 !important;
        color: #3a3125 !important;
      }

      html.rd-sepia .rd-b.rd-cur {
        background-color: rgba(120, 95, 55, .07);
      }

      html.rd-dark {
        color-scheme: dark;
        --bg: #16181d;
        --paper: #16181d;
        --l: rgba(255, 255, 255, .16);
      }

      html.rd-dark body {
        background: #16181d !important;
        color: #e8e6e1 !important;
      }

      html.rd-dark h1,
      html.rd-dark h2,
      html.rd-dark h3 {
        color: #f1eee8 !important;
      }

      html.rd-dark a,
      html.rd-dark .lvl,
      html.rd-dark summary,
      html.rd-dark .form b {
        color: #b9c9f7 !important;
      }

      html.rd-dark .top a,
      html.rd-dark .way {
        color: #ddd !important;
      }

      html.rd-dark .sub,
      html.rd-dark .why,
      html.rd-dark .small,
      html.rd-dark .way p,
      html.rd-dark .path span,
      html.rd-dark .foot,
      html.rd-dark .tl {
        color: #b9b6ae !important;
      }

      html.rd-dark del {
        color: #ff9b91;
      }

      html.rd-dark ins {
        color: #9ce2bb;
      }

      html.rd-dark .pair,
      html.rd-dark .q,
      html.rd-dark .way {
        border-color: rgba(255, 255, 255, .18) !important;
      }

      html.rd-dark .q label {
        border-color: rgba(255, 255, 255, .28) !important;
      }

      html.rd-dark button:not(.rd-fab):not(.rd-top),
      html.rd-dark .btn {
        border-color: rgba(255, 255, 255, .35);
      }

      html.rd-dark .btn.g,
      html.rd-dark button.g,
      html.rd-dark .btn.alt {
        color: #e8e6e1 !important;
      }

      html.rd-dark .ok {
        color: #9ce2bb;
      }

      html.rd-dark .no {
        color: #ff9b91;
      }

      .rd-study-tools {
        border-top: 1px solid var(--rd-line);
        margin-top: 14px;
        padding-top: 12px;
      }

      .rd-study-tools h3 {
        font-size: 14px;
        margin: 14px 0 8px;
        color: var(--rd-fg);
      }

      .rd-study-tools textarea {
        display: block;
        width: 100%;
        box-sizing: border-box;
        padding: 10px;
        border: 1px solid var(--rd-line);
        border-radius: 8px;
        background: var(--rd-bg);
        color: var(--rd-fg);
        font: inherit;
        line-height: 1.6;
        resize: vertical;
      }

      .rd-saved-item {
        border: 1px solid var(--rd-line);
        border-radius: 8px;
        padding: 9px;
        margin: 8px 0;
      }

      .rd-saved-text {
        font-size: 13px;
        overflow-wrap: anywhere;
        margin: 0 0 8px;
      }

      .rd-saved-item button {
        margin: 0 5px 4px 0;
      }

      .rd-hl {
        border-radius: 2px;
        padding: 0 1px;
        color: inherit;
      }

      @media (max-width: 620px) {
        .rd-panel {
          left: 8px;
          right: 8px;
          width: auto;
          bottom: 72px;
          max-height: 76vh;
        }

        .rd-fab {
          right: 12px;
          bottom: 12px;
        }

        .rd-top {
          left: 12px;
          bottom: 12px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        html.rd-focus .rd-b {
          transition: none;
        }

        html {
          scroll-behavior: auto !important;
        }
      }

      @media print {
        .rd-ui,
        .rd-prog {
          display: none !important;
        }

        html.rd-focus .rd-b {
          opacity: 1 !important;
        }
      }
    `;

    var st = document.createElement('style');
    st.id = 'rd-reader-styles';
    st.textContent = css;
    document.head.appendChild(st);

    /* ------------------------------------------------------
       Sections and reading time
       ------------------------------------------------------ */

    h2s = Array.prototype.slice.call(main.querySelectorAll('h2'));

    h2s.forEach(function (h, i) {
      if (!h.id) h.id = 'rd-s' + (i + 1);
    });

    var sub = main.querySelector('.sub');

    if (sub && !main.querySelector('.rd-meta')) {
      var words = (main.innerText || main.textContent || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

      var meta = document.createElement('p');
      meta.className = 'rd-meta';

      var minutes = Math.max(1, Math.ceil(words / 180));

      meta.textContent = 'About ' + minutes +
        (minutes === 1 ? ' minute' : ' minutes') +
        ' to read, plus practice';

      sub.insertAdjacentElement('afterend', meta);
    }

    /* ------------------------------------------------------
       Reading blocks
       ------------------------------------------------------ */

    blocks = Array.prototype.slice.call(
      main.querySelectorAll(
        'main > p, main > h2, main > h3,' +
        'main > ul > li, main > ol > li,' +
        'main .form p, main .pair,' +
        'main .two li, main .two h3, main .say'
      )
    ).filter(function (el) {
      if (el.closest('.rd-ui, .nav, #rd-study-tools')) {
        return false;
      }

      if (el.classList.contains('rd-meta')) return false;

      if (qf && qf.contains(el)) {
  return false;
}
       

      if (
        el.matches('main .say') &&
        el.parentElement !== main
      ) {
        return false;
      }

      return true;
    });

    blocks = blocks.filter(function (el, i, arr) {
      return arr.indexOf(el) === i;
    });

    blocks.forEach(function (el) {
      el.classList.add('rd-b');
    });

    /* ------------------------------------------------------
       Utility functions
       ------------------------------------------------------ */

    function seg(key, items) {
      return '<div class="rd-seg">' +
        items.map(function (item) {
          return '<button type="button" data-k="' + key +
            '" data-v="' + item[0] +
            '" aria-pressed="false">' +
            item[1] + '</button>';
        }).join('') +
        '</div>';
    }

    function make(tag, cls, value) {
      var node = document.createElement(tag);

      if (cls) node.className = cls;
      if (value != null) node.textContent = value;

      return node;
    }

    function toast(message) {
      var node = document.getElementById('rd-toast');

      if (!node) {
        node = make('div', 'rd-toast');
        node.id = 'rd-toast';
        node.setAttribute('role', 'status');
        body.appendChild(node);
      }

      node.replaceChildren(document.createTextNode(message));
      node.hidden = false;

      clearTimeout(msgT);

      msgT = setTimeout(function () {
        node.hidden = true;
      }, 2800);
    }

    /* ------------------------------------------------------
       Reader interface
       ------------------------------------------------------ */

    ui = document.createElement('div');
    ui.className = 'rd-ui';

    ui.innerHTML =
      '<button type="button" class="rd-top" id="rd-top"' +
        ' aria-label="Back to top" hidden>↑</button>' +

      '<button type="button" class="rd-fab" id="rd-fab"' +
        ' aria-label="Reading options" aria-expanded="false"' +
        ' aria-controls="rd-panel">Aa</button>' +

      '<div class="rd-panel" id="rd-panel" role="dialog"' +
        ' aria-label="Reading options" hidden>' +

        '<div class="rd-row">' +
          '<span class="rd-lab">Text size</span>' +
          '<div class="rd-seg">' +
            '<button type="button" data-act="smaller"' +
              ' aria-label="Smaller text">A−</button>' +
            '<button type="button" data-act="bigger"' +
              ' aria-label="Larger text">A+</button>' +
            '<button type="button" data-act="reset">Reset all</button>' +
          '</div>' +
        '</div>' +

        '<div class="rd-row">' +
          '<span class="rd-lab">Font</span>' +
          seg('font', [
            ['serif', 'Serif'],
            ['sans', 'Sans'],
            ['easy', 'Easy-read']
          ]) +
        '</div>' +

        '<div class="rd-row">' +
          '<span class="rd-lab">Line spacing</span>' +
          seg('lh', [
            ['tight', 'Tight'],
            ['normal', 'Normal'],
            ['roomy', 'Roomy']
          ]) +
        '</div>' +

        '<div class="rd-row">' +
          '<span class="rd-lab">Text width</span>' +
          seg('w', [
            ['narrow', 'Narrow'],
            ['normal', 'Normal'],
            ['wide', 'Wide']
          ]) +
        '</div>' +

        '<div class="rd-row">' +
          '<span class="rd-lab">Reading colours</span>' +
          seg('theme', [
            ['light', 'Light'],
            ['sepia', 'Sepia'],
            ['dark', 'Dark']
          ]) +
        '</div>' +

        '<div class="rd-row">' +
          '<span class="rd-lab">Focus mode</span>' +
          '<div class="rd-seg">' +
            '<button type="button" data-act="focus"' +
              ' aria-pressed="false">Dim other paragraphs</button>' +
          '</div>' +
        '</div>' +

        (main.querySelector('details') ?
          '<div class="rd-row">' +
            '<span class="rd-lab">Answers</span>' +
            '<div class="rd-seg">' +
              '<button type="button" data-act="open">Open all</button>' +
              '<button type="button" data-act="close">Close all</button>' +
            '</div>' +
          '</div>' : '') +

        (canSpeak ?
          '<div class="rd-row">' +
            '<span class="rd-lab">Listen to the lesson</span>' +
            '<div class="rd-seg">' +
              '<button type="button" data-act="listen"' +
                ' id="rd-listen">▶ Listen</button>' +
              '<button type="button" data-act="stop">Stop</button>' +
            '</div>' +
            '<div class="rd-seg" style="margin-top:6px">' +
              seg('rate', [
                ['0.8', 'Slow'],
                ['1', 'Normal'],
                ['1.25', 'Fast']
              ]) +
            '</div>' +
            '<p class="rd-note">' +
              'Double-click a paragraph to start listening from there.' +
            '</p>' +
          '</div>' : '') +

        (h2s.length > 2 ?
          '<div class="rd-row">' +
            '<span class="rd-lab">Jump to a section</span>' +
            '<nav class="rd-jump" aria-label="Lesson sections">' +
              h2s.map(function (h) {
                var a = document.createElement('a');
                a.href = '#' + h.id;
                a.textContent = h.textContent;
                return '<a href="#' + h.id + '">' +
                  escapeHTML(h.textContent) + '</a>';
              }).join('') +
            '</nav>' +
          '</div>' : '') +

      '</div>';

    body.appendChild(ui);

    prog = document.createElement('div');
    prog.className = 'rd-prog';
    prog.setAttribute('aria-hidden', 'true');
    body.appendChild(prog);

    fab = document.getElementById('rd-fab');
    panel = document.getElementById('rd-panel');
    topBtn = document.getElementById('rd-top');
    listenBtn = document.getElementById('rd-listen');

    function escapeHTML(value) {
      return String(value).replace(/[&<>"']/g, function (ch) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[ch];
      });
    }

    /* ------------------------------------------------------
       Apply reader settings
       ------------------------------------------------------ */

    var fonts = {
      serif: null,
      sans: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
      easy: "'Atkinson Hyperlegible', Inter, system-ui, sans-serif"
    };

    var lineHeights = {
      tight: '1.55',
      normal: null,
      roomy: '2.05'
    };

    var widths = {
      narrow: '560px',
      normal: null,
      wide: '880px'
    };

    function setProperty(el, property, value) {
      if (value) {
        el.style.setProperty(property, value, 'important');
      } else {
        el.style.removeProperty(property);
      }
    }

    function apply() {
      S.fs = Math.max(-3, Math.min(6, Number(S.fs) || 0));

      if (!fonts[S.font] && S.font !== 'serif') {
        S.font = DEF.font;
      }

      if (!(S.lh in lineHeights)) S.lh = DEF.lh;
      if (!(S.w in widths)) S.w = DEF.w;
      if (!['light', 'sepia', 'dark'].includes(S.theme)) {
        S.theme = DEF.theme;
      }

      setProperty(
        body,
        'font-size',
        S.fs ? (base + S.fs * 1.5) + 'px' : null
      );

      if (S.font === 'easy' && !easyLoaded) {
        easyLoaded = true;

        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap';

        document.head.appendChild(link);
      }

      setProperty(body, 'font-family', fonts[S.font]);
      setProperty(body, 'line-height', lineHeights[S.lh]);
      setProperty(main, 'max-width', widths[S.w]);

      root.classList.remove('rd-sepia', 'rd-dark');

      if (S.theme !== 'light') {
        root.classList.add('rd-' + S.theme);
      }

      root.classList.toggle('rd-focus', !!S.focus);

      Array.prototype.forEach.call(
        ui.querySelectorAll('button[data-k]'),
        function (button) {
          button.setAttribute(
            'aria-pressed',
            String(S[button.dataset.k]) === button.dataset.v
              ? 'true'
              : 'false'
          );
        }
      );

      var focusButton = ui.querySelector('[data-act="focus"]');

      if (focusButton) {
        focusButton.setAttribute(
          'aria-pressed',
          S.focus ? 'true' : 'false'
        );
      }

      updateFocus();
    }

    /* ------------------------------------------------------
       Open and close settings
       ------------------------------------------------------ */

    function openPanel(open) {
      panel.hidden = !open;
      fab.setAttribute('aria-expanded', open ? 'true' : 'false');

      if (open) {
        var first = panel.querySelector('button');

        if (first) first.focus();
      } else {
        fab.focus();
      }
    }

    fab.addEventListener('click', function () {
      openPanel(panel.hidden);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) {
        openPanel(false);
      }
    });

    document.addEventListener('click', function (event) {
      if (!panel.hidden && !ui.contains(event.target)) {
        panel.hidden = true;
        fab.setAttribute('aria-expanded', 'false');
      }
    });

    topBtn.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: reduce ? 'auto' : 'smooth'
      });
    });

    panel.addEventListener('click', function (event) {
      var anchor = event.target.closest('a');

      if (anchor) {
        openPanel(false);
        return;
      }

      var button = event.target.closest('button');

      if (!button) return;

      if (button.dataset.k) {
        var key = button.dataset.k;
        var value = button.dataset.v;

        S[key] = key === 'rate' ? parseFloat(value) : value;

        saveSettings();
        apply();

        if (key === 'rate' && speaking && !paused) {
          speak(idx);
        }

        return;
      }

      switch (button.dataset.act) {
        case 'smaller':
          S.fs--;
          break;

        case 'bigger':
          S.fs++;
          break;

        case 'reset':
          S = JSON.parse(JSON.stringify(DEF));
          break;

        case 'focus':
          S.focus = !S.focus;
          break;

        case 'open':
          main.querySelectorAll('details').forEach(function (d) {
            d.open = true;
          });
          return;

        case 'close':
          main.querySelectorAll('details').forEach(function (d) {
            d.open = false;
          });
          return;

        case 'listen':
          toggleListen();
          return;

        case 'stop':
          stopSpeech();
          return;
      }

      saveSettings();
      apply();
    });

    /* ------------------------------------------------------
       Progress, focus and resume position
       ------------------------------------------------------ */

    function updateFocus() {
      if (!S.focus) {
        if (cur) cur.classList.remove('rd-cur');
        cur = null;
        return;
      }

      var middle = window.innerHeight * 0.4;
      var best = null;
      var bestDistance = Infinity;

      blocks.forEach(function (block) {
        var rect = block.getBoundingClientRect();

        if (
          rect.bottom < -50 ||
          rect.top > window.innerHeight + 50
        ) {
          return;
        }

        var distance = Math.abs(
          (rect.top + rect.bottom) / 2 - middle
        );

        if (distance < bestDistance) {
          bestDistance = distance;
          best = block;
        }
      });

      if (best !== cur) {
        if (cur) cur.classList.remove('rd-cur');

        if (best) best.classList.add('rd-cur');

        cur = best;
      }
    }

    function onScroll() {
      if (ticking) return;

      ticking = true;

      requestAnimationFrame(function () {
        ticking = false;

        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        var percent = max > 0
          ? Math.min(100, window.scrollY / max * 100)
          : 0;

        prog.style.width = percent + '%';
        topBtn.hidden = window.scrollY < 700;

        updateFocus();
      });

      clearTimeout(saveT);

      saveT = setTimeout(function () {
        try {
          localStorage.setItem(
            'rd-pos:' + location.pathname,
            String(Math.round(window.scrollY))
          );
        } catch (e) {}
      }, 400);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    try {
      var y = parseInt(
        localStorage.getItem('rd-pos:' + location.pathname) || '0',
        10
      );

      if (y > 900 && !location.hash && window.scrollY < 50) {
        var resumeToast = make('div', 'rd-toast');
        resumeToast.id = 'rd-resume-toast';

        var message = make('span', '', 'Continue where you left off?');
        var go = make('button', '', 'Continue');
        var dismiss = make('button', '', 'Dismiss');

        go.type = 'button';
        dismiss.type = 'button';
        dismiss.setAttribute('aria-label', 'Dismiss resume prompt');

        resumeToast.append(message, go, dismiss);
        body.appendChild(resumeToast);

        function hideResume() {
          resumeToast.hidden = true;
        }

        go.addEventListener('click', function () {
          window.scrollTo({
            top: y,
            behavior: reduce ? 'auto' : 'smooth'
          });

          hideResume();
        });

        dismiss.addEventListener('click', hideResume);

        setTimeout(hideResume, 9000);
      }
    } catch (e) {}

    /* ------------------------------------------------------
       Text to speech
       ------------------------------------------------------ */

    function textOf(element) {
      var clone = element.cloneNode(true);

      clone.querySelectorAll(
        'summary,button,textarea,input,select,.rd-ui'
      ).forEach(function (node) {
        node.remove();
      });

      clone.querySelectorAll('details').forEach(function (node) {
        if (!node.open) node.remove();
      });

      return clone.textContent
        .replace(/\u2192/g, ' should be: ')
        .replace(/_{2,}/g, ' blank ')
        .replace(/\u00b7/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function speechLabel() {
      if (!listenBtn) return;

      listenBtn.textContent = !speaking
        ? '▶ Listen'
        : paused
          ? '▶ Resume'
          : 'Ⅱ Pause';
    }

    function markSpeech(element) {
      if (marked) marked.classList.remove('rd-speak');

      marked = element;

      if (marked) marked.classList.add('rd-speak');
    }

    function speak(index) {
      if (!canSpeak) return;

      window.speechSynthesis.cancel();

      if (index < 0 || index >= blocks.length) {
        stopSpeech();
        return;
      }

      idx = index;
      speaking = true;
      paused = false;

      speechLabel();

      var block = blocks[index];
      var text = textOf(block);

      if (!text) {
        speak(index + 1);
        return;
      }

      markSpeech(block);

      var rect = block.getBoundingClientRect();

      if (rect.top < 70 || rect.bottom > window.innerHeight - 70) {
        block.scrollIntoView({
          block: 'center',
          behavior: reduce ? 'auto' : 'smooth'
        });
      }

      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = Number(S.rate) || 1;

      var voices = window.speechSynthesis.getVoices();
      var voice = null;

      for (var i = 0; i < voices.length; i++) {
        if (/^en[-_](GB|US|AU|IN)/i.test(voices[i].lang)) {
          voice = voices[i];
          break;
        }
      }

      if (voice) utterance.voice = voice;

      function done() {
        if (speaking && !paused && idx === index) {
          speak(index + 1);
        }
      }

      utterance.onend = done;

      utterance.onerror = function (event) {
        if (/cancel|interrupt/i.test(event.error || '')) return;
        done();
      };

      window.speechSynthesis.speak(utterance);
    }

    function firstVisible() {
      for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].getBoundingClientRect().bottom > 60) {
          return i;
        }
      }

      return 0;
    }

    function toggleListen() {
      if (!speaking) {
        speak(firstVisible());
      } else if (!paused) {
        paused = true;
        window.speechSynthesis.cancel();
        speechLabel();
      } else {
        speak(idx);
      }
    }

    function stopSpeech() {
      speaking = false;
      paused = false;

      if (canSpeak) window.speechSynthesis.cancel();

      markSpeech(null);
      speechLabel();
    }

    window.addEventListener('pagehide', function () {
      if (canSpeak) window.speechSynthesis.cancel();
    });

    main.addEventListener('dblclick', function (event) {
      if (!canSpeak) return;

      var block = event.target.closest &&
        event.target.closest('.rd-b');

      if (!block) return;

      var index = blocks.indexOf(block);

      if (index < 0) return;

      var selection = window.getSelection();

      if (selection) selection.removeAllRanges();

      speak(index);
    });

    /* ------------------------------------------------------
       Highlights and notes
       ------------------------------------------------------ */

    function loadPageData() {
      try {
        var data = JSON.parse(localStorage.getItem(pkey) || 'null');

        if (data && Array.isArray(data.items)) {
          data.note = typeof data.note === 'string' ? data.note : '';
          return data;
        }
      } catch (e) {}

      return {
        t: document.title.replace(/\s*\|.*$/, ''),
        items: [],
        note: ''
      };
    }

    P = loadPageData();

    function savePageData() {
      P.u = Date.now();

      try {
        if (!P.items.length && !P.note.trim()) {
          localStorage.removeItem(pkey);
        } else {
          localStorage.setItem(pkey, JSON.stringify(P));
        }

        return true;
      } catch (e) {
        toast('Could not save. Browser storage may be full or blocked.');
        return false;
      }
    }

    function makeId() {
      return 'hl-' + Date.now().toString(36) +
        '-' + Math.random().toString(36).slice(2, 7);
    }

    function getItem(id) {
      for (var i = 0; i < P.items.length; i++) {
        if (P.items[i].id === id) return P.items[i];
      }

      return null;
    }

    function textNodes() {
      var nodes = [];

      var walker = document.createTreeWalker(
        main,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            var parent = node.parentElement;

            if (!parent || !node.data.length) {
              return NodeFilter.FILTER_REJECT;
            }

            if (
              parent.closest(
                '.rd-ui,.rd-meta,.nav,script,style,' +
                'textarea,input,button,select'
              )
            ) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      while (walker.nextNode()) nodes.push(walker.currentNode);

      return nodes;
    }

    function getOffsets(range) {
      var nodes = textNodes();
      var total = 0;
      var start = -1;
      var end = -1;

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var length = node.data.length;

        if (node === range.startContainer) {
          start = total + range.startOffset;
        }

        if (node === range.endContainer) {
          end = total + range.endOffset;
        }

        total += length;
      }

      if (start < 0 || end <= start) return null;

      return { start: start, end: end };
    }

    function createRange(start, end) {
      var nodes = textNodes();
      var total = 0;
      var startNode = null;
      var endNode = null;
      var startOffset = 0;
      var endOffset = 0;

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var next = total + node.data.length;

        if (!startNode && start >= total && start < next) {
          startNode = node;
          startOffset = start - total;
        }

        if (end > total && end <= next) {
          endNode = node;
          endOffset = end - total;
          break;
        }

        total = next;
      }

      if (!startNode || !endNode) return null;

      var range = document.createRange();

      try {
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        return range;
      } catch (e) {
        return null;
      }
    }

    function getHighlightMarks(id) {
      return Array.prototype.slice.call(
        main.querySelectorAll('mark.rd-hl')
      ).filter(function (mark) {
        return mark.dataset.id === id;
      });
    }

    function paintHighlight(item) {
      if (
        !item ||
        !Number.isInteger(item.start) ||
        !Number.isInteger(item.end) ||
        item.end <= item.start
      ) {
        return false;
      }

      var range = createRange(item.start, item.end);

      if (!range || range.collapsed) return false;

      var mark = document.createElement('mark');
      mark.className = 'rd-hl';
      mark.dataset.id = item.id;
      mark.style.backgroundColor = item.color || '#f8df8b';
      mark.style.color = 'inherit';

      try {
        range.surroundContents(mark);
        return true;
      } catch (e) {
        return false;
      }
    }

    function unwrapHighlight(id) {
      getHighlightMarks(id).forEach(function (mark) {
        var parent = mark.parentNode;

        if (!parent) return;

        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }

        parent.removeChild(mark);
        parent.normalize();
      });
    }

    function restoreHighlights() {
      /*
       * Saved ranges use character offsets in the lesson text.
       * Restore earlier highlights first.
       */
      P.items.sort(function (a, b) {
        return a.start - b.start;
      });

      P.items.forEach(function (item) {
        if (!getHighlightMarks(item.id).length) {
          paintHighlight(item);
        }
      });
    }

    function selectionIsInLesson(range) {
      var start = range.startContainer.nodeType === 1
        ? range.startContainer
        : range.startContainer.parentElement;

      var end = range.endContainer.nodeType === 1
        ? range.endContainer
        : range.endContainer.parentElement;

      return !!(
        start && end &&
        main.contains(start) &&
        main.contains(end) &&
        !start.closest('.rd-ui,.rd-meta,.nav') &&
        !end.closest('.rd-ui,.rd-meta,.nav')
      );
    }

    function addHighlight(color) {
      var selection = window.getSelection();

      if (!selection || !selection.rangeCount || selection.isCollapsed) {
        toast('Select the text you want to highlight first.');
        return;
      }

      var range = selection.getRangeAt(0);

      if (!selectionIsInLesson(range)) {
        toast('Select text inside the lesson.');
        return;
      }

      var selectedText = range.toString();

      if (!selectedText.trim()) {
        toast('Select some meaningful text first.');
        return;
      }

      var offsets = getOffsets(range);

      if (!offsets) {
        toast('This selection could not be saved.');
        return;
      }

      var item = {
        id: makeId(),
        start: offsets.start,
        end: offsets.end,
        text: selectedText,
        color: color
      };

      var mark = document.createElement('mark');
      mark.className = 'rd-hl';
      mark.dataset.id = item.id;
      mark.style.backgroundColor = color;
      mark.style.color = 'inherit';

      try {
        range.surroundContents(mark);
      } catch (e) {
        toast('Select text within one paragraph at a time.');
        return;
      }

      P.items.push(item);

      if (!savePageData()) {
        P.items.pop();
        unwrapHighlight(item.id);
        return;
      }

      selection.removeAllRanges();
      renderHighlights();
      toast('Highlight saved.');
    }

    function removeHighlight(id) {
      unwrapHighlight(id);

      P.items = P.items.filter(function (item) {
        return item.id !== id;
      });

      savePageData();
      renderHighlights();
      toast('Highlight removed.');
    }

    function renderHighlights() {
      var list = document.getElementById('rd-saved-items');

      if (!list) return;

      list.replaceChildren();

      if (!P.items.length) {
        list.appendChild(
          make('p', 'rd-note', 'Your saved highlights will appear here.')
        );
      }

      P.items.forEach(function (item) {
        var row = make('div', 'rd-saved-item');
        var preview = make(
          'p',
          'rd-saved-text',
          item.text || 'Saved highlight'
        );

        preview.style.borderLeft = '4px solid ' + item.color;
        preview.style.paddingLeft = '8px';

        var go = make('button', '', 'Go to text');
        go.type = 'button';

        go.addEventListener('click', function () {
          var marks = getHighlightMarks(item.id);

          if (marks.length) {
            marks[0].scrollIntoView({
              behavior: reduce ? 'auto' : 'smooth',
              block: 'center'
            });
          } else {
            toast('The saved text could not be located.');
          }
        });

        var remove = make('button', '', 'Remove');
        remove.type = 'button';

        remove.addEventListener('click', function () {
          removeHighlight(item.id);
        });

        row.append(preview, go, remove);
        list.appendChild(row);
      });
    }

    function buildStudyTools() {
      var section = make('section', 'rd-study-tools');
      section.id = 'rd-study-tools';

      section.appendChild(make('h3', '', 'Highlight text'));

      section.appendChild(make(
        'p',
        'rd-note',
        'Select text in the lesson, then choose a colour below.'
      ));

      var colors = [
        { value: '#f8df8b', label: 'Yellow' },
        { value: '#b9e4d0', label: 'Mint' },
        { value: '#c9d9ff', label: 'Blue' },
        { value: '#efc7dc', label: 'Pink' }
      ];

      var colorRow = make('div', 'rd-seg');

      colors.forEach(function (color) {
        var button = make('button', '', color.label);
        button.type = 'button';

        button.addEventListener('click', function () {
          addHighlight(color.value);
        });

        colorRow.appendChild(button);
      });

      section.appendChild(colorRow);
      section.appendChild(make('h3', '', 'Saved highlights'));

      var list = make('div', '');
      list.id = 'rd-saved-items';
      section.appendChild(list);

      section.appendChild(make('h3', '', 'Personal notes'));

      noteArea = document.createElement('textarea');
      noteArea.id = 'rd-personal-note';
      noteArea.rows = 5;
      noteArea.value = P.note;
      noteArea.placeholder = 'Write your lesson notes here...';
      noteArea.setAttribute('aria-label', 'Personal reading notes');

      section.appendChild(noteArea);

      var saveNote = make('button', '', 'Save notes');
      saveNote.type = 'button';

      saveNote.addEventListener('click', function () {
        var previous = P.note;
        P.note = noteArea.value;

        if (savePageData()) {
          toast('Your notes have been saved.');
        } else {
          P.note = previous;
        }
      });

      section.appendChild(saveNote);

      var clearNote = make('button', '', 'Clear notes');
      clearNote.type = 'button';
      clearNote.style.marginLeft = '6px';

      clearNote.addEventListener('click', function () {
        if (!noteArea.value.trim()) return;

        if (!window.confirm('Clear your personal notes?')) return;

        var previous = P.note;
        P.note = '';
        noteArea.value = '';

        if (savePageData()) {
          toast('Your notes have been cleared.');
        } else {
          P.note = previous;
          noteArea.value = previous;
        }
      });

      section.appendChild(clearNote);

      panel.appendChild(section);

      renderHighlights();
    }

    /*
     * Restore saved highlights before building the controls.
     */
    restoreHighlights();
    buildStudyTools();

    /* ------------------------------------------------------
       Finish initialisation
       ------------------------------------------------------ */

    apply();
    onScroll();
  }
})();
