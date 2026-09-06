/* 应用：书架 → 书籍 → 章节 三视图 + hash 路由 */
(function () {
  'use strict';

  var DATA = window.READING_DATA;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  var state = { view: 'shelf', bookId: null, chId: null, mm: null, tab: 'mindmap' };

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
      if (getBook(b)) return { view: c ? 'chapter' : 'book', bookId: b, chId: c };
    }
    return { view: 'shelf', bookId: null, chId: null };
  }

  window.addEventListener('hashchange', boot);
  document.addEventListener('DOMContentLoaded', boot);

  function boot() {
    state = hashState();
    if (state.view === 'book') renderBook();
    else if (state.view === 'chapter') renderChapter();
    else renderShelf();
    window.scrollTo(0, 0);
  }

  /* ---------------- 书架 ---------------- */
  function renderShelf() {
    document.title = DATA.libraryName;
    var app = $('#app');
    app.innerHTML = '';

    var header = el('header', 'site-head');
    header.appendChild(el('h1', 'site-title', '&#128218; ' + esc(DATA.libraryName)));
    header.appendChild(el('p', 'site-sub', '点击书籍查看读书笔记：全书概括 → 每章思维导图与要点提炼'));
    app.appendChild(header);

    var grid = el('div', 'shelf-grid');
    DATA.books.forEach(function (book) {
      var card = el('a', 'book-card', '');
      card.href = '#/book/' + book.id;

      var cover = el('div', 'book-cover');
      cover.style.background = 'linear-gradient(150deg, ' + book.cover.from + ' 0%, ' + book.cover.to + ' 78%)';
      cover.style.borderColor = book.cover.accent;
      var cv = el('div', 'book-cover-inner');
      cv.appendChild(el('div', 'book-cover-title', esc(book.title)));
      cv.appendChild(el('div', 'book-cover-author', esc(book.author)));
      cover.appendChild(cv);

      var meta = el('div', 'book-meta');
      meta.appendChild(el('div', 'book-tagline', esc(book.tagline)));
      meta.appendChild(el('div', 'book-info', esc(book.role) + ' · ' + book.chapters.length + ' 章'));

      var foot = el('div', 'book-footer');
      var kws = el('div', 'book-kws');
      book.keywords.slice(0, 4).forEach(function (k) { kws.appendChild(el('span', 'chip', esc(k))); });
      foot.appendChild(kws);
      foot.appendChild(el('span', 'book-arrow', '&#8594;'));

      card.appendChild(cover);
      card.appendChild(meta);
      card.appendChild(foot);
      grid.appendChild(card);
    });
    app.appendChild(grid);

    var tip = el('div', 'shelf-tip');
    tip.innerHTML = '提示：思维导图节点可点击折叠/展开，工具栏支持缩放。新增书籍与章节请编辑 <code>assets/js/data.js</code>（见 README）。';
    app.appendChild(tip);
  }

  /* ---------------- 书籍详情 ---------------- */
  function renderBook() {
    var book = getBook(state.bookId);
    if (!book) return renderShelf();
    document.title = book.title + ' · ' + DATA.libraryName;
    var app = $('#app');
    app.innerHTML = '';

    var back = el('a', 'nav-back', '&#8592; 返回书架');
    back.href = '#/';
    app.appendChild(back);

    var head = el('div', 'book-head');
    var cover = el('div', 'book-cover book-cover-lg');
    cover.style.background = 'linear-gradient(150deg, ' + book.cover.from + ' 0%, ' + book.cover.to + ' 78%)';
    cover.style.borderColor = book.cover.accent;
    var cv = el('div', 'book-cover-inner');
    cv.appendChild(el('div', 'book-cover-title', esc(book.title)));
    cv.appendChild(el('div', 'book-cover-author', esc(book.author)));
    cover.appendChild(cv);

    var info = el('div', 'book-info-box');
    info.appendChild(el('h2', 'book-title-lg', esc(book.title)));
    info.appendChild(el('div', 'book-sub', esc(book.fullTitle)));
    info.appendChild(el('div', 'book-roles', esc(book.author) + ' · ' + esc(book.role)));
    info.appendChild(el('div', 'book-readdate', esc(book.readDate)));
    var kws = el('div', 'book-kws lg');
    book.keywords.forEach(function (k) { kws.appendChild(el('span', 'chip', esc(k))); });
    info.appendChild(kws);
    head.appendChild(cover);
    head.appendChild(info);
    app.appendChild(head);

    var summary = el('section', 'panel');
    summary.appendChild(el('h3', 'panel-title', '全书概括'));
    var p = el('div', 'summary-text');
    book.summary.forEach(function (s) { p.appendChild(el('p', '', esc(s))); });
    summary.appendChild(p);
    app.appendChild(summary);

    var chap = el('section', 'panel');
    chap.appendChild(el('h3', 'panel-title', '章节目录（' + book.chapters.length + ' 章）'));
    var list = el('div', 'chapter-list');
    book.chapters.forEach(function (ch) {
      var row = el('a', 'chapter-row', '');
      row.href = '#/book/' + book.id + '/' + ch.id;
      var no = el('span', 'chapter-no', ch.no < 10 ? '0' + ch.no : ch.no);
      var body = el('div', 'chapter-body');
      body.appendChild(el('div', 'chapter-title', esc(ch.title)));
      body.appendChild(el('div', 'chapter-tagline', esc(ch.tagline)));
      var right = el('span', 'chapter-arrow', '导图 + 提炼 &#8599;');
      row.appendChild(no);
      row.appendChild(body);
      row.appendChild(right);
      list.appendChild(row);
    });
    chap.appendChild(list);
    app.appendChild(chap);

    var map = el('section', 'panel');
    map.appendChild(el('h3', 'panel-title', '全书思维导图'));
    var tools = el('div', 'mm-tools');
    tools.appendChild(mmButton('缩小', function () { if (state.mm) state.mm.zoom(1 / 1.2); }));
    tools.appendChild(mmButton('放大', function () { if (state.mm) state.mm.zoom(1.2); }));
    tools.appendChild(mmButton('适应屏幕', function () { if (state.mm) state.mm.fit(); }));
    map.appendChild(tools);
    var mmc = el('div', 'mindmap');
    map.appendChild(mmc);
    app.appendChild(map);

    state.mm = new window.MindMap(mmc, {
      t: '《' + book.title + '》导读',
      c: book.chapters.map(function (ch, i) {
        var sub = ch.mindmap.c.map(function (g) { return { t: g.t }; });
        return { t: '第' + ch.no + '章 ' + ch.title, c: sub };
      })
    });
    state.tab = null;
  }

  function mmButton(label, fn) {
    var b = el('button', 'mm-tool', label);
    b.addEventListener('click', fn);
    return b;
  }

  /* ---------------- 章节详情 ---------------- */
  function renderChapter() {
    var book = getBook(state.bookId);
    var ch = book && getChapter(book, state.chId);
    if (!book || !ch) return renderBook();
    document.title = ch.title + ' · ' + book.title;
    var app = $('#app');
    app.innerHTML = '';

    var back = el('a', 'nav-back', '&#8592; ' + esc(book.title));
    back.href = '#/book/' + book.id;
    app.appendChild(back);

    var head = el('div', 'ch-head');
    var no = el('span', 'ch-no', '第' + ch.no + '章');
    head.appendChild(no);
    head.appendChild(el('h2', 'ch-title', esc(ch.title)));
    head.appendChild(el('p', 'ch-tagline', esc(ch.tagline)));
    var kws = el('div', 'book-kws lg');
    ch.keywords.forEach(function (k) { kws.appendChild(el('span', 'chip', esc(k))); });
    head.appendChild(kws);
    app.appendChild(head);

    var tabs = el('div', 'tabs');
    var tabsDef = [
      { key: 'mindmap', label: '思维导图' },
      { key: 'notes', label: '文字提炼' },
      { key: 'audio', label: '音频口播' }
    ];
    state.tab = 'mindmap';
    tabsDef.forEach(function (t) {
      var btn = el('button', 'tab' + (t.key === state.tab ? ' active' : ''), t.label);
      btn.setAttribute('data-key', t.key);
      btn.addEventListener('click', function () {
        setTab(book, ch, t.key);
      });
      tabs.appendChild(btn);
    });
    app.appendChild(tabs);

    app.setAttribute('data-ch', ch.id);
    var content = el('div', 'tab-content');
    app.appendChild(content);
    renderTab(book, ch, 'mindmap', content);

    var nav = el('div', 'ch-nav');
    var idx = book.chapters.indexOf(ch);
    if (idx > 0) {
      var prev = el('a', 'ch-nav-link', '上一章：' + esc(book.chapters[idx - 1].title));
      prev.href = '#/book/' + book.id + '/' + book.chapters[idx - 1].id;
      nav.appendChild(prev);
    }
    if (idx < book.chapters.length - 1) {
      var next = el('a', 'ch-nav-link next', '下一章：' + esc(book.chapters[idx + 1].title));
      next.href = '#/book/' + book.id + '/' + book.chapters[idx + 1].id;
      nav.appendChild(next);
    }
    app.appendChild(nav);
  }

  function setTab(book, ch, key) {
    state.tab = key;
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-key') === key);
    }
    var content = $('.tab-content');
    renderTab(book, ch, key, content);
  }

  function renderTab(book, ch, key, content) {
    content.innerHTML = '';
    if (key === 'mindmap') renderMindmapTab(ch, content);
    else if (key === 'notes') renderNotesTab(ch, content);
    else renderAudioTab(ch, content);
  }

  function renderMindmapTab(ch, content) {
    var tools = el('div', 'mm-tools');
    tools.appendChild(mmButton('缩小', function () { if (state.mm) state.mm.zoom(1 / 1.2); }));
    tools.appendChild(mmButton('放大', function () { if (state.mm) state.mm.zoom(1.2); }));
    tools.appendChild(mmButton('适应屏幕', function () { if (state.mm) state.mm.fit(); }));
    tools.appendChild(el('span', 'mm-hint', '点击节点可折叠 / 展开'));
    content.appendChild(tools);
    var mmc = el('div', 'mindmap tab-mindmap');
    content.appendChild(mmc);
    state.mm = new window.MindMap(mmc, ch.mindmap);
  }

  function renderNotesTab(ch, content) {
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

  function renderAudioTab(ch, content) {
    var box = el('div', 'audio-panel');
    if (ch.audio && ch.audio.src) {
      box.appendChild(el('h4', 'audio-title', esc(ch.audio.title || ch.title + ' · 口播音频')));
      var player = el('audio', 'audio-player');
      player.controls = true;
      player.preload = 'none';
      player.src = ch.audio.src;
      box.appendChild(player);
      if (ch.audio.transcript) {
        box.appendChild(el('p', 'audio-transcript', esc(ch.audio.transcript)));
      }
    } else {
      var ph = el('div', 'audio-placeholder');
      ph.appendChild(el('div', 'audio-ico', ''));
      ph.appendChild(el('h4', 'audio-title', '本章音频口播制作中'));
      ph.appendChild(el('p', 'audio-desc', '准备好录音后将音频文件放入 assets/audio/ 目录，并在 data.js 本章的 audio 字段填入路径即可播放。'));
      box.appendChild(ph);
    }
    content.appendChild(box);
  }

  boot();
})();