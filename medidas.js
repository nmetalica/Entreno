/* Medidas, fotos de progreso y guía de foto. */
(function () {
  'use strict';
  var $ = EN.$, $$ = EN.$$, esc = EN.esc, fmt = EN.fmt, ic = EN.ic;

  var FIELDS = ['peso', 'grasa', 'musculo', 'cintura', 'cadera', 'pecho', 'brazo', 'muslo'];
  var POSES = EN.POSES;
  var cfg = EN.get(EN.K.cfg, {}) || {};
  function saveCfg() { EN.set(EN.K.cfg, cfg); }
  function toast(t) { var e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('on'); }, 2400); }
  function ms(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); }

  /* =============== pestañas =============== */
  function showTab(t) {
    ['med', 'fotos', 'guia'].forEach(function (k) { $('#pn-' + k).hidden = k !== t; });
    $('#tb-' + t).checked = true;
    try { history.replaceState(null, '', '#' + t); } catch (e) {}
    if (t === 'fotos') loadFotos().then(renderFotos);
    window.scrollTo(0, 0);
  }
  ['med', 'fotos', 'guia'].forEach(function (k) { $('#tb-' + k).addEventListener('change', function () { showTab(k); }); });

  /* =============== MEDIDAS =============== */
  var MED = EN.get(EN.K.med, {}) || {};
  function dates() { return Object.keys(MED).sort(); }
  function derive(e) {
    var d = {};
    if (e.peso != null && e.grasa != null) { d.gkg = e.peso * e.grasa / 100; d.magra = e.peso - d.gkg; }
    return d;
  }
  function readForm() {
    var e = {};
    FIELDS.forEach(function (f) { var v = EN.num($('#m-' + f).value); if (v != null) e[f] = v; });
    var n = $('#m-nota').value.trim(); if (n) e.nota = n;
    return e;
  }
  function fillForm(fecha) {
    var e = MED[fecha];
    $('#m-fecha').value = fecha;
    FIELDS.forEach(function (f) { $('#m-' + f).value = e && e[f] != null ? String(e[f]).replace('.', ',') : ''; });
    $('#m-nota').value = e && e.nota ? e.nota : '';
    $('#m-del').hidden = !e;
    $('#newtitle').textContent = e ? 'Corregir medición' : 'Nueva medición';
    var n = $('#editnote'); n.hidden = !e; if (e) n.textContent = 'Estás cambiando la del ' + EN.fdate(fecha, true) + '.';
    // lo anterior como pista
    var prev = dates().filter(function (d) { return d < fecha; }).pop();
    FIELDS.forEach(function (f) { var p = prev && MED[prev][f] != null ? String(MED[prev][f]).replace('.', ',') : '—'; $('#m-' + f).placeholder = p; });
    paintDerived();
  }
  function paintDerived() {
    var d = derive(readForm());
    $('#derived').textContent = d.gkg != null ? 'Masa grasa ≈ ' + fmt(d.gkg) + ' kg · Masa magra ≈ ' + fmt(d.magra) + ' kg' : '';
  }
  FIELDS.forEach(function (f) {
    $('#m-' + f).addEventListener('input', function () {
      var c = this.value.replace(/[^0-9.,]/g, ''); if (c !== this.value) this.value = c; paintDerived();
    });
  });
  $('#m-fecha').addEventListener('change', function () { if (this.value) fillForm(this.value); });
  $('#m-save').addEventListener('click', function () {
    var f = $('#m-fecha').value || EN.today(), e = readForm();
    var any = FIELDS.some(function (k) { return e[k] != null; });
    if (!any) { toast('Escribe al menos un dato'); return; }
    if (e.grasa != null && (e.grasa < 3 || e.grasa > 70)) { toast('Revisa la grasa: ¿es un %?'); return; }
    MED[f] = e; EN.set(EN.K.med, MED); EN.persist();
    toast('Medición guardada'); fillForm(EN.today()); renderMed();
  });
  $('#m-del').addEventListener('click', function () {
    var b = this;
    if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = '¿Seguro? Toca otra vez'; setTimeout(function () { delete b.dataset.sure; b.innerHTML = ic('trash-2') + 'Borrar'; }, 3000); return; }
    delete b.dataset.sure; b.innerHTML = ic('trash-2') + 'Borrar';
    delete MED[$('#m-fecha').value]; EN.set(EN.K.med, MED); toast('Medición borrada'); fillForm(EN.today()); renderMed();
  });

  /* ---- gráficas pequeñas ---- */
  function spark(pts) {
    var W = 150, H = 54, P = 6;
    var xs = pts.map(function (p) { return ms(p.d); }), ys = pts.map(function (p) { return p.v; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (y1 === y0) { y0 -= 1; y1 += 1; }
    var px = function (t) { return x1 === x0 ? W / 2 : P + (t - x0) / (x1 - x0) * (W - 2 * P); };
    var py = function (v) { return H - P - (v - y0) / (y1 - y0) * (H - 2 * P); };
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + px(ms(p.d)).toFixed(1) + ' ' + py(p.v).toFixed(1); }).join('');
    var dots = pts.map(function (p, i) { var last = i === pts.length - 1; return '<circle class="' + (last ? 'e' : 'p') + '" cx="' + px(ms(p.d)).toFixed(1) + '" cy="' + py(p.v).toFixed(1) + '" r="' + (last ? 4 : 3) + '"/>'; }).join('');
    return '<svg class="sp" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Evolución"><line class="g" x1="0" x2="' + W + '" y1="' + (H - 1) + '" y2="' + (H - 1) + '"/>' + (pts.length > 1 ? '<path class="l" d="' + d + '"/>' : '') + dots + '</svg>';
  }
  var METR = [
    { k: 'peso', t: 'Peso', u: 'kg', dec: 1, cls: '', good: 0, get: function (e) { return e.peso; } },
    { k: 'grasa', t: 'Grasa corporal', u: '%', dec: 1, cls: 'cw', good: -1, get: function (e) { return e.grasa; } },
    { k: 'magra', t: 'Masa magra', u: 'kg', dec: 1, cls: 'cb', good: 1, get: function (e) { return derive(e).magra; } },
    { k: 'cintura', t: 'Cintura', u: 'cm', dec: 1, cls: 'cc', good: -1, get: function (e) { return e.cintura; } }
  ];
  function renderCharts() {
    var box = $('#charts'), html = '', any = false;
    METR.forEach(function (m) {
      var pts = dates().map(function (d) { var v = m.get(MED[d]); return v == null ? null : { d: d, v: v }; }).filter(Boolean);
      var last = pts[pts.length - 1], first = pts[0];
      var body;
      if (!pts.length) body = '<div class="v">—</div><div class="one">Sin datos</div>';
      else {
        any = true;
        var dl = pts.length > 1 ? last.v - first.v : null, cl = '';
        if (dl != null && Math.abs(dl) >= Math.pow(10, -m.dec) / 2 && m.good) cl = (dl * m.good > 0) ? 'up' : 'dn';
        body = '<div class="v">' + fmt(last.v, m.dec) + '<small>' + m.u + '</small></div>' +
          (dl != null ? '<div class="d ' + cl + '">' + EN.sign(dl, m.dec) + ' ' + m.u + ' desde el inicio</div>' : '<div class="one">Primera medición</div>') +
          spark(pts) + '<div class="f"><span>' + EN.fdate(first.d) + '</span><span>' + (pts.length > 1 ? EN.fdate(last.d) : '') + '</span></div>';
      }
      html += '<div class="mc ' + m.cls + '"><div class="t">' + m.t + '</div>' + body + '</div>';
    });
    box.innerHTML = html;
    $('#evnote').textContent = any ? (dates().length < 2 ? 'Apunta otra medición dentro de dos semanas para ver la evolución.' : 'En verde, lo que va en buena dirección. La masa magra y la masa grasa salen del peso y el % de grasa de la báscula.') : 'Aquí aparecerán las gráficas cuando guardes la primera medición.';
  }
  function renderHist() {
    var ds = dates(), t = $('#hist');
    if (!ds.length) { t.innerHTML = '<tbody><tr><td>Todavía no hay mediciones.</td></tr></tbody>'; return; }
    var cols = [['peso', 'Peso', 1], ['grasa', 'Grasa %', 1], ['magra', 'Magra', 1], ['cintura', 'Cint.', 1], ['cadera', 'Cad.', 1], ['pecho', 'Pecho', 1], ['brazo', 'Brazo', 1], ['muslo', 'Muslo', 1]];
    var val = function (e, k) { return k === 'magra' ? derive(e).magra : e[k]; };
    var h = '<thead><tr><th>Fecha</th>' + cols.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + '</tr></thead><tbody>';
    ds.slice().reverse().forEach(function (d) {
      h += '<tr class="pick" data-d="' + d + '" tabindex="0"><td>' + EN.fdate(d, true) + '</td>' + cols.map(function (c) { return '<td>' + fmt(val(MED[d], c[0]), c[2]) + '</td>'; }).join('') + '</tr>';
    });
    if (ds.length > 1) {
      var a = MED[ds[0]], b = MED[ds[ds.length - 1]];
      h += '<tr><td><b>Cambio</b></td>' + cols.map(function (c) { var x = val(a, c[0]), y = val(b, c[0]); return '<td><b>' + (x != null && y != null ? EN.sign(y - x, c[2]) : '—') + '</b></td>'; }).join('') + '</tr>';
    }
    t.innerHTML = h + '</tbody>';
    $$('tr.pick', t).forEach(function (r) {
      var go = function () { fillForm(r.dataset.d); $$('tr.sel', t).forEach(function (x) { x.classList.remove('sel'); }); r.classList.add('sel'); $('#h-new').scrollIntoView({ behavior: 'auto', block: 'start' }); };
      r.addEventListener('click', go);
      r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }
  function renderMed() { renderCharts(); renderHist(); }

  /* =============== dibujos de la guía (también la silueta de la cámara) =============== */
  function cap(x1, y1, x2, y2, r) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L * r, ny = dx / L * r;
    return 'M' + (x1 + nx) + ' ' + (y1 + ny) + 'L' + (x2 + nx) + ' ' + (y2 + ny) + 'A' + r + ' ' + r + ' 0 0 0 ' + (x2 - nx) + ' ' + (y2 - ny) + 'L' + (x1 - nx) + ' ' + (y1 - ny) + 'A' + r + ' ' + r + ' 0 0 0 ' + (x1 + nx) + ' ' + (y1 + ny) + 'Z';
  }
  function mirror(x) { return 300 - x; }
  // Cuerpo en un cuadro de 300 × 400: cabeza en y≈24 y pies en y≈378.
  function bodyPaths(pose) {
    var p = [];
    if (pose === 'lado') {
      p.push('<ellipse cx="150" cy="46" rx="20" ry="23"/>', '<path d="M131 44l-9 7 9 3z"/>');
      p.push('<path d="' + cap(152, 66, 152, 90, 8) + '"/>');
      p.push('<path d="M134 94Q127 130 132 160Q130 184 135 206L169 206Q173 180 170 156Q174 122 167 94Z"/>');
      p.push('<path d="' + cap(150, 102, 152, 154, 10) + '"/>', '<path d="' + cap(152, 154, 150, 206, 9) + '"/>');
      p.push('<path d="' + cap(152, 208, 152, 290, 17) + '"/>', '<path d="' + cap(152, 290, 152, 358, 12) + '"/>');
      p.push('<ellipse cx="140" cy="372" rx="23" ry="6.5"/>');
    } else {
      p.push('<ellipse cx="150" cy="46" rx="19" ry="23"/>');
      p.push('<path d="' + cap(150, 66, 150, 90, 8) + '"/>');
      p.push('<path d="M110 94Q150 84 190 94L187 150Q185 176 181 206L119 206Q115 176 113 150Z"/>');
      [1, -1].forEach(function (s) {
        var X = function (x) { return s > 0 ? x : mirror(x); };
        p.push('<path d="' + cap(X(104), 102, X(94), 154, 11) + '"/>', '<path d="' + cap(X(94), 154, X(86), 208, 9) + '"/>');
        p.push('<path d="' + cap(X(133), 208, X(131), 290, 17) + '"/>', '<path d="' + cap(X(131), 290, X(130), 358, 12) + '"/>');
        p.push('<ellipse cx="' + X(125) + '" cy="372" rx="13" ry="6.5" transform="rotate(' + (s > 0 ? -10 : 10) + ' ' + X(125) + ' 372)"/>');
      });
    }
    return p.join('');
  }
  function silhouette(pose, mode) { // mode 'ov' (sobre la cámara) o 'guide'
    var ov = mode === 'ov', fill = ov ? '#fff' : 'currentColor';
    var spine = pose === 'espalda' ? '<path d="M150 92L150 204" stroke="' + (ov ? 'rgba(0,0,0,.35)' : 'var(--soft)') + '" stroke-width="2.5" fill="none"/>' : '';
    var lab = function (y, t) { return '<text x="285" y="' + (y - 4) + '" text-anchor="end" style="font:800 11px system-ui,sans-serif;fill:#fff;stroke:rgba(0,0,0,.65);stroke-width:3;paint-order:stroke">' + t + '</text>'; };
    var lines = ov ?
      '<g stroke="#fff" stroke-width="1.6" stroke-dasharray="6 5" opacity=".85" fill="none"><line x1="15" y1="22" x2="285" y2="22"/><line x1="15" y1="380" x2="285" y2="380"/><line x1="150" y1="22" x2="150" y2="380" opacity=".45"/></g>' + lab(22, 'Cabeza') + lab(380, 'Pies') : '';
    return '<g' + (ov ? ' style="color:#fff"' : '') + '><g fill="' + fill + '" opacity="' + (ov ? '.3' : '1') + '">' + bodyPaths(pose) + '</g>' + spine + lines + '</g>';
  }
  function poseSvg(pose) {
    var feet = pose === 'lado' ? '' : '<g class="gfoot" opacity=".9"><rect x="112" y="368" width="24" height="12" rx="6"/><rect x="164" y="368" width="24" height="12" rx="6"/></g>';
    return '<svg viewBox="0 0 300 400" role="img" aria-label="Pose de ' + pose + '" style="color:var(--a)"><g class="gl"><line x1="20" y1="22" x2="280" y2="22"/><line x1="20" y1="384" x2="280" y2="384"/></g>' + silhouette(pose, 'guide') + '<text class="gt" x="24" y="16">cabeza</text><text class="gt" x="24" y="398">pies</text></svg>';
  }
  function setupSvg() {
    // vista lateral del rincón: móvil a 1,1 m, persona a 2,5 m (80 px por metro)
    var fy = 150, mx = 52, mh = 88, px = 252, ph = 138;
    return '<svg class="gfig" viewBox="-26 0 346 190" role="img" aria-label="Móvil a un metro de altura y a unos dos metros y medio de ti">' +
      '<line x1="10" y1="' + fy + '" x2="310" y2="' + fy + '" stroke="var(--muted)" stroke-width="1.5"/>' +
      '<path class="gcone" d="M' + mx + ' ' + (fy - mh) + ' L' + px + ' ' + (fy - ph - 6) + ' L' + px + ' ' + (fy + 4) + 'Z"/>' +
      '<line class="gconel" x1="' + mx + '" y1="' + (fy - mh) + '" x2="' + px + '" y2="' + (fy - ph - 6) + '"/><line class="gconel" x1="' + mx + '" y1="' + (fy - mh) + '" x2="' + px + '" y2="' + (fy + 4) + '"/>' +
      '<rect x="' + (mx - 7) + '" y="' + (fy - mh - 16) + '" width="14" height="26" rx="3" style="fill:var(--ink)"/>' +
      '<line x1="' + mx + '" y1="' + (fy - mh + 10) + '" x2="' + mx + '" y2="' + fy + '" stroke="var(--ink)" stroke-width="3"/>' +
      '<g style="color:var(--a)"><circle cx="' + px + '" cy="' + (fy - ph + 9) + '" r="9" fill="currentColor"/><path d="M' + px + ' ' + (fy - ph + 18) + 'L' + px + ' ' + (fy - 54) + 'M' + (px - 14) + ' ' + (fy - ph + 28) + 'L' + (px + 14) + ' ' + (fy - ph + 28) + 'M' + px + ' ' + (fy - 54) + 'L' + (px - 9) + ' ' + fy + 'M' + px + ' ' + (fy - 54) + 'L' + (px + 9) + ' ' + fy + '" stroke="currentColor" stroke-width="7" stroke-linecap="round" fill="none"/></g>' +
      '<rect class="gfoot" x="' + (px - 14) + '" y="' + (fy + 2) + '" width="28" height="5" rx="2.5"/>' +
      '<line class="gdim" x1="' + mx + '" y1="' + (fy + 22) + '" x2="' + px + '" y2="' + (fy + 22) + '"/><line class="gdim" x1="' + mx + '" y1="' + (fy + 17) + '" x2="' + mx + '" y2="' + (fy + 27) + '"/><line class="gdim" x1="' + px + '" y1="' + (fy + 17) + '" x2="' + px + '" y2="' + (fy + 27) + '"/>' +
      '<text class="gtb" x="' + ((mx + px) / 2) + '" y="' + (fy + 38) + '" text-anchor="middle">≈ 2,5 m</text>' +
      '<line class="gdim" x1="' + (mx - 20) + '" y1="' + (fy - mh + 10) + '" x2="' + (mx - 20) + '" y2="' + fy + '"/>' +
      '<text class="gtb" x="' + (mx - 24) + '" y="' + (fy - 34) + '" text-anchor="end">1–1,2 m</text>' +
      '<text class="gt" x="' + (mx + 10) + '" y="' + (fy - mh - 22) + '">móvil recto</text>' +
      '<text class="gt" x="' + (px - 4) + '" y="' + (fy + 38) + '" text-anchor="middle" style="fill:var(--c)">marca de pies</text>' +
      '</svg>';
  }
  $('#g-setup').innerHTML = setupSvg();
  $('#g-poses').innerHTML = [['frente', 'Frente'], ['lado', 'Lado'], ['espalda', 'Espalda']].map(function (p) { return '<div class="pose">' + poseSvg(p[0]) + '<b>' + p[1] + '</b></div>'; }).join('');
  var CHECK = [
    ['Hora y estado', 'Por la mañana, en ayunas y después de ir al baño.'],
    ['Misma ropa', 'Ajustada y la de siempre: top deportivo y short, o solo short.'],
    ['Pelo recogido y sin accesorios', 'Que se vea bien el cuello y los hombros.'],
    ['Móvil en su marca', 'Recto, a la altura del ombligo o del pecho, con zoom 1x.'],
    ['Pies en las marcas', 'Talones en la cinta, a la anchura de la cadera.'],
    ['Luz repartida', 'Sin sol directo ni luz fuerte detrás de ti.'],
    ['Cuerpo relajado', 'Sin meter tripa, sin sacar pecho y sin tensar.'],
    ['Cuerpo entero en la imagen', 'La cabeza cerca de la línea de arriba y los pies cerca de la de abajo.']
  ];
  $('#g-check').innerHTML = CHECK.map(function (c, i) { return '<li><input type="checkbox" id="ck' + i + '"><label for="ck' + i + '">' + c[0] + '<small>' + c[1] + '</small></label></li>'; }).join('');

  /* =============== FOTOS =============== */
  var FOTOS = [];
  function loadFotos() { return EN.fotos.all().then(function (a) { FOTOS = a; return a; }, function () { FOTOS = []; return []; }); }
  function sessions() {
    var m = {};
    FOTOS.forEach(function (f) { (m[f.fecha] = m[f.fecha] || {})[f.pose] = f; });
    return Object.keys(m).sort().map(function (d) { return { fecha: d, poses: m[d] }; });
  }
  function medTag(d) {
    var e = MED[d]; if (!e) return '';
    var t = []; if (e.peso != null) t.push(fmt(e.peso) + ' kg'); if (e.grasa != null) t.push(fmt(e.grasa) + ' % grasa'); if (e.cintura != null) t.push('cintura ' + fmt(e.cintura) + ' cm');
    return t.join(' · ');
  }
  function renderFotos() {
    var ss = sessions().reverse(), today = EN.today();
    if (!ss.length || ss[0].fecha !== today) ss.unshift({ fecha: today, poses: {}, hoy: true });
    $('#sessions').innerHTML = ss.map(function (s) {
      var ago = EN.days(s.fecha), when = ago === 0 ? 'Hoy' : 'hace ' + ago + (ago === 1 ? ' día' : ' días');
      var slots = POSES.map(function (p) {
        var f = s.poses[p.k];
        return f ? '<button type="button" class="slot has" data-d="' + s.fecha + '" data-p="' + p.k + '" aria-label="Ver foto de ' + p.n.toLowerCase() + ' del ' + EN.fdate(s.fecha) + '"><img src="' + f.img + '" alt=""><span class="lb">' + p.n + '</span></button>'
          : '<button type="button" class="slot" data-d="' + s.fecha + '" data-p="' + p.k + '" aria-label="Añadir foto de ' + p.n.toLowerCase() + '">' + ic('plus') + '<span>' + p.n + '</span></button>';
      }).join('');
      return '<section class="card ses"><div class="h"><b>' + EN.fdate(s.fecha, true) + '</b><span class="tag">' + when + (medTag(s.fecha) ? ' · ' + medTag(s.fecha) : '') + '</span></div><div class="slots">' + slots + '</div></section>';
    }).join('');
    $$('#sessions .slot').forEach(function (b) {
      b.addEventListener('click', function () { b.classList.contains('has') ? openLbx(b.dataset.d, b.dataset.p) : pickFile(b.dataset.d, b.dataset.p); });
    });
    renderCompare();
  }
  function fileToJpeg(file, maxSide) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var s = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .82));
      };
      im.onerror = function () { URL.revokeObjectURL(url); no(new Error('imagen')); };
      im.src = url;
    });
  }
  function savePhoto(fecha, pose, img, cam) {
    return EN.fotos.put({ id: fecha + '|' + pose, fecha: fecha, pose: pose, cam: cam || null, img: img }).then(function () { EN.persist(); });
  }
  var galTarget = null;
  function pickFile(d, p) { galTarget = { d: d, p: p }; if (typeof CAM !== 'undefined') CAM.galmode = false; $('#gal').value = ''; $('#gal').click(); }

  /* ---- ver / cambiar / borrar ---- */
  var lb = null;
  function openLbx(d, p) {
    var f = FOTOS.filter(function (x) { return x.fecha === d && x.pose === p; })[0]; if (!f) return;
    lb = { d: d, p: p }; $('#lb-img').src = f.img; $('#lb-t').textContent = EN.fdate(d, true) + ' · ' + POSES.filter(function (x) { return x.k === p; })[0].n;
    $('#lbx').hidden = false; $('#lb-x').focus();
  }
  function closeLbx() { $('#lbx').hidden = true; lb = null; }
  $('#lb-x').addEventListener('click', closeLbx);
  $('#lb-re').addEventListener('click', function () { var t = lb; closeLbx(); pickFile(t.d, t.p); });
  $('#lb-del').addEventListener('click', function () {
    var b = this;
    if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = '¿Seguro? Toca otra vez'; setTimeout(function () { delete b.dataset.sure; b.innerHTML = ic('trash-2') + 'Borrar'; }, 3000); return; }
    delete b.dataset.sure; b.innerHTML = ic('trash-2') + 'Borrar';
    var t = lb; EN.fotos.del(t.d + '|' + t.p).then(loadFotos).then(function () { closeLbx(); renderFotos(); toast('Foto borrada'); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!$('#lbx').hidden) closeLbx(); else if (!$('#cam').hidden) closeCam(); } });

  /* ---- antes y después ---- */
  var cmp = { a: null, b: null, p: 'frente' };
  function renderCompare() {
    var ss = sessions(), box = $('#cmpbox');
    if (ss.length < 2) { box.innerHTML = '<p class="sub">Cuando tengas fotos de dos fechas distintas podrás compararlas aquí deslizando.</p>'; return; }
    if (!cmp.a || !ss.some(function (s) { return s.fecha === cmp.a; })) cmp.a = ss[0].fecha;
    if (!cmp.b || !ss.some(function (s) { return s.fecha === cmp.b; })) cmp.b = ss[ss.length - 1].fecha;
    var opts = function (sel) { return ss.map(function (s) { return '<option value="' + s.fecha + '"' + (s.fecha === sel ? ' selected' : '') + '>' + EN.fdate(s.fecha, true) + '</option>'; }).join(''); };
    var fa = (FOTOS.filter(function (x) { return x.fecha === cmp.a && x.pose === cmp.p; })[0] || {}).img, fb = (FOTOS.filter(function (x) { return x.fecha === cmp.b && x.pose === cmp.p; })[0] || {}).img;
    var stage = fa && fb ?
      '<div class="cmp" id="cmpst"><img src="' + fb + '" alt="Después"><img class="top" src="' + fa + '" alt="Antes"><span class="hl"></span><span class="tg l">Antes</span><span class="tg r">Después</span><input type="range" min="0" max="100" value="50" id="cmprng" aria-label="Deslizar entre antes y después"></div>'
      : '<div class="cmp"><div class="none">No hay foto de ' + POSES.filter(function (x) { return x.k === cmp.p; })[0].n.toLowerCase() + ' en una de las dos fechas.</div></div>';
    var ea = MED[cmp.a], eb = MED[cmp.b], foot = '';
    if (cmp.a !== cmp.b) {
      var parts = ['<b>' + (EN.days(cmp.a) - EN.days(cmp.b)) + ' días</b> entre las dos'];
      if (ea && eb) {
        if (ea.peso != null && eb.peso != null) parts.push('peso <b>' + EN.sign(eb.peso - ea.peso) + ' kg</b>');
        if (ea.grasa != null && eb.grasa != null) parts.push('grasa <b>' + EN.sign(eb.grasa - ea.grasa) + ' %</b>');
        if (ea.cintura != null && eb.cintura != null) parts.push('cintura <b>' + EN.sign(eb.cintura - ea.cintura) + ' cm</b>');
      }
      foot = parts.join(' · ');
    }
    box.innerHTML = '<div class="fgrid"><label class="fld"><span>Antes</span><select id="cmpa">' + opts(cmp.a) + '</select></label><label class="fld"><span>Después</span><select id="cmpb">' + opts(cmp.b) + '</select></label></div>' +
      '<div class="seg" role="radiogroup" aria-label="Pose">' + POSES.map(function (p) { return '<input type="radio" name="cp" id="cp-' + p.k + '"' + (cmp.p === p.k ? ' checked' : '') + '><label for="cp-' + p.k + '">' + p.n + '</label>'; }).join('') + '</div>' + stage + '<p class="cmpfoot">' + foot + '</p>';
    $('#cmpa').addEventListener('change', function () { cmp.a = this.value; renderCompare(); });
    $('#cmpb').addEventListener('change', function () { cmp.b = this.value; renderCompare(); });
    POSES.forEach(function (p) { $('#cp-' + p.k).addEventListener('change', function () { cmp.p = p.k; renderCompare(); }); });
    var r = $('#cmprng'); if (r) r.addEventListener('input', function () { $('#cmpst').style.setProperty('--p', this.value + '%'); });
  }

  /* =============== CÁMARA GUIADA =============== */
  var CAM = { nocam: false, galmode: false, stream: null, facing: cfg.cam || 'user', idx: 0, shot: null, mode: cfg.modo || 'sil', timer: null, tilt: null, onori: null };
  var video = $('#c-video');
  function stopStream() { if (CAM.stream) { CAM.stream.getTracks().forEach(function (t) { t.stop(); }); CAM.stream = null; } video.srcObject = null; }
  function setMsg(t) { var m = $('#c-msg'); m.hidden = !t; m.textContent = t || ''; }
  function startStream() {
    stopStream();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { noCamera('Este navegador no deja usar la cámara desde aquí.'); return Promise.resolve(); }
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: CAM.facing }, width: { ideal: 1440 }, height: { ideal: 1920 } }, audio: false }).then(function (s) {
      CAM.nocam = false; CAM.stream = s; video.srcObject = s; video.classList.toggle('mir', CAM.facing === 'user'); setMsg('');
      var p = video.play(); if (p && p.catch) p.catch(function () {});
      paintOverlay();
    }, function () { noCamera('No tengo permiso para usar la cámara. Puedes dárselo en los ajustes del navegador, o usar «Elegir de la galería».'); });
  }
  function noCamera(t) {
    CAM.nocam = true; setMsg(t);
    galButtons();
  }
  function galButtons() {
    $('#c-live').innerHTML = '<button type="button" class="cb" id="c-gal">' + ic('image') + 'Elegir de la galería</button><button type="button" class="cb g" id="c-skip2">Saltar</button>';
    $('#c-gal').addEventListener('click', function () { CAM.galmode = true; $('#gal').value = ''; $('#gal').click(); });
    $('#c-skip2').addEventListener('click', nextPose);
  }
  function liveButtons() {
    if (CAM.nocam) { galButtons(); return; }
    $('#c-live').innerHTML = '<button type="button" class="cb" id="c-t10">' + ic('timer') + 'En 10 s</button><button type="button" class="cb g" id="c-now">Ahora</button><button type="button" class="cb g" id="c-skip">Saltar</button>';
    $('#c-t10').addEventListener('click', function () { shoot(10); });
    $('#c-now').addEventListener('click', function () { shoot(0); });
    $('#c-skip').addEventListener('click', nextPose);
  }
  function prevPhoto(pose) { // la foto anterior de esta pose (la más reciente que no sea de hoy)
    var l = FOTOS.filter(function (f) { return f.pose === pose && f.fecha < EN.today(); }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    return l[0] || null;
  }
  function paintOverlay() {
    var pose = POSES[CAM.idx].k, ov = $('#c-ov'), prev = prevPhoto(pose), mode = CAM.mode;
    if (mode === 'ant' && !prev) mode = 'sil';
    $$('#c-ovm button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.m === CAM.mode ? 'true' : 'false'); b.disabled = b.dataset.m === 'ant' && !prev; b.style.opacity = b.disabled ? .4 : 1; });
    if (mode === 'sil') ov.innerHTML = '<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet">' + silhouette(pose, 'ov') + '</svg>';
    else if (mode === 'ant') ov.innerHTML = '<img src="' + prev.img + '" alt="" class="' + (CAM.facing === 'user' ? 'mir' : '') + '">';
    else ov.innerHTML = '';
  }
  $$('#c-ovm button').forEach(function (b) { b.addEventListener('click', function () { CAM.mode = b.dataset.m; cfg.modo = CAM.mode; saveCfg(); paintOverlay(); }); });
  function paintHeader() {
    $('#c-pose').textContent = POSES[CAM.idx].n; $('#c-step').textContent = 'Foto ' + (CAM.idx + 1) + ' de ' + POSES.length;
  }
  function openCam(first) {
    CAM.idx = first || 0; CAM.shot = null; CAM.mode = cfg.modo || 'sil';
    if (CAM.mode === 'ant' && !prevPhoto(POSES[CAM.idx].k)) CAM.mode = 'sil';
    if (!cfg.modo && prevPhoto(POSES[CAM.idx].k)) CAM.mode = 'ant';
    $('#cam').hidden = false; document.body.style.overflow = 'hidden'; EN.audio(); EN.lock();
    setReview(false); liveButtons(); paintHeader(); paintOverlay();
    tiltStart(); return startStream();
  }
  function closeCam() {
    clearInterval(CAM.timer); CAM.timer = null; $('#c-cd').textContent = ''; stopStream(); tiltStop();
    $('#cam').hidden = true; document.body.style.overflow = ''; EN.unlock(); loadFotos().then(renderFotos);
  }
  function setReview(on) {
    $('#c-review').hidden = !on; $('#c-live').hidden = on; $('#c-rev').hidden = !on; $('#c-ovm').hidden = on;
    $('#c-ov').style.display = on ? 'none' : ''; $('#c-lv').style.display = on ? 'none' : '';
  }
  function nextPose() {
    if (CAM.idx >= POSES.length - 1) { closeCam(); toast('Sesión de fotos terminada'); return; }
    CAM.idx++; CAM.shot = null;
    if (CAM.mode === 'ant' && !prevPhoto(POSES[CAM.idx].k)) CAM.mode = 'sil';
    setReview(false); liveButtons(); paintHeader(); paintOverlay();
  }
  function flash() { var f = $('#c-fl'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  function shoot(sec) {
    EN.audio(); clearInterval(CAM.timer);
    var left = sec, cd = $('#c-cd');
    var go = function () { cd.textContent = ''; flash(); EN.tone(1175, .25); EN.buzz(120); capture(); };
    if (!sec) { go(); return; }
    $('#c-live').innerHTML = '<button type="button" class="cb g" id="c-cancel">' + ic('x') + 'Cancelar</button>';
    $('#c-cancel').addEventListener('click', function () { clearInterval(CAM.timer); cd.textContent = ''; liveButtons(); });
    cd.textContent = left; EN.tone(660, .1);
    CAM.timer = setInterval(function () {
      left--; if (left <= 0) { clearInterval(CAM.timer); go(); return; }
      cd.textContent = left; if (left <= 3) { EN.tone(660, .12); EN.buzz(40); }
    }, 1000);
  }
  function capture() {
    var v = video, vw = v.videoWidth, vh = v.videoHeight;
    if (!vw || !vh) { toast('La cámara aún no está lista'); liveButtons(); return; }
    // recorte 3:4 centrado, igual que lo que se ve en pantalla
    var sw = vw, sh = vh;
    if (vw / vh > 3 / 4) sw = Math.round(vh * 3 / 4); else sh = Math.round(vw * 4 / 3);
    var sx = Math.round((vw - sw) / 2), sy = Math.round((vh - sh) / 2), k = Math.min(1, 1200 / sh);
    var c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
    c.getContext('2d').drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
    CAM.shot = c.toDataURL('image/jpeg', .85); $('#c-rev').src = CAM.shot; setReview(true);
  }
  $('#c-redo').addEventListener('click', function () { CAM.shot = null; setReview(false); liveButtons(); });
  $('#c-ok').addEventListener('click', function () {
    if (!CAM.shot) return; var pose = POSES[CAM.idx].k, img = CAM.shot;
    savePhoto(EN.today(), pose, img, CAM.facing).then(loadFotos).then(function () { toast('Foto de ' + POSES[CAM.idx].n.toLowerCase() + ' guardada'); nextPose(); }, function () { toast('No se pudo guardar'); });
  });
  $('#c-flip').addEventListener('click', function () { CAM.facing = CAM.facing === 'user' ? 'environment' : 'user'; cfg.cam = CAM.facing; saveCfg(); startStream(); });
  $('#c-x').addEventListener('click', closeCam);
  // foto elegida desde la galería (hueco suelto o dentro de la cámara si no hay permiso)
  $('#gal').addEventListener('change', function () {
    var f = this.files && this.files[0], inCam = CAM.galmode, t = galTarget; CAM.galmode = false;
    if (!f) return;
    if (inCam) {
      var pose = POSES[CAM.idx].k;
      fileToJpeg(f, 1200).then(function (img) { return savePhoto(EN.today(), pose, img, 'file'); }).then(loadFotos).then(function () { toast('Foto guardada'); nextPose(); }, function () { toast('No se pudo guardar la foto'); });
    } else if (t) {
      fileToJpeg(f, 1200).then(function (img) { return savePhoto(t.d, t.p, img, 'file'); })
        .then(loadFotos).then(function () { renderFotos(); toast('Foto guardada'); }, function () { toast('No se pudo guardar la foto'); });
    }
  });

  /* ---- nivel: ¿está el móvil recto? ---- */
  function tiltStart() {
    var lv = $('#c-lv'); lv.innerHTML = '';
    var handler = function (e) {
      if (e.beta == null) return; var t = e.beta - 90, ok = Math.abs(t) <= 3;
      var up = CAM.facing === 'user' ? t < 0 : t > 0;
      lv.innerHTML = '<span class="' + (ok ? 'ok' : '') + '">' + (ok ? 'Móvil recto ✓' : 'Apunta ' + (up ? 'demasiado arriba' : 'demasiado abajo') + ' · ' + Math.round(Math.abs(t)) + '°') + '</span>';
    };
    CAM.onori = handler;
    try {
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') window.addEventListener('deviceorientation', handler); }, function () {});
      } else if (window.DeviceOrientationEvent) window.addEventListener('deviceorientation', handler);
    } catch (e) {}
  }
  function tiltStop() { try { if (CAM.onori) window.removeEventListener('deviceorientation', CAM.onori); } catch (e) {} CAM.onori = null; $('#c-lv').innerHTML = ''; }

  function startSession() { loadFotos().then(function () { openCam(0); }); }
  $('#b-cam').addEventListener('click', startSession);
  $('#g-cam').addEventListener('click', function () { showTab('fotos'); startSession(); });

  /* =============== arranque =============== */
  fillForm(EN.today()); renderMed();
  var h = (location.hash || '').replace('#', ''); if (h === 'fotos' || h === 'guia') showTab(h);
  loadFotos();
})();
