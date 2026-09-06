/* 思维导图渲染器：右键展开的树形结构，可缩放、可点击折叠节点 */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var FONT_ROOT = 15;
  var FONT_CHILD = 13;
  var CHAR_W_ROOT = 15;
  var CHAR_W_CHILD = 13.4;

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

  function MindMap(container, rootData, opts) {
    opts = opts || {};
    this.container = container;
    this.levelGap = opts.levelGap || 46;
    this.vGap = opts.vGap || 14;
    this.padX = opts.padX || 16;
    this.padY = opts.padY || 10;
    this.lineH = opts.lineH || 20;
    this.widthByDepth = [240, 212, 192, 168, 150];
    this.scale = 1;
    this.rootData = rootData;
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
    var w = this.widthByDepth[Math.min(depth, this.widthByDepth.length - 1)];
    var innerW = w - this.padX * 2 - 4;
    var cw = depth === 0 ? CHAR_W_ROOT : CHAR_W_CHILD;
    var lines = wrapLines(data.t, innerW, cw);
    n.lines = lines;
    n.w = w;
    n.h = Math.max(lines.length * this.lineH + this.padY * 2, 34);
    if (data.c) {
      for (var i = 0; i < data.c.length; i++) n.children.push(this.build(data.c[i], depth + 1));
    }
    return n;
  };

  MindMap.prototype.maxDepthScan = function (node) {
    var max = node.depth;
    for (var i = 0; i < node.children.length; i++) {
      var d = this.maxDepthScan(node.children[i]);
      if (d > max) max = d;
    }
    return max;
  };

  MindMap.prototype.layout = function () {
    var self = this;
    var cursor = 0;

    function walk(node) {
      if (!node.children.length || node.collapsed) {
        var top = cursor;
        cursor += node.h + self.vGap;
        node.y = top + node.h / 2;
        return { top: top, bottom: top + node.h };
      }
      var ranges = [];
      for (var i = 0; i < node.children.length; i++) ranges.push(walk(node.children[i]));
      var min = Infinity, max = -Infinity;
      for (var j = 0; j < ranges.length; j++) {
        if (ranges[j].top < min) min = ranges[j].top;
        if (ranges[j].bottom > max) max = ranges[j].bottom;
      }
      node.y = (min + max) / 2;
      return { top: min, bottom: max };
    }

    var r = walk(this.root);
    this.maxDepth = this.maxDepthScan(this.root);
    this.maxW = 0;
    (function scan(n) {
      if (n.w > self.maxW) self.maxW = n.w;
      for (var i = 0; i < n.children.length; i++) scan(n.children[i]);
    })(this.root);

    var leftPad = 24, rightPad = 24, topPad = 30, bottomPad = 30;
    this.contentW = leftPad + this.maxDepth * this.levelGap + this.maxW + rightPad;
    this.contentH = Math.max(r.bottom, this.root.h) + topPad + bottomPad;

    (function assignX(n) {
      n.x = leftPad + n.depth * self.levelGap;
      n.y = n.y + topPad;
      for (var i = 0; i < n.children.length; i++) assignX(n.children[i]);
    })(this.root);
    this.topPad = topPad;
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
      html += (i ? '<span class="mm-line">' + esc(node.lines[i]) + '</span>' : esc(node.lines[i]));
    }
    el.innerHTML = html;
    el.title = node.t;

    if (node.children.length) {
      var badge = document.createElement('span');
      badge.className = 'mm-toggle';
      if (node.collapsed) {
        badge.textContent = '+' + node.children.length;
        el.classList.add('mm-collapsed');
      } else {
        badge.textContent = '\u2212';
      }
      el.appendChild(badge);
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        self.toggle(node);
      });
    } else {
      el.addEventListener('click', function (e) {
        var c = el.classList;
        c.toggle('mm-flash');
        setTimeout(function () { c.remove('mm-flash'); }, 700);
      });
    }

    parentLayer.appendChild(el);
    node.el = el;
    for (var j = 0; j < node.children.length; j++) this.renderNode(node.children[j], parentLayer);
  };

  MindMap.prototype.drawLinks = function (node) {
    if (!node.children.length || node.collapsed) return;
    var x1 = node.x + node.w, y1 = node.y;
    for (var i = 0; i < node.children.length; i++) {
      var child = node.children[i];
      var x2 = child.x, y2 = child.y;
      var mx = (x1 + x2) / 2;
      var d = 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' C' + mx.toFixed(1) + ',' + y1.toFixed(1) + ' ' + mx.toFixed(1) + ',' + y2.toFixed(1) + ' ' + x2.toFixed(1) + ',' + y2.toFixed(1);
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'mm-link' + (child.collapsed ? ' mm-link-dim' : ''));
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
    this.scale = Math.max(0.25, Math.min(2.5, s));
    this.canvas.style.width = (this.contentW * this.scale) + 'px';
    this.canvas.style.height = (this.contentH * this.scale) + 'px';
    this.canvas.style.transform = 'scale(' + this.scale + ')';
    this.canvas.style.transformOrigin = '0 0';
  };

  MindMap.prototype.zoom = function (delta) {
    this.setScale(this.scale * delta);
  };

  MindMap.prototype.fit = function () {
    var availW = this.container.clientWidth;
    if (!availW) availW = this.container.parentElement.clientWidth || 600;
    var s = Math.max(0.3, Math.min(1.4, (availW - 24) / this.contentW));
    this.setScale(s);
  };

  MindMap.prototype.reset = function () {
    this.fit();
    var vp = this.container;
    if (vp.scrollTo) vp.scrollTo(0, 0);
  };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  global.MindMap = MindMap;
})(window);