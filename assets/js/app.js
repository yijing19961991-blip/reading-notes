/* 应用：书架 → 书籍页（简介 / 章节要点 / 音频口播 三区平行展示）+ hash 路由 */
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

  var state = {
    view: 'shelf', bookId: null, chId: null,
    chapOpen: null, chapTabs: {}
  };

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
    state = hashState();
    state.chapOpen = null;
    state.chapTabs = {};
    if (state.view === 'book') {
      if (state.chId) state.chapOpen = state.chId;
      renderBook();
    } else renderShelf();
    window.scrollTo(0, 0);
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
    var app = $('#app');
    app.innerHTML = '';

    var header = el('header', 'site-head');
    header.appendChild(el('h1', 'site-title', '&#128218; ' + esc(DATA.libraryName)));
    header.appendChild(el('p', 'site-sub', '点击书籍查看读书笔记：书籍简介 → 章节要点（导图+提炼）→ 音频口播'));
    app.appendChild(header);

    var grid = el('div', 'shelf-grid');
    DATA.books.forEach(function (book) {
      var card = el('a', 'book-card', '');
      card.href = '#/book/' + book.id;

      card.appendChild(coverEl(book, ''));

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

  /* ================ 书籍页：三区平行展示 ================ */
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

    /* 顶部锚点导航：三区快速跳转 */
    var nav = [
      { id: 'sec-intro', label: '一、书籍简介' },
      { id: 'sec-chapters', label: '二、章节要点（' + book.chapters.length + ' 章）' },
      { id: 'sec-audio', label: '三、音频口播合集' }
    ];
    var tabs = el('div', 'tabs book-tabs');
    nav.forEach(function (n) {
      var b = el('button', 'tab jump', n.label);
      b.addEventListener('click', function () {
        var sec = document.getElementById(n.id);
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      tabs.appendChild(b);
    });
    app.appendChild(tabs);

    /* 区一：书籍简介 + 全书思维导图 */
    var secIntro = el('section', 'panel book-section');
    secIntro.id = 'sec-intro';
    var introInner = el('div', '');
    introInner.appendChild(el('h3', 'panel-title', '书籍简介'));
    var sum = el('div', 'summary-text');
    book.summary.forEach(function (s) { sum.appendChild(el('p', '', esc(s))); });
    introInner.appendChild(sum);
    app.appendChild(secIntro);
    var bookMap = el('div', 'book-map');
    bookMap.appendChild(el('h3', 'panel-title sub', '全书思维导图'));
    var tools1 = el('div', 'mm-tools');
    var mb1 = {};
    tools1.appendChild(mmButton('缩小', function () { if (mb1.m) mb1.m.zoom(1 / 1.2); }));
    tools1.appendChild(mmButton('放大', function () { if (mb1.m) mb1.m.zoom(1.2); }));
    tools1.appendChild(mmButton('适应屏幕', function () { if (mb1.m) mb1.m.fit(); }));
    bookMap.appendChild(tools1);
    var mmc1 = el('div', 'mindmap');
    bookMap.appendChild(mmc1);
    secIntro.appendChild(introInner);
    secIntro.appendChild(introInner);
    secIntro.appendChild(bookMap);
    mb1.m = new window.MindMap(mmc1, {
      t: '《' + book.title + '》导读',
      c: book.chapters.map(function (ch) {
        return { t: '第' + ch.no + '章 ' + ch.title, c: ch.mindmap.c.map(function (g) { return { t: g.t }; }) };
      })
    });

    /* 区二：章节要点（每章可展开：思维导图 + 文字提炼） */
    var secChapters = el('section', 'panel book-section');
    secChapters.id = 'sec-chapters';
    secChapters.appendChild(el('h3', 'panel-title', '章节要点'));
    app.appendChild(secChapters);
    renderChapters(book, secChapters);

    /* 区三：音频口播合集 */
    var secAudio = el('section', 'panel book-section');
    secAudio.id = 'sec-audio';
    secAudio.appendChild(el('h3', 'panel-title', '音频口播合集'));
    app.appendChild(secAudio);
    renderAudioAll(book, secAudio);
  }

  /* ---- 区二：章节列表，每章展开含思维导图 + 文字提炼 ---- */
  function renderChapters(book, content) {
    var list = el('div', 'chapter-list');
    book.chapters.forEach(function (ch) {
      var open = ch.id === state.chapOpen;
      var item = el('div', 'chap-item' + (open ? ' open' : ''));

      var head = el('div', 'chap-head');
      head.appendChild(el('span', 'chapter-no', ch.no < 10 ? '0' + ch.no : ch.no));
      var body = el('div', 'chapter-body');
      body.appendChild(el('div', 'chapter-title', esc(ch.title)));
      body.appendChild(el('div', 'chapter-tagline', esc(ch.tagline)));
      head.appendChild(body);
      head.appendChild(el('span', 'chapter-arrow', open ? '收起 ▲' : '展开 ▼'));
      head.addEventListener('click', function () {
        state.chapOpen = (ch.id === state.chapOpen) ? null : ch.id;
        renderChapters(book, content);
      });
      item.appendChild(head);

      if (open) {
        var cbody = el('div', 'chap-body');
        var kws = el('div', 'book-kws lg');
        ch.keywords.forEach(function (k) { kws.appendChild(el('span', 'chip', esc(k))); });
        cbody.appendChild(kws);

        var subTabs = el('div', 'tabs chap-tabs');
        var subBox = el('div', 'chap-content');
        var activeTab = state.chapTabs[ch.id] || 'mindmap';
        [['mindmap', '思维导图'], ['notes', '文字提炼']].forEach(function (td) {
          var b = el('button', 'tab' + (activeTab === td[0] ? ' active' : ''), td[1]);
          b.setAttribute('data-key', td[0]);
          b.addEventListener('click', function () {
            state.chapTabs[ch.id] = td[0];
            var btns = subTabs.querySelectorAll('.tab');
            for (var i = 0; i < btns.length; i++) {
              btns[i].classList.toggle('active', btns[i].getAttribute('data-key') === td[0]);
            }
            renderChapBody(ch, subBox);
          });
          subTabs.appendChild(b);
        });
        cbody.appendChild(subTabs);
        cbody.appendChild(subBox);
        item.appendChild(cbody);
        renderChapBody(ch, subBox);
      }

      list.appendChild(item);
    });
    content.appendChild(list);
  }

  function renderChapBody(ch, content) {
    content.innerHTML = '';
    if ((state.chapTabs[ch.id] || 'mindmap') === 'mindmap') {
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
    } else {
      renderNotes(ch, content);
    }
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

  /* ---- 区三：音频口播合集 ---- */
  function renderAudioAll(book, content) {
    book.chapters.forEach(function (ch) {
      var item = el('div', 'audio-item');
      item.appendChild(el('h4', 'audio-title', '第' + ch.no + '章 · ' + esc(ch.title)));
      if (ch.audio && ch.audio.src) {
        var pl = document.createElement('audio');
        pl.className = 'audio-player';
        pl.controls = true;
        pl.preload = 'none';
        pl.src = ch.audio.src;
        item.appendChild(pl);
        if (ch.audio.transcript) {
          item.appendChild(el('p', 'audio-transcript', esc(ch.audio.transcript)));
        }
      } else {
        item.appendChild(el('div', 'audio-mini', '本章音频口播制作中'));
      }
      content.appendChild(item);
    });
  }

  function mmButton(label, fn) {
    var b = el('button', 'mm-tool', label);
    b.addEventListener('click', fn);
    return b;
  }

  boot();
})();