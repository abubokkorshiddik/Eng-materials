
/* ---------- Highlights and notes ---------- */
/* Insert inside init(), before apply(); onScroll(); */

var pkey = 'rd-hl:' + location.pathname;
var P = loadP();
var msgT;

function loadP() {
  try {
    var o = JSON.parse(localStorage.getItem(pkey));
    if (o && Array.isArray(o.items)) {
      if (typeof o.note !== 'string') o.note = '';
      return o;
    }
  } catch (e) {}

  return {
    t: document.title.replace(/\s*\|.*$/, ''),
    items: [],
    note: ''
  };
}

function savePg() {
  P.u = Date.now();

  try {
    if (!P.items.length && !P.note.trim()) {
      localStorage.removeItem(pkey);
    } else {
      localStorage.setItem(pkey, JSON.stringify(P));
    }
  } catch (e) {
    flash('Unable to save. Browser storage may be full.');
  }
}

function el(tag, cls, value) {
  var node = document.createElement(tag);
  if (cls) node.className = cls;
  if (value != null) node.textContent = value;
  return node;
}

function mkid() {
  return 'h' + Date.now().toString(36) +
    Math.random().toString(36).slice(2, 7);
}

function flash(message) {
  var n = document.getElementById('rd-msg');

  if (!n) {
    n = el('div', 'rd-toast');
    n.id = 'rd-msg';
    n.setAttribute('role', 'status');
    ui.appendChild(n);
  }

  n.textContent = message;
  n.hidden = false;
  clearTimeout(msgT);

  msgT = setTimeout(function () {
    n.hidden = true;
  }, 2800);
}

/* Read eligible text nodes without including the reader controls. */
function tnodes() {
  var out = [];

  var walker = document.createTreeWalker(
    main,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        var p = node.parentElement;

        if (!p || !node.data.length) {
          return NodeFilter.FILTER_REJECT;
        }

        if (
          p.closest(
            '#qf,.rd-ui,.rd-meta,.nav,script,style,textarea,input,button,select'
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        if (p.closest('mark.rd-hl')) {
          return NodeFilter.FILTER_ACCEPT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  while (walker.nextNode()) {
    out.push(walker.currentNode);
  }

  return out;
}

function offsetOf(node, offset) {
  var nodes = tnodes();
  var total = 0;

  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] === node) {
      return total + offset;
    }

    total += nodes[i].data.length;
  }

  return -1;
}

function rangeOffsets(range) {
  var start = offsetOf(
    range.startContainer,
    range.startOffset
  );

  var end = offsetOf(
    range.endContainer,
    range.endOffset
  );

  if (start < 0 || end <= start) return null;

  return { start: start, end: end };
}

function rangeFromOffsets(start, end) {
  var nodes = tnodes();
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

function getIt(id) {
  for (var i = 0; i < P.items.length; i++) {
    if (P.items[i].id === id) return P.items[i];
  }

  return null;
}

/* Restore a highlight using its saved text offsets. */
function paint(item) {
  if (!item || !Number.isInteger(item.start) ||
      !Number.isInteger(item.end) || item.end <= item.start) {
    return;
  }

  var range = rangeFromOffsets(item.start, item.end);
  if (!range || range.collapsed) return;

  var mark = el('mark', 'rd-hl');
  mark.dataset.id = item.id;
  mark.style.backgroundColor = item.color || '#f8df8b';
  mark.style.color = 'inherit';

  try {
    range.surroundContents(mark);
  } catch (e) {
    /*
     * A selection spanning several HTML elements cannot always
     * be wrapped with surroundContents. Skip it safely.
     */
    return;
  }
}

function restoreHighlights() {
  P.items.forEach(function (item) {
    paint(item);
  });
}

function removeHighlight(id) {
  var marks = main.querySelectorAll(
    'mark.rd-hl[data-id="' + id + '"]'
  );

  Array.prototype.forEach.call(marks, function (mark) {
    var parent = mark.parentNode;

    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }

    parent.removeChild(mark);
    parent.normalize();
  });
}

function highlightSelection(color) {
  var selection = window.getSelection();

  if (!selection || selection.isCollapsed ||
      !selection.rangeCount) {
    flash('Select some text first.');
    return;
  }

  var range = selection.getRangeAt(0);

  if (!main.contains(range.commonAncestorContainer)) {
    flash('Select text inside the lesson.');
    return;
  }

  if (range.toString().trim().length === 0) {
    flash('Select some meaningful text first.');
    return;
  }

  if (range.commonAncestorContainer.parentElement &&
      range.commonAncestorContainer.parentElement.closest(
        '.rd-ui,#qf'
      )) {
    flash('Select text inside the lesson.');
    return;
  }

  var offsets = rangeOffsets(range);

  if (!offsets) {
    flash('This selection could not be saved.');
    return;
  }

  var item = {
    id: mkid(),
    start: offsets.start,
    end: offsets.end,
    text: range.toString(),
    color: color || '#f8df8b'
  };

  P.items.push(item);

  try {
    savePg();
    restoreHighlights();
    selection.removeAllRanges();
    renderSavedItems();
    flash('Highlight saved.');
  } catch (e) {
    P.items.pop();
    flash('Unable to create this highlight.');
  }
}

/* Saved highlights and personal notes. */
function renderSavedItems() {
  var list = document.getElementById('rd-saved-items');
  if (!list) return;

  list.replaceChildren();

  if (!P.items.length) {
    list.appendChild(el('p', 'rd-note', 'No saved highlights yet.'));
  }

  P.items.forEach(function (item) {
    var row = el('div', 'rd-saved-item');
    var preview = el(
      'p',
      'rd-saved-text',
      item.text || 'Saved highlight'
    );

    var go = el('button', '', 'Go to text');
    go.type = 'button';

    go.addEventListener('click', function () {
      var marks = main.querySelectorAll(
        'mark.rd-hl[data-id="' + item.id + '"]'
      );

      if (marks.length) {
        marks[0].scrollIntoView({
          behavior: reduce ? 'auto' : 'smooth',
          block: 'center'
        });
      } else {
        flash('This highlight could not be located.');
      }
    });

    var remove = el('button', '', 'Remove');
    remove.type = 'button';

    remove.addEventListener('click', function () {
      removeHighlight(item.id);

      P.items = P.items.filter(function (x) {
        return x.id !== item.id;
      });

      savePg();
      renderSavedItems();
      flash('Highlight removed.');
    });

    row.appendChild(preview);
    row.appendChild(go);
    row.appendChild(remove);
    list.appendChild(row);
  });
}

function buildStudyTools() {
  if (document.getElementById('rd-study-tools')) return;

  var section = el('section', 'rd-study-tools');
  section.id = 'rd-study-tools';

  section.appendChild(el('h3', '', 'My reading notes'));

  var hint = el(
    'p',
    'rd-note',
    'Select lesson text, then choose a highlight colour.'
  );
  section.appendChild(hint);

  var colors = [
    ['#f8df8b', 'Yellow'],
    ['#b9e4d0', 'Mint'],
    ['#c9d9ff', 'Blue'],
    ['#efc7dc', 'Pink']
  ];

  var colorRow = el('div', 'rd-seg');

  colors.forEach(function (item) {
    var btn = el('button', '', item[1]);
    btn.type = 'button';

    btn.addEventListener('click', function () {
      highlightSelection(item[0]);
    });

    colorRow.appendChild(btn);
  });

  section.appendChild(colorRow);
  section.appendChild(el('h3', '', 'Saved highlights'));

  var saved = el('div', '');
  saved.id = 'rd-saved-items';
  section.appendChild(saved);

  section.appendChild(el('h3', '', 'Personal notes'));

  var note = document.createElement('textarea');
  note.id = 'rd-personal-note';
  note.rows = 5;
  note.placeholder = 'Write your lesson notes here...';
  note.value = P.note;
  note.setAttribute('aria-label', 'Personal reading notes');
  note.style.width = '100%';
  note.style.boxSizing = 'border-box';
  note.style.marginBottom = '8px';
  note.style.padding = '10px';
  note.style.borderRadius = '8px';

  section.appendChild(note);

  var saveNote = el('button', '', 'Save notes');
  saveNote.type = 'button';

  saveNote.addEventListener('click', function () {
    P.note = note.value;
    savePg();
    flash('Notes saved.');
  });

  section.appendChild(saveNote);

  var clearNote = el('button', '', 'Clear notes');
  clearNote.type = 'button';
  clearNote.style.marginLeft = '6px';

  clearNote.addEventListener('click', function () {
    if (!note.value.trim()) return;

    if (!window.confirm('Clear your personal notes?')) return;

    note.value = '';
    P.note = '';
    savePg();
    flash('Notes cleared.');
  });

  section.appendChild(clearNote);

  /*
   * Put study tools inside the existing reading options panel.
   */
  panel.appendChild(section);

  renderSavedItems();
}

/* Add highlight styling to the existing reader CSS. */
var hlStyle = document.createElement('style');

hlStyle.textContent =
  '.rd-hl{border-radius:2px;padding:0 1px}' +
  '.rd-study-tools{border-top:1px solid var(--rd-line);margin-top:14px;padding-top:12px}' +
  '.rd-study-tools h3{font-size:14px;margin:12px 0 8px}' +
  '.rd-saved-item{border:1px solid var(--rd-line);border-radius:8px;padding:8px;margin:8px 0}' +
  '.rd-saved-text{font-size:13px;overflow-wrap:anywhere;margin:0 0 8px}' +
  '.rd-saved-item button{margin-right:5px;margin-bottom:4px}';

document.head.appendChild(hlStyle);

/*
 * Restore only after the lesson content is present.
 * Existing highlight marks are unwrapped before rebuilding to
 * avoid duplicating marks if this function is called again.
 */
restoreHighlights();
buildStudyTools();

/* Keep these as the final initialisation calls inside init(). */
apply();
onScroll();
