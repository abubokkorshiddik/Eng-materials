
/* ==========================================================
   IELTS Grammar Lab | Complete reading tools
   File: reader.js

   Features:
   1. Reading settings and themes
   2. Separate floating settings, highlight and notes icons
   3. Dedicated highlight and notes panels
   4. Text size, fonts, spacing and content width
   5. Focus mode and reading progress
   6. Resume reading position
   7. Text to speech with speed controls
   8. Section navigation and answer controls
   9. Persistent highlights and personal notes
   10. Responsive layout and accessibility

   Self-contained. Works on pages containing <main>.
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

    if (document.getElementById('rd-fab')) return;

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
    var highlightPanel;
    var notesPanel;
    var fab;
    var highlightFab;
    var notesFab;
    var topBtn;
    var prog;
    var listenBtn;
    var noteArea;
    var P;

    var pkey = 'rd-hl:' + location.pathname;

    var canSpeak =
      'speechSynthesis' in window &&
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
        font: 500 14px/1.5 Inter, system-ui, sans-serif;
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
        padding: 8px 11px;
        min-height: 38px;
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
      .rd-tool-fab,
      .rd-top {
        position: fixed;
        width: 48px;
        height: 48px;
        border-radius: 50% !important;
        padding: 0 !important;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700 !important;
        background: #ffffff !important;
        color: #1f2a44 !important;
        border: 2px solid #1f2a44 !important;
        box-shadow: 0 3px 12px rgba(15, 23, 42, .18);
        z-index: 10000;
      }

      .rd-fab {
        right: 16px;
        bottom: 16px;
        font-size: 17px !important;
      }

      .rd-tool-fab {
        right: 16px;
        font-size: 21px !important;
      }

      #rd-highlight-fab {
        bottom: 76px;
      }

      #rd-notes-fab {
        bottom: 136px;
      }

      .rd-top {
        left: 16px;
        bottom: 16px;
        font-size: 22px !important;
      }

      .rd-fab:hover,
      .rd-tool-fab:hover,
      .rd-top:hover {
        background: #eef2f8 !important;
      }

      .rd-panel {
        position: fixed;
        right: 16px;
        bottom: 76px;
        width: min(390px, calc(100vw - 32px));
        max-height: 78vh;
        overflow: auto;
        box-sizing: border-box;
        background: var(--rd-bg);
        color: var(--rd-fg);
        border: 1px solid var(--rd-line);
        border-radius: 14px;
        padding: 16px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, .25);
        z-index: 10001;
        overscroll-behavior: contain;
      }

      .rd-panel[hidden],
      .rd-top[hidden],
      .rd-toast[hidden] {
        display: none !important;
      }

      .rd-panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 0 0 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--rd-line);
      }

      .rd-panel-head h2 {
        font-size: 17px;
        line-height: 1.4;
        margin: 0;
        color: var(--rd-fg);
      }

      .rd-close {
        flex-shrink: 0;
        width: 36px;
        min-height: 36px !important;
        padding: 0 !important;
        font-size: 21px !important;
      }

      .rd-row {
        margin: 0 0 16px;
      }

      .rd-lab {
        display: block;
        font-size: 12px;
        font-weight: 700;
        opacity: .78;
        margin: 0 0 7px;
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
        gap: 3px;
      }

      .rd-jump a {
        color: var(--rd-fg) !important;
        text-decoration: none;
        padding: 8px;
        border-radius: 6px;
        font-size: 14px;
        overflow-wrap: anywhere;
      }

      .rd-jump a:hover {
        background: var(--rd-line);
      }

      .rd-note {
        font-size: 12px;
        opacity: .78;
        margin: 7px 0 12px;
      }

      .rd-prog {
        position: fixed;
        left: 0;
        top: 0;
        height: 4px;
        width: 0;
        background: #1f2a44;
        z-index: 10002;
        pointer-events: none;
      }

      .rd-toast {
        position: fixed;
        left: 50%;
        bottom: 76px;
        transform: translateX(-50%);
        background: var(--rd-bg, #ffffff);
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

      html.rd-dark button:not(.rd-fab):not(.rd-tool-fab):not(.rd-top),
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

      html.rd-dark .rd-fab,
      html.rd-dark .rd-tool-fab,
      html.rd-dark .rd-top {
        background: #23262d !important;
        color: #eceae4 !important;
        border-color: #cdd6ff !important;
      }

      html.rd-sepia .rd-fab,
      html.rd-sepia .rd-tool-fab,
      html.rd-sepia .rd-top {
        background: #fbf4e4 !important;
        color: #3a3125 !important;
        border-color: #5b4636 !important;
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
        padding: 10px;
        margin: 8px 0;
      }

      .rd-saved-text {
        font-size: 13px;
        overflow-wrap: anywhere;
        margin: 0 0 10px;
        line-height: 1.6;
      }

      .rd-saved-item button {
        margin: 0 5px 4px 0;
      }

      .rd-hl {
        border-radius: 2px;
        padding: 0 1px;
        color: inherit;
      }

      .rd-color-btn {
        min-width: 70px;
      }

      .rd-color-dot {
        display: inline-block;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        margin-right: 5px;
        border: 1px solid rgba(0, 0, 0, .18);
      }

      .rd-primary {
        background: #1f2a44 !important;
        color: #ffffff !important;
        border-color: #1f2a44 !important;
      }

      .rd-danger {
        color: #a22c2c !important;
      }

      @media (max-width: 620px) {
        .rd-panel {
          left: 8px;
          right: 8px;
          width: auto;
          bottom: 70px;
          max-height: 76vh;
          padding: 14px;
        }

        .rd-fab {
          right: 12px;
          bottom: 12px;
          width: 44px;
          height: 44px;
        }

        .rd-tool-fab {
          right: 12px;
          width: 44px;
          height: 44px;
        }

        #rd-highlight-fab {
          bottom: 66px;
        }

        #rd-notes-fab {
          bottom: 120px;
        }

        .rd-top {
          left: 12px;
          bottom: 12px;
          width: 44px;
          height: 44px;
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

    if (!document.getElementById('rd-reader-styles')) {
      var st = document.createElement('style');
      st.id = 'rd-reader-styles';
      st.textContent = css;
      document.head.appendChild(st);
    }

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

      if (qf && qf.contains(el)) return false;

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

    function make(tag, cls, value) {
      var node = document.createElement(tag);

      if (cls) node.className = cls;
      if (value != null) node.textContent = value;

      return node;
    }

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

    function closeAllPanels(returnFocus) {
      panel.hidden = true;
      highlightPanel.hidden = true;
      notesPanel.hidden = true;

      fab.setAttribute('aria-expanded', 'false');
      highlightFab.setAttribute('aria-expanded', 'false');
      notesFab.setAttribute('aria-expanded', 'false');

      if (returnFocus && returnFocus.focus) returnFocus.focus();
    }

    function openPanel(which) {
      closeAllPanels(false);

      if (which === 'settings') {
        panel.hidden = false;
        fab.setAttribute('aria-expanded', 'true');
        var first = panel.querySelector('button');
        if (first) first.focus();
      }

      if (which === 'highlights') {
        highlightPanel.hidden = false;
        highlightFab.setAttribute('aria-expanded', 'true');
        var hButton = highlightPanel.querySelector('button');
        if (hButton) hButton.focus();
      }

      if (which === 'notes') {
        notesPanel.hidden = false;
        notesFab.setAttribute('aria-expanded', 'true');
        noteArea.focus();
      }
    }

    /* ------------------------------------------------------
       Main interface and dedicated panels
       ------------------------------------------------------ */

    ui = document.createElement('div');
    ui.className = 'rd-ui';

    ui.innerHTML =
      '<button type="button" class="rd-top" id="rd-top"' +
        ' aria-label="Back to top" hidden>↑</button>' +

      '<button type="button" class="rd-tool-fab" id="rd-notes-fab"' +
        ' aria-label="Open personal notes" title="Personal notes"' +
        ' aria-expanded="false" aria-controls="rd-notes-panel">' +
        '📝</button>' +

      '<button type="button" class="rd-tool-fab" id="rd-highlight-fab"' +
        ' aria-label="Open highlights" title="Highlight text"' +
        ' aria-expanded="false" aria-controls="rd-highlight-panel">' +
        '🖍️</button>' +

      '<button type="button" class="rd-fab" id="rd-fab"' +
        ' aria-label="Reading settings" title="Reading settings"' +
        ' aria-expanded="false" aria-controls="rd-panel">Aa</button>' +

      '<div class="rd-panel" id="rd-panel" role="dialog"' +
        ' aria-label="Reading settings" hidden>' +

        '<div class="rd-panel-head">' +
          '<h2>Reading settings</h2>' +
          '<button type="button" class="rd-close" data-close' +
            ' aria-label="Close settings">×</button>' +
        '</div>' +

        '<div class="rd-row">' +
          '<span class="rd-lab">Text size</span>' +
          '<div class="rd-seg">' +
            '<button type="button" data-act="smaller"' +
              ' aria-label="Smaller text">A−</button>' +
            '<button type="button" data-act="bigger"' +
              ' aria-label="Larger text">A+</button>' +
            '<button type="button" data-act="reset">Reset settings</button>' +
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
              'Double-click a paragraph to listen from that point.' +
            '</p>' +
          '</div>' : '') +

        (h2s.length > 2 ?
          '<div class="rd-row">' +
            '<span class="rd-lab">Jump to a section</span>' +
            '<nav class="rd-jump" aria-label="Lesson sections">' +
              h2s.map(function (h) {
                return '<a href="#' + escapeHTML(h.id) + '">' +
                  escapeHTML(h.textContent) + '</a>';
              }).join('') +
            '</nav>' +
          '</div>' : '') +

      '</div>' +

      '<div class="rd-panel" id="rd-highlight-panel"' +
        ' role="dialog" aria-label="Text highlights" hidden>' +
        '<div class="rd-panel-head">' +
          '<h2>🖍️ Text highlights</h2>' +
          '<button type="button" class="rd-close" data-close' +
            ' aria-label="Close highlights">×</button>' +
        '</div>' +
        '<div id="rd-highlight-tools"></div>' +
      '</div>' +

      '<div class="rd-panel" id="rd-notes-panel"' +
        ' role="dialog" aria-label="Personal notes" hidden>' +
        '<div class="rd-panel-head">' +
          '<h2>📝 Personal notes</h2>' +
          '<button type="button" class="rd-close" data-close' +
            ' aria-label="Close notes">×</button>' +
        '</div>' +
        '<div id="rd-notes-tools"></div>' +
      '</div>';

    body.appendChild(ui);

    prog = document.createElement('div');
    prog.className = 'rd-prog';
    prog.setAttribute('aria-hidden', 'true');
    body.appendChild(prog);

    fab = document.getElementById('rd-fab');
    highlightFab = document.getElementById('rd-highlight-fab');
    notesFab = document.getElementById('rd-notes-fab');
    panel = document.getElementById('rd-panel');
    highlightPanel = document.getElementById('rd-highlight-panel');
    notesPanel = document.getElementById('rd-notes-panel');
    topBtn = document.getElementById('rd-top');
    listenBtn = document.getElementById('rd-listen');

    /* ------------------------------------------------------
       Settings
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

      if (!(S.font in fonts)) S.font = DEF.font;
      if (!(S.lh in lineHeights)) S.lh = DEF.lh;
      if (!(S.w in widths)) S.w = DEF.w;

      if (!['light', 'sepia', 'dark'].includes(S.theme)) {
        S.theme = DEF.theme;
      }

      if (![0.8, 1, 1.25].includes(Number(S.rate))) {
        S.rate = DEF.rate;
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

      ui.querySelectorAll('button[data-k]').forEach(function (button) {
        button.setAttribute(
          'aria-pressed',
          String(S[button.dataset.k]) === button.dataset.v
            ? 'true'
            : 'false'
        );
      });

      var focusButton = ui.querySelector('[data-act="focus"]');

      if (focusButton) {
        focusButton.setAttribute(
          'aria-pressed',
          S.focus ? 'true' : 'false'
        );
      }

      updateFocus();
    }

    fab.addEventListener('click', function () {
      openPanel(panel.hidden ? 'settings' : '');
    });

    highlightFab.addEventListener('click', function () {
      openPanel(highlightPanel.hidden ? 'highlights' : '');
    });

    notesFab.addEventListener('click', function () {
      openPanel(notesPanel.hidden ? 'notes' : '');
    });

    ui.addEventListener('click', function (event) {
      var closeButton = event.target.closest('[data-close]');

      if (closeButton) {
        closeAllPanels(false);
        return;
      }

      var anchor = event.target.closest('.rd-jump a');

      if (anchor) {
        closeAllPanels(false);
        return;
      }

      var button = event.target.closest('#rd-panel button');

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

        default:
          return;
      }

      saveSettings();
      apply();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (
          !panel.hidden ||
          !highlightPanel.hidden ||
          !notesPanel.hidden
        ) {
          closeAllPanels(false);
        }
      }
    });

    document.addEventListener('click', function (event) {
      if (
        !panel.hidden ||
        !highlightPanel.hidden ||
        !notesPanel.hidden
      ) {
        if (!ui.contains(event.target)) {
          closeAllPanels(false);
        }
      }
    });

    topBtn.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: reduce ? 'auto' : 'smooth'
      });
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
       Highlights and notes storage
       ------------------------------------------------------ */

    function loadPageData() {
      try {
        var data = JSON.parse(localStorage.getItem(pkey) || 'null');

        if (data && Array.isArray(data.items)) {
          data.items = data.items.filter(function (item) {
            return item &&
              typeof item.id === 'string' &&
              Number.isInteger(item.start) &&
              Number.isInteger(item.end) &&
              item.end > item.start;
          });

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

      while (walker.nextNode()) {
        nodes.push(walker.currentNode);
      }

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
        return;
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

            closeAllPanels(false);
          } else {
            toast('The saved text could not be located.');
          }
        });

        var remove = make('button', 'rd-danger', 'Remove');
        remove.type = 'button';

        remove.addEventListener('click', function () {
          removeHighlight(item.id);
        });

        row.append(preview, go, remove);
        list.appendChild(row);
      });
    }

    /* ------------------------------------------------------
       Dedicated highlight tools
       ------------------------------------------------------ */

    function buildHighlightTools() {
      var section = document.getElementById('rd-highlight-tools');

      section.replaceChildren();

      section.appendChild(make(
        'p',
        'rd-note',
        'Select text in the lesson first. Then choose a colour to save your highlight.'
      ));

      var colors = [
        { value: '#f8df8b', label: 'Yellow' },
        { value: '#b9e4d0', label: 'Mint' },
        { value: '#c9d9ff', label: 'Blue' },
        { value: '#efc7dc', label: 'Pink' }
      ];

      var colorRow = make('div', 'rd-seg');

      colors.forEach(function (color) {
        var button = make('button', 'rd-color-btn');
        button.type = 'button';

        var dot = make('span', 'rd-color-dot');
        dot.style.backgroundColor = color.value;

        button.append(dot, document.createTextNode(color.label));

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

      renderHighlights();
    }

    /* ------------------------------------------------------
       Dedicated notes tools
       ------------------------------------------------------ */

    function buildNotesTools() {
      var section = document.getElementById('rd-notes-tools');

      section.replaceChildren();

      section.appendChild(make(
        'p',
        'rd-note',
        'Write down grammar rules, new vocabulary, examples or questions from this lesson. Your notes are saved in this browser.'
      ));

      noteArea = document.createElement('textarea');
      noteArea.id = 'rd-personal-note';
      noteArea.rows = 9;
      noteArea.value = P.note;
      noteArea.placeholder = 'Write your lesson notes here...';
      noteArea.setAttribute('aria-label', 'Personal reading notes');

      section.appendChild(noteArea);

      var buttons = make('div', 'rd-seg');
      buttons.style.marginTop = '10px';

      var saveNote = make('button', 'rd-primary', 'Save notes');
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

      var clearNote = make('button', 'rd-danger', 'Clear notes');
      clearNote.type = 'button';

      clearNote.addEventListener('click', function () {
        if (!noteArea.value.trim()) {
          toast('There are no notes to clear.');
          return;
        }

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

      buttons.append(saveNote, clearNote);
      section.appendChild(buttons);

      var status = make(
        'p',
        'rd-note',
        'Notes are stored locally on this device. They are not synced to other devices.'
      );

      section.appendChild(status);
    }

    /* ------------------------------------------------------
       Finish initialisation
       ------------------------------------------------------ */

    restoreHighlights();
    buildHighlightTools();
    buildNotesTools();

    apply();
    onScroll();
  }
})();
