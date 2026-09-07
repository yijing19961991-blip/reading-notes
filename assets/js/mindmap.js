/* 思维导图渲染器：左右对称紧凑布局，节点点击折叠/展开，可缩放、自动适配一屏 */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var FONT_ROOT = 14;
  var FONT_CHILD = 12.5;
  var CW_ROOT = 13.5;
  var CW_CHILD = 12;

  var DEF = {
    colGap: 150,      // 相邻列水平间距（同时决定节点列宽上限）
    vGap: 9,          // 兄弟叶子垂直间隔
    sideGap: 30,      // 同侧分支之间垂直间隔
    padX: 10,
    padY: 6,
    lineH: 17,
    rootW: 215
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
      collapsedCount: data.c ? data.c.length : 0,
      side: (data._side === 'left' || data._side === 'right') ? data._side : 'right'
    };
    var cfg = this.cfg;
    var w;
    if (depth === 0) w = cfg.rootW;
    else w = Math.min(cfg.colGap - 10, depth <= 2 ? 158 : 148);
    var cw = depth === 0 ? CW_ROOT : CW_CHILD;
    n.font = depth === 0 ? FONT_ROOT : FONT_CHILD;
    n.w = w;
    n.lines = wrapLines(data.t, w - cfg.padX * 2 - 4, cw);
    n.h = Math.max(n.lines.length * cfg.lineH + cfg.padY * 2, 27);
    if (data.c) {
      for (var i = 0; i < data.c.length; i++) {
        n.children.push(this.build(data.c[i], depth + 1));
      }
    }
    return n;
  };

  MindMap.prototype.partition = function (node) {
    // depth-1 分支左右交替分派：偶数→右，奇数→左
    var right = [], left = [];
    var root = node;
    node.children.forEach(function (c, i) {
      c.side = (i % 2 === 0) ? 'right' : 'left';
      if (c.side === 'right') right.push(c);
      else left.push(c);
    });
    (function assign(cs) {
      cs.forEach(function (c) {
        c.children.forEach(function (g) { g.side = c.side; assign(g.children); });
      });
    })(right);
    (function assign(cs) {
      cs.forEach(function (c) {
        c.children.forEach(function (g) { g.side = c.side; assign(g.children); });
      });
    })(left);
    return { right: right, left: left };
  };

  MindMap.prototype.layout = function () {
    var self = this;
    var cfg = this.cfg;
    var root = this.root;

    // y 布局：叶子堆叠，父节点取首尾子中点
    function walk(n) {
      if (!n.children.length || n.collapsed) {
        n._top = self._cursor;
        n._bottom = self._cursor + n.h;
        n.relY = n._top + n.h / 2;
        self._cursor += n.h + cfg.vGap;
        return;
      }
      for (var i = 0; i < n.children.length; i++) walk(n.children[i]);
      n._top = n.children[0]._top;
      n._bottom = n.children[n.children.length - 1]._bottom;
      n.relY = (n._top + n._bottom) / 2;
    }

    function layoutSide(branches) {
      var sideH = 0;
      self._cursor = 0;
      if (branches.length) {
        for (var i = 0; i < branches.length; i++) {
          self._cursor = i ? branches[i - 1]._bottom + cfg.sideGap : 0;
          walk(branches[i]);
        }
        sideH = branches[branches.length - 1]._bottom;
      }
      return sideH;
    }

    var sides = this.partition(root);
    var rightH = layoutSide(sides.right);
    var leftH = layoutSide(sides.left);
    var canvasH = Math.max(rightH, leftH, root.h) ;
    canvasH += 40; // 上下留白
    root.relY = canvasH / 2;

    function shiftSide(branches, sideH) {
      var off = (canvasH - sideH) / 2;
      branches.forEach(function (b) {
        (function sh(n) {
          n.y = n.relY + off;
          for (var i = 0; i < n.children.length; i++) sh(n.children[i]);
        })(b);
      });
    }
    shiftSide(sides.right, rightH);
    shiftSide(sides.left, leftH);

    // x 布局
    var rootLeft = 60;
    root.x = rootLeft;
    root.y = root.relY;
    (function assignX(children) {
      children.forEach(function (c) {
        if (c.side === 'right') {
          c.x = rootLeft + root.w + c.depth * cfg.colGap;
        } else {
          c.x = rootLeft - c.depth * cfg.colGap - c.w;
        }
        assignX(c.children);
      });
    })(root.children);

    // 归一化左边距并求画布尺寸
    var minX = Infinity, maxX = -Infinity;
    (function scan(n) {
      if (n.x < minX) minX = n.x;
      if (n.x + n.w > maxX) maxX = n.x + n.w;
      for (var i = 0; i < n.children.length; i++) scan(n.children[i]);
    })(root);
    var shift = 24 - minX;
    (function scan2(n) {
      n.x += shift;
      for (var i = 0; i < n.children.length; i++) scan2(n.children[i]);
    })(root);

    this.contentH = canvasH;
    this.contentW = maxX + shift + 24;
    this.canvasH = canvasH;
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
    if (!node.children.length || node.collapsed) return;
    var self = this;
    for (var i = 0; i < node.children.length; i++) {
      var child = node.children[i];
      var rightSide = child.side === 'right';
      var x1 = rightSide ? node.x + node.w : node.x;
      var y1 = node.y;
      var x2 = rightSide ? child.x : child.x + child.w;
      var y2 = child.y;
      if (x1 > x2) { var t = x1; x1 = x2; x2 = t; }
      var mx = (x1 + x2) / 2;
      var d = 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' C' + mx.toFixed(1) + ',' + y1.toFixed(1) + ' ' + mx.toFixed(1) + ',' + y2.toFixed(1) + ' ' + x2.toFixed(1) + ',' + y2.toFixed(1);
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