/* Guardado común de todas las páginas de Entreno.
   Los datos viven en este móvil: localStorage para lo pequeño, IndexedDB para las fotos. */
(function () {
  var EN = window.EN = window.EN || {};
  EN.K = {
    rut: 'rutina-emilio-mes',   // series, pesos y peso corporal de rutina.html
    comp: 'pc-off-checks',      // casillas de la lista de la compra (comidas.html)
    med: 'entreno:med',         // mediciones: { 'AAAA-MM-DD': {peso, grasa, ...} }
    perfil: 'entreno:perfil',   // { nombre }
    log: 'entreno:log',         // sesiones guiadas: [{sid, lugar, ini, fin}]
    notas: 'entreno:notas',     // notas para la entrenadora
    copia: 'entreno:copia',     // fecha de la última copia guardada
    cfg: 'entreno:cfg'          // ajustes (cámara preferida, etc.)
  };
  EN.BACKUP_KEYS = function () {
    var out = [], i, k;
    try {
      for (i = 0; i < localStorage.length; i++) {
        k = localStorage.key(i);
        if (k === EN.K.rut || k === EN.K.comp || k.indexOf('entreno:') === 0) out.push(k);
      }
    } catch (e) {}
    return out;
  };

  EN.get = function (k, def) {
    try { var v = localStorage.getItem(k); if (v == null) return def; return JSON.parse(v); } catch (e) { return def; }
  };
  EN.set = function (k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
  };
  EN.del = function (k) { try { localStorage.removeItem(k); } catch (e) {} };

  /* ---------- utilidades ---------- */
  EN.num = function (s) {
    if (s == null || s === '') return null;
    var n = parseFloat(String(s).replace(',', '.').replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? null : n;
  };
  EN.fmt = function (n, dec) {
    if (n == null || isNaN(n)) return '—';
    var d = dec == null ? 1 : dec, p = Math.pow(10, d);
    return String(Math.round(n * p) / p).replace('.', ',');
  };
  EN.sign = function (n, dec) { return n == null ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + EN.fmt(Math.abs(n), dec); };
  EN.today = function () {
    var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  };
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  EN.fdate = function (iso, long) {
    var p = String(iso).split('-'); if (p.length < 3) return iso;
    return (+p[2]) + ' ' + MES[+p[1] - 1] + (long ? ' ' + p[0] : '');
  };
  EN.days = function (iso) { // días desde esa fecha hasta hoy
    var p = String(iso).split('-'); var a = new Date(+p[0], +p[1] - 1, +p[2]), b = new Date(); b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 86400000);
  };
  EN.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  EN.$ = function (s, el) { return (el || document).querySelector(s); };
  EN.$$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ---------- fotos en IndexedDB (guardadas como texto data:image/jpeg) ---------- */
  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (ok, no) {
      if (!window.indexedDB) { no(new Error('sin IndexedDB')); return; }
      var r = indexedDB.open('entreno-fotos', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('fotos', { keyPath: 'id' }); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { no(r.error); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, no) {
        var t = d.transaction('fotos', mode), s = t.objectStore('fotos'), res = fn(s);
        t.oncomplete = function () { ok(res && res.result !== undefined ? res.result : undefined); };
        t.onerror = t.onabort = function () { no(t.error); };
      });
    });
  }
  EN.fotos = {
    all: function () { return tx('readonly', function (s) { return s.getAll(); }).then(function (a) { return a || []; }); },
    get: function (id) { return tx('readonly', function (s) { return s.get(id); }); },
    put: function (rec) { return tx('readwrite', function (s) { return s.put(rec); }); },
    del: function (id) { return tx('readwrite', function (s) { return s.delete(id); }); },
    count: function () { return tx('readonly', function (s) { return s.count(); }).then(function (n) { return n || 0; }, function () { return 0; }); }
  };
  EN.POSES = [{ k: 'frente', n: 'Frente' }, { k: 'lado', n: 'Lado' }, { k: 'espalda', n: 'Espalda' }];

  // Pide al navegador que no borre los datos si falta espacio (no siempre lo concede).
  EN.persist = function () { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {} };

  /* ---------- pitidos y pantalla encendida ---------- */
  var ac = null, wake = null;
  EN.audio = function () { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) {} };
  EN.tone = function (f, d, at) {
    try { var o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = .14; o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + (at || 0)); o.stop(ac.currentTime + (at || 0) + d); } catch (e) {}
  };
  EN.buzz = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
  EN.lock = function () {
    try { if (navigator.wakeLock && !wake) navigator.wakeLock.request('screen').then(function (w) { wake = w; w.addEventListener && w.addEventListener('release', function () { wake = null; }); }).catch(function () {}); } catch (e) {}
  };
  EN.unlock = function () { try { if (wake) { wake.release(); wake = null; } } catch (e) {} };
  EN.mmss = function (s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };

  /* ---------- ¿hay algo que guardar? (para el aviso de la portada) ---------- */
  EN.hasData = function () {
    var S = EN.get(EN.K.rut, {}), k;
    for (k in S) if (k.indexOf('c:') === 0 || k.indexOf('v:') === 0) return true;
    return Object.keys(EN.get(EN.K.med, {})).length > 0;
  };
})();
