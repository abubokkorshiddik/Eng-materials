/* IELTS Grammar Lab - reading tools. Self-contained: works on every page, old or new. */
(function () {
  'use strict';
  var KEY = 'ielts-gl-reader';
  var DEF = { fs: 0, font: 'serif', lh: 'normal', w: 'normal', theme: 'light', focus: false, rate: 1 };
  var S = load();
  var root = document.documentElement;

  function load() {
    var o = {};
    try { o = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    for (var k in DEF) if (!(k in o)) o[k] = DEF[k];
    return o;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function theme() {
    root.classList.remove('rd-sepia', 'rd-dark');
    if (S.theme !== 'light') root.classList.add('rd-' + S.theme);
  }
  theme(); // apply early so the page does not flash

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  function init() {
    var body = document.body, main = document.querySelector('main');
    if (!main || document.getElementById('rd-fab')) return;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var base = parseFloat(getComputedStyle(body).fontSize) || 18;
    var qf = document.getElementById('qf');

    /* ---------- styles ---------- */
    var css = '' +
    '.rd-ui{--rd-bg:#fff;--rd-fg:#222;--rd-line:rgba(0,0,0,.18);--rd-ac:#1f2a44;font:500 14px/1.4 Inter,system-ui,sans-serif;color:var(--rd-fg)}' +
    'html.rd-sepia .rd-ui{--rd-bg:#fbf4e4;--rd-fg:#3a3125;--rd-line:rgba(58,49,37,.25);--rd-ac:#5b4636}' +
    'html.rd-dark .rd-ui{--rd-bg:#23262d;--rd-fg:#eceae4;--rd-line:rgba(255,255,255,.25);--rd-ac:#cdd6ff}' +
    '.rd-ui button{font:inherit;cursor:pointer;border-radius:8px;border:1px solid var(--rd-line);background:transparent;color:var(--rd-fg);padding:7px 11px;min-height:36px}' +
    '.rd-ui button[aria-pressed=true]{background:var(--rd-ac);color:var(--rd-bg);border-color:var(--rd-ac)}' +
    '.rd-fab,.rd-top{position:fixed;bottom:16px;width:48px;height:48px;border-radius:50%!important;padding:0!important;font-weight:700!important;background:var(--rd-bg)!important;border:2px solid var(--rd-ac)!important;color:var(--rd-ac)!important;box-shadow:0 2px 10px rgba(0,0,0,.2);z-index:60}' +
    '.rd-fab{right:16px;font-size:17px!important}.rd-top{left:16px;font-size:20px!important}' +
    '.rd-panel{position:fixed;right:16px;bottom:74px;width:min(370px,calc(100vw - 32px));max-height:72vh;overflow:auto;background:var(--rd-bg);border:1px solid var(--rd-line);border-radius:14px;padding:14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.28);z-index:61}' +
    '.rd-panel[hidden],.rd-top[hidden],.rd-toast[hidden]{display:none}' +
    '.rd-row{margin:0 0 12px}.rd-lab{display:block;font-size:12px;font-weight:600;opacity:.75;margin:0 0 5px}' +
    '.rd-seg{display:flex;gap:6px;flex-wrap:wrap}.rd-seg button{flex:1 1 auto}' +
    '.rd-jump{display:flex;flex-direction:column;gap:2px;margin:0}.rd-jump a{color:var(--rd-fg)!important;text-decoration:none;padding:6px 8px;border-radius:6px;font-size:14px}.rd-jump a:hover{background:var(--rd-line)}' +
    '.rd-note{font-size:12px;opacity:.7;margin:6px 0 0}' +
    '.rd-prog{position:fixed;left:0;top:0;height:4px;width:0;background:var(--a,#1f2a44);z-index:70}' +
    '.rd-toast{position:fixed;left:50%;bottom:76px;transform:translateX(-50%);background:var(--rd-bg);border:1px solid var(--rd-line);border-radius:12px;padding:10px 14px;display:flex;gap:8px;align-items:center;z-index:62;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:calc(100vw - 24px)}' +
    '.rd-meta{font:600 .85rem Inter,system-ui,sans-serif;opacity:.7;margin:-10px 0 20px}' +
    '.rd-speak{background:rgba(255,213,79,.35)!important;border-radius:4px;box-shadow:0 0 0 4px rgba(255,213,79,.35)}' +
    '.rd-ui :focus-visible,.rd-jump a:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}' +
    'html.rd-focus .rd-b{opacity:.28;transition:opacity .25s}html.rd-focus .rd-b.rd-cur,html.rd-focus .rd-b.rd-speak{opacity:1}' +
    /* sepia */
    'html.rd-sepia{--bg:#f3ead7;--paper:#f3ead7}html.rd-sepia body{color:#3a3125!important}' +
    /* dark */
    'html.rd-dark{--bg:#16181d;--paper:#16181d;--l:rgba(255,255,255,.16);color-scheme:dark}' +
    'html.rd-dark body{background:#16181d!important;color:#e8e6e1!important}' +
    'html.rd-dark h1,html.rd-dark h2,html.rd-dark h3{color:color-mix(in srgb,var(--d,var(--ink,#fff)) 25%,#fff)!important}' +
    'html.rd-dark a,html.rd-dark .lvl,html.rd-dark summary,html.rd-dark .form b{color:color-mix(in srgb,var(--a,var(--blue,#9ab)) 50%,#fff)!important}' +
    'html.rd-dark .top a,html.rd-dark .way{color:#ddd!important}' +
    'html.rd-dark .sub,html.rd-dark .why,html.rd-dark .small,html.rd-dark .way p,html.rd-dark .path span,html.rd-dark .foot,html.rd-dark .tl{color:#b9b6ae!important}' +
    'html.rd-dark del{color:#ff8a80}html.rd-dark ins{color:#7ee2a0}' +
    'html.rd-dark .pair,html.rd-dark .q,html.rd-dark .way{border-color:rgba(255,255,255,.18)!important}' +
    'html.rd-dark .q label{border-color:rgba(255,255,255,.28)!important}' +
    'html.rd-dark button:not(.rd-fab):not(.rd-top),html.rd-dark .btn{border:1px solid rgba(255,255,255,.35)}' +
    'html.rd-dark .btn.g,html.rd-dark button.g,html.rd-dark .btn.alt{color:#e8e6e1!important}' +
    'html.rd-dark .ok{color:#7ee2a0}html.rd-dark .no{color:#ff8a80}' +
    '@media(max-width:620px){.rd-panel{left:8px;right:8px;width:auto;bottom:72px}}' +
    '@media(prefers-reduced-motion:reduce){html.rd-focus .rd-b{transition:none}}' +
    '@media print{.rd-ui,.rd-prog{display:none!important}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    /* ---------- sections, reading time ---------- */
    var h2s = [].slice.call(main.querySelectorAll('h2'));
    h2s.forEach(function (h, i) { if (!h.id) h.id = 'rd-s' + (i + 1); });
    var sub = main.querySelector('.sub');
    if (sub) {
      var words = (main.innerText || main.textContent || '').trim().split(/\s+/).length;
      var m = document.createElement('p'); m.className = 'rd-meta';
      var n = Math.max(1, Math.round(words / 180)); m.textContent = 'About ' + n + (n === 1 ? ' minute' : ' minutes') + ' to read, plus practice';
      sub.insertAdjacentElement('afterend', m);
    }

    /* ---------- blocks (used by Listen and Focus) ---------- */
    var blocks = [].slice.call(main.querySelectorAll(
      'main > p,main > h2,main > h3,main > ul > li,main > ol > li,main .form p,main .pair,main .two li,main .two h3,main .say'))
      .filter(function (el) {
        if (el.closest('.rd-ui,.nav') || el.classList.contains('rd-meta')) return false;
        if (qf && (qf.contains(el) || (qf.compareDocumentPosition(el) & 4))) return false;
        if (el.matches('main .say') && el.parentElement !== main) return false;
        return true;
      });
    blocks = blocks.filter(function (el, i, a) { return a.indexOf(el) === i; });
    blocks.forEach(function (el) { el.classList.add('rd-b'); });

    /* ---------- UI ---------- */
    var hasDetails = main.querySelector('details');
    var canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    function seg(k, arr) {
      return '<div class="rd-seg">' + arr.map(function (a) {
        return '<button type="button" data-k="' + k + '" data-v="' + a[0] + '" aria-pressed="false">' + a[1] + '</button>';
      }).join('') + '</div>';
    }
    var ui = document.createElement('div'); ui.className = 'rd-ui';
    ui.innerHTML =
      '<button type="button" class="rd-top" id="rd-top" aria-label="Back to top" hidden>\u2191</button>' +
      '<button type="button" class="rd-fab" id="rd-fab" aria-label="Reading options" aria-expanded="false" aria-controls="rd-panel">Aa</button>' +
      '<div class="rd-panel" id="rd-panel" role="dialog" aria-label="Reading options" hidden>' +
        '<div class="rd-row"><span class="rd-lab">Text size</span><div class="rd-seg"><button type="button" data-act="smaller" aria-label="Smaller text">A\u2212</button><button type="button" data-act="bigger" aria-label="Larger text">A+</button><button type="button" data-act="reset">Reset all</button></div></div>' +
        '<div class="rd-row"><span class="rd-lab">Font</span>' + seg('font', [['serif', 'Serif'], ['sans', 'Sans'], ['easy', 'Easy-read']]) + '</div>' +
        '<div class="rd-row"><span class="rd-lab">Line spacing</span>' + seg('lh', [['tight', 'Tight'], ['normal', 'Normal'], ['roomy', 'Roomy']]) + '</div>' +
        '<div class="rd-row"><span class="rd-lab">Text width</span>' + seg('w', [['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide']]) + '</div>' +
        '<div class="rd-row"><span class="rd-lab">Colours</span>' + seg('theme', [['light', 'Light'], ['sepia', 'Sepia'], ['dark', 'Dark']]) + '</div>' +
        '<div class="rd-row"><span class="rd-lab">Focus</span><div class="rd-seg"><button type="button" data-act="focus" aria-pressed="false">Dim everything except where I am reading</button></div></div>' +
        (hasDetails ? '<div class="rd-row"><span class="rd-lab">Answers</span><div class="rd-seg"><button type="button" data-act="open">Open all</button><button type="button" data-act="close">Close all</button></div></div>' : '') +
        (canSpeak ? '<div class="rd-row"><span class="rd-lab">Listen</span><div class="rd-seg"><button type="button" data-act="listen" id="rd-listen">\u25B6 Listen</button><button type="button" data-act="stop">Stop</button></div>' +
          '<div class="rd-seg" style="margin-top:6px">' + seg('rate', [['0.8', 'Slow'], ['1', 'Normal'], ['1.25', 'Fast']]).replace('<div class="rd-seg">', '').replace(/<\/div>$/, '') + '</div>' +
          '<p class="rd-note">Starts from where you are on the page. Double-click any line to start from there.</p></div>' : '') +
        (h2s.length > 2 ? '<div class="rd-row"><span class="rd-lab">Jump to</span><nav class="rd-jump" aria-label="Sections">' + h2s.map(function (h) { return '<a href="#' + h.id + '">' + h.textContent + '</a>'; }).join('') + '</nav></div>' : '') +
      '</div>' +
      '<div class="rd-toast" id="rd-toast" hidden><span>Continue where you left off?</span><button type="button" id="rd-go">Continue</button><button type="button" id="rd-no" aria-label="Dismiss">\u2715</button></div>';
    body.appendChild(ui);
    var prog = document.createElement('div'); prog.className = 'rd-prog'; prog.setAttribute('aria-hidden', 'true'); body.appendChild(prog);
    var fab = document.getElementById('rd-fab'), panel = document.getElementById('rd-panel'), topBtn = document.getElementById('rd-top');

    /* ---------- apply settings ---------- */
    var fonts = { serif: null, sans: "Inter,system-ui,-apple-system,'Segoe UI',sans-serif", easy: "'Atkinson Hyperlegible',Inter,system-ui,sans-serif" };
    var lhs = { tight: '1.55', normal: null, roomy: '2.05' };
    var ws = { narrow: '560px', normal: null, wide: '880px' };
    var easyLoaded = false;
    function setP(el, p, v) { if (v) el.style.setProperty(p, v, 'important'); else el.style.removeProperty(p); }
    function apply() {
      S.fs = Math.max(-3, Math.min(6, S.fs));
      setP(body, 'font-size', S.fs ? (base + S.fs * 1.5) + 'px' : null);
      if (S.font === 'easy' && !easyLoaded) {
        easyLoaded = true;
        var l = document.createElement('link'); l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap';
        document.head.appendChild(l);
      }
      setP(body, 'font-family', fonts[S.font]);
      setP(body, 'line-height', lhs[S.lh]);
      setP(main, 'max-width', ws[S.w]);
      theme();
      root.classList.toggle('rd-focus', !!S.focus);
      [].forEach.call(ui.querySelectorAll('button[data-k]'), function (b) {
        b.setAttribute('aria-pressed', String(S[b.dataset.k]) === b.dataset.v ? 'true' : 'false');
      });
      var fb = ui.querySelector('[data-act=focus]'); if (fb) fb.setAttribute('aria-pressed', S.focus ? 'true' : 'false');
      updateFocus();
    }

    /* ---------- panel open/close ---------- */
    function openPanel(o) {
      panel.hidden = !o; fab.setAttribute('aria-expanded', o ? 'true' : 'false');
      if (o) { var f = panel.querySelector('button'); if (f) f.focus(); } else fab.focus();
    }
    fab.addEventListener('click', function () { openPanel(panel.hidden); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) openPanel(false); });
    document.addEventListener('click', function (e) { if (!panel.hidden && !ui.contains(e.target)) { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); } });
    topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
    panel.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (a) { openPanel(false); return; }
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.k) {
        var v = b.dataset.v; S[b.dataset.k] = (b.dataset.k === 'rate') ? parseFloat(v) : v;
        if (b.dataset.k === 'rate' && speaking && !paused) speak(idx);
        save(); apply(); return;
      }
      switch (b.dataset.act) {
        case 'smaller': S.fs--; break;
        case 'bigger': S.fs++; break;
        case 'reset': S = JSON.parse(JSON.stringify(DEF)); break;
        case 'focus': S.focus = !S.focus; break;
        case 'open': [].forEach.call(main.querySelectorAll('details'), function (d) { d.open = true; }); return;
        case 'close': [].forEach.call(main.querySelectorAll('details'), function (d) { d.open = false; }); return;
        case 'listen': toggleListen(); return;
        case 'stop': stopSpeech(); return;
      }
      save(); apply();
    });

    /* ---------- progress, back to top, focus, resume ---------- */
    var ticking = false, saveT, cur = null;
    function updateFocus() {
      if (!S.focus) { if (cur) cur.classList.remove('rd-cur'); cur = null; return; }
      var mid = window.innerHeight * 0.4, best = null, bd = 1e9;
      for (var i = 0; i < blocks.length; i++) {
        var r = blocks[i].getBoundingClientRect();
        if (r.bottom < -50 || r.top > window.innerHeight + 50) continue;
        var d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bd) { bd = d; best = blocks[i]; }
      }
      if (best !== cur) { if (cur) cur.classList.remove('rd-cur'); if (best) best.classList.add('rd-cur'); cur = best; }
    }
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var h = document.documentElement, max = h.scrollHeight - window.innerHeight;
        prog.style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%';
        topBtn.hidden = window.scrollY < 700;
        updateFocus();
      });
      clearTimeout(saveT);
      saveT = setTimeout(function () { try { localStorage.setItem('rd-pos:' + location.pathname, String(Math.round(window.scrollY))); } catch (e) {} }, 400);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    try {
      var y = parseInt(localStorage.getItem('rd-pos:' + location.pathname) || '0', 10);
      if (y > 900 && !location.hash && window.scrollY < 50) {
        var toast = document.getElementById('rd-toast'); toast.hidden = false;
        var hide = function () { toast.hidden = true; };
        document.getElementById('rd-go').onclick = function () { window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); hide(); };
        document.getElementById('rd-no').onclick = hide;
        setTimeout(hide, 9000);
      }
    } catch (e) {}

    /* ---------- listen (text to speech) ---------- */
    var speaking = false, paused = false, idx = -1, marked = null, listenBtn = document.getElementById('rd-listen');
    function textOf(el) {
      var c = el.cloneNode(true);
      [].forEach.call(c.querySelectorAll('summary'), function (n) { n.remove(); });
      [].forEach.call(c.querySelectorAll('details'), function (n) { if (!n.open) n.remove(); });
      return c.textContent.replace(/\u2192/g, ' should be: ').replace(/_{2,}/g, ' blank ').replace(/\u00b7/g, ', ').replace(/\s+/g, ' ').trim();
    }
    function label() { if (listenBtn) listenBtn.textContent = !speaking ? '\u25B6 Listen' : (paused ? '\u25B6 Resume' : '\u23F8 Pause'); }
    function mark(el) { if (marked) marked.classList.remove('rd-speak'); marked = el; if (el) el.classList.add('rd-speak'); }
    function speak(i) {
      if (!canSpeak) return;
      speechSynthesis.cancel();
      if (i < 0 || i >= blocks.length) { stopSpeech(); return; }
      idx = i; speaking = true; paused = false; label();
      var el = blocks[i], t = textOf(el);
      if (!t) { speak(i + 1); return; }
      mark(el);
      var r = el.getBoundingClientRect();
      if (r.top < 70 || r.bottom > window.innerHeight - 70) el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      var u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = S.rate || 1;
      var vs = speechSynthesis.getVoices(), v = null;
      for (var k = 0; k < vs.length; k++) if (/^en[-_](GB|US|AU|IN)/i.test(vs[k].lang)) { v = vs[k]; break; }
      if (v) u.voice = v;
      var done = function () { if (speaking && !paused && idx === i) speak(i + 1); };
      u.onend = done;
      u.onerror = function (e) { if (e.error && /cancel|interrupt/i.test(e.error)) return; done(); };
      speechSynthesis.speak(u);
    }
    function firstVisible() {
      for (var i = 0; i < blocks.length; i++) if (blocks[i].getBoundingClientRect().top > 60) return i;
      return 0;
    }
    function toggleListen() {
      if (!speaking) speak(firstVisible());
      else if (!paused) { paused = true; speechSynthesis.cancel(); label(); }
      else speak(idx);
    }
    function stopSpeech() { speaking = false; paused = false; if (canSpeak) speechSynthesis.cancel(); mark(null); label(); }
    window.addEventListener('pagehide', function () { if (canSpeak) speechSynthesis.cancel(); });
    main.addEventListener('dblclick', function (e) {
      if (!canSpeak) return;
      var el = e.target.closest && e.target.closest('.rd-b'); if (!el) return;
      var i = blocks.indexOf(el); if (i < 0) return;
      var sel = window.getSelection && window.getSelection(); if (sel) sel.removeAllRanges();
      speak(i);
    });

    apply(); onScroll();
  }
})();















    /* ---------- highlights and notes (saved in this browser only) ---------- */
    var pkey = 'rd-hl:' + location.pathname, P = loadP();
    function loadP() {
      try { var o = JSON.parse(localStorage.getItem(pkey)); if (o && o.items) return o; } catch (e) {}
      return { t: document.title.replace(/\s*\|.*$/, ''), items: [], note: '' };
    }
    function savePg() {
      P.u = Date.now();
      try {
        if (!P.items.length && !P.note) localStorage.removeItem(pkey);
        else localStorage.setItem(pkey, JSON.stringify(P));
      } catch (e) { flash('Could not save. Browser storage may be full or blocked.'); }
    }
    function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
    function mkid() { return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
    function getIt(id) { for (var i = 0; i < P.items.length; i++) if (P.items[i].id === id) return P.items[i]; return null; }
    function marksOf(id) { return [].slice.call(main.querySelectorAll('mark.rd-hl[data-id="' + id + '"]')); }
    var msgT;
    function flash(t) {
      var n = document.getElementById('rd-msg'); if (!n) { n = el('div', 'rd-toast'); n.id = 'rd-msg'; n.setAttribute('role', 'status'); ui.appendChild(n); }
      n.textContent = t; n.hidden = false; clearTimeout(msgT); msgT = setTimeout(function () { n.hidden = true; }, 2800);
    }

    function tnodes() {
      var out = [], w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) { var p = n.parentElement; return p && !p.closest('#qf,.rd-meta,.nav,script,style') ? 1 : 2; }
      });
      while (w.nextNode()) out.push(w.currentNode);
      return out;
    }
    function fullText() { return tnodes().map(function (n) { return n.data; }).join(''); }
    function offsetOf(node, off) {
      var ts = tnodes(), acc = 0, i;
      if (node.nodeType === 3) {
        for (i = 0; i < ts.length; i++) { if (ts[i] === node) return acc + off; acc += ts[i].length; }
        return -1;
      }
      var r = document.createRange(); r.setStart(node, off); r.collapse(true);
      for (i = 0; i < ts.length; i++) { if (r.comparePoint(ts[i], 0) >= 0) return acc; acc += ts[i].length; }
      return acc;
    }
    function wrap(s, e, id, color) {
      var ts = tnodes(), acc = 0, first = true;
      for (var i = 0; i < ts.length; i++) {
        var n = ts[i], a = acc, b = acc + n.length; acc = b;
        if (b <= s) continue; if (a >= e) break;
        if (!/\S/.test(n.data)) continue;
        var from = Math.max(s, a) - a, to = Math.min(e, b) - a;
        if (to <= from) continue;
        var mid = n; if (from > 0) mid = n.splitText(from);
        if (to - from < mid.length) mid.splitText(to - from);
        var mk = document.createElement('mark');
        mk.className = 'rd-hl rd-c-' + color + (first ? ' rd-first' : ''); mk.dataset.id = id;
        mid.parentNode.insertBefore(mk, mid); mk.appendChild(mid); first = false;
      }

