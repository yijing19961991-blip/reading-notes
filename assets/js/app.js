/* 应用：书架 → 书籍页（简介/章节要点/音频口播 页签切换）→ 章节页（思维导图/文字提炼 页签切换）+ hash 路由 */
(function () {
  'use strict';

  var DATA = window.READING_DATA;
  var $ = function (sel) { return document.querySelector(sel); };
  var el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  var state = {
    view: 'shelf', bookId: null, chId: null,
    bookTab: 'intro', chapTab: 'mindmap'
  };

  var activeTune = null; // 当前章节页正在播放的音频 {audio, icon}

  function stopActiveTune() {
    if (activeTune) {
      if (activeTune.audio && !activeTune.audio.paused) activeTune.audio.pause();
      activeTune = null;
    }
  }

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function getBook(id) {
    for (var i = 0; i < DATA.books.length; i++) if (DATA.books[i].id === id) return DATA.books[i];
    return null;
  }

  function getChapter(book, chId) {
    for (var i = 0; i < book.chapters.length; i++) if (book.chapters[i].id === chId) return book.chapters[i];
    return null;
  }

  function hashState() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'book') {
      var b = parts[1], c = parts[2] || null;
      if (getBook(b)) return { view: 'book', bookId: b, chId: c };
    }
    return { view: 'shelf', bookId: null, chId: null };
  }

  window.addEventListener('hashchange', boot);
  document.addEventListener('DOMContentLoaded', boot);

  function boot() {
    stopActiveTune();
    var hs = hashState();
    if (hs.view === 'book') {
      if (hs.bookId !== state.bookId) { state.bookTab = 'intro'; }
      if (hs.chId !== state.chId) { state.chapTab = 'mindmap'; }
      state.view = 'book';
      state.bookId = hs.bookId;
      state.chId = hs.chId;
      if (state.chId) renderChapter();
      else renderBook();
    } else {
      state.view = 'shelf';
      state.chId = null;
      renderShelf();
    }
    if (state.view !== 'book' || !state.chId) window.scrollTo(0, 0);
  }

  /* ---------------- 封面 ---------------- */
  function coverEl(book, extraCls) {
    var cv = el('div', 'book-cover' + (extraCls || ''));
    if (book.cover && book.cover.img) {
      cv.classList.add('has-img');
      var img = new Image();
      img.className = 'cover-img';
      img.src = book.cover.img;
      img.alt = book.title;
      cv.appendChild(img);
    } else {
      cv.style.background = 'linear-gradient(150deg, ' + book.cover.from + ' 0%, ' + book.cover.to + ' 78%)';
      cv.style.borderColor = book.cover.accent;
      var inn = el('div', 'book-cover-inner');
      inn.appendChild(el('div', 'book-cover-title', esc(book.title)));
      inn.appendChild(el('div', 'book-cover-author', esc(book.author)));
      cv.appendChild(inn);
    }
    return cv;
  }

  /* ---------------- 书架 ---------------- */
  function renderShelf() {
    document.title = DATA.libraryName;
    var app = $('#app'); app.innerHTML = '';
    var header = el('header', 'site-head');
    header.appendChild(el('h1', 'site-title', '&#128218; ' + esc(DATA.libraryName)));
    header.appendChild(el('p', 'site-sub', '点击书籍查看读书笔记'));
    app.appendChild(header);

    var grid = el('div', 'shelf-grid');
    DATA.books.forEach(function (book) {
      var card = el('a', 'book-card');
      card.href = '#/book/' + book.id;
      card.appendChild(coverEl(book));
      var meta = el('div', 'book-meta');
      meta.appendChild(el('div', 'book-tagline', esc(book.tagline)));
      meta.appendChild(el('div', 'book-info', esc(book.role) + ' · ' + book.chapters.length + ' 章'));
      card.appendChild(meta);
      var foot = el('div', 'book-footer');
      var kws = el('div', 'book-kws');
      book.keywords.slice(0, 4).forEach(function (k) { kws.appendChild(el('span', 'chip', esc(k))); });
      foot.appendChild(kws);
      foot.appendChild(el('span', 'book-arrow', '&#8594;'));
      card.appendChild(foot);
      grid.appendChild(card);
    });
    app.appendChild(grid);

    var tip = el('div', 'shelf-tip');
    tip.innerHTML = '提示：导图节点可点击折叠/展开，工具栏支持缩放。新增书籍与章节请编辑 <code>assets/js/data.js</code>（见 README）。';
    app.appendChild(tip);
  }

  /* ---------------- 书籍页：三个页签切换 ---------------- */
  function renderBook() {
    var book = getBook(state.bookId);
    if (!book) return renderShelf();
    document.title = book.title + ' · ' + DATA.libraryName;
    var app = $('#app'); app.innerHTML = '';

    var back = el('a', 'nav-back', '&#8592; 返回书架');
    back.href = '#/';
    app.appendChild(back);

    var head = el('div', 'book-head');
    head.appendChild(coverEl(book, ' book-cover-lg'));
    var info = el('div', 'book-info-box');
    info.appendChild(el('h2', 'book-title-lg', esc(book.title)));
    info.appendChild(el('div', 'book-sub', esc(book.fullTitle)));
    info.appendChild(el('div', 'book-roles', esc(book.author) + ' · ' + esc(book.role)));
    info.appendChild(el('div', 'book-readdate', esc(book.readDate)));
    var kws = el('div', 'book-kws lg');
    book.keywords.forEach(function (k) { kws.appendChild(el('span', 'chip', esc(k))); });
    info.appendChild(kws);
    head.appendChild(info);
    app.appendChild(head);

    var tabs = el('div', 'tabs book-tabs');
    var defs = [['intro', '书籍简介'], ['chapters', '章节要点'], ['audio', '音频口播']];
    var contentBox = el('div', 'book-tab-content');
    defs.forEach(function (kv) {
      var b = el('button', 'tab', kv[1]);
      b.setAttribute('data-key', kv[0]);
      b.addEventListener('click', function () {
        if (state.bookTab === kv[0]) return;
        state.bookTab = kv[0];
        setActiveTabs(tabs, kv[0]);
        renderBookTab(book, contentBox);
      });
      tabs.appendChild(b);
    });
    setActiveTabs(tabs, state.bookTab);
    app.appendChild(tabs);
    app.appendChild(contentBox);
    renderBookTab(book, contentBox);
  }

  function setActiveTabs(container, key) {
    var list = container.querySelectorAll('.tab');
    for (var i = 0; i < list.length; i++) {
      list[i].classList.toggle('active', list[i].getAttribute('data-key') === key);
    }
  }

  function renderBookTab(book, content) {
    content.innerHTML = '';
    if (state.bookTab === 'intro') renderIntro(book, content);
    else if (state.bookTab === 'chapters') renderChapters(book, content);
    else renderAudioAll(book, content);
  }

  /* ---- 书籍简介：概括 + 全书思维导图 ---- */
  function renderIntro(book, content) {
    var summary = el('section', 'panel');
    summary.appendChild(el('h3', 'panel-title', '书籍简介'));
    var p = el('div', 'summary-text');
    book.summary.forEach(function (s) { p.appendChild(el('p', '', esc(s))); });
    summary.appendChild(p);
    content.appendChild(summary);

    var map = el('section', 'panel');
    map.appendChild(el('h3', 'panel-title', '全书思维导图'));
    var tools = el('div', 'mm-tools');
    var mb = {};
    tools.appendChild(mmButton('缩小', function () { if (mb.m) mb.m.zoom(1 / 1.2); }));
    tools.appendChild(mmButton('放大', function () { if (mb.m) mb.m.zoom(1.2); }));
    tools.appendChild(mmButton('适应屏幕', function () { if (mb.m) mb.m.fit(); }));
    map.appendChild(tools);
    var mmc = el('div', 'mindmap');
    map.appendChild(mmc);
    content.appendChild(map);
    mb.m = new window.MindMap(mmc, {
      t: '《' + book.title + '》导读',
      c: book.chapters.map(function (ch) {
        return { t: '第' + ch.no + '章 ' + ch.title, c: ch.mindmap.c.map(function (g) { return { t: g.t }; }) };
      })
    });
  }

  /* ---- 章节要点：章节列表，点击进入章节页 ---- */
  function renderChapters(book, content) {
    var list = el('div', 'chapter-list');
    book.chapters.forEach(function (ch) {
      var row = el('a', 'chapter-row');
      row.href = '#/book/' + book.id + '/' + ch.id;
      row.appendChild(el('span', 'chapter-no', ch.no < 10 ? '0' + ch.no : ch.no));
      var body = el('div', 'chapter-body');
      body.appendChild(el('div', 'chapter-title', esc(ch.title)));
      body.appendChild(el('div', 'chapter-tagline', esc(ch.tagline)));
      row.appendChild(body);
      row.appendChild(el('span', 'chapter-arrow', '进入 &#8250;'));
      list.appendChild(row);
    });
    content.appendChild(list);
  }

  /* ---- 音频口播：一页展示全部章节合集 ---- */
  function renderAudioAll(book, content) {
    var intro = el('p', 'audio-note', '以下为全书各章音频口播合集：');
    content.appendChild(intro);
    book.chapters.forEach(function (ch) {
      var item = el('div', 'audio-item panel');
      item.appendChild(el('h4', 'audio-title', '第' + ch.no + '章 · ' + esc(ch.title)));
      if (ch.audio && ch.audio.src) {
        var pl = document.createElement('audio');
        pl.className = 'audio-player';
        pl.controls = true;
        pl.preload = 'none';
        pl.src = ch.audio.src;
        item.appendChild(pl);
        if (ch.audio.transcript) item.appendChild(el('p', 'audio-transcript', esc(ch.audio.transcript)));
      } else {
        item.appendChild(el('div', 'audio-mini', '本章音频口播制作中'));
      }
      content.appendChild(item);
    });
  }

  /* ================ 章节页：思维导图 / 文字提炼 两个页签 ================ */
  function renderChapter() {
    var book = getBook(state.bookId), ch = state.chId && getChapter(book, state.chId);
    if (!book || !ch) return renderBook();
    document.title = '第' + ch.no + '章 ' + ch.title + ' · ' + book.title;
    var app = $('#app'); app.innerHTML = '';

    var back = el('a', 'nav-back', '&#8592; ' + esc(book.title));
    back.href = '#/book/' + book.id;
    app.appendChild(back);

    var head = el('div', 'book-head');
    var info = el('div', 'book-info-box');
    info.appendChild(el('h2', 'book-title-lg', '第' + ch.no + '章 ' + esc(ch.title)));
    info.appendChild(el('div', 'book-sub', esc(ch.tagline)));
    var kws = el('div', 'book-kws lg');
    ch.keywords.forEach(function (k) { kws.appendChild(el('span', 'chip', esc(k))); });
    info.appendChild(kws);
    head.appendChild(info);
    app.appendChild(head);

    if (ch.audio && ch.audio.src) app.appendChild(buildChapterPlayer(ch));

    var tabs = el('div', 'tabs book-tabs');
    var defs = [['mindmap', '思维导图'], ['notes', '文字提炼']];
    var contentBox = el('div', 'book-tab-content');
    defs.forEach(function (kv) {
      var b = el('button', 'tab', kv[1]);
      b.setAttribute('data-key', kv[0]);
      b.addEventListener('click', function () {
        if (state.chapTab === kv[0]) return;
        state.chapTab = kv[0];
        setActiveTabs(tabs, kv[0]);
        renderChapterTab(book, ch, contentBox);
      });
      tabs.appendChild(b);
    });
    setActiveTabs(tabs, state.chapTab);
    app.appendChild(tabs);
    app.appendChild(contentBox);
    renderChapterTab(book, ch, contentBox);
  }

  function renderChapterTab(book, ch, content) {
    content.innerHTML = '';
    if (state.chapTab === 'notes') renderNotes(ch, content);
    else {
      var tools = el('div', 'mm-tools');
      var mb = {};
      tools.appendChild(mmButton('缩小', function () { if (mb.m) mb.m.zoom(1 / 1.2); }));
      tools.appendChild(mmButton('放大', function () { if (mb.m) mb.m.zoom(1.2); }));
      tools.appendChild(mmButton('适应屏幕', function () { if (mb.m) mb.m.fit(); }));
      tools.appendChild(el('span', 'mm-hint', '点击节点可折叠 / 展开'));
      content.appendChild(tools);
      var mmc = el('div', 'mindmap');
      content.appendChild(mmc);
      mb.m = new window.MindMap(mmc, ch.mindmap);
    }
  }

  /* ---- 章节页内联音频播放器：播放/暂停 + 可拖进度条，切页签不断播 ---- */
  function buildChapterPlayer(ch) {
    var wrap = el('div', 'chap-audio');
    var btn = el('button', 'audio-btn', '&#9654;');
    btn.setAttribute('aria-label', '播放/暂停本章音频口播');
    var label = el('span', 'audio-label', '本章音频口播');
    var seek = document.createElement('input');
    seek.type = 'range';
    seek.className = 'audio-seek';
    seek.min = 0;
    seek.max = 0;
    seek.step = 'any';
    seek.value = 0;
    var cur = el('span', 'audio-time', '0:00');
    var dur = el('span', 'audio-time', '0:00');
    var audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = ch.audio.src;
    audio.addEventListener('loadedmetadata', function () {
      seek.max = Math.max(audio.duration || 0, 0);
      dur.textContent = fmtTime(audio.duration);
    });
    audio.addEventListener('timeupdate', function () {
      seek.value = audio.currentTime;
      cur.textContent = fmtTime(audio.currentTime);
    });
    audio.addEventListener('play', function () { btn.innerHTML = '&#10074;&#10074;'; });
    audio.addEventListener('pause', function () { btn.innerHTML = '&#9654;'; });
    audio.addEventListener('ended', function () { btn.innerHTML = '&#9654;'; cur.textContent = '0:00'; seek.value = 0; activeTune = null; });
    btn.addEventListener('click', function () {
      if (audio.paused) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
      else audio.pause();
    });
    seek.addEventListener('input', function () {
      var t = parseFloat(seek.value);
      if (isFinite(t)) {
        audio.currentTime = t;
        cur.textContent = fmtTime(t);
      }
    });
    wrap.appendChild(btn);
    wrap.appendChild(label);
    wrap.appendChild(seek);
    wrap.appendChild(cur);
    wrap.appendChild(dur);
    activeTune = { audio: audio, icon: btn };
    return wrap;
  }

  function renderNotes(ch, content) {
    ch.notes.forEach(function (block) {
      var sec = el('div', 'note-block');
      sec.appendChild(el('h4', 'note-h', esc(block.h)));
      var ul = el('ul', 'note-items');
      block.items.forEach(function (it) {
        var li = el('li', 'note-item', '<span class="note-mark"></span>' + esc(it));
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      content.appendChild(sec);
    });
  }

  function mmButton(label, fn) {
    var b = el('button', 'mm-tool', label);
    b.addEventListener('click', fn);
    return b;
  }

  boot();
})();