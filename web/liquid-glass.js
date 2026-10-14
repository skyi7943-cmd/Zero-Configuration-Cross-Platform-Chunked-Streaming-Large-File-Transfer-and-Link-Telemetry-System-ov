/**
 * Şatafat Media — Liquid Glass Engine
 *
 * 复刻 Apple iOS 26 / macOS Tahoe Liquid Glass 的核心光学特征：
 *   1. 边缘透镜折射：按每个元素真实的圆角矩形形状，逐像素计算凸面玻璃的法线与折射位移图，
 *      再通过 SVG feDisplacementMap 作用于 backdrop-filter —— 背后内容在玻璃边缘被真实地弯曲。
 *   2. 色散：R / G / B 三通道使用不同折射强度，边缘出现细微的彩虹色散。
 *   3. 低模糊、高通透：Liquid Glass 不是磨砂玻璃，中心几乎清澈，只在边缘发生光学扭曲。
 *   4. 指针跟随的镜面高光、iOS 26 标签栏的液态滑块。
 *
 * Chromium 内核（Chrome / Edge / 安卓 Chrome）支持 backdrop-filter: url(#svg)，显示完整折射；
 * Safari / Firefox 自动降级为高通透玻璃（blur + saturate），视觉风格保持一致。
 */
(function () {
  'use strict';

  const root = document.documentElement;
  const ua = navigator.userAgent;
  const isIOSWebKit = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isFirefox = /Firefox|FxiOS/.test(ua);
  const isChromium = /Chrome|Chromium|Edg\//.test(ua) && !/CriOS|EdgiOS/.test(ua);
  const REFRACT = isChromium && !isIOSWebKit && !isFirefox;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.classList.add(REFRACT ? 'lg-refract' : 'lg-fallback');

  /* ==============================================================
   * 1. 折射引擎
   * ============================================================== */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';
  let defsEl = null;
  let uid = 0;
  const registry = new WeakMap();

  function ensureDefs() {
    if (defsEl) return defsEl;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    // 注意：不能 display:none，否则浏览器不会解析滤镜
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    defsEl = document.createElementNS(SVG_NS, 'defs');
    svg.appendChild(defsEl);
    document.body.appendChild(svg);
    return defsEl;
  }

  /**
   * 生成凸面玻璃折射位移图
   *  - 圆角矩形 SDF 求出每个像素到边缘的距离与外法线
   *  - 在边缘 depth 宽度的"斜面"内，按 squircle 凸面曲线的斜率计算折射强度
   *  - R 通道 = x 方向位移，G 通道 = y 方向位移（128 为不偏移）
   */
  function buildDisplacementMap(w, h, radius, depth) {
    const k = w * h > 160000 ? 0.5 : 1;
    const cw = Math.max(2, Math.round(w * k));
    const ch = Math.max(2, Math.round(h * k));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(cw, ch);
    const data = img.data;

    const hw = w / 2;
    const hh = h / 2;
    const r = Math.max(0.5, Math.min(radius, hw, hh));
    const innerX = hw - r;
    const innerY = hh - r;

    for (let y = 0; y < ch; y++) {
      const py = (y + 0.5) / k - hh;
      const ay = Math.abs(py);
      const sy = py < 0 ? -1 : 1;
      for (let x = 0; x < cw; x++) {
        const px = (x + 0.5) / k - hw;
        const ax = Math.abs(px);
        const sx = px < 0 ? -1 : 1;

        const qx = ax - innerX;
        const qy = ay - innerY;
        let dist, nx, ny;
        if (qx > 0 && qy > 0) {
          const len = Math.sqrt(qx * qx + qy * qy) || 1;
          dist = len - r;
          nx = (qx / len) * sx;
          ny = (qy / len) * sy;
        } else if (qx > qy) {
          dist = qx - r;
          nx = sx;
          ny = 0;
        } else {
          dist = qy - r;
          nx = 0;
          ny = sy;
        }

        const inside = -dist; // 距离边缘的深度（像素）
        let R = 128, G = 128;
        if (inside > 0 && inside < depth) {
          const t = inside / depth;            // 0 = 边缘, 1 = 斜面内沿
          // squircle 凸面 h(t) = (1-(1-t)^4)^(1/4)，其斜率在边缘最大、内沿趋近于 0
          const u = 1 - t;
          const mag = Math.min(1, Math.pow(u, 2.2) * 1.05);
          // 向内采样：边缘附近显示更内侧的内容 => 光学拉伸/透镜感
          R = 128 - nx * mag * 127;
          G = 128 - ny * mag * 127;
        }
        const i = (y * cw + x) * 4;
        data[i] = R;
        data[i + 1] = G;
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

  function el(tag, attrs) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function buildFilter(id, w, h, mapUrl, opts) {
    const defs = ensureDefs();
    const old = document.getElementById(id);
    if (old) old.remove();

    const f = el('filter', {
      id: id,
      x: '0', y: '0', width: String(w), height: String(h),
      filterUnits: 'userSpaceOnUse',
      primitiveUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB'
    });

    f.appendChild(el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: String(opts.blur), result: 'blurred' }));
    f.appendChild(el('feColorMatrix', { in: 'blurred', type: 'saturate', values: String(opts.saturate), result: 'sat' }));

    const img = el('feImage', { x: '0', y: '0', width: String(w), height: String(h), preserveAspectRatio: 'none', result: 'map' });
    img.setAttribute('href', mapUrl);
    img.setAttributeNS(XLINK_NS, 'xlink:href', mapUrl);
    f.appendChild(img);

    const S = opts.strength * 2;
    const channels = [
      { scale: S, keep: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', name: 'r' },
      { scale: S * (1 - opts.dispersion), keep: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', name: 'g' },
      { scale: S * (1 - opts.dispersion * 2), keep: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', name: 'b' }
    ];
    channels.forEach(c => {
      f.appendChild(el('feDisplacementMap', { in: 'sat', in2: 'map', scale: String(c.scale), xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + c.name }));
      f.appendChild(el('feColorMatrix', { in: 'd' + c.name, type: 'matrix', values: c.keep, result: c.name }));
    });
    f.appendChild(el('feBlend', { in: 'r', in2: 'g', mode: 'screen', result: 'rg' }));
    f.appendChild(el('feBlend', { in: 'rg', in2: 'b', mode: 'screen' }));

    defs.appendChild(f);
  }

  function refresh(node) {
    const st = registry.get(node);
    if (!st) return;
    const w = Math.round(node.offsetWidth);
    const h = Math.round(node.offsetHeight);
    if (w < 6 || h < 6) return;
    if (w === st.w && h === st.h) return;
    st.w = w;
    st.h = h;

    // 极高的元素（超长列表）只保留通透玻璃，避免性能开销
    if (h > 1800) {
      node.style.removeProperty('backdrop-filter');
      node.style.removeProperty('-webkit-backdrop-filter');
      return;
    }

    const cs = getComputedStyle(node);
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    const ds = node.dataset;
    const depthDefault = Math.min(30, Math.min(w, h) * 0.42, radius + 8);
    const depth = ds.lgDepth ? Math.min(+ds.lgDepth, Math.min(w, h) / 2) : depthDefault;
    const opts = {
      blur: ds.lgBlur != null ? +ds.lgBlur : 7,
      strength: ds.lgStrength ? +ds.lgStrength : 28,
      saturate: ds.lgSat ? +ds.lgSat : 1.7,
      dispersion: ds.lgDispersion ? +ds.lgDispersion : 0.07
    };

    const map = buildDisplacementMap(w, h, radius, depth);
    buildFilter(st.id, w, h, map, opts);
    const value = 'url(#' + st.id + ')';
    node.style.setProperty('backdrop-filter', value);
    node.style.setProperty('-webkit-backdrop-filter', value);
  }

  const ro = REFRACT ? new ResizeObserver(entries => {
    entries.forEach(e => schedule(e.target));
  }) : null;

  function schedule(node) {
    const st = registry.get(node);
    if (!st) return;
    clearTimeout(st.timer);
    st.timer = setTimeout(() => refresh(node), st.w ? 140 : 0);
  }

  function attach(node) {
    if (!REFRACT || registry.has(node)) return;
    registry.set(node, { id: 'lg-filter-' + (++uid), w: 0, h: 0, timer: 0 });
    ro.observe(node);
    schedule(node);
  }

  function scan(scope) {
    (scope || document).querySelectorAll('[data-refract], .liquid-toast').forEach(attach);
  }

  /* ==============================================================
   * 2. 动态壁纸（清晰色带 + 柔光，衬托折射）
   * ============================================================== */
  const PALETTES = {
    ios26:  { dark: ['#04060e', '#0a0f24'], light: ['#eef2fb', '#dfe6f7'], c: ['#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f', '#64d2ff'] },
    tahoe:  { dark: ['#03111a', '#062030'], light: ['#e9f6f3', '#d6ecf2'], c: ['#30d1c0', '#0a84ff', '#64d2ff', '#34c759', '#5ac8fa'] },
    sunset: { dark: ['#12060f', '#1f0a17'], light: ['#fdf0e8', '#f7dfe4'], c: ['#ff9f0a', '#ff375f', '#bf5af2', '#ffd60a', '#ff6482'] },
    vision: { dark: ['#0a0b10', '#14161e'], light: ['#eef0f4', '#e1e4ea'], c: ['#8e8ea0', '#64d2ff', '#c7c7d1', '#5e5ce6', '#aeb4c6'] }
  };

  function startWallpaper() {
    const canvas = document.getElementById('liquidWallpaperCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0;

    function resize() {
      W = canvas.width = Math.round(window.innerWidth);
      H = canvas.height = Math.round(window.innerHeight);
    }
    resize();
    window.addEventListener('resize', resize);

    let t = Math.random() * 100;
    let last = 0;
    const FRAME = 1000 / 24;

    function draw(now) {
      requestAnimationFrame(draw);
      if (document.hidden) return;
      if (now - last < FRAME) return;
      last = now;
      if (!reduceMotion) t += 0.006;

      const pal = PALETTES[root.getAttribute('data-wallpaper')] || PALETTES.ios26;
      const light = root.getAttribute('data-theme') === 'light';
      const bg = light ? pal.light : pal.dark;
      const c = pal.c;

      const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
      g.addColorStop(0, bg[0]);
      g.addColorStop(1, bg[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // 柔光团
      for (let i = 0; i < 3; i++) {
        const bx = W * (0.2 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 2.1)));
        const by = H * (0.2 + 0.6 * (0.5 + 0.5 * Math.cos(t * 0.5 + i * 1.7)));
        const br = Math.max(W, H) * 0.42;
        const rg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        rg.addColorStop(0, hexA(c[i], light ? 0.35 : 0.42));
        rg.addColorStop(1, hexA(c[i], 0));
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      }

      // 清晰的流动色带（边缘锐利 —— 玻璃折射时最明显）
      const step = 20;
      for (let i = 0; i < 4; i++) {
        const base = H * (0.16 + i * 0.23);
        const amp = H * 0.075;
        const top = [];
        ctx.beginPath();
        for (let x = 0, j = 0; x <= W + step; x += step, j++) {
          const p = x / W;
          const y = base
            + Math.sin(p * Math.PI * (1.3 + i * 0.35) + t * (0.9 + i * 0.2) + i * 1.3) * amp
            + Math.cos(p * Math.PI * 3.1 - t * 0.6 + i * 2.2) * amp * 0.35;
          top.push(y);
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (let j = top.length - 1; j >= 0; j--) {
          const x = j * step;
          const thick = H * (0.07 + 0.025 * Math.sin(x / W * 5 + t * 1.2 + i));
          ctx.lineTo(x, top[j] + thick);
        }
        ctx.closePath();
        const lg = ctx.createLinearGradient(0, 0, W, 0);
        lg.addColorStop(0, hexA(c[i], light ? 0.55 : 0.75));
        lg.addColorStop(0.5, hexA(c[(i + 1) % c.length], light ? 0.6 : 0.85));
        lg.addColorStop(1, hexA(c[(i + 2) % c.length], light ? 0.5 : 0.7));
        ctx.fillStyle = lg;
        ctx.fill();

        // 色带顶部的高光细线
        ctx.beginPath();
        top.forEach((y, j) => { if (j === 0) ctx.moveTo(0, y); else ctx.lineTo(j * step, y); });
        ctx.strokeStyle = light ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 几颗玻璃珠
      for (let i = 0; i < 3; i++) {
        const ox = W * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.45 + i * 2.4)));
        const oy = H * (0.2 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.38 + i * 1.3 + 1)));
        const or = Math.min(W, H) * (0.05 + i * 0.018);
        const og = ctx.createRadialGradient(ox - or * 0.35, oy - or * 0.35, or * 0.1, ox, oy, or);
        og.addColorStop(0, 'rgba(255,255,255,0.9)');
        og.addColorStop(0.35, hexA(c[(i + 3) % c.length], 0.9));
        og.addColorStop(1, hexA(c[(i + 1) % c.length], 0.85));
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(ox, oy, or, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ==============================================================
   * 3. 指针跟随镜面高光
   * ============================================================== */
  function startSpecular() {
    let pending = null;
    let queued = false;
    document.addEventListener('pointermove', (e) => {
      pending = e;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const ev = pending;
        document.querySelectorAll('.lg').forEach(node => {
          const r = node.getBoundingClientRect();
          if (r.width === 0) return;
          if (ev.clientX < r.left - 120 || ev.clientX > r.right + 120 || ev.clientY < r.top - 120 || ev.clientY > r.bottom + 120) {
            node.style.setProperty('--lit', '0');
            return;
          }
          node.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
          node.style.setProperty('--my', (ev.clientY - r.top) + 'px');
          node.style.setProperty('--lit', '1');
        });
      });
    }, { passive: true });
  }

  /* ==============================================================
   * 4. iOS 26 标签栏液态滑块 + 悬浮按钮
   * ============================================================== */
  function startDock() {
    const bar = document.querySelector('.dock-bar');
    const thumb = bar && bar.querySelector('.seg-thumb');
    if (!bar || !thumb) return;

    function place(animate) {
      const active = bar.querySelector('.seg-btn.active');
      if (!active) return;
      const x = active.offsetLeft;
      const w = active.offsetWidth;
      if (animate) {
        thumb.classList.remove('morph');
        void thumb.offsetWidth;
        thumb.classList.add('morph');
      }
      thumb.style.transform = 'translateX(' + x + 'px)';
      thumb.style.width = w + 'px';
    }

    bar.addEventListener('click', (e) => {
      if (e.target.closest('.seg-btn')) requestAnimationFrame(() => place(true));
    });
    window.addEventListener('resize', () => place(false));
    // 语言切换会改变按钮宽度
    new MutationObserver(() => place(false)).observe(bar, { subtree: true, characterData: true, childList: true });
    setTimeout(() => place(false), 50);

    const fab = document.getElementById('btnDockSend');
    if (fab) {
      fab.addEventListener('click', () => {
        const input = document.getElementById('fileInput');
        if (input) input.click();
      });
    }
  }

  /* ==============================================================
   * 启动
   * ============================================================== */
  function boot() {
    startWallpaper();
    startSpecular();
    startDock();
    if (REFRACT) {
      scan();
      new MutationObserver(muts => {
        muts.forEach(m => m.addedNodes.forEach(n => {
          if (n.nodeType !== 1) return;
          if (n.matches && n.matches('[data-refract], .liquid-toast')) attach(n);
          if (n.querySelectorAll) scan(n);
        }));
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  window.LiquidGlass = { attach: attach, refract: REFRACT };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
