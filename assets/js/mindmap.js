/* 思维导图渲染器：竖向逻辑图布局（适合手机竖屏）
 * 根节点在顶部，分支节点自上而下排成一列，每个分支下的子节点横向排列（可换行）。
 * 节点点击折叠/展开，可缩放、自动适配一屏 */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var FONT_ROOT = 14;
  var FONT_CHILD = 12.5;
  var CW_ROOT = 13.5;
  var CW_CHILD = 12;

  var DEF = {
    cw: 316,        // 内容列宽（竖屏设计）
    marginX: 22,    // 内容与外框左右边距
    padX: 10,
    padY: 6,
    lineH: 17,
    nodeGap: 8,     // 同一行内节点间距
    rowGap: 8,      // 行与行垂直间距
    innerGap: 8,    // 分支标题与下方子节点行的间距
    nGap: 16,       // 相邻分支块垂直间距
    rootGap: 18,    // 根节点与第一个分支的间距
    topPad: 8,
    botPad: 10
  };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function wrapLines(text, maxW, cw) {
    text = String(text || '');
    var lines = [], cur = '', w = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === '\n') { lines.push(cur); cur = ''; w = 0; continue; }
      var cwidth = ch.charCodeAt(0) > 255 ? cw : cw * 0.55;
      if (w + cwidth > maxW && cur) { lines.push(cur); cur = ch; w = cwidth; }
      else { cur += ch; w += cwidth; }
    }
    if (cur) lines.push(cur);
    if (!lines.length) lines.push('');
    return lines;
  }

  function textWidth(text, cw) {
    var w = 0;
    for (var i = 0; i < text.length; i++) {
      w += text.charCodeAt(i) > 255 ? cw : cw * 0.55;
    }
    return w;
  }

  function MindMap(container, rootData, opts) {
    opts = opts || {};
    this.container = container;
    this.cfg = {};
    for (var k in DEF) this.cfg[k] = opts[k] !== undefined ? opts[k] : DEF[k];
    this.scale = 1;
    this.root = this.build(rootData, 0);
    this.layout();
    this.render();
  }

  MindMap.prototype.build = function (data, depth) {
    var n = {
      t: data.t,
      depth: depth,
      children: [],
      collapsed: false,
      collapsedCount: data.c ? data.c.length : 0
    };
    var cfg = this.cfg;
    var cw = depth === 0 ? CW_ROOT : CW_CHILD;
    n.w = Math.min(textWidth(data.t, cw) + cfg.padX * 2 + 6, cfg.cw);
    n.lines = wrapLines(data.t, n.w - cfg.padX * 2 - 4, cw);
    n.h = Math.max(n.lines.length * cfg.lineH + cfg.padY * 2 + 2, 27);
    if (data.c) {
      for (var i = 0; i < data.c.length; i++) {
        n.children.push(this.build(data.c[i], depth + 1));
      }
    }
    return n;
  };

  MindMap.prototype.hasSub = function (n) {
    if (!n.children.length || n.collapsed) return false;
    for (var i = 0; i < n.children.length; i++) {
      if (!n.children[i].collapsed) return true;
    }
    return false;
  };

  // 将子节点横向打包成若干行（每个有子树的节点独占一行）
  MindMap.prototype.packRows = function (items) {
    var cfg = this.cfg;
    var rows = [], cur = [], curW = -cfg.nodeGap;
    function flush() { if (cur.length) { rows.push(cur); cur = []; curW = -cfg.nodeGap; } }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (this.hasSub(it)) { flush(); rows.push([it]); cur = []; curW = -cfg.nodeGap; continue; }
      var add = it.w + (cur.length ? cfg.nodeGap : 0);
      if (cur.length && curW + add > cfg.cw) { flush(); add = it.w; }
      cur.push(it); curW += add;
    }
    flush();
    return rows;
  };

  // 递归计算以 n 为根（含 n 自身）所需总高度
  MindMap.prototype.measureSubtree = function (n) {
    var cfg = this.cfg;
    if (!this.hasSub(n)) return n.h;
    var rows = this.packRows(n.children);
    var total = n.h + cfg.innerGap;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var rowH = 0;
      for (var j = 0; j < row.length; j++) rowH = Math.max(rowH, row[j].h);
      var extra = rowH;
      for (var k = 0; k < row.length; k++) {
        if (this.hasSub(row[k])) extra = Math.max(extra, this.measureSubtree(row[k]));
      }
      total += extra + cfg.rowGap;
    }
    return total - cfg.rowGap;
  };

  // 纵向布局：根在上，分支自上而下，子节点横向打包成行
  MindMap.prototype.lay = function (node, top) {
    var cfg = this.cfg;
    node.x = cfg.marginX + (cfg.cw - node.w) / 2;
    node.y = top + node.h / 2;
    if (!this.hasSub(node)) return;
    var rows = this.packRows(node.children);
    var y = top + node.h + cfg.innerGap;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var rowH = 0, sumW = 0;
      for (var j = 0; j < row.length; j++) {
        rowH = Math.max(rowH, row[j].h);
        sumW += row[j].w + (j ? cfg.nodeGap : 0);
      }
      var x = cfg.marginX + (cfg.cw - sumW) / 2;
      var extra = rowH;
      for (var k = 0; k < row.length; k++) {
        var item = row[k];
        item.x = x;
        var itemTop = y + (rowH - item.h) / 2;
        item.y = itemTop + item.h / 2;
        if (this.hasSub(item)) {
          this.lay(item, itemTop);
          extra = Math.max(extra, this.measureSubtree(item));
        }
        x += item.w + cfg.nodeGap;
      }
      y += extra + cfg.rowGap;
    }
    this._maxY = y - cfg.rowGap;
  };

  MindMap.prototype.layout = function () {
    var cfg = this.cfg;
    this._maxY = 0;
    this.lay(this.root, cfg.topPad);
    this.contentW = cfg.cw + cfg.marginX * 2;
    this.contentH = Math.max(this._maxY, this.root.h) + cfg.botPad;
    this.canvasH = this.contentH;
  };

  MindMap.prototype.render = function () {
    var self = this;
    this.container.innerHTML = '';

    var viewport = document.createElement('div');
    viewport.className = 'mm-viewport';
    viewport.style.width = this.contentW + 'px';
    viewport.style.height = this.contentH + 'px';
    this.viewport = viewport;

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'mm-links');
    svg.setAttribute('width', this.contentW);
    svg.setAttribute('height', this.contentH);
    viewport.appendChild(svg);
    this.svg = svg;

    var nodes = document.createElement('div');
    nodes.className = 'mm-nodes';
    viewport.appendChild(nodes);

    this.renderNode(this.root, nodes);

    var canvas = document.createElement('div');
    canvas.className = 'mm-canvas';
    canvas.appendChild(viewport);
    this.container.appendChild(canvas);
    this.canvas = canvas;

    this.drawLinks(this.root);
    this.setScale(this.scale);
  };

  MindMap.prototype.renderNode = function (node, parentLayer) {
    var self = this;
    var el = document.createElement('div');
    el.className = 'mm-node' + (node.depth === 0 ? ' mm-node-root' : '') + (node.children.length ? ' mm-node-toggle' : '');
    el.style.left = node.x + 'px';
    el.style.top = (node.y - node.h / 2) + 'px';
    el.style.width = node.w + 'px';
    el.style.height = node.h + 'px';
    var html = '';
    for (var i = 0; i < node.lines.length; i++) {
      html += (i ? '<span class="mm-line">' : '') + esc(node.lines[i]) + (i ? '</span>' : '');
    }
    el.innerHTML = html;
    el.title = node.t;

    if (node.children.length) {
      var badge = document.createElement('span');
      badge.className = 'mm-toggle';
      if (node.collapsed) {
        badge.textContent = '+' + node.collapsedCount;
        el.classList.add('mm-collapsed');
      } else {
        badge.textContent = '\u2212';
      }
      el.appendChild(badge);
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        self.toggle(node);
      });
    }

    parentLayer.appendChild(el);
    node.el = el;
    for (var j = 0; j < node.children.length; j++) this.renderNode(node.children[j], parentLayer);
  };

  MindMap.prototype.drawLinks = function (node) {
    if (!this.hasSub(node)) return;
    var self = this;
    var px = node.x + node.w / 2;
    var py = node.y + node.h / 2;
    for (var i = 0; i < node.children.length; i++) {
      var child = node.children[i];
      if (child.collapsed) continue;
      var cx = child.x + child.w / 2;
      var cy = child.y - child.h / 2;
      var mid = (py + cy) / 2;
      var d = 'M' + px.toFixed(1) + ',' + py.toFixed(1) +
              ' C' + px.toFixed(1) + ',' + mid.toFixed(1) +
              ' ' + cx.toFixed(1) + ',' + mid.toFixed(1) +
              ' ' + cx.toFixed(1) + ',' + cy.toFixed(1);
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'mm-link');
      this.svg.appendChild(path);
      this.drawLinks(child);
    }
  };

  MindMap.prototype.toggle = function (node) {
    node.collapsed = !node.collapsed;
    this.layout();
    this.render();
  };

  MindMap.prototype.setScale = function (s) {
    this.scale = Math.max(0.2, Math.min(1.7, s));
    this.canvas.style.width = (this.contentW * this.scale) + 'px';
    this.canvas.style.height = (this.contentH * this.scale) + 'px';
    this.canvas.style.transform = 'scale(' + this.scale + ')';
    this.canvas.style.transformOrigin = '0 0';
  };

  MindMap.prototype.zoom = function (delta) {
    this.setScale(this.scale * delta);
  };

  MindMap.prototype.fit = function () {
    var aw = this.container.clientWidth || this.container.parentElement.clientWidth || 600;
    var vh = (global.innerHeight || 700) - 220;
    var ah = Math.max(280, Math.min(vh, 900));
    var s = Math.min((aw - 20) / this.contentW, (ah - 24) / this.contentH);
    s = Math.max(0.45, Math.min(1.4, s));
    this.setScale(s);
    var vp = this.container;
    if (vp.scrollTo) vp.scrollTo(0, 0);
  };

  global.MindMap = MindMap;
})(window);