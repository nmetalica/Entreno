/* Resumen para la entrenadora: junta rutina, pesos, medidas y fotos en una página imprimible. */
(function () {
  'use strict';
  var $ = EN.$, $$ = EN.$$, esc = EN.esc, fmt = EN.fmt, PLAN = window.PLAN;
  var S = EN.get(EN.K.rut, {}) || {}, MED = EN.get(EN.K.med, {}) || {}, LOG = EN.get(EN.K.log, []) || [];
  var PER = EN.get(EN.K.perfil, {}) || {}, NOT = EN.get(EN.K.notas, {}) || {};
  if (!NOT.pts) NOT.pts = {};
  function toast(t) { var e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('on'); }, 2400); }
  var num = EN.num;
  function name() { return (PER.nombre || '').trim() || 'Emilio'; }

  /* ---------- constancia ---------- */
  function sess(w, d) {
    var sid = 'w' + w + 'd' + d, tot = 0, n = 0;
    PLAN[w - 1].days[d - 1].ex.forEach(function (x, i) { for (var j = 1; j <= x.sets; j++) { tot++; if (S['c:' + sid + '-e' + (i + 1) + '-s' + j]) n++; } });
    return { sid: sid, tot: tot, n: n, done: !!S['c:' + sid + '-done'], pct: tot ? Math.round(n / tot * 100) : 0 };
  }
  var TXT = { cons: '' };
  function renderConst() {
    var doneN = 0, sn = 0, st = 0, cells = '';
    for (var w = 1; w <= 4; w++) {
      cells += '<span class="h">S' + w + '</span>';
      for (var d = 1; d <= 3; d++) {
        var s = sess(w, d); if (s.done) doneN++; sn += s.n; st += s.tot;
        cells += '<span class="c ' + (s.done ? 'ok' : s.n ? 'mid' : '') + '">' + (s.done ? '✓' : s.n ? s.pct + ' %' : '—') + '<small>Día ' + d + '</small></span>';
      }
    }
    var mins = LOG.map(function (l) { return l.min; }).filter(Boolean), avg = mins.length ? Math.round(mins.reduce(function (a, b) { return a + b; }, 0) / mins.length) : null;
    var gym = LOG.filter(function (l) { return l.lugar === 'gym'; }).length, casa = LOG.filter(function (l) { return l.lugar === 'casa'; }).length;
    var ds = LOG.map(function (l) { return l.ini; }).sort();
    $('#kp').innerHTML = '<div><b>' + doneN + '/12</b><span>sesiones terminadas</span></div><div><b>' + (st ? Math.round(sn / st * 100) : 0) + ' %</b><span>de las series marcadas</span></div><div><b>' + (avg == null ? '—' : avg + ' min') + '</b><span>duración media</span></div>';
    $('#wk').innerHTML = cells;
    var sub = [];
    if (LOG.length) sub.push(gym + ' en gimnasio y ' + casa + ' en casa (de las hechas con el modo guiado)');
    if (ds.length) sub.push('del ' + EN.fdate(new Date(ds[0]).toISOString().slice(0, 10), true) + ' al ' + EN.fdate(new Date(ds[ds.length - 1]).toISOString().slice(0, 10), true));
    $('#cnote').textContent = sub.join(' · ');
    TXT.cons = 'Sesiones terminadas: ' + doneN + ' de 12 · series marcadas: ' + (st ? Math.round(sn / st * 100) : 0) + ' %' + (avg != null ? ' · duración media ' + avg + ' min' : '') + (LOG.length ? ' · ' + gym + ' en gimnasio, ' + casa + ' en casa' : '');
    $('#psub').textContent = name() + ' · ' + new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /* ---------- pesos ---------- */
  function wv(w, d, i, pl) { return num(S['v:w' + w + 'd' + d + '-e' + (i + 1) + '-kg-' + pl]); }
  function renderPesos() {
    var html = '', lines = [];
    for (var d = 1; d <= 3; d++) {
      var D1 = PLAN[0].days[d - 1], rows = '';
      D1.ex.forEach(function (x1, i) {
        var any = false, tds = '', first = {}, last = {};
        for (var w = 1; w <= 4; w++) {
          var ex = PLAN[w - 1].days[d - 1].ex[i]; if (!ex) { tds += '<td></td>'; continue; }
          var c = wv(w, d, i, 'casa'), g = wv(w, d, i, 'gym'), t = '';
          if (c != null && g != null) t = fmt(c) + ' / ' + fmt(g); else if (c != null) t = fmt(c); else if (g != null) t = fmt(g);
          if (c != null) { any = true; if (first.c == null) first.c = c; last.c = c; }
          if (g != null) { any = true; if (first.g == null) first.g = g; last.g = g; }
          tds += '<td>' + (t ? '<b>' + t + '</b>' : '—') + (ex.k !== x1.k && t ? '<small>' + esc(ex.name) + '</small>' : '') + '</td>';
        }
        if (!any) return;
        var dl = [];
        if (first.c != null && last.c !== first.c) dl.push(EN.sign(last.c - first.c) + ' kg' + (first.g != null ? ' casa' : ''));
        if (first.g != null && last.g !== first.g) dl.push(EN.sign(last.g - first.g) + ' kg' + (first.c != null ? ' gym' : ''));
        rows += '<tr><td class="nm">' + esc(x1.name) + '</td>' + tds + '<td><b class="' + (dl.length && dl[0].charAt(0) === '+' ? 'up' : '') + '">' + (dl.join(' · ') || '—') + '</b></td></tr>';
        lines.push(D1.title + ' · ' + x1.name + ': ' + [1, 2, 3, 4].map(function (w) { var c = wv(w, d, i, 'casa'), g = wv(w, d, i, 'gym'); var v = g != null ? g : c; return v != null ? 'S' + w + ' ' + fmt(v) : null; }).filter(Boolean).join(' → ') + ' kg');
      });
      if (rows) html += '<h3 class="dayh">Día ' + d + ' · ' + esc(D1.title) + '</h3><div class="scroll"><table class="tb"><thead><tr><th>Ejercicio</th><th>S1</th><th>S2</th><th>S3</th><th>S4</th><th>Cambio</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
    $('#pesos').innerHTML = html || '<p class="sub">Todavía no has apuntado pesos. En el entreno guiado o en la rutina, escribe el peso usado en cada ejercicio.</p>';
    if (html) $('#pesos').insertAdjacentHTML('beforeend', '<p class="sub">En kg. Con «casa / gym» cuando has apuntado los dos. El cambio compara la primera y la última semana con dato.</p>');
    TXT.pesos = lines;
  }

  /* ---------- cuerpo ---------- */
  function derive(e) { var d = {}; if (e.peso != null && e.grasa != null) { d.gkg = e.peso * e.grasa / 100; d.magra = e.peso - d.gkg; } return d; }
  var METR = [['peso', 'Peso', 'kg', function (e) { return e.peso; }], ['grasa', 'Grasa corporal', '%', function (e) { return e.grasa; }], ['magra', 'Masa magra', 'kg', function (e) { return derive(e).magra; }],
    ['gkg', 'Masa grasa', 'kg', function (e) { return derive(e).gkg; }], ['musculo', 'Músculo (báscula)', 'kg', function (e) { return e.musculo; }], ['cintura', 'Cintura', 'cm', function (e) { return e.cintura; }],
    ['cadera', 'Cadera', 'cm', function (e) { return e.cadera; }], ['pecho', 'Pecho', 'cm', function (e) { return e.pecho; }], ['brazo', 'Brazo', 'cm', function (e) { return e.brazo; }], ['muslo', 'Muslo', 'cm', function (e) { return e.muslo; }]];
  function renderCuerpo() {
    var ds = Object.keys(MED).sort(), lines = [];
    if (!ds.length) {
      var bw = [1, 2, 3, 4].map(function (w) { return num(S['v:bw' + w]); });
      if (bw.some(function (v) { return v != null; })) {
        $('#cuerpo').innerHTML = '<p class="sub">Peso semanal apuntado en la rutina:</p><div class="scroll"><table class="tb"><thead><tr><th></th><th>S1</th><th>S2</th><th>S3</th><th>S4</th></tr></thead><tbody><tr><td>Peso (kg)</td>' + bw.map(function (v) { return '<td>' + fmt(v) + '</td>'; }).join('') + '</tr></tbody></table></div>';
        lines.push('Peso semanal (kg): ' + bw.map(function (v, i) { return v != null ? 'S' + (i + 1) + ' ' + fmt(v) : null; }).filter(Boolean).join(' · '));
      } else $('#cuerpo').innerHTML = '<p class="sub">Aún no hay medidas. Se apuntan en «Medidas y fotos».</p>';
      TXT.cuerpo = lines; return;
    }
    var a = ds[0], z = ds[ds.length - 1], two = ds.length > 1, rows = '';
    METR.forEach(function (m) {
      var x = m[3](MED[a]), y = m[3](MED[z]); if (x == null && y == null) return;
      var dl = two && x != null && y != null ? EN.sign(y - x) + ' ' + m[2] : '—';
      rows += '<tr><td>' + m[1] + '</td><td>' + (x == null ? '—' : fmt(x)) + '</td>' + (two ? '<td>' + (y == null ? '—' : fmt(y)) + '</td><td><b>' + dl + '</b></td>' : '') + '</tr>';
      lines.push(m[1] + ': ' + (x == null ? '—' : fmt(x)) + (two ? ' → ' + (y == null ? '—' : fmt(y)) + ' ' + m[2] + (dl !== '—' ? ' (' + dl + ')' : '') : ' ' + m[2]));
    });
    $('#cuerpo').innerHTML = '<div class="scroll"><table class="tb"><thead><tr><th></th><th>' + EN.fdate(a, true) + '</th>' + (two ? '<th>' + EN.fdate(z, true) + '</th><th>Cambio</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="sub">' + ds.length + (ds.length === 1 ? ' medición' : ' mediciones') + ' en total. La masa magra y la grasa se calculan con el peso y el % de grasa de la báscula inteligente.</p>';
    TXT.cuerpo = lines; TXT.cuerpoFechas = two ? EN.fdate(a, true) + ' → ' + EN.fdate(z, true) : EN.fdate(a, true);
  }

  /* ---------- fotos ---------- */
  function renderFotos() {
    var box = $('#fotos'); if (!$('#incf').checked) { box.innerHTML = ''; return; }
    EN.fotos.all().then(function (all) {
      var m = {}; all.forEach(function (f) { (m[f.fecha] = m[f.fecha] || {})[f.pose] = f; });
      var ds = Object.keys(m).sort();
      if (!ds.length) { box.innerHTML = '<p class="sub">Aún no hay fotos.</p>'; return; }
      var pick = ds.length > 1 ? [ds[0], ds[ds.length - 1]] : [ds[0]];
      box.innerHTML = pick.map(function (d, k) {
        return '<p class="eyeb" style="margin-top:6px">' + (ds.length > 1 ? (k ? 'Última' : 'Primera') + ' · ' : '') + EN.fdate(d, true) + '</p><div class="fo"><span class="l"></span>' + EN.POSES.map(function (p) {
          var f = m[d][p.k]; return f ? '<img src="' + f.img + '" alt="' + p.n + ' ' + EN.fdate(d) + '">' : '<span class="e">' + p.n + '</span>';
        }).join('') + '</div>';
      }).join('');
    });
  }
  $('#incf').addEventListener('change', renderFotos);

  /* ---------- puntos para comentar y notas ---------- */
  var PTS = [
    ['b-kcal', 'Plan de Breisy: según las cifras del PDF, los menús suman de media unas 1.342 kcal al día frente a 1.561 de objetivo (unas 220 menos). ¿Es intencionado o se compensa con el batido y las cenas?'],
    ['e-macros', 'Plan de Emilio: los menús dan de media unas 2.177 kcal, 165 g de proteína, 93 g de grasa y 171 g de hidratos; el objetivo del PDF es 2.211 kcal, 131 g, 74 g y 256 g. ¿Se mantiene este reparto?'],
    ['b-lista', 'Lista de la compra de Breisy: el arroz sale 950 g en la lista y 690 g sumando los menús; la patata, 420 g en la lista y 480 g en los menús. ¿Cuál vale?'],
    ['batido', 'El batido de proteína con bebida de soja no aparece en las listas de la compra: ¿cuántos días a la semana se toma?']
  ];
  function renderPts() {
    $('#pts').innerHTML = PTS.map(function (p) {
      var on = !!NOT.pts[p[0]];
      return '<li class="' + (on ? '' : 'off') + '"><input type="checkbox" id="pt-' + p[0] + '"' + (on ? ' checked' : '') + '><label for="pt-' + p[0] + '">' + esc(p[1]) + '</label></li>';
    }).join('');
    $$('#pts input').forEach(function (i) { i.addEventListener('change', function () { var id = i.id.slice(3); if (i.checked) NOT.pts[id] = 1; else delete NOT.pts[id]; i.closest('li').classList.toggle('off', !i.checked); EN.set(EN.K.notas, NOT); }); });
  }
  $('#notas').value = NOT.texto || '';
  $('#notas').addEventListener('input', function () { NOT.texto = this.value; EN.set(EN.K.notas, NOT); });
  $('#nombre').value = PER.nombre || '';
  $('#nombre').addEventListener('input', function () { PER.nombre = this.value; EN.set(EN.K.perfil, PER); $('#psub').textContent = name() + ' · ' + new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); });

  /* ---------- texto para enviar ---------- */
  function buildText() {
    var L = ['RESUMEN DE ENTRENO · ' + name(), new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }), '', 'CONSTANCIA', TXT.cons];
    if (TXT.pesos && TXT.pesos.length) { L.push('', 'PESOS POR EJERCICIO'); L = L.concat(TXT.pesos); }
    if (TXT.cuerpo && TXT.cuerpo.length) { L.push('', 'CUERPO' + (TXT.cuerpoFechas ? ' (' + TXT.cuerpoFechas + ')' : '')); L = L.concat(TXT.cuerpo); }
    var pts = PTS.filter(function (p) { return NOT.pts[p[0]]; }).map(function (p) { return '• ' + p[1]; });
    if (pts.length || (NOT.texto || '').trim()) { L.push('', 'PARA COMENTAR'); L = L.concat(pts); if ((NOT.texto || '').trim()) L.push(NOT.texto.trim()); }
    return L.join('\n');
  }
  $('#b-print').addEventListener('click', function () { window.print(); });
  $('#b-copy').addEventListener('click', function () {
    var t = buildText();
    var fb = function () { var a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); toast('Texto copiado'); } catch (e) { toast('No se pudo copiar'); } a.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('Texto copiado'); }, fb); else fb();
  });
  $('#b-share').addEventListener('click', function () {
    var t = buildText();
    if (navigator.share) navigator.share({ title: 'Resumen de entreno', text: t }).catch(function () {});
    else $('#b-copy').click();
  });

  renderConst(); renderPesos(); renderCuerpo(); renderPts(); renderFotos();
})();
