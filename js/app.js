/* Malm 3 Documentation: Interactive App, Precedence Simulator, Herda Pill & Quick-Find
 * Classic script (no ES modules; works identically on file:// and http://).
 * Expects window.MalmSyntax (js/syntax.js) and window.MalmDocs (js/content-lang.js + js/content-overrides.js).
 */
(function (global) {
  'use strict';

  var STORAGE_MODE_KEY = 'malm-docs-mode';
  var STORAGE_ROOM_KEY = 'malm-docs-room';
  var CANONICAL_GROUPS = ['start', 'language', 'modules', 'overrides', 'cli'];
  var DEFAULT_GROUP_LABELS = {
    start: 'Start',
    language: 'Language',
    modules: 'Modules',
    overrides: 'Overrides',
    cli: 'CLI'
  };

  var HERDA_ROOMS = [
    { id: '1', name: 'Home',      colorVar: 'var(--r1)', meta: 'Room 1 · Blue' },
    { id: '2', name: 'Desk 2',    colorVar: 'var(--r2)', meta: 'Room 2 · Mint' },
    { id: '3', name: 'Thesis',    colorVar: 'var(--r3)', meta: 'Room 3 · Violet' },
    { id: '4', name: 'Fjordline', colorVar: 'var(--r4)', meta: 'Room 4 · Coral' },
    { id: '5', name: 'Room 5',    colorVar: 'var(--r5)', meta: 'Room 5 · Amber' },
    { id: '6', name: 'Room 6',    colorVar: 'var(--r6)', meta: 'Room 6 · Lime' },
    { id: '7', name: 'Room 7',    colorVar: 'var(--r7)', meta: 'Room 7 · Cyan' },
    { id: '8', name: 'Room 8',    colorVar: 'var(--r8)', meta: 'Room 8 · Rose' }
  ];

  var MODES = ['night', 'day', 'hc'];
  var MODE_LABELS = {
    night: 'Night',
    day: 'Day',
    hc: 'High Contrast'
  };

  var pillStatusTimer = null;
  var searchModalOpen = false;
  var roomPopoutOpen = false;
  var mobileNavOpen = false;
  var searchEntries = [];
  var searchFiltered = [];
  var searchSelectedIdx = 0;

  // ---- Safe Storage Helpers (file:// safe) ----

  function storageGet(key) {
    try {
      return global.localStorage ? global.localStorage.getItem(key) : null;
    } catch (_) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      if (global.localStorage) global.localStorage.setItem(key, value);
    } catch (_) {
      // Ignore storage failures in restricted contexts
    }
  }

  // ---- Safe HTML & Inline Code Helpers ----

  function esc(str) {
    if (global.MalmSyntax && typeof global.MalmSyntax.escapeHtml === 'function') {
      return global.MalmSyntax.escapeHtml(str);
    }
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function highlight(code, lang) {
    if (global.MalmSyntax && typeof global.MalmSyntax.highlight === 'function') {
      return global.MalmSyntax.highlight(code, lang);
    }
    return esc(code);
  }

  function renderInlineCode(text) {
    if (text == null) return '';
    var escaped = esc(String(text));
    return escaped.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  }

  function stripTags(html) {
    return String(html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Splits highlighted HTML into lines while keeping <span class="..."> tags balanced per line.
  function splitHighlightedLines(html) {
    var rawLines = String(html).split('\n');
    var openTags = [];
    var result = [];

    for (var i = 0; i < rawLines.length; i++) {
      var line = rawLines[i];
      var prefix = openTags.join('');
      var tagRe = /<(\/?)span([^>]*)>/g;
      var m;
      while ((m = tagRe.exec(line)) !== null) {
        if (m[1] === '/') {
          openTags.pop();
        } else {
          openTags.push('<span' + m[2] + '>');
        }
      }
      var suffix = '';
      for (var k = 0; k < openTags.length; k++) {
        suffix += '</span>';
      }
      result.push(prefix + line + suffix);
    }
    return result;
  }

  function renderCodeLinesHtml(code, lang) {
    var trimmed = String(code == null ? '' : code).replace(/\n$/, '');
    var highlighted = highlight(trimmed, lang);
    var lines = splitHighlightedLines(highlighted);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      out.push(
        '<span class="code-line">' +
          '<span class="code-ln" aria-hidden="true">' + (i + 1) + '</span>' +
          '<span class="code-text">' + (lines[i] || ' ') + '</span>' +
        '</span>'
      );
    }
    return out.join('');
  }

  // ---- Herda 24x24 Stroke Icons ----

  function iconSvg(name, size) {
    var s = size || 16;
    var cls = 'ic ic-' + s;
    var body = '';
    switch (name) {
      case 'ok':
        body = '<polyline points="20 6 9 17 4 12"></polyline>';
        break;
      case 'changed':
        body = '<path d="M10.3 3.9 1.8 18.5a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>' +
               '<line x1="12" y1="9" x2="12" y2="13"></line>' +
               '<line x1="12" y1="17" x2="12.01" y2="17"></line>';
        break;
      case 'danger':
        body = '<circle cx="12" cy="12" r="9"></circle>' +
               '<line x1="12" y1="8" x2="12" y2="12"></line>' +
               '<line x1="12" y1="16" x2="12.01" y2="16"></line>';
        break;
      case 'accent':
        body = '<circle cx="12" cy="12" r="9"></circle>' +
               '<line x1="12" y1="16" x2="12" y2="12"></line>' +
               '<line x1="12" y1="8" x2="12.01" y2="8"></line>';
        break;
      case 'copy':
        body = '<rect x="9" y="9" width="11" height="11" rx="2"></rect>' +
               '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
        break;
      case 'moon':
        body = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path>';
        break;
      case 'sun':
        body = '<circle cx="12" cy="12" r="4"></circle>' +
               '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>';
        break;
      case 'contrast':
        body = '<circle cx="12" cy="12" r="9"></circle>' +
               '<path d="M12 3v18"></path>' +
               '<path d="M12 7a5 5 0 0 1 0 10"></path>';
        break;
      case 'lock':
        body = '<rect x="5" y="11" width="14" height="10" rx="2"></rect>' +
               '<path d="M8 11V7a4 4 0 0 1 8 0v4"></path>';
        break;
      case 'reset':
        body = '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path>' +
               '<path d="M3 3v5h5"></path>';
        break;
      default:
        body = '<circle cx="12" cy="12" r="4"></circle>';
    }
    return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
  }

  // ---- Four-Tone Pill Status Announcements ----

  function showPillStatus(tone, text, durationMs) {
    var statusEl = document.getElementById('pill-status');
    if (!statusEl) return;

    var t = tone || 'ok';
    var dur = typeof durationMs === 'number' ? durationMs : 2400;

    if (pillStatusTimer) {
      clearTimeout(pillStatusTimer);
      pillStatusTimer = null;
    }

    var glyph = t === 'accent'
      ? '<span class="room-dot" aria-hidden="true"></span>'
      : iconSvg(t, 14);

    statusEl.className = 'pill-part pill-status tone-' + t;
    statusEl.innerHTML = glyph + '<span class="pill-status-text">' + esc(text) + '</span>';
    statusEl.hidden = false;

    pillStatusTimer = setTimeout(function () {
      statusEl.hidden = true;
      pillStatusTimer = null;
    }, dur);
  }

  // ---- Clipboard Copy (works on both http:// and file://) ----

  function copyToClipboard(text, btnEl, statusLabel) {
    var str = String(text == null ? '' : text);

    function onCopied() {
      showPillStatus('ok', statusLabel || 'Copied', 2400);
      if (btnEl) {
        btnEl.classList.add('is-copied');
        var labelSpan = btnEl.querySelector('.copy-btn-label');
        var prevText = labelSpan ? labelSpan.textContent : null;
        if (labelSpan) labelSpan.textContent = 'Copied';
        setTimeout(function () {
          btnEl.classList.remove('is-copied');
          if (labelSpan && prevText !== null) labelSpan.textContent = prevText;
        }, 1600);
      }
    }

    function fallbackCopy() {
      try {
        var ta = document.createElement('textarea');
        ta.value = str;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        onCopied();
      } catch (_) {
        showPillStatus('changed', 'Copy unavailable', 2400);
      }
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(str).then(onCopied, fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  // ---- Mode & Room State Management ----

  function getRoomById(id) {
    for (var i = 0; i < HERDA_ROOMS.length; i++) {
      if (HERDA_ROOMS[i].id === String(id)) return HERDA_ROOMS[i];
    }
    return HERDA_ROOMS[0];
  }

  function applyMode(mode, announce) {
    var valid = MODES.indexOf(mode) !== -1 ? mode : 'night';
    document.documentElement.dataset.mode = valid;
    storageSet(STORAGE_MODE_KEY, valid);

    var modeBtn = document.getElementById('pill-mode-btn');
    if (modeBtn) {
      var iconName = valid === 'day' ? 'sun' : (valid === 'hc' ? 'contrast' : 'moon');
      modeBtn.innerHTML =
        iconSvg(iconName, 14) +
        '<span class="pill-mode-label">' + esc(MODE_LABELS[valid]) + '</span>';
      modeBtn.setAttribute('aria-label', 'Appearance mode: ' + MODE_LABELS[valid] + '. Click to cycle.');
    }

    if (announce) {
      showPillStatus('accent', MODE_LABELS[valid] + ' mode', 2400);
    }
  }

  function applyRoom(roomId, announce) {
    var room = getRoomById(roomId);
    document.documentElement.dataset.room = room.id;
    storageSet(STORAGE_ROOM_KEY, room.id);

    // Update Hero strip buttons
    var chips = document.querySelectorAll('#hero-room-strip .room-chip');
    for (var i = 0; i < chips.length; i++) {
      var active = chips[i].getAttribute('data-room') === room.id;
      chips[i].classList.toggle('is-active', active);
      chips[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    // Update Pill room button label
    var pillName = document.querySelector('#pill-room-btn .pill-room-name');
    if (pillName) pillName.textContent = room.name;

    // Update Room Pop-out items
    var options = document.querySelectorAll('#room-popout-list .room-option');
    for (var j = 0; j < options.length; j++) {
      var isSel = options[j].getAttribute('data-room') === room.id;
      options[j].classList.toggle('is-active', isSel);
      options[j].setAttribute('aria-selected', isSel ? 'true' : 'false');
      var check = options[j].querySelector('.room-option-check');
      if (check) check.hidden = !isSel;
    }

    if (announce) {
      showPillStatus('accent', 'Room ' + room.id + ' · ' + room.name, 2000);
    }
  }

  function renderRoomControls() {
    var heroStrip = document.getElementById('hero-room-strip');
    if (heroStrip) {
      var stripHtml = HERDA_ROOMS.map(function (r) {
        return (
          '<button type="button" class="room-chip" data-room="' + r.id + '" aria-pressed="false">' +
            '<span class="room-chip-dot" style="background:' + r.colorVar + '" aria-hidden="true"></span>' +
            '<span>' + r.id + ' ' + esc(r.name) + '</span>' +
          '</button>'
        );
      }).join('');
      heroStrip.innerHTML = stripHtml;
      heroStrip.addEventListener('click', function (e) {
        var btn = e.target.closest('.room-chip');
        if (!btn) return;
        applyRoom(btn.getAttribute('data-room'), true);
      });
    }

    var popoutList = document.getElementById('room-popout-list');
    if (popoutList) {
      var listHtml = HERDA_ROOMS.map(function (r) {
        return (
          '<button type="button" class="room-option" role="option" data-room="' + r.id + '" aria-selected="false">' +
            '<span class="room-option-left">' +
              '<span class="room-option-dot" style="background:' + r.colorVar + '" aria-hidden="true"></span>' +
              '<span>' + esc(r.name) + '</span>' +
              '<span class="room-option-meta">' + esc(r.meta) + '</span>' +
            '</span>' +
            '<span class="room-option-check" hidden>' + iconSvg('ok', 14) + '</span>' +
          '</button>'
        );
      }).join('');
      popoutList.innerHTML = listHtml;
      popoutList.addEventListener('click', function (e) {
        var btn = e.target.closest('.room-option');
        if (!btn) return;
        applyRoom(btn.getAttribute('data-room'), true);
        setRoomPopout(false);
      });
    }
  }

  function setRoomPopout(open) {
    var popout = document.getElementById('room-popout');
    var btn = document.getElementById('pill-room-btn');
    if (!popout || !btn) return;
    roomPopoutOpen = Boolean(open);
    popout.hidden = !roomPopoutOpen;
    btn.setAttribute('aria-expanded', roomPopoutOpen ? 'true' : 'false');
  }

  function setMobileNav(open) {
    var pane = document.getElementById('sidebar-pane');
    var backdrop = document.getElementById('nav-backdrop');
    var toggle = document.getElementById('nav-toggle');
    if (!pane || !backdrop || !toggle) return;
    mobileNavOpen = Boolean(open);
    pane.classList.toggle('is-open', mobileNavOpen);
    backdrop.hidden = !mobileNavOpen;
    toggle.setAttribute('aria-expanded', mobileNavOpen ? 'true' : 'false');
  }

  // ---- Block Renderers ----

  function renderCodeBlock(opts) {
    var code = opts.code || '';
    var lang = opts.lang || 'text';
    var filename = opts.filename || '';
    var title = opts.title || '';
    var badge = opts.badge || '';
    var caption = opts.caption || '';
    var hideHeader = Boolean(opts.hideHeader);

    var headerHtml = '';
    if (!hideHeader) {
      headerHtml =
        '<div class="code-header">' +
          '<div class="code-meta">' +
            (filename ? '<span class="code-filename">' + esc(filename) + '</span>' : '') +
            (title ? '<span class="code-title">' + esc(title) + '</span>' : '') +
            '<span class="code-lang">' + esc(lang) + '</span>' +
            (badge ? '<span class="code-badge">' + esc(badge) + '</span>' : '') +
          '</div>' +
          '<button type="button" class="btn btn-sm code-copy-btn" data-copy-code="1" aria-label="Copy code">' +
            iconSvg('copy', 12) +
            '<span class="copy-btn-label">Copy</span>' +
          '</button>' +
        '</div>';
    }

    var captionHtml = caption
      ? '<div class="code-caption">' + renderInlineCode(caption) + '</div>'
      : '';

    var wrap = document.createElement('div');
    wrap.className = 'code-block';
    wrap.innerHTML =
      headerHtml +
      '<div class="code-body">' +
        '<pre class="code-pre"><code>' + renderCodeLinesHtml(code, lang) + '</code></pre>' +
      '</div>' +
      captionHtml;

    var copyBtn = wrap.querySelector('.code-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyToClipboard(code, copyBtn, filename ? 'Copied ' + filename : 'Copied snippet');
      });
    }

    return wrap;
  }

  function renderTabsBlock(block) {
    var tabs = Array.isArray(block.tabs) ? block.tabs : [];
    var container = document.createElement('div');
    container.className = 'tabs-block';
    if (block.id) container.dataset.tabsId = block.id;

    var activeIdx = 0;

    var header = document.createElement('div');
    header.className = 'tabs-header';

    var tabList = document.createElement('div');
    tabList.className = 'tabs-list';
    tabList.setAttribute('role', 'tablist');
    if (block.label) tabList.setAttribute('aria-label', block.label);

    var actions = document.createElement('div');
    actions.className = 'tabs-actions';

    var langBadge = document.createElement('span');
    langBadge.className = 'code-lang';

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn btn-sm code-copy-btn';
    copyBtn.innerHTML = iconSvg('copy', 12) + '<span class="copy-btn-label">Copy</span>';
    copyBtn.addEventListener('click', function () {
      var cur = tabs[activeIdx];
      if (!cur) return;
      copyToClipboard(cur.code || '', copyBtn, 'Copied ' + (cur.filename || cur.label));
    });

    actions.appendChild(langBadge);
    actions.appendChild(copyBtn);
    header.appendChild(tabList);
    header.appendChild(actions);
    container.appendChild(header);

    var panelsWrap = document.createElement('div');
    container.appendChild(panelsWrap);

    var tabButtons = [];
    var tabPanels = [];

    function activateTab(idx, focusBtn) {
      if (idx < 0 || idx >= tabs.length) return;
      activeIdx = idx;
      for (var i = 0; i < tabs.length; i++) {
        var on = i === idx;
        tabButtons[i].classList.toggle('is-active', on);
        tabButtons[i].setAttribute('aria-selected', on ? 'true' : 'false');
        tabButtons[i].tabIndex = on ? 0 : -1;
        tabPanels[i].hidden = !on;
      }
      langBadge.textContent = tabs[idx].lang || 'text';
      if (focusBtn) tabButtons[idx].focus();
    }

    tabs.forEach(function (tab, idx) {
      var baseId = (block.id || 'tabs') + '-' + (tab.id || idx);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-btn';
      btn.id = 'tab-' + baseId;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', 'panel-' + baseId);
      btn.textContent = tab.label || tab.filename || ('Tab ' + (idx + 1));

      btn.addEventListener('click', function () {
        activateTab(idx, false);
      });

      btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          activateTab((idx + 1) % tabs.length, true);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          activateTab((idx - 1 + tabs.length) % tabs.length, true);
        } else if (e.key === 'Home') {
          e.preventDefault();
          activateTab(0, true);
        } else if (e.key === 'End') {
          e.preventDefault();
          activateTab(tabs.length - 1, true);
        }
      });

      tabList.appendChild(btn);
      tabButtons.push(btn);

      var panel = document.createElement('div');
      panel.className = 'tab-panel';
      panel.id = 'panel-' + baseId;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', btn.id);

      if (tab.filename || tab.note) {
        var noteBar = document.createElement('div');
        noteBar.className = 'tab-note';
        var parts = [];
        if (tab.filename) {
          parts.push('<span class="code-filename">' + esc(tab.filename) + '</span>');
        }
        if (tab.note) {
          parts.push('<span>' + renderInlineCode(tab.note) + '</span>');
        }
        noteBar.innerHTML = parts.join(' &middot; ');
        panel.appendChild(noteBar);
      }

      panel.appendChild(renderCodeBlock({
        code: tab.code || '',
        lang: tab.lang || 'text',
        hideHeader: true
      }));

      panelsWrap.appendChild(panel);
      tabPanels.push(panel);
    });

    if (tabs.length > 0) activateTab(0, false);
    return container;
  }

  function renderCalloutBlock(block) {
    var tone = block.tone || 'accent';
    var el = document.createElement('div');
    el.className = 'callout callout--' + tone;
    el.innerHTML =
      '<div class="callout-icon">' + iconSvg(tone, 18) + '</div>' +
      '<div class="callout-body">' +
        '<div class="callout-head">' +
          (block.label ? '<span class="callout-label">' + esc(block.label) + '</span>' : '') +
          (block.title ? '<h4 class="callout-title">' + esc(block.title) + '</h4>' : '') +
        '</div>' +
        '<p class="callout-text">' + renderInlineCode(block.text || '') + '</p>' +
      '</div>';
    return el;
  }

  function renderGridBlock(block) {
    var cols = block.columns === 3 ? 3 : 2;
    var grid = document.createElement('div');
    grid.className = 'card-grid card-grid--' + cols;

    var cards = Array.isArray(block.cards) ? block.cards : [];
    cards.forEach(function (card) {
      var item = document.createElement('article');
      item.className = 'feature-card';

      var toneCls = card.tone ? ('tone-' + card.tone) : 'tone-neutral';
      var headHtml =
        '<div class="feature-card-head">' +
          '<h3 class="feature-card-title">' + esc(card.title || '') + '</h3>' +
          (card.tag ? '<span class="status-chip ' + toneCls + '">' + esc(card.tag) + '</span>' : '') +
        '</div>' +
        '<p class="feature-card-desc">' + renderInlineCode(card.description || '') + '</p>';

      item.innerHTML = headHtml;

      if (card.code) {
        var codeWrap = document.createElement('div');
        codeWrap.className = 'feature-card-code';
        codeWrap.appendChild(renderCodeBlock({
          code: card.code,
          lang: card.lang || 'malm',
          hideHeader: true
        }));
        item.appendChild(codeWrap);
      }

      grid.appendChild(item);
    });

    return grid;
  }

  function renderTableBlock(block) {
    var wrap = document.createElement('div');
    wrap.className = 'table-wrap';

    var captionHtml = block.caption
      ? '<div class="table-caption">' + renderInlineCode(block.caption) + '</div>'
      : '';

    var headers = Array.isArray(block.headers) ? block.headers : [];
    var rows = Array.isArray(block.rows) ? block.rows : [];

    var theadHtml = '<thead><tr>' +
      headers.map(function (h) { return '<th>' + renderInlineCode(h) + '</th>'; }).join('') +
      '</tr></thead>';

    var tbodyHtml = '<tbody>' +
      rows.map(function (row) {
        return '<tr>' +
          row.map(function (cell) { return '<td>' + renderInlineCode(cell) + '</td>'; }).join('') +
          '</tr>';
      }).join('') +
      '</tbody>';

    wrap.innerHTML = captionHtml + '<table class="doc-table">' + theadHtml + tbodyHtml + '</table>';
    return wrap;
  }

  function renderStepsBlock(block) {
    var ol = document.createElement('ol');
    ol.className = 'steps-list';

    var items = Array.isArray(block.items) ? block.items : [];
    items.forEach(function (item, idx) {
      var li = document.createElement('li');
      li.className = 'step-item';

      var badge = document.createElement('div');
      badge.className = 'step-badge';
      badge.textContent = item.step != null ? String(item.step) : String(idx + 1);

      var body = document.createElement('div');
      body.className = 'step-body';
      body.innerHTML =
        '<h3 class="step-title">' + esc(item.title || '') + '</h3>' +
        '<p class="step-desc">' + renderInlineCode(item.description || '') + '</p>';

      if (item.code) {
        body.appendChild(renderCodeBlock({
          code: item.code,
          lang: item.lang || 'sh',
          hideHeader: false
        }));
      }

      li.appendChild(badge);
      li.appendChild(body);
      ol.appendChild(li);
    });

    return ol;
  }

  // ---- Interactive Override Precedence & Overlay Simulator ----

  function deepClone(val) {
    if (val === null || typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(deepClone);
    var out = {};
    var keys = Object.keys(val);
    for (var i = 0; i < keys.length; i++) {
      out[keys[i]] = deepClone(val[keys[i]]);
    }
    return out;
  }

  function deepMerge(target, patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return deepClone(patch);
    }
    var base = (target && typeof target === 'object' && !Array.isArray(target))
      ? deepClone(target)
      : {};
    var keys = Object.keys(patch);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (
        patch[k] &&
        typeof patch[k] === 'object' &&
        !Array.isArray(patch[k]) &&
        base[k] &&
        typeof base[k] === 'object' &&
        !Array.isArray(base[k])
      ) {
        base[k] = deepMerge(base[k], patch[k]);
      } else {
        base[k] = deepClone(patch[k]);
      }
    }
    return base;
  }

  function stableJson(val) {
    if (val === null || typeof val !== 'object') return JSON.stringify(val);
    if (Array.isArray(val)) {
      return '[' + val.map(stableJson).join(',') + ']';
    }
    var keys = Object.keys(val).sort();
    return '{' + keys.map(function (k) {
      return JSON.stringify(k) + ':' + stableJson(val[k]);
    }).join(',') + '}';
  }

  function evaluateScenario(scenario, enabledById) {
    var indexedLayers = (scenario.layers || []).map(function (layer, idx) {
      return { layer: layer, index: idx };
    });

    var optionLayers = indexedLayers
      .filter(function (x) { return enabledById[x.layer.id] && !x.layer.isOverlayStep55; })
      .sort(function (a, b) {
        if (a.layer.priority !== b.layer.priority) return a.layer.priority - b.layer.priority;
        return a.index - b.index;
      });

    var step55Layers = indexedLayers
      .filter(function (x) { return enabledById[x.layer.id] && x.layer.isOverlayStep55; })
      .sort(function (a, b) { return a.index - b.index; });

    var keyStates = Object.create(null);
    var allConflicts = [];
    var conflictLayerIds = Object.create(null);
    var winningLayerIds = Object.create(null);

    function ensureKeyState(key) {
      if (!keyStates[key]) {
        keyStates[key] = {
          key: key,
          hasValue: false,
          value: undefined,
          winningPriority: -Infinity,
          winningLayerId: null,
          winningSource: null,
          locked: false,
          lockedBy: null,
          setByPrio: Object.create(null),
          insertByPrioKey: Object.create(null),
          ledger: []
        };
      }
      return keyStates[key];
    }

    (scenario.keys || []).forEach(function (k) {
      ensureKeyState(k.key);
    });

    // Pass 1: Evaluate sorted option layers (Steps 1..4)
    optionLayers.forEach(function (entry) {
      var layer = entry.layer;
      var prio = layer.priority;
      var ops = Array.isArray(layer.ops) ? layer.ops : [];

      ops.forEach(function (op) {
        var st = ensureKeyState(op.key);
        var kind = op.op;

        if (kind === 'set') {
          var serialized = stableJson(op.value);
          var prevSet = st.setByPrio[prio];
          if (prevSet && prevSet.serialized !== serialized) {
            // Equal-priority conflict
            prevSet.ledgerEntry.conflict = true;
            var conflictEntry = {
              layerId: layer.id,
              layerName: layer.name,
              source: layer.source,
              priority: prio,
              op: 'set',
              value: deepClone(op.value),
              note: op.note || 'Equal-priority conflict',
              won: false,
              conflict: true
            };
            st.ledger.push(conflictEntry);
            conflictLayerIds[prevSet.layerId] = true;
            conflictLayerIds[layer.id] = true;
            allConflicts.push({
              key: op.key,
              priority: prio,
              message:
                'Two layers set `' + op.key + '` to different values at priority ' + prio +
                ' (' + prevSet.source + ' vs ' + layer.source +
                '). Resolve this with `#[priority(N)]`, `#[force]`, or `.patch(...)`.'
            });
            return;
          }

          var wins = prio >= st.winningPriority;
          if (wins) {
            for (var li = 0; li < st.ledger.length; li++) {
              if (!st.ledger[li].conflict) st.ledger[li].won = false;
            }
            st.value = deepClone(op.value);
            st.hasValue = true;
            st.winningPriority = prio;
            st.winningLayerId = layer.id;
            st.winningSource = layer.source;
          }

          var setLedger = {
            layerId: layer.id,
            layerName: layer.name,
            source: layer.source,
            priority: prio,
            op: 'set',
            value: deepClone(op.value),
            note: op.note || '',
            won: wins,
            conflict: false
          };
          st.ledger.push(setLedger);
          if (!prevSet) {
            st.setByPrio[prio] = {
              layerId: layer.id,
              source: layer.source,
              serialized: serialized,
              ledgerEntry: setLedger
            };
          }
          return;
        }

        if (kind === 'patch') {
          st.value = deepMerge(st.value, op.value);
          st.hasValue = true;
          if (prio >= st.winningPriority) {
            st.winningPriority = prio;
            st.winningLayerId = layer.id;
            st.winningSource = layer.source;
          }
          st.ledger.push({
            layerId: layer.id,
            layerName: layer.name,
            source: layer.source,
            priority: prio,
            op: 'patch',
            value: deepClone(op.value),
            note: op.note || '.patch(...)',
            won: true,
            conflict: false
          });
          return;
        }

        if (kind === 'insert') {
          var mk = op.mapKey != null ? String(op.mapKey) : '';
          var insKey = prio + '\0' + mk;
          var insSerialized = stableJson(op.value);
          var prevIns = st.insertByPrioKey[insKey];

          if (prevIns && prevIns.serialized !== insSerialized) {
            prevIns.ledgerEntry.conflict = true;
            var insConflictEntry = {
              layerId: layer.id,
              layerName: layer.name,
              source: layer.source,
              priority: prio,
              op: 'insert',
              mapKey: mk,
              value: deepClone(op.value),
              note: op.note || 'Conflicting .insert("' + mk + '")',
              won: false,
              conflict: true
            };
            st.ledger.push(insConflictEntry);
            conflictLayerIds[prevIns.layerId] = true;
            conflictLayerIds[layer.id] = true;
            allConflicts.push({
              key: op.key + '["' + mk + '"]',
              priority: prio,
              message:
                'Two layers insert different values for `' + op.key + '["' + mk + '"]` at priority ' + prio +
                ' (' + prevIns.source + ' vs ' + layer.source +
                '). Resolve this with `#[priority(N)]` or `#[force]`.'
            });
            return;
          }

          if (!st.value || typeof st.value !== 'object' || Array.isArray(st.value)) {
            st.value = {};
          }
          st.value[mk] = deepClone(op.value);
          st.hasValue = true;
          if (prio >= st.winningPriority) {
            st.winningPriority = prio;
            st.winningLayerId = layer.id;
            st.winningSource = layer.source;
          }
          var insLedger = {
            layerId: layer.id,
            layerName: layer.name,
            source: layer.source,
            priority: prio,
            op: 'insert',
            mapKey: mk,
            value: deepClone(op.value),
            note: op.note || '.insert("' + mk + '")',
            won: true,
            conflict: false
          };
          st.ledger.push(insLedger);
          if (!prevIns) {
            st.insertByPrioKey[insKey] = {
              layerId: layer.id,
              source: layer.source,
              serialized: insSerialized,
              ledgerEntry: insLedger
            };
          }
          return;
        }

        if (kind === 'remove') {
          var rk = op.mapKey != null ? op.mapKey : op.value;
          if (Array.isArray(st.value)) {
            st.value = st.value.filter(function (v) { return stableJson(v) !== stableJson(rk); });
          } else if (st.value && typeof st.value === 'object') {
            delete st.value[String(rk)];
          }
          st.hasValue = true;
          if (prio >= st.winningPriority) {
            st.winningPriority = prio;
            st.winningLayerId = layer.id;
            st.winningSource = layer.source;
          }
          st.ledger.push({
            layerId: layer.id,
            layerName: layer.name,
            source: layer.source,
            priority: prio,
            op: 'remove',
            mapKey: String(rk),
            value: rk,
            note: op.note || '.remove("' + rk + '")',
            won: true,
            conflict: false
          });
          return;
        }

        if (kind === 'remove_all') {
          var list = Array.isArray(op.value) ? op.value : [];
          if (Array.isArray(st.value)) {
            var removeSet = list.map(stableJson);
            st.value = st.value.filter(function (v) { return removeSet.indexOf(stableJson(v)) === -1; });
          } else if (st.value && typeof st.value === 'object') {
            list.forEach(function (k) { delete st.value[String(k)]; });
          }
          st.hasValue = true;
          if (prio >= st.winningPriority) {
            st.winningPriority = prio;
            st.winningLayerId = layer.id;
            st.winningSource = layer.source;
          }
          st.ledger.push({
            layerId: layer.id,
            layerName: layer.name,
            source: layer.source,
            priority: prio,
            op: 'remove_all',
            value: deepClone(list),
            note: op.note || '.remove_all([...])',
            won: true,
            conflict: false
          });
          return;
        }

        if (kind === 'push') {
          if (!Array.isArray(st.value)) st.value = [];
          st.value.push(deepClone(op.value));
          st.hasValue = true;
          if (prio >= st.winningPriority) {
            st.winningPriority = prio;
            st.winningLayerId = layer.id;
            st.winningSource = layer.source;
          }
          st.ledger.push({
            layerId: layer.id,
            layerName: layer.name,
            source: layer.source,
            priority: prio,
            op: 'push',
            value: deepClone(op.value),
            note: op.note || '.push(...)',
            won: true,
            conflict: false
          });
        }
      });
    });

    // Finalize locks & winning layers for option keys
    Object.keys(keyStates).forEach(function (key) {
      var st = keyStates[key];
      if (key.indexOf('output:') === 0) return;
      if (st.winningPriority > 375) {
        st.locked = true;
        st.lockedBy = st.winningSource;
      }
      if (st.winningLayerId && !conflictLayerIds[st.winningLayerId]) {
        winningLayerIds[st.winningLayerId] = true;
      }
    });

    // Pass 2: Post-Render Output Patches
    var outputPreview = null;
    var hasOutputKey = (scenario.keys || []).some(function (k) { return k.key.indexOf('output:') === 0; });
    var hasStep55 = (scenario.layers || []).some(function (l) { return l.isOverlayStep55; });

    if (hasOutputKey || hasStep55) {
      var outKeyDef = (scenario.keys || []).find(function (k) { return k.key.indexOf('output:') === 0; });
      var outKey = outKeyDef ? outKeyDef.key : 'output:config.json';
      var outSt = ensureKeyState(outKey);

      // Seed rendered output document from resolved non-output option keys
      var doc = {};
      (scenario.keys || []).forEach(function (k) {
        if (k.key.indexOf('output:') === 0) return;
        var st = keyStates[k.key];
        var shortKey = k.key.indexOf('.') !== -1 ? k.key.split('.').pop() : k.key;
        if (st && st.hasValue) {
          doc[shortKey] = deepClone(st.value);
        }
      });

      step55Layers.forEach(function (entry) {
        var layer = entry.layer;
        var ops = Array.isArray(layer.ops) ? layer.ops : [];
        ops.forEach(function (op) {
          if (op.op === 'overlay_json') {
            doc = deepMerge(doc, op.value);
            outSt.winningPriority = layer.priority;
            outSt.winningLayerId = layer.id;
            outSt.winningSource = layer.source;
            winningLayerIds[layer.id] = true;
            outSt.ledger.push({
              layerId: layer.id,
              layerName: layer.name,
              source: layer.source,
              priority: layer.priority,
              op: 'overlay_json',
              value: deepClone(op.value),
              note: op.note || 'Post-render output patch',
              won: true,
              conflict: false
            });
          }
        });
      });

      outSt.value = doc;
      outSt.hasValue = true;
      outputPreview = {
        key: outKey,
        filename: outKey.replace(/^output:/, ''),
        doc: doc,
        patchedCount: outSt.ledger.length,
        ledger: outSt.ledger
      };
    }

    return {
      keyStates: keyStates,
      conflicts: allConflicts,
      conflictLayerIds: conflictLayerIds,
      winningLayerIds: winningLayerIds,
      outputPreview: outputPreview
    };
  }

  function renderSimulatorBlock(simConfig) {
    var scenarios = Array.isArray(simConfig && simConfig.scenarios) ? simConfig.scenarios : [];
    var card = document.createElement('div');
    card.id = 'precedence-simulator';
    card.className = 'sim-card';

    if (scenarios.length === 0) {
      card.innerHTML = '<div class="sim-header"><p class="sim-desc">No simulator scenarios configured.</p></div>';
      return card;
    }

    // Track per-scenario layer enabled state
    var stateByScenario = Object.create(null);
    function initScenarioState(sc) {
      var map = Object.create(null);
      (sc.layers || []).forEach(function (l) {
        map[l.id] = Boolean(l.defaultEnabled);
      });
      return map;
    }
    scenarios.forEach(function (sc) {
      stateByScenario[sc.id] = initScenarioState(sc);
    });

    var activeScenarioIdx = 0;

    // Header
    var header = document.createElement('div');
    header.className = 'sim-header';

    var headerTop = document.createElement('div');
    headerTop.className = 'sim-header-top';

    var titleWrap = document.createElement('div');
    titleWrap.innerHTML =
      '<h3 class="sim-title">' + esc(simConfig.title || 'Interactive Precedence & Overlay Simulator') + '</h3>' +
      '<p class="sim-desc">' + renderInlineCode(simConfig.description || '') + '</p>';

    var scopeChip = document.createElement('span');
    scopeChip.className = 'status-chip tone-neutral sim-scope-chip';

    headerTop.appendChild(titleWrap);
    headerTop.appendChild(scopeChip);

    var scenarioBar = document.createElement('div');
    scenarioBar.className = 'sim-scenarios';
    scenarioBar.setAttribute('role', 'tablist');
    scenarioBar.setAttribute('aria-label', 'Precedence simulator scenarios');

    header.appendChild(headerTop);
    header.appendChild(scenarioBar);
    card.appendChild(header);

    // Summary Bar
    var summaryBar = document.createElement('div');
    summaryBar.className = 'sim-summary';

    var summaryText = document.createElement('span');
    var resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn-sm btn-quiet';
    resetBtn.innerHTML = iconSvg('reset', 12) + '<span>Reset layers</span>';
    resetBtn.addEventListener('click', function () {
      var sc = scenarios[activeScenarioIdx];
      stateByScenario[sc.id] = initScenarioState(sc);
      renderActiveScenario();
      showPillStatus('ok', 'Simulator reset', 1800);
    });

    summaryBar.appendChild(summaryText);
    summaryBar.appendChild(resetBtn);
    card.appendChild(summaryBar);

    // Two-column body: Layers | Live Resolution & History
    var body = document.createElement('div');
    body.className = 'sim-body';

    var layersCol = document.createElement('div');
    layersCol.className = 'sim-layers-col';

    var resultCol = document.createElement('div');
    resultCol.className = 'sim-result-col';

    body.appendChild(layersCol);
    body.appendChild(resultCol);
    card.appendChild(body);

    var scenarioButtons = [];
    scenarios.forEach(function (sc, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sim-scenario-btn';
      btn.setAttribute('role', 'tab');
      btn.textContent = sc.label || sc.id;
      btn.addEventListener('click', function () {
        activeScenarioIdx = idx;
        renderActiveScenario();
      });
      scenarioBar.appendChild(btn);
      scenarioButtons.push(btn);
    });

    function formatValueDisplay(val) {
      if (val === undefined) return { text: '(unset)', lang: 'text' };
      if (typeof val === 'object' && val !== null) {
        return { text: JSON.stringify(val, null, 2), lang: 'json' };
      }
      return { text: JSON.stringify(val), lang: 'json' };
    }

    function renderActiveScenario() {
      var sc = scenarios[activeScenarioIdx];
      var enabledMap = stateByScenario[sc.id];

      scenarioButtons.forEach(function (b, idx) {
        var on = idx === activeScenarioIdx;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });

      scopeChip.textContent = sc.scopeInfo || '--profile default';
      scopeChip.hidden = !sc.scopeInfo;
      summaryText.innerHTML = renderInlineCode(sc.summary || '');

      var evalRes = evaluateScenario(sc, enabledMap);

      // Render left column: Layers
      layersCol.innerHTML = '';
      var layersHeading = document.createElement('div');
      layersHeading.className = 'sim-col-heading';
      var enabledCount = (sc.layers || []).filter(function (l) { return enabledMap[l.id]; }).length;
      layersHeading.innerHTML =
        '<span class="overline">Active Layers (' + enabledCount + '/' + (sc.layers || []).length + ')</span>' +
        '<span class="overline">Sorted by priority</span>';
      layersCol.appendChild(layersHeading);

      (sc.layers || []).forEach(function (layer) {
        var isOn = Boolean(enabledMap[layer.id]);
        var isWin = isOn && Boolean(evalRes.winningLayerIds[layer.id]);
        var isConf = isOn && Boolean(evalRes.conflictLayerIds[layer.id]);

        var box = document.createElement('div');
        box.className = 'sim-layer' +
          (!isOn ? ' is-disabled' : '') +
          (isWin ? ' is-winner' : '') +
          (isConf ? ' is-conflict' : '');

        var head = document.createElement('div');
        head.className = 'sim-layer-head';

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'sim-layer-toggle';
        cb.checked = isOn;
        cb.id = 'sim-toggle-' + sc.id + '-' + layer.id;
        cb.setAttribute('aria-label', 'Toggle ' + layer.name);
        cb.addEventListener('change', function () {
          enabledMap[layer.id] = cb.checked;
          var nextRes = evaluateScenario(sc, enabledMap);
          renderActiveScenario();
          if (cb.checked && nextRes.conflicts.length > 0 && nextRes.conflictLayerIds[layer.id]) {
            showPillStatus('danger', 'Priority conflict detected', 2800);
          }
        });

        var prioClass = 'sim-prio';
        if (layer.isOverlayStep55) prioClass += ' sim-prio--overlay';
        else if (layer.priority > 375) prioClass += ' sim-prio--locked';

        var prioText = layer.isOverlayStep55
          ? 'Output Patch · P' + layer.priority
          : 'P' + layer.priority;

        var statusBadge = '';
        if (isConf) {
          statusBadge = '<span class="status-chip tone-danger">Conflict</span>';
        } else if (isWin) {
          statusBadge = '<span class="status-chip tone-ok">' + (layer.isOverlayStep55 ? 'Applied' : 'Winner') + '</span>';
        }

        var info = document.createElement('div');
        info.className = 'sim-layer-info';
        info.innerHTML =
          '<div class="sim-layer-title-row">' +
            '<label class="sim-layer-name" for="' + esc(cb.id) + '">' + esc(layer.name) + '</label>' +
            '<span class="' + prioClass + '">' + esc(prioText) + '</span>' +
            statusBadge +
          '</div>' +
          '<span class="sim-layer-source">' + esc(layer.source || '') + '</span>' +
          '<p class="sim-layer-explain">' + renderInlineCode(layer.explanation || '') + '</p>';

        head.appendChild(cb);
        head.appendChild(info);
        box.appendChild(head);

        if (layer.snippet) {
          var pre = document.createElement('pre');
          pre.className = 'sim-layer-snippet';
          pre.innerHTML = '<code>' + highlight(layer.snippet, layer.lang || 'malm') + '</code>';
          box.appendChild(pre);
        }

        layersCol.appendChild(box);
      });

      // Render right column: Conflicts, Resolved Values & Option History, Output Patch Preview
      resultCol.innerHTML = '';
      var resHeading = document.createElement('div');
      resHeading.className = 'sim-col-heading';
      resHeading.innerHTML =
        '<span class="overline">Resolved Result &amp; Option History</span>' +
        (evalRes.conflicts.length > 0
          ? '<span class="status-chip tone-danger">' + evalRes.conflicts.length + ' Conflict' + (evalRes.conflicts.length === 1 ? '' : 's') + '</span>'
          : '<span class="status-chip tone-ok">Resolved</span>');
      resultCol.appendChild(resHeading);

      // Priority Conflict Diagnostics (Four-Tone Danger Callout)
      evalRes.conflicts.forEach(function (conf) {
        var alertEl = document.createElement('div');
        alertEl.className = 'callout callout--danger sim-conflict';
        alertEl.setAttribute('role', 'alert');
        alertEl.innerHTML =
          '<div class="callout-icon">' + iconSvg('danger', 18) + '</div>' +
          '<div class="callout-body">' +
            '<div class="callout-head">' +
              '<span class="callout-label">Conflict</span>' +
              '<h4 class="callout-title">Priority Conflict Detected (Priority ' + conf.priority + ')</h4>' +
            '</div>' +
            '<p class="callout-text">' + renderInlineCode(conf.message) + '</p>' +
          '</div>';
        resultCol.appendChild(alertEl);
      });

      var resolvedList = document.createElement('div');
      resolvedList.className = 'sim-resolved-list';

      (sc.keys || []).forEach(function (keyDef) {
        if (keyDef.key.indexOf('output:') === 0) return;
        var st = evalRes.keyStates[keyDef.key];
        var item = document.createElement('div');
        item.className = 'sim-resolved-item';

        var lockChipHtml = '';
        if (st && st.hasValue) {
          if (st.locked) {
            lockChipHtml =
              '<span class="status-chip tone-changed" title="Overrides Settings (' + esc(st.lockedBy || '') + ')">' +
                iconSvg('lock', 12) + ' Locked in Settings UI (priority &gt; 375)' +
              '</span>';
          } else {
            lockChipHtml = '<span class="status-chip tone-ok">Editable in Settings UI</span>';
          }
        } else {
          lockChipHtml = '<span class="status-chip tone-neutral">Unset</span>';
        }

        var winPrioBadge = st && st.winningPriority > -Infinity
          ? '<span class="sim-prio' + (st.locked ? ' sim-prio--locked' : '') + '">Winner P' + st.winningPriority + '</span>'
          : '';

        var valFmt = formatValueDisplay(st ? st.value : undefined);

        var ledgerHtml = '';
        if (st && st.ledger.length > 0) {
          ledgerHtml = '<ul class="sim-ledger">' +
            st.ledger.map(function (entry) {
              var cls = 'sim-ledger-entry' +
                (entry.conflict ? ' is-conflict' : (entry.won ? ' is-won' : ''));
              var tag = entry.conflict
                ? 'Conflict'
                : (entry.won ? 'Applied' : 'Overridden');
              var opLabel = entry.op === 'set'
                ? '='
                : '.' + entry.op + (entry.mapKey ? '("' + entry.mapKey + '")' : '');
              return (
                '<li class="' + cls + '">' +
                  '<span><strong>P' + entry.priority + '</strong> · ' + esc(entry.layerName) +
                  ' <code class="inline-code">' + esc(opLabel) + '</code></span>' +
                  '<span>' + esc(tag) + '</span>' +
                '</li>'
              );
            }).join('') +
          '</ul>';
        } else {
          ledgerHtml = '<ul class="sim-ledger"><li class="sim-ledger-entry"><span>No enabled layers write this key.</span></li></ul>';
        }

        var lockedByNote = (st && st.locked && st.lockedBy)
          ? '<p class="sim-key-desc">Overrides Settings (set by <code>' + esc(st.lockedBy) + '</code>): locked in the Settings UI because priority exceeds 375.</p>'
          : '';

        item.innerHTML =
          '<div class="sim-resolved-head">' +
            '<span class="sim-key-name">' + esc(keyDef.label || keyDef.key) + '</span>' +
            '<div class="sim-layer-title-row">' + winPrioBadge + lockChipHtml + '</div>' +
          '</div>' +
          (keyDef.description ? '<p class="sim-key-desc">' + renderInlineCode(keyDef.description) + '</p>' : '') +
          lockedByNote +
          '<div class="sim-value-box">' + highlight(valFmt.text, valFmt.lang) + '</div>' +
          ledgerHtml;

        resolvedList.appendChild(item);
      });

      resultCol.appendChild(resolvedList);

      // Post-Render Output Patch Preview (overlay json)
      if (evalRes.outputPreview) {
        var pv = evalRes.outputPreview;
        var outBox = document.createElement('div');
        outBox.className = 'sim-output-preview';
        var jsonText = JSON.stringify(pv.doc, null, 2);
        var badgeTone = pv.patchedCount > 0 ? 'tone-hand' : 'tone-neutral';
        var badgeLabel = pv.patchedCount > 0
          ? 'Post-render output patch (' + pv.patchedCount + ')'
          : 'Unpatched output';

        outBox.innerHTML =
          '<div class="sim-output-head">' +
            '<span class="code-filename">' + esc(pv.filename) + '</span>' +
            '<span class="status-chip ' + badgeTone + '">' + esc(badgeLabel) + '</span>' +
          '</div>' +
          '<pre class="sim-output-pre"><code>' + highlight(jsonText, 'json') + '</code></pre>';
        resultCol.appendChild(outBox);
      }
    }

    renderActiveScenario();
    return card;
  }

  // ---- Documentation Renderer & Search Index Builder ----

  function collectOrderedSections(docs) {
    var raw = []
      .concat(Array.isArray(docs.langSections) ? docs.langSections : [])
      .concat(Array.isArray(docs.moduleSections) ? docs.moduleSections : [])
      .concat(Array.isArray(docs.overrideSections) ? docs.overrideSections : []);

    var byGroup = Object.create(null);
    CANONICAL_GROUPS.forEach(function (g) { byGroup[g] = []; });

    raw.forEach(function (sec) {
      if (!sec || !sec.id) return;
      var g = CANONICAL_GROUPS.indexOf(sec.group) !== -1 ? sec.group : 'language';
      byGroup[g].push(sec);
    });

    var ordered = [];
    CANONICAL_GROUPS.forEach(function (g) {
      ordered = ordered.concat(byGroup[g]);
    });
    return { ordered: ordered, byGroup: byGroup };
  }

  function resolveGroupLabel(docs, groupId) {
    if (Array.isArray(docs.groups)) {
      for (var i = 0; i < docs.groups.length; i++) {
        if (docs.groups[i].id === groupId) {
          return docs.groups[i].shortLabel || docs.groups[i].label || DEFAULT_GROUP_LABELS[groupId];
        }
      }
    }
    return DEFAULT_GROUP_LABELS[groupId] || groupId;
  }

  function buildSearchIndex(orderedSections, docs) {
    var entries = [];
    orderedSections.forEach(function (sec) {
      var groupLabel = resolveGroupLabel(docs, sec.group);
      var keywords = [sec.title, sec.subtitle || '', sec.lead || '', sec.badge || '', sec.id];

      (sec.blocks || []).forEach(function (b) {
        if (!b) return;
        if (b.type === 'prose' && b.html) {
          keywords.push(stripTags(b.html));
        } else if (b.type === 'callout') {
          keywords.push(b.label || '', b.title || '', b.text || '');
        } else if (b.type === 'code') {
          keywords.push(b.title || '', b.filename || '', b.caption || '', b.code || '');
        } else if (b.type === 'tabs' && Array.isArray(b.tabs)) {
          b.tabs.forEach(function (t) {
            keywords.push(t.label || '', t.filename || '', t.note || '', t.code || '');
          });
        } else if (b.type === 'grid' && Array.isArray(b.cards)) {
          b.cards.forEach(function (c) {
            keywords.push(c.title || '', c.tag || '', c.description || '', c.code || '');
          });
        } else if (b.type === 'table') {
          keywords.push(b.caption || '');
          (b.headers || []).forEach(function (h) { keywords.push(h); });
          (b.rows || []).forEach(function (r) { keywords.push(r.join(' ')); });
        } else if (b.type === 'steps' && Array.isArray(b.items)) {
          b.items.forEach(function (it) {
            keywords.push(it.title || '', it.description || '', it.code || '');
          });
        } else if (b.type === 'simulator' && docs.precedenceSimulator) {
          keywords.push(docs.precedenceSimulator.title || '', docs.precedenceSimulator.description || '');
          (docs.precedenceSimulator.scenarios || []).forEach(function (sc) {
            keywords.push(sc.label || '', sc.summary || '', sc.scopeInfo || '');
          });
        }
      });

      entries.push({
        id: sec.id,
        title: sec.title,
        group: groupLabel,
        snippet: sec.lead || sec.subtitle || '',
        haystack: keywords.join(' ').toLowerCase(),
        titleLower: (sec.title || '').toLowerCase()
      });

      // Add dedicated quick-jump entry for interactive simulator
      if ((sec.blocks || []).some(function (b) { return b && b.type === 'simulator'; })) {
        entries.push({
          id: 'precedence-simulator',
          title: 'Interactive Precedence & Overlay Simulator',
          group: 'Interactive',
          snippet: 'Toggle priority 0..1000 layers, inspect priority conflicts, Settings UI locks (> 375), and post-render output patches.',
          haystack: 'precedence simulator interactive override conflict locked 375 400 1000 force outer_gap pace.level binds overlay json patch',
          titleLower: 'interactive precedence & overlay simulator'
        });
      }
    });

    return entries;
  }

  function renderSidebarAndDocs(docs) {
    var collected = collectOrderedSections(docs);
    var ordered = collected.ordered;
    var byGroup = collected.byGroup;

    // 1. Render Sidebar Navigation
    var navEl = document.getElementById('sidebar-nav');
    if (navEl) {
      navEl.innerHTML = '';
      CANONICAL_GROUPS.forEach(function (gId) {
        var secs = byGroup[gId];
        if (!secs || secs.length === 0) return;

        var groupDiv = document.createElement('div');
        groupDiv.className = 'nav-group';

        var label = document.createElement('div');
        label.className = 'nav-group-label';
        label.textContent = resolveGroupLabel(docs, gId);
        groupDiv.appendChild(label);

        var ul = document.createElement('ul');
        ul.className = 'nav-list';

        secs.forEach(function (sec) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.className = 'nav-link';
          a.href = '#' + sec.id;
          a.dataset.sectionId = sec.id;
          a.innerHTML =
            '<span>' + esc(sec.title) + '</span>' +
            (sec.badge ? '<span class="nav-link-badge">' + esc(sec.badge) + '</span>' : '');
          a.addEventListener('click', function () {
            setMobileNav(false);
          });
          li.appendChild(a);
          ul.appendChild(li);
        });

        groupDiv.appendChild(ul);
        navEl.appendChild(groupDiv);
      });
    }

    // 2. Render Main Documentation Content
    var docContent = document.getElementById('doc-content');
    if (docContent) {
      docContent.innerHTML = '';
      var frag = document.createDocumentFragment();

      ordered.forEach(function (sec) {
        var sectionEl = document.createElement('section');
        sectionEl.className = 'doc-section';
        sectionEl.id = sec.id;
        sectionEl.dataset.sectionTitle = sec.title;

        var groupLabel = resolveGroupLabel(docs, sec.group);

        var header = document.createElement('header');
        header.className = 'section-header';
        header.innerHTML =
          '<div class="section-meta">' +
            '<span class="overline">' + esc(groupLabel) + '</span>' +
            (sec.badge ? '<span class="status-chip tone-accent">' + esc(sec.badge) + '</span>' : '') +
          '</div>' +
          '<h2 class="section-title">' + esc(sec.title) + '</h2>' +
          (sec.subtitle ? '<p class="section-subtitle">' + esc(sec.subtitle) + '</p>' : '') +
          (sec.lead ? '<p class="section-lead">' + renderInlineCode(sec.lead) + '</p>' : '');
        sectionEl.appendChild(header);

        var blocksWrap = document.createElement('div');
        blocksWrap.className = 'section-blocks';

        (sec.blocks || []).forEach(function (block) {
          if (!block || !block.type) return;
          var el = null;
          switch (block.type) {
            case 'prose':
              el = document.createElement('div');
              el.className = 'block-prose';
              el.innerHTML = block.html || '';
              break;
            case 'callout':
              el = renderCalloutBlock(block);
              break;
            case 'code':
              el = renderCodeBlock(block);
              break;
            case 'tabs':
              el = renderTabsBlock(block);
              break;
            case 'grid':
              el = renderGridBlock(block);
              break;
            case 'table':
              el = renderTableBlock(block);
              break;
            case 'steps':
              el = renderStepsBlock(block);
              break;
            case 'simulator':
              el = renderSimulatorBlock(docs.precedenceSimulator);
              break;
          }
          if (el) blocksWrap.appendChild(el);
        });

        sectionEl.appendChild(blocksWrap);
        frag.appendChild(sectionEl);
      });

      docContent.appendChild(frag);
    }

    searchEntries = buildSearchIndex(ordered, docs);
    setupScrollSpy(ordered);
  }

  // ---- Scroll-Spy (Sidebar Active Row + Pill Section Readout) ----

  function setupScrollSpy(orderedSections) {
    if (!orderedSections || orderedSections.length === 0) return;

    var navLinks = Array.prototype.slice.call(document.querySelectorAll('#sidebar-nav .nav-link'));
    var sectionEls = orderedSections
      .map(function (s) { return document.getElementById(s.id); })
      .filter(Boolean);
    var pillSection = document.getElementById('pill-section');
    var activeId = null;

    function setActive(id) {
      if (!id || id === activeId) return;
      activeId = id;
      var activeTitle = '';

      for (var i = 0; i < navLinks.length; i++) {
        var on = navLinks[i].dataset.sectionId === id;
        navLinks[i].classList.toggle('is-active', on);
        if (on) {
          navLinks[i].setAttribute('aria-current', 'location');
        } else {
          navLinks[i].removeAttribute('aria-current');
        }
      }

      for (var j = 0; j < orderedSections.length; j++) {
        if (orderedSections[j].id === id) {
          activeTitle = orderedSections[j].title;
          break;
        }
      }
      if (pillSection && activeTitle) {
        pillSection.textContent = activeTitle;
      }
    }

    setActive(orderedSections[0].id);

    function computeActiveFromScroll() {
      var offset = 120;
      var current = sectionEls[0];
      for (var i = 0; i < sectionEls.length; i++) {
        var rect = sectionEls[i].getBoundingClientRect();
        if (rect.top <= offset) {
          current = sectionEls[i];
        } else {
          break;
        }
      }
      if (current) setActive(current.id);
    }

    if (typeof IntersectionObserver !== 'undefined') {
      var visibleSet = Object.create(null);
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          visibleSet[entry.target.id] = entry.isIntersecting;
        });
        for (var i = 0; i < sectionEls.length; i++) {
          if (visibleSet[sectionEls[i].id]) {
            setActive(sectionEls[i].id);
            return;
          }
        }
        computeActiveFromScroll();
      }, {
        rootMargin: '-12% 0px -70% 0px',
        threshold: 0
      });

      sectionEls.forEach(function (el) { observer.observe(el); });
    }

    var rafPending = false;
    global.addEventListener('scroll', function () {
      if (rafPending) return;
      rafPending = true;
      global.requestAnimationFrame(function () {
        rafPending = false;
        computeActiveFromScroll();
      });
    }, { passive: true });
  }

  // ---- Quick-Find Modal ----

  function openSearchModal() {
    var modal = document.getElementById('search-modal');
    var input = document.getElementById('search-input');
    if (!modal || !input) return;
    setRoomPopout(false);
    setMobileNav(false);
    searchModalOpen = true;
    modal.hidden = false;
    input.value = '';
    filterSearchResults('');
    setTimeout(function () { input.focus(); }, 10);
  }

  function closeSearchModal() {
    var modal = document.getElementById('search-modal');
    if (!modal) return;
    searchModalOpen = false;
    modal.hidden = true;
  }

  function jumpToTarget(id) {
    closeSearchModal();
    var target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      if (global.history && global.history.replaceState) {
        global.history.replaceState(null, '', '#' + id);
      }
    } catch (_) {
      // Ignore history errors on restricted file:// origins
    }
  }

  function filterSearchResults(rawQuery) {
    var q = String(rawQuery || '').trim().toLowerCase();
    var resultsEl = document.getElementById('search-results');
    if (!resultsEl) return;

    if (!q) {
      searchFiltered = searchEntries.slice(0, 14);
    } else {
      var tokens = q.split(/\s+/).filter(Boolean);
      searchFiltered = searchEntries
        .map(function (entry) {
          var score = 0;
          for (var i = 0; i < tokens.length; i++) {
            var tok = tokens[i];
            if (entry.titleLower.indexOf(tok) !== -1) {
              score += 10;
            } else if (entry.haystack.indexOf(tok) !== -1) {
              score += 3;
            } else {
              return null;
            }
          }
          if (entry.titleLower.indexOf(q) === 0) score += 8;
          return { entry: entry, score: score };
        })
        .filter(Boolean)
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 12)
        .map(function (x) { return x.entry; });
    }

    searchSelectedIdx = 0;
    renderSearchResultsList();
  }

  function renderSearchResultsList() {
    var resultsEl = document.getElementById('search-results');
    if (!resultsEl) return;

    if (searchFiltered.length === 0) {
      resultsEl.innerHTML = '<div class="search-empty">No matching Malm 3 sections or topics.</div>';
      return;
    }

    resultsEl.innerHTML = searchFiltered.map(function (item, idx) {
      var sel = idx === searchSelectedIdx;
      return (
        '<button type="button" class="search-result-item' + (sel ? ' is-selected' : '') + '"' +
          ' role="option" aria-selected="' + (sel ? 'true' : 'false') + '"' +
          ' data-result-idx="' + idx + '">' +
          '<div class="search-result-top">' +
            '<span class="search-result-title">' + esc(item.title) + '</span>' +
            '<span class="search-result-group">' + esc(item.group) + '</span>' +
          '</div>' +
          '<div class="search-result-snippet">' + esc(item.snippet) + '</div>' +
        '</button>'
      );
    }).join('');
  }

  function updateSearchSelection(nextIdx) {
    if (searchFiltered.length === 0) return;
    searchSelectedIdx = (nextIdx + searchFiltered.length) % searchFiltered.length;
    var items = document.querySelectorAll('#search-results .search-result-item');
    for (var i = 0; i < items.length; i++) {
      var sel = i === searchSelectedIdx;
      items[i].classList.toggle('is-selected', sel);
      items[i].setAttribute('aria-selected', sel ? 'true' : 'false');
      if (sel && typeof items[i].scrollIntoView === 'function') {
        items[i].scrollIntoView({ block: 'nearest' });
      }
    }
  }

  // ---- Wire Global Controls & Keyboard Shortcuts ----

  function bindChromeEvents(docs) {
    // Hydrate hero metadata
    if (docs.meta) {
      var verEl = document.getElementById('hero-version');
      if (verEl && docs.meta.version) {
        verEl.textContent = docs.meta.version.indexOf('Herda') !== -1
          ? docs.meta.version
          : docs.meta.version + ' · Herda';
      }
      var cmdEl = document.getElementById('hero-quick-cmd');
      if (cmdEl && docs.meta.quickStartCmd) {
        cmdEl.textContent = docs.meta.quickStartCmd;
      }
    }

    // Hero copy command button
    var heroCopyBtn = document.getElementById('hero-copy-btn');
    if (heroCopyBtn) {
      heroCopyBtn.addEventListener('click', function () {
        var cmdEl = document.getElementById('hero-quick-cmd');
        var text = cmdEl ? cmdEl.textContent : '';
        copyToClipboard(text, heroCopyBtn, 'Copied quick start command');
      });
    }

    // Hero Quick Find button
    var heroSearchBtn = document.getElementById('hero-search-btn');
    if (heroSearchBtn) {
      heroSearchBtn.addEventListener('click', openSearchModal);
    }

    // Mobile drawer controls
    var navToggle = document.getElementById('nav-toggle');
    var navBackdrop = document.getElementById('nav-backdrop');
    if (navToggle) {
      navToggle.addEventListener('click', function () {
        setMobileNav(!mobileNavOpen);
      });
    }
    if (navBackdrop) {
      navBackdrop.addEventListener('click', function () {
        setMobileNav(false);
      });
    }

    // Pill Room Pop-out toggle
    var pillRoomBtn = document.getElementById('pill-room-btn');
    if (pillRoomBtn) {
      pillRoomBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        setRoomPopout(!roomPopoutOpen);
      });
    }

    // Close Room Pop-out on outside click
    document.addEventListener('click', function (e) {
      if (!roomPopoutOpen) return;
      var popout = document.getElementById('room-popout');
      var pillBtn = document.getElementById('pill-room-btn');
      if (popout && !popout.contains(e.target) && pillBtn && !pillBtn.contains(e.target)) {
        setRoomPopout(false);
      }
    });

    // Pill Mode toggle (night -> day -> hc)
    var pillModeBtn = document.getElementById('pill-mode-btn');
    if (pillModeBtn) {
      pillModeBtn.addEventListener('click', function () {
        var cur = document.documentElement.dataset.mode || 'night';
        var next = MODES[(MODES.indexOf(cur) + 1) % MODES.length];
        applyMode(next, true);
      });
    }

    // Pill Search button
    var pillSearchBtn = document.getElementById('pill-search-btn');
    if (pillSearchBtn) {
      pillSearchBtn.addEventListener('click', openSearchModal);
    }

    // Search Modal controls
    var searchBackdrop = document.getElementById('search-backdrop');
    var searchClose = document.getElementById('search-close');
    var searchInput = document.getElementById('search-input');
    var searchResults = document.getElementById('search-results');

    if (searchBackdrop) searchBackdrop.addEventListener('click', closeSearchModal);
    if (searchClose) searchClose.addEventListener('click', closeSearchModal);

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterSearchResults(searchInput.value);
      });
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          updateSearchSelection(searchSelectedIdx + 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          updateSearchSelection(searchSelectedIdx - 1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          var picked = searchFiltered[searchSelectedIdx];
          if (picked) jumpToTarget(picked.id);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeSearchModal();
        }
      });
    }

    if (searchResults) {
      searchResults.addEventListener('click', function (e) {
        var item = e.target.closest('.search-result-item');
        if (!item) return;
        var idx = parseInt(item.getAttribute('data-result-idx'), 10);
        if (!isNaN(idx) && searchFiltered[idx]) {
          jumpToTarget(searchFiltered[idx].id);
        }
      });
    }

    // Global keyboard shortcuts: '/', Ctrl+K / Cmd+K, Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (searchModalOpen) closeSearchModal();
        if (roomPopoutOpen) setRoomPopout(false);
        if (mobileNavOpen) setMobileNav(false);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchModalOpen) closeSearchModal();
        else openSearchModal();
        return;
      }

      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
        var isEditable = tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable);
        if (!isEditable && !searchModalOpen) {
          e.preventDefault();
          openSearchModal();
        }
      }
    });
  }

  // ---- Boot ----

  function boot() {
    var docContent = document.getElementById('doc-content');
    if (!global.MalmDocs || !global.MalmSyntax) {
      if (docContent) {
        docContent.innerHTML =
          '<div class="callout callout--danger">' +
            '<div class="callout-icon">' + iconSvg('danger', 18) + '</div>' +
            '<div class="callout-body">' +
              '<div class="callout-head">' +
                '<span class="callout-label">Load Error</span>' +
                '<h4 class="callout-title">Missing Malm documentation scripts</h4>' +
              '</div>' +
              '<p class="callout-text">Ensure js/syntax.js, js/content-lang.js, and js/content-overrides.js load before js/app.js.</p>' +
            '</div>' +
          '</div>';
      }
      return;
    }

    renderRoomControls();

    var savedMode = storageGet(STORAGE_MODE_KEY) || document.documentElement.dataset.mode || 'night';
    var savedRoom = storageGet(STORAGE_ROOM_KEY) || document.documentElement.dataset.room || '1';
    applyMode(savedMode, false);
    applyRoom(savedRoom, false);

    renderSidebarAndDocs(global.MalmDocs);
    bindChromeEvents(global.MalmDocs);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
