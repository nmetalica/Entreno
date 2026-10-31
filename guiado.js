/* Entreno guiado: una pantalla por ejercicio, descanso automático y cardio.
   Lee y escribe el mismo guardado que rutina.html, así que todo queda sincronizado. */
(function () {
  'use strict';
  var $ = EN.$, $$ = EN.$$, esc = EN.esc, ic = EN.ic, K = EN.K.rut;
  var PLAN = window.PLAN, FIGS = window.FIGS, CARDIO = window.CARDIO;

  /* ---------- guardado (se relee antes de escribir por si la otra página lo cambió) ---------- */
  var S = {};
  function load() { try { S = JSON.parse(localStorage.getItem(K) || '{}') || {}; } catch (e) { S = {}; } return S; }
  function mut(fn) { load(); fn(S); try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) {} }
  function toast(t) { var e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('on'); }, 2400); }
  var num = function (v) { return EN.num(v); };

  /* ---------- sesión elegida ---------- */
  var sel = { w: 1, d: 1, place: 'casa' }, restSecs = 60, ei = 0, items = [], rest = null, hold = null, cv = null, t0 = 0;
  function sidOf(w, d) { return 'w' + (w || sel.w) + 'd' + (d || sel.d); }
  function dayOf(w, d) { return PLAN[w - 1].days[d - 1]; }
  function exCount(w, d) { return dayOf(w, d).ex.length; }
  function seriesTotals(w, d) {
    var tot = 0, n = 0, sid = sidOf(w, d);
    dayOf(w, d).ex.forEach(function (x, i) { for (var j = 1; j <= x.sets; j++) { tot++; if (S['c:' + sid + '-e' + (i + 1) + '-s' + j]) n++; } });
    return { n: n, tot: tot };
  }
  function isDone(w, d) { return !!S['c:' + sidOf(w, d) + '-done']; }
  function firstPending() {
    for (var w = 1; w <= 4; w++) for (var d = 1; d <= 3; d++) if (!isDone(w, d)) return { w: w, d: d };
    return { w: 4, d: 3 };
  }
  function partial() { // sesión empezada y sin terminar (la última en orden)
    var r = null;
    for (var w = 1; w <= 4; w++) for (var d = 1; d <= 3; d++) { var t = seriesTotals(w, d); if (!isDone(w, d) && t.n > 0) r = { w: w, d: d, n: t.n, tot: t.tot }; }
    return r;
  }
  function buildItems() {
    items = dayOf(sel.w, sel.d).ex.map(function (x, i) { return { t: 'ex', x: x, i: i }; });
    if (sel.place === 'gym') items.push({ t: 'cv' });
  }
  function cid(i) { return sidOf() + '-e' + (items[i].i + 1); }
  function sDone(i, j) { return !!S['c:' + cid(i) + '-s' + j]; }
  function nextOpen(i) { var n = items[i].x.sets; for (var j = 1; j <= n; j++) if (!sDone(i, j)) return j; return 0; }
  function exDone(i) { return nextOpen(i) === 0; }
  function nameOf(i) { var it = items[i]; if (it.t === 'cv') return 'Cardio de 20 minutos'; return sel.place === 'gym' && it.x.gym ? it.x.gym.name : it.x.name; }
  function firstOpenItem() {
    for (var i = 0; i < items.length; i++) { if (items[i].t === 'ex') { if (!exDone(i)) return i; } else if (!S['c:' + sidOf() + '-cardio']) return i; }
    return items.length - 1;
  }

  /* =============== pantalla de selección =============== */
  function stored(name, re) { var v = S[name]; var m = v && String(v).match(re); return m ? +m[1] : null; }
  function paintSetup() {
    load();
    var fp = firstPending();
    if (!sel.fixed) {
      sel.w = fp.w; sel.d = fp.d;
    }
    sel.place = S['r:lugar'] === 'lg-gym' ? 'gym' : 'casa';
    restSecs = S['r:descanso'] === 'rs45' ? 45 : 60;
    $('#lg-' + sel.place).checked = true; $('#rs' + restSecs).checked = true;
    $('#o-w').innerHTML = PLAN.map(function (W) {
      var all = [1, 2, 3].every(function (d) { return isDone(W.n, d); });
      return '<input type="radio" name="ow" id="ow' + W.n + '"' + (W.n === sel.w ? ' checked' : '') + '><label for="ow' + W.n + '"><b>S' + W.n + (all ? ' ✓' : '') + '</b><small>' + esc(W.name) + '</small></label>';
    }).join('');
    $('#o-d').innerHTML = PLAN[sel.w - 1].days.map(function (D) {
      return '<input type="radio" name="od" id="od' + D.n + '"' + (D.n === sel.d ? ' checked' : '') + '><label for="od' + D.n + '"><b>Día ' + D.n + (isDone(sel.w, D.n) ? ' ✓' : '') + '</b><small>' + esc(D.title) + '</small></label>';
    }).join('');
    $$('#o-w input').forEach(function (r) { r.addEventListener('change', function () { sel.w = +r.id.slice(2); sel.fixed = true; paintSetup(); }); });
    $$('#o-d input').forEach(function (r) { r.addEventListener('change', function () { sel.d = +r.id.slice(2); sel.fixed = true; paintSetup(); }); });
    var D = dayOf(sel.w, sel.d), mins = Math.round(D.ex.reduce(function (a, x) { return a + x.secs; }, 0) / 60);
    $('#sumline').textContent = D.title + ' · ' + D.ex.length + ' ejercicios · unos ' + mins + ' min' + (sel.place === 'gym' ? ' + 20 min de cardio' : '');
    var p = partial(), rz = $('#resume');
    rz.hidden = !p;
    if (p) {
      $('#rs-t').textContent = 'Semana ' + p.w + ' · Día ' + p.d + ' · ' + dayOf(p.w, p.d).title;
      $('#rs-s').textContent = p.n + ' de ' + p.tot + ' series hechas';
      $('#rs-go').onclick = function () { sel.w = p.w; sel.d = p.d; sel.fixed = true; begin(); };
    }
  }
  ['casa', 'gym'].forEach(function (k) { $('#lg-' + k).addEventListener('change', function () { sel.place = k; mut(function (s) { s['r:lugar'] = 'lg-' + k; }); paintSetup(); }); });
  [45, 60].forEach(function (k) { $('#rs' + k).addEventListener('change', function () { restSecs = k; mut(function (s) { s['r:descanso'] = 'rs' + k; }); }); });
  $('#start').addEventListener('click', begin);

  function begin() {
    EN.audio(); EN.lock(); EN.persist();
    mut(function (s) { s['r:semana'] = 'wk' + sel.w; s['r:dia'] = 'dy' + sel.d; s['r:lugar'] = 'lg-' + sel.place; s['r:vista'] = 'vw-train'; s['r:descanso'] = 'rs' + restSecs; });
    var cfg = EN.get(EN.K.cfg, {}) || {}, sid = sidOf();
    if (!(cfg.ses && cfg.ses.sid === sid && Date.now() - cfg.ses.ini < 6 * 3600 * 1000)) { cfg.ses = { sid: sid, ini: Date.now() }; EN.set(EN.K.cfg, cfg); }
    t0 = cfg.ses.ini;
    buildItems(); ei = firstOpenItem(); stopTimers();
    $('#v-setup').hidden = true; $('#v-done').hidden = true; $('#v-work').hidden = false;
    document.body.classList.toggle('gym', sel.place === 'gym');
    render();
  }

  /* =============== pantalla de entrenamiento =============== */
  function fig(k) { return FIGS[k] || ''; }
  function cueHtml(arr) {
    return '<div><b>Postura</b>' + esc(arr[0]) + '</div><div><b>Movimiento</b>' + esc(arr[1]) + '</div>';
  }
  function render() {
    var it = items[ei], n = items.length;
    $('#w-t').textContent = it.t === 'cv' ? 'Cardio' : 'Ejercicio ' + (ei + 1) + ' de ' + dayOf(sel.w, sel.d).ex.length;
    $('#w-s').textContent = 'Semana ' + sel.w + ' · Día ' + sel.d + ' · ' + dayOf(sel.w, sel.d).title;
    $('#w-prev').disabled = ei === 0; $('#w-next').disabled = ei === n - 1;
    $('#w-prog').innerHTML = items.map(function (x, i) {
      var d = x.t === 'ex' ? exDone(i) : !!S['c:' + sidOf() + '-cardio'];
      return '<i class="' + (d ? 'd' : i === ei ? (x.t === 'cv' ? 'cv' : 'c') : '') + '"></i>';
    }).join('');
    var mid = $('#w-mid');
    mid.innerHTML = it.t === 'ex' ? exHtml(it) : cardioHtml();
    mid.scrollTop = 0;
    if (it.t === 'ex') bindEx(it); else bindCardio();
    renderDock();
  }

  function weightKey(i) { return cid(i) + '-kg-' + sel.place; }
  function prevWeight(i) {
    if (sel.w < 2) return null; var it = items[i], pd = dayOf(sel.w - 1, sel.d), px = pd.ex[it.i];
    if (!px || px.k !== it.x.k) return null;
    return num(S['v:w' + (sel.w - 1) + 'd' + sel.d + '-e' + (it.i + 1) + '-kg-' + sel.place]);
  }
  function exHtml(it) {
    var x = it.x, gym = sel.place === 'gym' && x.gym, k = gym ? x.gym.k : x.k, cue = gym && x.gym.cue ? x.gym.cue : x.cue;
    var j = nextOpen(ei), bub = '';
    for (var s = 1; s <= x.sets; s++) bub += '<button type="button" class="bub' + (sDone(ei, s) ? ' d' : s === j ? ' cur' : '') + '" data-s="' + s + '" aria-label="Serie ' + s + (sDone(ei, s) ? ', hecha' : '') + '" aria-pressed="' + (sDone(ei, s) ? 'true' : 'false') + '">' + (sDone(ei, s) ? ic('check') : s) + '</button>';
    var kg = '';
    if (x.kg) {
      var v = S['v:' + weightKey(ei)], pv = prevWeight(ei);
      kg = '<div class="kgrow"><span class="l">Peso usado</span><button type="button" class="ib" id="kg-m" aria-label="Quitar medio kilo">' + ic('minus') + '</button><input id="kg" type="text" inputmode="decimal" autocomplete="off" placeholder="' + (pv != null ? EN.fmt(pv) : '—') + '" value="' + esc(v == null ? '' : v) + '" aria-label="Peso usado en kilos"><button type="button" class="ib" id="kg-p" aria-label="Añadir medio kilo">' + ic('plus') + '</button><span class="u">kg</span>' + (pv != null ? '<span class="prev">Semana anterior: ' + EN.fmt(pv) + ' kg. Si te fue fácil, sube un poco.</span>' : '') + '</div>';
    }
    var alt = x.alt ? '<details class="how2"><summary>' + ic('repeat') + esc(x.alt.t) + '</summary><div class="altx">' + fig(x.alt.k) + '<p>' + esc(x.alt.txt) + '</p></div></details>' : '';
    return '<div class="fcard">' + fig(k) + '<span class="no">' + (it.i + 1) + '</span></div>' +
      '<div class="wh"><h2>' + esc(nameOf(ei)) + '</h2>' + (gym ? '<p class="was">En casa: ' + esc(x.name) + '</p>' : '') + '</div>' +
      '<div class="dose"><span class="big">' + x.sets + ' × ' + esc(x.reps) + '</span>' + (x.uni ? '<span class="uni">' + esc(x.uni) + '</span>' : '') + '</div>' +
      (x.note ? '<p class="wnote">' + ic('zap') + '<span>' + esc(x.note) + '</span></p>' : '') +
      '<p class="imp">' + ic('triangle-alert') + '<span>' + esc(cue[2]) + '</span></p>' +
      '<div class="bubs" role="group" aria-label="Series">' + bub + '</div>' + kg +
      '<details class="how2"><summary>' + ic('person-standing') + 'Cómo se hace</summary><div>' + cueHtml(cue) + '</div></details>' + alt;
  }
  function bindEx(it) {
    $$('#w-mid .bub').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = +b.dataset.s, was = sDone(ei, s);
        mut(function (S2) { var key = 'c:' + cid(ei) + '-s' + s; if (was) delete S2[key]; else S2[key] = 1; });
        load(); render();
      });
    });
    var inp = $('#kg');
    if (inp) {
      var key = 'v:' + weightKey(ei);
      var setV = function (v) { mut(function (S2) { if (v === '' || v == null) delete S2[key]; else S2[key] = v; }); };
      inp.addEventListener('input', function () { var c = inp.value.replace(/[^0-9.,]/g, ''); if (c !== inp.value) inp.value = c; setV(c.trim()); });
      var step = function (d) {
        var cur = num(inp.value); if (cur == null) cur = prevWeight(ei); if (cur == null) cur = d > 0 ? 4.5 : 0;
        cur = Math.max(0, Math.round((cur + d) * 2) / 2); inp.value = EN.fmt(cur); setV(inp.value);
      };
      $('#kg-m').addEventListener('click', function () { step(-.5); });
      $('#kg-p').addEventListener('click', function () { step(.5); });
    }
  }

  /* ---------- base inferior: acción principal, descanso o cuenta atrás ---------- */
  function ringDock(cls, big, label, sub, btns) {
    return '<div class="rest ' + cls + '"><div class="ring"><svg viewBox="0 0 72 72" aria-hidden="true"><circle class="r0" cx="36" cy="36" r="32"/><circle class="r1" id="rr" cx="36" cy="36" r="32"/></svg><b id="rt">' + big + '</b></div>' +
      '<div class="tx"><b id="rl">' + label + '</b><small id="rsub">' + sub + '</small></div><div class="bt">' + btns + '</div></div>';
  }
  function renderDock() {
    var dock = $('#w-dock'), it = items[ei];
    if (hold) { holdDock(dock); return; }
    if (rest) {
      dock.innerHTML = ringDock(rest.done ? 'go2' : '', rest.done ? '¡Ya!' : EN.mmss(rest.left), rest.done ? 'A por la siguiente' : 'Descanso', esc(rest.next || ''),
        rest.done ? '' : '<button type="button" id="r-more">+15 s</button><button type="button" id="r-skip">Saltar</button>');
      paintRing();
      if (!rest.done) { $('#r-skip').addEventListener('click', function () { stopRest(); }); $('#r-more').addEventListener('click', function () { rest.end += 15000; rest.total += 15; tickRest(); }); }
      return;
    }
    if (it.t === 'cv') { cvDock(dock); return; }
    var x = it.x, j = nextOpen(ei);
    if (!j) { dock.innerHTML = '<button type="button" class="go" id="g-main">' + (ei < items.length - 1 ? 'Siguiente ejercicio' + ic('chevron-right') : 'Terminar sesión' + ic('check')) + '</button>'; $('#g-main').addEventListener('click', function () { if (ei < items.length - 1) { ei++; render(); } else finish(); }); return; }
    if (x.hold) dock.innerHTML = '<button type="button" class="go" id="g-main">' + ic('timer') + 'Empezar ' + (x.hold >= 60 ? (x.hold / 60) + ' min' : x.hold + ' s') + ' · serie ' + j + '</button>';
    else dock.innerHTML = '<button type="button" class="go" id="g-main">' + ic('check') + 'Serie ' + j + ' hecha</button>';
    $('#g-main').addEventListener('click', function () { if (x.hold) startHold(x.hold); else markSeries(ei, nextOpen(ei)); });
  }
  function paintRing() {
    var r = $('#rr'); if (!r || !rest) return;
    r.style.strokeDashoffset = rest.done ? 0 : (201 * rest.left / rest.total).toFixed(1);
  }

  function markSeries(i, j) {
    mut(function (S2) { S2['c:' + cid(i) + '-s' + j] = 1; });
    var x = items[i].x;
    if (exDone(i)) {
      if (i >= items.length - 1) { render(); finish(); return; }
      ei = i + 1;
      if (items[ei].t === 'cv') { render(); return; }          // antes del cardio no hace falta descanso
      startRest('Luego: ' + nameOf(ei));
    } else startRest('Siguiente: serie ' + nextOpen(i) + ' de ' + x.sets);
    render();
  }

  /* ---------- descanso ---------- */
  function startRest(next) {
    stopRest(true); EN.audio(); EN.lock();
    rest = { total: restSecs, end: Date.now() + restSecs * 1000, left: restSecs, next: next, done: false, last: null };
    rest.iv = setInterval(tickRest, 200);
  }
  function tickRest() {
    if (!rest || rest.done) return;
    var left = Math.max(0, Math.ceil((rest.end - Date.now()) / 1000));
    if (left !== rest.last) {
      rest.last = left; rest.left = left;
      var t = $('#rt'); if (t) t.textContent = EN.mmss(left);
      var box = $('.rest'); if (box) box.classList.toggle('last', left <= 4 && left > 0);
      if (left <= 4 && left > 0) { EN.tone(660, .12); EN.buzz(40); }
      paintRing();
    }
    if (left <= 0) {
      clearInterval(rest.iv); rest.done = true; EN.tone(880, .18); EN.tone(1175, .3, .2); EN.buzz([250, 120, 250]);
      renderDock(); var r = rest; setTimeout(function () { if (rest === r) { rest = null; renderDock(); } }, 2500);
    }
  }
  function stopRest(silent) { if (rest) { clearInterval(rest.iv); rest = null; } if (!silent) renderDock(); }

  /* ---------- planchas y otras posturas con tiempo ---------- */
  function startHold(secs) {
    stopRest(true); EN.audio(); EN.lock();
    hold = { phase: 'prep', total: 3, end: Date.now() + 3000, secs: secs, left: 3, last: null };
    hold.iv = setInterval(tickHold, 200); renderDock();
  }
  function holdDock(dock) {
    var p = hold.phase === 'prep';
    dock.innerHTML = ringDock('', p ? hold.left : EN.mmss(hold.left), p ? 'Prepárate' : 'Mantén la posición', p ? 'Empieza en un momento' : 'Serie ' + nextOpen(ei), '<button type="button" id="h-x">Cancelar</button>');
    $('#h-x').addEventListener('click', function () { clearInterval(hold.iv); hold = null; renderDock(); });
    $('.rest').classList.remove('last'); paintHold();
  }
  function paintHold() { var r = $('#rr'); if (r && hold) r.style.strokeDashoffset = (201 * hold.left / hold.total).toFixed(1); }
  function tickHold() {
    if (!hold) return;
    var left = Math.max(0, Math.ceil((hold.end - Date.now()) / 1000));
    if (left !== hold.last) {
      hold.last = left; hold.left = left; var t = $('#rt'); if (t) t.textContent = hold.phase === 'prep' ? left : EN.mmss(left);
      var box = $('.rest'); if (box) box.classList.toggle('last', hold.phase === 'run' && left <= 4 && left > 0);
      if (left <= 4 && left > 0) { EN.tone(660, .12); EN.buzz(40); }
      paintHold();
    }
    if (left <= 0) {
      if (hold.phase === 'prep') { hold.phase = 'run'; hold.total = hold.secs; hold.end = Date.now() + hold.secs * 1000; hold.left = hold.secs; hold.last = null; EN.tone(880, .15); renderDock(); }
      else { clearInterval(hold.iv); hold = null; EN.tone(880, .18); EN.tone(1175, .3, .2); EN.buzz([250, 120, 250]); markSeries(ei, nextOpen(ei)); }
    }
  }

  /* ---------- cardio ---------- */
  function cvKey() { return S['r:cv-' + sidOf()] ? String(S['r:cv-' + sidOf()]).replace('cv-' + sidOf() + '-', '') : CARDIO[0].k; }
  function cardioHtml() {
    var cur = cvKey(), sid = sidOf(), c = CARDIO.filter(function (x) { return x.k === cur; })[0] || CARDIO[0];
    var opts = CARDIO.map(function (x) {
      return '<input type="radio" name="cvr" id="cvr-' + x.k + '"' + (x.k === c.k ? ' checked' : '') + '><label for="cvr-' + x.k + '">' + fig(x.k) + '<span>' + esc(x.name) + '</span><small>' + x.min + ' min</small></label>';
    }).join('');
    return '<div class="cv-card"><span class="eyeb">Al terminar las pesas · solo en el gimnasio</span><h2>Quemagrasas · 20 minutos</h2><p>' + esc(c.txt) + '</p><p class="imp">' + ic('info') + '<span>' + esc(c.tip) + '</span></p></div>' +
      '<div class="cvs" role="radiogroup" aria-label="Máquina">' + opts + '</div>' +
      '<div class="bigt" id="cvt" aria-live="off">' + EN.mmss(cv ? cv.left : 1200) + '</div>';
  }
  function bindCardio() {
    $$('#w-mid input[name=cvr]').forEach(function (r) {
      r.addEventListener('change', function () { var k = r.id.replace('cvr-', ''); mut(function (S2) { S2['r:cv-' + sidOf()] = 'cv-' + sidOf() + '-' + k; }); render(); });
    });
  }
  function cvDock(dock) {
    var run = cv && cv.iv, fin = cv && cv.left <= 0;
    dock.innerHTML = '<div style="display:grid;gap:8px">' + (fin ? '<button type="button" class="go" id="cv-fin">' + ic('check') + 'Terminar sesión</button>' :
      '<button type="button" class="go" id="cv-main">' + ic(run ? 'pause' : 'play') + (run ? 'Pausar' : cv && cv.left < 1200 ? 'Seguir' : 'Empezar 20:00') + '</button>' +
      '<button type="button" class="go ghost" id="cv-fin" style="min-height:48px;font-size:1rem">Ya está, terminar sesión</button>') + '</div>';
    var m = $('#cv-main'); if (m) m.addEventListener('click', function () { run ? cvPause() : cvStart(); });
    $('#cv-fin').addEventListener('click', function () { mut(function (S2) { S2['c:' + sidOf() + '-cardio'] = 1; }); cvStop(); finish(); });
  }
  function cvStart() {
    EN.audio(); EN.lock(); cv = cv || { left: 1200 }; if (cv.left <= 0) cv.left = 1200;
    cv.end = Date.now() + cv.left * 1000;
    cv.iv = setInterval(function () {
      cv.left = Math.max(0, Math.round((cv.end - Date.now()) / 1000)); var t = $('#cvt'); if (t) t.textContent = EN.mmss(cv.left);
      if (cv.left <= 0) { clearInterval(cv.iv); cv.iv = null; EN.tone(880, .25); EN.tone(1175, .4, .3); EN.buzz([300, 150, 300]); mut(function (S2) { S2['c:' + sidOf() + '-cardio'] = 1; }); renderDock(); $$('#w-prog i').forEach(function (i, k, a) { if (k === a.length - 1) i.className = 'd'; }); }
    }, 500);
    renderDock();
  }
  function cvPause() { if (cv && cv.iv) { clearInterval(cv.iv); cv.iv = null; } renderDock(); }
  function cvStop() { if (cv && cv.iv) clearInterval(cv.iv); cv = null; }

  /* ---------- fin de la sesión ---------- */
  function stopTimers() { stopRest(true); if (hold) { clearInterval(hold.iv); hold = null; } cvStop(); }
  function finish() {
    stopTimers(); EN.unlock();
    var sid = sidOf(), fin = Date.now();
    mut(function (S2) { S2['c:' + sid + '-done'] = 1; });
    var mins = Math.max(1, Math.min(180, Math.round((fin - t0) / 60000)));
    var log = EN.get(EN.K.log, []) || []; if (!Array.isArray(log)) log = [];
    if (!log.some(function (l) { return l.sid === sid && l.ini === t0; })) { log.push({ sid: sid, lugar: sel.place, ini: t0, fin: fin, min: mins }); EN.set(EN.K.log, log); }
    var t = seriesTotals(sel.w, sel.d), nw = 0;
    dayOf(sel.w, sel.d).ex.forEach(function (x, i) { if (num(S['v:' + sid + '-e' + (i + 1) + '-kg-' + sel.place]) != null) nw++; });
    $('#v-work').hidden = true; $('#v-done').hidden = false; document.body.classList.remove('gym');
    $('#f-sub').textContent = 'Semana ' + sel.w + ' · Día ' + sel.d + ' · ' + dayOf(sel.w, sel.d).title;
    $('#f-stats').innerHTML = '<div><b>' + mins + '</b><span>minutos</span></div><div><b>' + t.n + '/' + t.tot + '</b><span>series</span></div><div><b>' + nw + '</b><span>pesos apuntados</span></div>';
    var nx = sel.d < 3 ? { w: sel.w, d: sel.d + 1 } : sel.w < 4 ? { w: sel.w + 1, d: 1 } : null;
    var msg = nx ? 'Siguiente: Semana ' + nx.w + ' · Día ' + nx.d + ' · ' + dayOf(nx.w, nx.d).title + '.' : '¡Mes completado! Apunta tus medidas, haz las fotos y revisa el resumen para la entrenadora.';
    $('#f-next span').textContent = msg;
    $('#f-again').onclick = function () { if (nx) { sel.w = nx.w; sel.d = nx.d; sel.fixed = true; } else { location.href = 'medidas.html'; return; } $('#v-done').hidden = true; $('#v-setup').hidden = false; paintSetup(); window.scrollTo(0, 0); };
    $('#f-again').innerHTML = nx ? ic('calendar-days') + 'Preparar la siguiente' : ic('scale') + 'Anotar medidas';
    window.scrollTo(0, 0);
  }

  /* ---------- salir y navegar ---------- */
  $('#w-x').addEventListener('click', function () { stopTimers(); EN.unlock(); $('#v-work').hidden = true; $('#v-setup').hidden = false; document.body.classList.remove('gym'); sel.fixed = true; paintSetup(); window.scrollTo(0, 0); });
  $('#w-prev').addEventListener('click', function () { if (ei > 0) { if (hold) { clearInterval(hold.iv); hold = null; } ei--; render(); } });
  $('#w-next').addEventListener('click', function () { if (ei < items.length - 1) { if (hold) { clearInterval(hold.iv); hold = null; } ei++; render(); } });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && !$('#v-work').hidden) { EN.lock(); tickRest(); tickHold(); } });

  /* =============== arranque =============== */
  load(); paintSetup();
})();
