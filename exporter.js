/* VExport – offline PNG / PDF export of an HTML document sheet (no libraries, no internet).
   DOM -> inlined styles -> SVG foreignObject -> canvas -> A4 pages (cut between table rows) -> PNG or real PDF.
   opts: { bg: dataURI of a letterhead image, top, bottom: safe area in css px when bg is used, breakSel: selector of safe break points } */
(function (root) {
  'use strict';
  var W = 794, PAGE_H = Math.round(W * 297 / 210), MARGIN = 26;
  var BREAK_DEFAULT = '.it tr,.ban,.info,.tot,.words,.rcv,.terms,.sign,.thx,.ftr,.dn-box,.gd,.chk,.rc-amt,.hd,.dsc,.eml';

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function imagesReady(el) {
    return Promise.all([].slice.call(el.querySelectorAll('img')).map(function (i) {
      if (i.complete && i.naturalWidth) return i.decode ? i.decode().catch(function () { }) : null;
      return new Promise(function (r) { i.onload = i.onerror = r; });
    }));
  }
  function inlineStyles(src, dst) {
    var cs = getComputedStyle(src), s = '', i;
    for (i = 0; i < cs.length; i++) s += cs[i] + ':' + cs.getPropertyValue(cs[i]) + ';';
    dst.setAttribute('style', s);
    for (i = 0; i < src.children.length; i++) inlineStyles(src.children[i], dst.children[i]);
  }
  function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }

  /* render element at A4 width -> { canvas, H, scale, breaks } */
  function render(el, opts) {
    var stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:-12000px;top:0;width:' + W + 'px;background:#fff;pointer-events:none';
    var clone = el.cloneNode(true);
    clone.classList.add('xp'); clone.style.width = W + 'px'; clone.style.maxWidth = 'none'; clone.style.transform = 'none'; clone.style.margin = '0'; clone.style.boxShadow = 'none';
    stage.appendChild(clone); document.body.appendChild(stage);
    var H, breaks, copy;
    return imagesReady(clone).then(function () { return sleep(40); }).then(function () {
      var box = clone.getBoundingClientRect(); H = Math.ceil(box.height);
      breaks = [].slice.call(clone.querySelectorAll(opts.breakSel || BREAK_DEFAULT)).map(function (e) { return e.getBoundingClientRect().bottom - box.top; });
      copy = clone.cloneNode(true); inlineStyles(clone, copy);
      stage.remove();
      copy.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      var xml = new XMLSerializer().serializeToString(copy);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><foreignObject x="0" y="0" width="100%" height="100%">' + xml + '</foreignObject></svg>';
      return loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    }).then(function (img) {
      var scale = Math.max(1, Math.min(2, Math.sqrt(16e6 / (W * H))));
      var c = document.createElement('canvas'); c.width = Math.round(W * scale); c.height = Math.round(H * scale);
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      return { canvas: c, H: H, scale: scale, breaks: breaks };
    }).catch(function (e) { if (stage.parentNode) stage.remove(); throw e; });
  }

  /* where to cut between pages */
  function cuts(R, usable) {
    var out = [0], start = 0;
    while (start + usable < R.H - 2) {
      var limit = start + usable, cand = R.breaks.filter(function (b) { return b > start + usable * 0.5 && b <= limit; });
      var end = cand.length ? Math.max.apply(null, cand) : limit; out.push(end); start = end;
    }
    out.push(R.H);
    var n = out.length - 1, H = R.H;                      // avoid a thin last page: keep terms + signature together
    if (n >= 2 && out[n] - out[n - 1] < 240) {
      var prev = R.breaks.filter(function (b) { return b > out[n - 2] + 200 && b < out[n - 1] - 4 && H - b >= 240 && H - b <= usable; });
      if (prev.length) out[n - 1] = Math.max.apply(null, prev);
    }
    return out;
  }

  /* split into finished A4 page canvases (with letterhead if opts.bg) */
  function pages(el, opts) {
    opts = opts || {};
    return Promise.all([render(el, opts), opts.bg ? loadImg(opts.bg) : null]).then(function (r) {
      var R = r[0], bgImg = r[1], sc = R.scale, pw = Math.round(W * sc), ph = Math.round(PAGE_H * sc);
      var top = bgImg ? opts.top : MARGIN, bottom = bgImg ? opts.bottom : MARGIN, usable = PAGE_H - top - bottom;
      var cs = cuts(R, usable), list = [], i;
      for (i = 0; i < cs.length - 1; i++) {
        var y0 = cs[i], y1 = cs[i + 1], c = document.createElement('canvas'); c.width = pw; c.height = ph;
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, pw, ph);
        if (bgImg) g.drawImage(bgImg, 0, 0, pw, ph);
        g.drawImage(R.canvas, 0, y0 * sc, pw, (y1 - y0) * sc, 0, top * sc, pw, (y1 - y0) * sc);
        list.push(c);
      }
      return { pages: list, full: R.canvas, hasBg: !!bgImg };
    });
  }
  function toBlob(canvas, type, q) {
    return new Promise(function (res, rej) { try { canvas.toBlob(function (b) { b ? res(b) : rej(new Error('blob')); }, type, q); } catch (e) { rej(e); } });
  }

  /* PNG: plain render for branded layout; stacked pages for letterhead layout */
  function png(el, opts) {
    return pages(el, opts).then(function (P) {
      if (!P.hasBg || P.pages.length === 1) return toBlob(P.hasBg ? P.pages[0] : P.full, 'image/png');
      var pw = P.pages[0].width, ph = P.pages[0].height, n = P.pages.length, f = Math.min(1, Math.sqrt(16e6 / (pw * ph * n)));
      var c = document.createElement('canvas'); c.width = Math.round(pw * f); c.height = Math.round(ph * f * n);
      var g = c.getContext('2d'); P.pages.forEach(function (p, i) { g.drawImage(p, 0, i * ph * f, pw * f, ph * f); });
      return toBlob(c, 'image/png');
    });
  }

  /* ---- PDF ---- */
  function b64(url) { var s = atob(url.split(',')[1]), u = new Uint8Array(s.length), i; for (i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function buildPDF(list, pw, ph) {
    var enc = new TextEncoder(), parts = [], offs = [], len = 0, N = list.length, i;
    function push(x) { var b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; }
    function obj(n, body) { offs[n] = len; push(n + ' 0 obj\n' + body + '\nendobj\n'); }
    push('%PDF-1.4\n');
    var kids = []; for (i = 0; i < N; i++) kids.push((3 + 3 * i) + ' 0 R');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + N + ' >>');
    list.forEach(function (j, k) {
      var p = 3 + 3 * k, c = p + 1, im = p + 2, cs = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';
      obj(p, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + c + ' 0 R >>');
      obj(c, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
      offs[im] = len;
      push(im + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + j.w + ' /Height ' + j.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + j.data.length + ' >>\nstream\n');
      push(j.data); push('\nendstream\nendobj\n');
    });
    var xr = len, total = 3 + 3 * N, x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
    for (i = 1; i < total; i++) x += ('0000000000' + offs[i]).slice(-10) + ' 00000 n \n';
    push(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF');
    return new Blob(parts, { type: 'application/pdf' });
  }
  function pdf(el, opts) {
    return pages(el, opts).then(function (P) {
      var list = P.pages.map(function (c) { return { data: b64(c.toDataURL('image/jpeg', 0.92)), w: c.width, h: c.height }; });
      return buildPDF(list, 595.28, 841.89);
    });
  }

  /* ---- delivery ---- */
  function save(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function share(blob, name, title) {
    var f = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: title || name }).then(function () { return true; }, function (e) { if (e && e.name === 'AbortError') return true; throw e; });
    save(blob, name); return Promise.resolve(false);
  }
  root.VExport = { png: png, pdf: pdf, save: save, share: share };
})(window);
