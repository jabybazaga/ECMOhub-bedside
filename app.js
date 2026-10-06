(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var n0 = function (v) { return Math.round(v).toString(); };
  var n1 = function (v) { return (Math.round(v * 10) / 10).toString().replace(".", ","); };
  var n2 = function (v) { return (Math.round(v * 100) / 100).toString().replace(".", ","); };
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var ultimaRonda = null;

  // ---------- ajustes (se guardan en este móvil) ----------
  var SET_KEY = "ecmo_ajustes";
  var DEF_SET = { tema: "auto", letra: 0, densidad: "compacta", modo: "vv", recordar: true, rangos: true, vibrar: false, fuentes: "todas", gases: "mmhg", firma: "", boxes: 30, favs: [] };
  var S = (function () {
    var o = {};
    try { o = JSON.parse(ls(SET_KEY) || "{}") || {}; } catch (e) { o = {}; }
    var r = {};
    for (var k in DEF_SET) r[k] = (k in o) ? o[k] : DEF_SET[k];
    if (!Array.isArray(r.favs)) r.favs = [];
    if (r.boxes === 12) r.boxes = 30; // el antiguo valor por defecto pasa a Box 1–30
    return r;
  })();
  function saveS() { ls(SET_KEY, JSON.stringify(S)); }
  var mqDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function applyAjustes() {
    var root = document.documentElement;
    var t = S.tema === "auto" ? (mqDark && mqDark.matches ? "oscuro" : "claro") : S.tema;
    if (t === "claro") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "noche" ? "#0A0E11" : t === "oscuro" ? "#151E24" : "#FFFFFF");
    root.setAttribute("data-letra", String(S.letra));
    root.setAttribute("data-densidad", S.densidad);
    root.setAttribute("data-fuentes", S.fuentes);
  }
  applyAjustes();
  if (mqDark) {
    var onMq = function () { if (S.tema === "auto") applyAjustes(); };
    if (mqDark.addEventListener) mqDark.addEventListener("change", onMq); else if (mqDark.addListener) mqDark.addListener(onMq);
  }
  function vibrar() { if (S.vibrar && navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* sin vibración */ } } }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  // ---------- navegación entre pantallas ----------
  var screenNames = ["inicio", "ronda", "calc", "vv", "va", "anticoag", "complicaciones", "escalas", "checklists", "perlas", "datos", "fuentes", "informes", "buscar", "ajustes"];
  var screens = {};
  screenNames.forEach(function (n) { screens[n] = document.getElementById("screen-" + n); });

  // ---- botón o gesto «Atrás» del móvil ----
  // Cada pantalla distinta de Inicio y cada capa (hoja de valores, esquema, modo crisis, informe)
  // añade una entrada al historial; «Atrás» cierra la capa de arriba o vuelve a la pantalla anterior.
  // En Inicio, «Atrás» sale de la app como siempre.
  var HIST = { d: 0, skip: 0, pop: false };
  var CAPAS = [];
  var actual = "inicio";
  try { history.replaceState({ s: "inicio", d: 0 }, ""); } catch (e) { /* sin historial */ }
  // Foco: al abrir una capa se lleva dentro y no sale con el tabulador; al cerrarla vuelve a donde estaba.
  var CAPA_EL = { hoja: "sheet", esquema: "viewer", crisis: "crisis" };
  var FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  function capaEl(n) { return CAPA_EL[n] ? document.getElementById(CAPA_EL[n]) : null; }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" || !CAPAS.length) return;
    var el = capaEl(CAPAS[CAPAS.length - 1].n);
    if (!el || el.hidden) return;
    var fs = $$(FOCUSABLE, el).filter(function (x) { return x.offsetParent !== null; });
    if (!fs.length) return;
    var first = fs[0], last = fs[fs.length - 1], act = document.activeElement;
    if (!el.contains(act)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && act === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && act === last) { e.preventDefault(); first.focus(); }
  });
  function capaAbierta(n, cerrar) {
    if (CAPAS.some(function (c) { return c.n === n; })) return;
    var el = capaEl(n);
    CAPAS.push({ n: n, cerrar: cerrar, previo: document.activeElement });
    if (el) setTimeout(function () { var f = el.querySelector(FOCUSABLE); if (f && !el.hidden) f.focus({ preventScroll: true }); }, 60);
    try { history.pushState({ s: actual, d: ++HIST.d, capa: n }, ""); } catch (e) { /* sin historial */ }
  }
  function capaCerrada(n) {
    var i = -1;
    CAPAS.forEach(function (c, j) { if (c.n === n) i = j; });
    if (i < 0) return;
    var previo = CAPAS[i].previo;
    CAPAS.splice(i, 1);
    if (n !== "hoja" && previo && previo.focus && document.body.contains(previo)) previo.focus({ preventScroll: true });
    if (!HIST.pop) { HIST.skip++; history.back(); }
  }
  function navegar(name) {
    if (name === "inicio") {
      if (HIST.d > 0) { HIST.skip++; history.go(-HIST.d); HIST.d = 0; }
      return;
    }
    try { history.pushState({ s: name, d: ++HIST.d }, ""); } catch (e) { /* sin historial */ }
  }
  window.addEventListener("popstate", function (e) {
    var st = e.state || { s: "inicio", d: 0 };
    HIST.d = st.d || 0;
    if (HIST.skip > 0) { HIST.skip--; return; }
    HIST.pop = true;
    try {
      if (CAPAS.length) CAPAS.pop().cerrar();
      else go(st.s || "inicio", true);
    } finally { HIST.pop = false; }
  });

  function go(name, desdeHistorial) {
    if (!screens[name]) return;
    if (!desdeHistorial && name !== actual) {
      // Capas que quedaran abiertas debajo (p. ej. un informe) se cierran sin tocar el historial.
      HIST.pop = true;
      try { while (CAPAS.length) CAPAS.pop().cerrar(); } finally { HIST.pop = false; }
      navegar(name);
    }
    actual = name;
    screenNames.forEach(function (k) {
      screens[k].classList.toggle("on", k === name);
    });
    document.querySelectorAll(".tab[data-go]").forEach(function (btn) {
      btn.classList.toggle("on", btn.dataset.go === name);
    });
    var content = screens[name].querySelector(".content");
    if (content) content.scrollTop = 0;
    window.scrollTo(0, 0);
    var menu = document.getElementById("r-menu");
    if (menu) menu.hidden = true;
    if (name === "buscar") { var q = document.getElementById("q"); if (q) { q.focus(); renderSearch(); } }
    if (name === "inicio") updateHero();
    if (name === "informes") renderListaInformes();
    if (name === "datos") renderSurv();
    if (name === "perlas") cargarPerlas();
    if (name === "ajustes") { syncAjustes(); renderFavs(); }
  }

  document.querySelectorAll("[data-go]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      go(el.dataset.go);
      if (el.dataset.calcTab) selectCalcTab(el.dataset.calcTab);
    });
  });

  document.querySelectorAll("[data-placeholder]").forEach(function (el) {
    el.addEventListener("click", function () {
      window.alert(el.dataset.placeholder + " — pantalla pendiente de construir.");
    });
  });

  // splash: pasa a Inicio tras un instante o al tocar
  var splash = document.getElementById("splash");
  function dismissSplash() {
    splash.classList.remove("on");
    go("inicio");
  }
  splash.addEventListener("click", dismissSplash);
  setTimeout(dismissSplash, 1100);

  // ---------- acordeón (Ronda + Criterios) ----------
  document.querySelectorAll(".fs-head").forEach(function (head) {
    head.addEventListener("click", function () {
      var fs = head.closest(".fieldset");
      var group = fs.closest(".content");
      var opening = !fs.classList.contains("open");
      $$(".fieldset", group).forEach(function (f) {
        f.classList.remove("open");
        f.querySelector(".fs-head").setAttribute("aria-expanded", "false");
      });
      if (opening) {
        fs.classList.add("open");
        head.setAttribute("aria-expanded", "true");
      }
    });
  });

  // ---------- steppers ----------
  var stepState = {
    // Paciente
    peso: { v: 75, min: 20, max: 250, dec: 0 },
    diuresis: { v: 0.8, min: 0, max: 10, dec: 1 },
    temp: { v: 36.8, min: 30, max: 42, dec: 1 },
    // Circuito
    flujo: { v: 4.2, min: 0, max: 8, dec: 1 },
    sweep: { v: 4, min: 0, max: 15, dec: 1 },
    rpm: { v: 3100, min: 0, max: 6000, dec: 0 },
    p1: { v: -70, min: -150, max: 0, dec: 0 },
    p2: { v: 180, min: 0, max: 500, dec: 0 },
    p3m: { v: 152, min: 0, max: 500, dec: 0 },
    po2post: { v: 380, min: 0, max: 600, dec: 0 },
    dias: { v: 4, min: 0, max: 90, dec: 0 },
    // Hemodinámica
    fc: { v: 92, min: 0, max: 250, dec: 0 },
    tas: { v: 108, min: 0, max: 300, dec: 0 },
    tad: { v: 62, min: 0, max: 200, dec: 0 },
    gc: { v: 6.2, min: 0, max: 15, dec: 1 },
    ic: { v: 2.4, min: 0, max: 8, dec: 1 },
    lactato: { v: 1.8, min: 0, max: 25, dec: 1 },
    // Gasometría
    sao2: { v: 90, min: 0, max: 100, dec: 0 },
    svo2: { v: 68, min: 0, max: 100, dec: 0 },
    pao2: { v: 72, min: 0, max: 600, dec: 0 },
    paco2: { v: 41, min: 10, max: 150, dec: 0 },
    ph: { v: 7.39, min: 6.5, max: 7.9, dec: 2 },
    svmix: { v: null, min: 30, max: 90, dec: 0, blankStart: 65 },
    // Analítica
    hb: { v: 9.1, min: 3, max: 20, dec: 1 },
    plaq: { v: 88, min: 0, max: 800, dec: 0 },
    fibri: { v: 1.8, min: 0, max: 10, dec: 1 },
    act: { v: 172, min: 0, max: 999, dec: 0 },
    ttpa: { v: 58, min: 0, max: 250, dec: 0 },
    ldh: { v: 420, min: 0, max: 6000, dec: 0 },
    ritmo: { v: 11, min: 0, max: 60, dec: 1 },
    // Ventilador
    pplat: { v: 24, min: 0, max: 60, dec: 0 },
    peep: { v: 12, min: 0, max: 30, dec: 0 },
    vfio2: { v: 40, min: 21, max: 100, dec: 0 },
    // Criterios de indicación
    "k-pao2": { v: 62, min: 0, max: 600, dec: 0 },
    "k-fio2": { v: 100, min: 21, max: 100, dec: 0 },
    "k-ph": { v: 7.22, min: 6.5, max: 7.9, dec: 2 },
    "k-paco2": { v: 68, min: 10, max: 150, dec: 0 },
    "k-fr": { v: 35, min: 0, max: 60, dec: 0 },
    "k-peep": { v: 14, min: 0, max: 30, dec: 0 },
    "k-pplat": { v: 31, min: 0, max: 60, dec: 0 },
    "k-pmedia": { v: 22, min: 0, max: 60, dec: 0 },
    "k-comp": { v: 26, min: 0, max: 200, dec: 0 },
    "k-edad": { v: 52, min: 0, max: 100, dec: 0 },
    "k-vm": { v: 3, min: 0, max: 60, dec: 0 },
  };

  var RONDA_KEYS = ["peso", "diuresis", "temp", "flujo", "sweep", "rpm", "p1", "p2", "p3m", "po2post", "dias",
    "fc", "tas", "tad", "gc", "ic", "lactato", "sao2", "svo2", "pao2", "paco2", "ph", "svmix",
    "hb", "plaq", "fibri", "act", "ttpa", "ldh", "ritmo", "pplat", "peep", "vfio2"];

  // ---------- formato de valores y unidades ----------
  var KPA = 7.50062; // 1 kPa = 7,50062 mmHg
  var GAS_KEYS = ["pao2", "paco2", "po2post", "k-pao2", "k-paco2"];
  function enKpa(key) { return S.gases === "kpa" && GAS_KEYS.indexOf(key) > -1; }
  function numES(v, dec) { return v.toFixed(dec).replace(".", ",").replace("-", "−"); }
  function fmtDisplay(key) {
    var st = stepState[key];
    if (!st || st.v === null || st.v === undefined) return "—";
    if (enKpa(key)) return numES(st.v / KPA, 1);
    return numES(st.v, st.dec);
  }
  function unitOf(key) { var m = FIELD_META[key]; if (!m) return ""; return enKpa(key) ? "kPa" : m.unit; }

  // ---------- los valores pasan de +/– a teselas que se tocan ----------
  var FIELD_META = {};
  var TILE_ORDER = { ronda: [], criterios: [] };
  function buildTiles(root, scope) {
    if (!root) return;
    $$(".fs-body", root).forEach(function (body) {
      var fs = body.closest(".fieldset");
      var gname = fs.querySelector(".fs-head .lbl").textContent.trim();
      var fields = $$(":scope > .field", body).filter(function (f) { return f.querySelector(".stepper"); });
      if (!fields.length) return;
      var grid = document.createElement("div");
      grid.className = "vgrid";
      body.insertBefore(grid, fields[0]);
      fields.forEach(function (f) {
        var stepBtn = f.querySelector("[data-step]");
        var key = stepBtn.dataset.step;
        var lab = f.querySelector("label");
        var opt = lab.querySelector("span");
        var label = (opt ? lab.firstChild.textContent : lab.textContent).trim();
        var unitEl = f.querySelector(".unit");
        FIELD_META[key] = {
          label: label, unit: unitEl ? unitEl.textContent.trim() : "", group: gname, fs: fs, scope: scope,
          optional: !!opt, delta: Math.abs(parseFloat(stepBtn.dataset.delta)) || 1
        };
        var b = document.createElement("button");
        b.type = "button";
        b.className = "vt";
        b.dataset.edit = key;
        if (f.dataset.only) b.dataset.only = f.dataset.only;
        b.innerHTML = '<span class="l"><i class="pip"></i><span>' + label + (opt ? " (opcional)" : "") + '</span></span>' +
          '<span class="v"><span data-val="' + key + '"></span><span class="u" data-unit="' + key + '"></span></span>';
        grid.appendChild(b);
        TILE_ORDER[scope].push(key);
        f.parentNode.removeChild(f);
      });
      var head = fs.querySelector(".fs-head");
      var lbl = head.querySelector(".lbl");
      var box = document.createElement("span");
      box.className = "fsx";
      head.insertBefore(box, lbl);
      box.appendChild(lbl);
      box.insertAdjacentHTML("beforeend", '<span class="fs-sum"></span>');
      var chev = head.querySelector(".chev");
      var cnt = document.createElement("span"); cnt.className = "fs-cnt";
      var bdg = document.createElement("span"); bdg.className = "fs-bdg";
      head.insertBefore(cnt, chev);
      head.insertBefore(bdg, chev);
    });
  }
  buildTiles(document.getElementById("screen-ronda"), "ronda");
  // ΔP de membrana: tarjeta calculada (P2 − P3) justo después de P3, a todo el ancho.
  (function () {
    var p3t = tileOf("p3m");
    if (!p3t) return;
    var el = document.createElement("div");
    el.className = "vt calc"; el.id = "r-dpm";
    el.innerHTML = '<span class="l"><i class="pip"></i><span>ΔP membrana · P2 − P3</span><em class="calc-tag">calculado</em></span>' +
      '<span class="v"><span id="r-dpm-v">—</span><span class="u">mmHg</span></span>';
    p3t.parentNode.insertBefore(el, p3t.nextSibling);
  })();
  buildTiles(document.getElementById("pane-criterios"), "criterios");

  function sv(key) {
    var st = stepState[key];
    if (!st || st.v === null || st.v === undefined) return NaN;
    return st.v;
  }

  function refreshStepOutputs(key) {
    var st = stepState[key];
    if (!st) return;
    document.querySelectorAll('[data-val="' + key + '"]').forEach(function (out) { out.textContent = fmtDisplay(key); });
    document.querySelectorAll('[data-unit="' + key + '"]').forEach(function (u) { u.textContent = unitOf(key); });
    var t = document.querySelector('.vt[data-edit="' + key + '"]');
    if (t) t.classList.toggle("empty", st.v === null || st.v === undefined);
  }

  function aplicarPaso(btn) {
    var key = btn.dataset.step;
    var delta = parseFloat(btn.dataset.delta);
    var st = stepState[key];
    if (!st) return false;
    var base = (st.v === null || st.v === undefined) ? st.blankStart : st.v;
    var v = base + (st.v === null || st.v === undefined ? 0 : delta);
    if (v < st.min) v = st.min;
    if (v > st.max) v = st.max;
    v = Math.round(v * Math.pow(10, st.dec)) / Math.pow(10, st.dec);
    var cambio = v !== st.v;
    st.v = v;
    refreshStepOutputs(key);
    return cambio;
  }
  function recalcularPaso(btn) {
    var key = btn.dataset.step;
    if (RONDA_KEYS.indexOf(key) > -1) ronda();
    if (key.indexOf("k-") === 0) calcCriterios();
  }

  // Botones +/–: el botón responde visualmente en cuanto se apoya el dedo;
  // el paso se aplica al soltar (así, si el dedo empieza un scroll encima
  // de un +/–, el valor NO cambia por accidente). Manteniendo pulsado se
  // repite y acelera, para no tener que dar decenas de toques (p. ej.
  // plaquetas de 88 a 250, o las rpm).
  document.querySelectorAll("[data-step]").forEach(function (btn) {
    var tEspera = null, tRepite = null, repeticiones = 0, porPuntero = false;

    function limpiar() {
      clearTimeout(tEspera); clearTimeout(tRepite);
      tEspera = tRepite = null;
      btn.classList.remove("pressing");
    }
    function soltar() {
      if (!btn.classList.contains("pressing")) return;
      if (repeticiones === 0) aplicarPaso(btn); // toque simple
      limpiar();
      recalcularPaso(btn); // recalcular avisos una vez, al soltar
    }
    function cancelar() { // scroll o dedo fuera del botón
      var huboCambios = repeticiones > 0;
      limpiar();
      if (huboCambios) recalcularPaso(btn);
    }
    function repetir() {
      repeticiones++;
      var n = repeticiones > 30 ? 3 : repeticiones > 12 ? 2 : 1; // acelera
      var seguir = false;
      for (var i = 0; i < n; i++) seguir = aplicarPaso(btn) || seguir;
      if (!seguir) { tRepite = null; return; } // tope alcanzado
      tRepite = setTimeout(repetir, repeticiones > 6 ? 60 : 110);
    }

    btn.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      porPuntero = true;
      repeticiones = 0;
      btn.classList.add("pressing");
      tEspera = setTimeout(repetir, 450);
    });
    btn.addEventListener("pointerup", soltar);
    btn.addEventListener("pointercancel", cancelar);
    btn.addEventListener("pointerleave", cancelar);
    btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    btn.addEventListener("click", function () {
      // Con dedo/ratón el paso ya se aplicó al soltar (pointerup); el click solo
      // actúa para teclado / lectores de pantalla.
      if (porPuntero) { porPuntero = false; return; }
      aplicarPaso(btn);
      recalcularPaso(btn);
    });
  });

  // ---------- Ronda diaria: modo VV/VA ----------
  var modo = "vv";
  document.getElementById("ronda-seg").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-mode]");
    if (!btn) return;
    this.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); b.setAttribute("aria-checked", "false"); });
    btn.classList.add("on"); btn.setAttribute("aria-checked", "true");
    modo = btn.dataset.mode;
    document.getElementById("screen-ronda").dataset.modo = modo;
    $$("#screen-ronda [data-only]").forEach(function (el) {
      el.hidden = el.getAttribute("data-only") !== modo;
    });
    ronda();
  });
  $$("#screen-ronda [data-only]").forEach(function (el) {
    el.hidden = el.getAttribute("data-only") !== modo;
  });
  document.getElementById("screen-ronda").dataset.modo = modo;

  var rSangrado = document.getElementById("r-sangrado");
  if (rSangrado) rSangrado.addEventListener("change", ronda);

  var rClear = document.getElementById("r-clear");
  if (rClear) {
    rClear.addEventListener("click", function () {
      stepState.svmix.v = null;
      refreshStepOutputs("svmix");
      ronda();
    });
  }

  function dlRow(k, v) { return '<div class="dl-row"><span class="dl-k">' + k + '</span><span class="dl-v">' + v + '</span></div>'; }

  function ronda() {
    // Valores derivados y avisos: reglas.js (funciones puras con pruebas automáticas).
    var vals = {};
    RONDA_KEYS.forEach(function (k) { vals[k] = stepState[k].v; });
    var sangrado = $("#r-sangrado") ? $("#r-sangrado").value : "no";
    var R = window.ECMO_REGLAS.evaluar(vals, modo, sangrado), d = R.datos, f = R.findings;
    var pp = d.pp, pam = d.pam, flujoKg = d.flujoKg, cao2 = d.cao2, do2 = d.do2, vo2 = d.vo2, dv = d.dv, gap = d.gap, dp = d.dp;

    var der = [
      ["Presión de pulso", isFinite(pp) ? n0(pp) + " mmHg" : "—"],
      ["PAM estimada", isFinite(pam) ? n0(pam) + " mmHg" : "—"],
      ["Flujo por peso", isFinite(flujoKg) ? n0(flujoKg) + " mL/kg/min" : "—"],
      ["CaO₂", isFinite(cao2) ? n1(cao2) + " mL/dL" : "—"],
      ["DO₂", isFinite(do2) ? n0(do2) + " mL/min" : "—"],
      ["VO₂", isFinite(vo2) ? n0(vo2) + " mL/min" : "—"],
      ["DO₂ / VO₂", isFinite(dv) ? n1(dv) : "—"],
      ["SaO₂ − SvO₂", isFinite(gap) ? n0(gap) + " puntos" : "—"],
    ];
    if (modo === "vv" && isFinite(dp)) der.push(["Driving pressure", n0(dp) + " cmH₂O"]);
    $("#r-derived").innerHTML = der.map(function (d) {
      var m = /^(\S+) (.+)$/.exec(d[1]);
      return '<div class="dt"><span class="l">' + d[0] + '</span><span class="v">' + (m ? m[1] + '<span class="u">' + m[2] + '</span>' : d[1]) + '</span></div>';
    }).join("");

    ultimaRonda = { modo: modo, findings: f.slice(), datos: d };
    var btnInforme = document.getElementById("r-informe-btn");
    if (btnInforme) btnInforme.disabled = !f.some(function (x) { return x.sev === "crit" || x.sev === "warn"; });

    var orden = { crit: 0, warn: 1, info: 2, ok: 3 };
    f.sort(function (a, b) { return orden[a.sev] - orden[b.sev]; });

    var nc = f.filter(function (x) { return x.sev === "crit"; }).length;
    var nw = f.filter(function (x) { return x.sev === "warn"; }).length;
    var nk = f.filter(function (x) { return x.sev === "ok"; }).length;
    $("#r-tally").innerHTML =
      '<span><span class="dot2 crit"></span><b>' + nc + '</b> requieren acción</span>' +
      '<span><span class="dot2 warn"></span><b>' + nw + '</b> a vigilar</span>' +
      '<span><span class="dot2 ok"></span><b>' + nk + '</b> en rango</span>';

    $("#r-findings").innerHTML = f.length ? f.map(function (x) {
      return '<div class="fi ' + x.sev + '"><div class="body"><div class="t">' + x.t +
        (x.v && x.v !== "—" ? ' <span class="val">' + x.v + '</span>' : '') +
        '</div><div class="m">' + x.m + '</div><span class="src">' + x.src + '</span></div></div>';
    }).join("") : '<p style="color:var(--ink-3);font-size:14px">Introduce algún valor para ver los avisos.</p>';
    rondaUI(f);
  }

  // ---------- Calculadoras: chips ----------
  var CALC_TABS = ["criterios", "recirc", "hep", "resp", "save"];
  document.getElementById("calc-chips").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    selectCalcTab(btn.dataset.tab);
  });

  // ---------- Recirculación ----------
  var spre = document.getElementById("spre"), spost = document.getElementById("spost"), svEl = document.getElementById("sv");
  var spreV = document.getElementById("spre-v"), spostV = document.getElementById("spost-v"), svV = document.getElementById("sv-v");
  var recircVal = document.getElementById("recirc-val"), recircMsg = document.getElementById("recirc-msg");

  function updateRecirc() {
    spreV.textContent = spre.value;
    spostV.textContent = spost.value;
    svV.textContent = svEl.value;
    var denom = Number(spost.value) - Number(svEl.value);
    if (denom === 0) {
      recircVal.textContent = "—";
      recircVal.style.color = "var(--ink)";
      recircMsg.textContent = "Introduce valores distintos entre retorno y SvO₂.";
      return;
    }
    var pct = ((Number(spre.value) - Number(svEl.value)) / denom) * 100;
    var clamped = Math.max(0, Math.min(100, pct));
    recircVal.textContent = clamped.toFixed(0) + " %";
    if (clamped < 15) {
      recircVal.style.color = "var(--good)";
      recircMsg.textContent = "Rango bajo: no sugiere recirculación relevante.";
    } else if (clamped < 35) {
      recircVal.style.color = "var(--warn)";
      recircMsg.textContent = "Rango moderado: vigilar el patrón clínico, no solo el número.";
    } else {
      recircVal.style.color = "var(--crit)";
      recircMsg.textContent = "Rango alto: revisar posición de cánulas y flujo de bomba.";
    }
  }
  [spre, spost, svEl].forEach(function (el) { el.addEventListener("input", updateRecirc); });
  updateRecirc();

  // ---------- Heparina ----------
  var hpeso = document.getElementById("hpeso"), hritmo = document.getElementById("hritmo");
  var pesoV = document.getElementById("peso-v"), ritmoV = document.getElementById("ritmo-v");
  var hepBolo = document.getElementById("hep-bolo"), hepBoloSub = document.getElementById("hep-bolo-sub");
  var hepConc = document.getElementById("hep-conc"), hepDosis = document.getElementById("hep-dosis");
  var biva = document.getElementById("biva");

  function updateHep() {
    pesoV.textContent = hpeso.value;
    ritmoV.textContent = hritmo.value;
    var peso = Number(hpeso.value), ritmo = Number(hritmo.value);
    var bolo = peso * 1;
    var totalPrepMg = peso * 2;
    var concMgMl = totalPrepMg / 250;
    var dosisMgH = ritmo * concMgMl;
    var dosisMgKgH = peso > 0 ? dosisMgH / peso : 0;
    hepBolo.textContent = bolo.toFixed(0) + " mg";
    if (hepBoloSub) hepBoloSub.textContent = "≈ " + (bolo * 100).toFixed(0) + " UI (1 mg/kg). Bolo extra de " + (peso * 50).toFixed(0) + " UI si la canulación pasa de 15 min.";
    hepConc.textContent = concMgMl.toFixed(2) + " mg/mL";
    hepDosis.textContent = dosisMgH.toFixed(1) + " mg/h";
    hepDosis.title = dosisMgKgH.toFixed(2) + " mg/kg/h";
    if (biva) biva.textContent = (0.2 * peso).toFixed(1) + " mg/h";
  }
  [hpeso, hritmo].forEach(function (el) { el.addEventListener("input", updateHep); });
  updateHep();

  // ---------- Criterios de indicación ----------
  var K_KEYS = ["k-pao2", "k-fio2", "k-ph", "k-paco2", "k-fr", "k-peep", "k-pplat", "k-pmedia", "k-comp", "k-edad", "k-vm"];
  function kv(key) { return sv(key); }

  ["k-rx", "k-dur", "k-sitio"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("change", calcCriterios);
  });
  var kInest = document.getElementById("k-inest");
  if (kInest) kInest.addEventListener("change", calcCriterios);
  var kRescate = document.getElementById("k-rescate");
  if (kRescate) kRescate.addEventListener("change", calcCriterios);

  function calcCriterios() {
    var pao2 = kv("k-pao2"), fio2 = kv("k-fio2"), ph = kv("k-ph"), paco2 = kv("k-paco2"), fr = kv("k-fr");
    var peep = kv("k-peep"), pplat = kv("k-pplat"), pmedia = kv("k-pmedia"), comp = kv("k-comp");
    var rx = Number(document.getElementById("k-rx").value), edad = kv("k-edad"), vm = kv("k-vm");
    var dur = document.getElementById("k-dur").value, sitio = document.getElementById("k-sitio").value;
    var inest = kInest ? kInest.checked : false;

    var pf = (isFinite(pao2) && isFinite(fio2) && fio2 > 0) ? pao2 / (fio2 / 100) : NaN;
    var io = (isFinite(pao2) && isFinite(fio2) && isFinite(pmedia) && pao2 > 0) ? (fio2 * pmedia) / pao2 : NaN;

    var mp = [];
    mp.push(rx);
    if (isFinite(pf)) mp.push(pf >= 300 ? 0 : pf >= 225 ? 1 : pf >= 175 ? 2 : pf >= 101 ? 3 : 4);
    if (isFinite(peep)) mp.push(peep < 5 ? 0 : peep <= 8 ? 1 : peep <= 11 ? 2 : peep <= 14 ? 3 : 4);
    if (isFinite(comp)) mp.push(comp > 80 ? 0 : comp >= 60 ? 1 : comp >= 40 ? 2 : comp >= 20 ? 3 : 4);
    var murray = mp.length === 4 ? mp.reduce(function (a, b) { return a + b; }, 0) / 4 : NaN;

    var ap = NaN;
    if (isFinite(edad) && isFinite(pf) && isFinite(pplat)) {
      ap = (edad < 47 ? 1 : edad <= 66 ? 2 : 3) + (pf > 158 ? 1 : pf >= 105 ? 2 : 3) + (pplat < 27 ? 1 : pplat <= 30 ? 2 : 3);
    }

    $("#k-derived").innerHTML = [
      ["PaO₂ / FiO₂", isFinite(pf) ? n0(pf) : "—"],
      ["Murray score", isFinite(murray) ? n2(murray) : "—"],
      ["APSS", isFinite(ap) ? ap + " / 9" : "—"],
      ["Índice de oxigenación", isFinite(io) ? n1(io) : "—"],
    ].map(function (d) { return dlRow(d[0], d[1]); }).join("");
    LAST_CRIT = { pf: pf, murray: murray, ap: ap };
    updateResbar();

    var durGt3 = (dur === "3a6" || dur === "gt6"), durGt6 = (dur === "gt6");
    function c(txt, estado) { return { t: txt, e: estado }; }
    var grupos = [];

    var e1 = (isFinite(pf) && isFinite(fio2)) ? (pf < 80 && fio2 > 90) : null;
    var e2 = (isFinite(murray)) ? (murray >= 3) : null;
    var e3 = (isFinite(pf) && isFinite(fio2)) ? (pf < 150 && fio2 > 90) : null;
    var e4 = (isFinite(murray)) ? (murray >= 2 && murray < 3) : null;
    grupos.push({ n: "ELSO", sub: "Red Book, tabla 37-1",
      v: (e1 && e2) ? "si" : ((e3 && e4) || e1 || e2) ? "qz" : "no",
      vt: (e1 && e2) ? "Indicación · riesgo > 80 %" : ((e3 && e4) || e1 || e2) ? "Considerar · riesgo > 50 %" : "No cumple",
      l: [c("P/F &lt; 80 con FiO₂ &gt; 90 %", e1), c("Murray 3–4", e2), c("P/F &lt; 150 con FiO₂ &gt; 90 % (considerar)", e3), c("Murray 2–3 (considerar)", e4)] });

    var s1 = isFinite(murray) ? (murray >= 3.0) : null;
    var s2 = isFinite(ph) ? (ph < 7.20) : null;
    var s3 = isFinite(murray) ? (murray >= 2.5) : null;
    grupos.push({ n: "CESAR", sub: "Peek 2009",
      v: (s1 || s2) ? "si" : s3 ? "qz" : "no",
      vt: (s1 || s2) ? "Cumple criterio de entrada" : s3 ? "Considerar · facilitar traslado" : "No cumple",
      l: [c("Murray ≥ 3,0", s1), c("pH &lt; 7,20 pese a tratamiento óptimo", s2), c("Murray ≥ 2,5 (considerar)", s3)] });

    var m1 = isFinite(io) ? (io > 30) : null;
    var m2b = (isFinite(pf) && isFinite(peep)) ? (pf < 70 && peep >= 15 && sitio === "centro") : null;
    var m3 = (isFinite(pf) && isFinite(peep)) ? (pf < 100 && peep >= 10 && sitio === "espera") : null;
    var m4 = isFinite(ph) ? (ph < 7.25) : null;
    var m5 = inest;
    var ecmonet = (m1 || m2b || m3 || m4 || m5);
    grupos.push({ n: "ECMOnet", sub: "red italiana, Patroniti 2011",
      v: ecmonet ? "si" : "no", vt: ecmonet ? "Cumple al menos un criterio" : "No cumple",
      l: [c("Índice de oxigenación &gt; 30", m1),
        c("P/F &lt; 70 con PEEP ≥ 15, ya en centro ECMO", m2b),
        c("P/F &lt; 100 con PEEP ≥ 10, esperando traslado", m3),
        c("pH &lt; 7,25 durante al menos 2 h", m4),
        c("Inestabilidad hemodinámica", m5)] });

    var o1 = (isFinite(pf) && isFinite(fio2)) ? (pf < 50 && fio2 > 80 && durGt3) : null;
    var o2 = (isFinite(pf) && isFinite(fio2)) ? (pf < 80 && fio2 > 80 && durGt6) : null;
    var o3 = (isFinite(ph) && isFinite(fr) && isFinite(pplat)) ? (ph < 7.25 && durGt6 && fr >= 35 && pplat < 32) : null;
    var ox1 = isFinite(vm) ? (vm > 7) : null, ox2 = isFinite(edad) ? (edad < 18) : null;
    var eoEx = (ox1 === true || ox2 === true);
    var eolia = (o1 || o2 || o3);
    grupos.push({ n: "EOLIA", sub: "Combes 2018 · recomendado por ESICM",
      v: eoEx ? "ex" : eolia ? "si" : "no",
      vt: eoEx ? "Cumple criterio de exclusión" : eolia ? "Cumple criterio de inclusión" : "No cumple",
      l: [c("P/F &lt; 50 con FiO₂ &gt; 0,8 durante &gt; 3 h", o1),
        c("P/F &lt; 80 con FiO₂ &gt; 0,8 durante &gt; 6 h", o2),
        c("pH &lt; 7,25 durante &gt; 6 h con FR 35 y meseta &lt; 32", o3),
        c("Exclusión: VM &gt; 7 días", ox1),
        c("Exclusión: edad &lt; 18 años", ox2)] });

    var h1 = (isFinite(pf) && isFinite(fio2)) ? (pf < 80 && fio2 > 90) : null;
    var h2 = isFinite(murray) ? (murray >= 3) : null;
    var h3 = isFinite(ap) ? (ap >= 8) : null;
    var h4 = (isFinite(pf) && isFinite(fio2)) ? (pf < 150 && fio2 > 90) : null;
    var h5 = isFinite(murray) ? (murray >= 2 && murray < 3) : null;
    var h6 = isFinite(ap) ? (ap >= 3) : null;
    var h7 = (isFinite(ph) && isFinite(paco2) && isFinite(pplat)) ? ((ph < 7.20 || paco2 > 80) && pplat > 30) : null;
    var hInd = (h1 || h2 || h3 || h7), hCon = (h4 || h5 || h6);
    var hx1 = (isFinite(vm) && isFinite(fio2) && isFinite(pplat)) ? (vm > 7 && fio2 > 90 && pplat > 30) : null;
    grupos.push({ n: "CHUB", sub: "anexo de indicaciones VV",
      v: hx1 === true ? "ex" : hInd ? "si" : hCon ? "qz" : "no",
      vt: hx1 === true ? "Cumple criterio de exclusión" : hInd ? "Indicación · mortalidad estimada > 80 %" : hCon ? "Considerar · mortalidad estimada > 50 %" : "No cumple",
      l: [c("PaFiO₂ &lt; 80 con FiO₂ &gt; 90 %", h1), c("Murray 3–4", h2), c("APSS ≥ 8", h3),
        c("Hipercapnia: pH &lt; 7,20 o PCO₂ &gt; 80 con meseta &gt; 30", h7),
        c("PaFiO₂ &lt; 150 con FiO₂ &gt; 90 % (considerar)", h4), c("Murray 2–3 (considerar)", h5), c("APSS ≥ 3 (considerar)", h6),
        c("Exclusión: VM &gt; 7 días con FiO₂ &gt; 90 % y meseta &gt; 30", hx1)] });

    $("#crit-host").innerHTML = grupos.map(function (g) {
      return '<div class="crit-card"><h4>' + g.n + '</h4>' +
        '<div class="csub">' + g.sub + '</div>' +
        '<span class="verdict ' + g.v + '">' + g.vt + '</span><ul class="crit-list">' +
        g.l.map(function (it) {
          var mk = it.e === true ? "y" : it.e === false ? "n" : "u";
          var sym = it.e === true ? "✓" : it.e === false ? "·" : "?";
          if (it.e === true && it.t.indexOf("Exclusión") === 0) { mk = "x"; sym = "!"; }
          return '<li class="' + (it.e === true ? "on" : "off") + '"><span class="mk ' + mk + '">' + sym + '</span><span>' + it.t + '</span></li>';
        }).join("") + '</ul></div>';
    }).join("");
  }

  // ---------- RESP score ----------
  var RESP_CLASSES = [{ min: 6, cls: "I", s: 92 }, { min: 3, cls: "II", s: 76 }, { min: -1, cls: "III", s: 57 }, { min: -5, cls: "IV", s: 33 }, { min: -99, cls: "V", s: 18 }];
  function calcResp() {
    var p = (+$("#resp-edad").value) + (+$("#resp-vm").value) + (+$("#resp-dx").value);
    $$("[data-resp]").forEach(function (cb) { if (cb.checked) p += +cb.getAttribute("data-resp"); });
    var c = RESP_CLASSES.find(function (r) { return p >= r.min; });
    $("#resp-pts").textContent = (p > 0 ? "+" : "") + p;
    $("#resp-cls").textContent = c.cls;
    $("#resp-surv").textContent = c.s + " %";
    updateResbar();
  }
  ["#resp-edad", "#resp-vm", "#resp-dx"].forEach(function (s) { var el = $(s); if (el) el.addEventListener("change", calcResp); });
  $$("[data-resp]").forEach(function (cb) { cb.addEventListener("change", calcResp); });

  // ---------- SAVE score ----------
  var SAVE_CLASSES = [{ min: 6, cls: "I", s: 75 }, { min: 1, cls: "II", s: 58 }, { min: -4, cls: "III", s: 42 }, { min: -9, cls: "IV", s: 30 }, { min: -99, cls: "V", s: 18 }];
  function calcSave() {
    var p = -6 + (+$("#save-edad").value) + (+$("#save-peso").value) + (+$("#save-int").value);
    $$("[data-save]").forEach(function (cb) { if (cb.checked) p += +cb.getAttribute("data-save"); });
    var c = SAVE_CLASSES.find(function (r) { return p >= r.min; });
    $("#save-pts").textContent = (p > 0 ? "+" : "") + p;
    $("#save-cls").textContent = c.cls;
    $("#save-surv").textContent = c.s + " %";
    $("#save-msg").textContent = c.cls === "V" ? "Clase V: se considera no tributaria de asistencia."
      : c.cls === "IV" ? "Clase IV: valorar riesgo-beneficio antes de activar."
      : "Una puntuación de exactamente 5 es clase II, no clase I.";
    updateResbar();
  }
  ["#save-edad", "#save-peso", "#save-int"].forEach(function (s) { var el = $(s); if (el) el.addEventListener("change", calcSave); });
  $$("[data-save]").forEach(function (cb) { cb.addEventListener("change", calcSave); });

  // ---------- Checklists ----------
  var CHECKLISTS = [
    { id: "maleta", title: "Maleta ECMO", groups: [
      { g: "Circuito y consola", items: ["2 circuitos completos", "Consola con bomba de back-up", "Intercambiador de temperatura", "Mezclador de gases y adaptadores de pared", "Balas de O2 y de aire", "3 sistemas de bomba", "4 clamps metálicos"] },
      { g: "Fluidos y fármacos", items: ["Bomba de infusión de heparina", "Plasmalyte 500 cc x3", "Gelaspam 500 cc x2", "Heparina 5% x5", "6 llaves de tres pasos de alta presión", "4 conectores luer 3/8 x 3/8"] },
      { g: "Punto de cuidado", items: ["Máquina de ACT y cubetas", "Gasómetro portátil y cubetas"] },
    ] },
    { id: "canulacion", title: "Maleta de canulación", groups: [
      { g: "Cánulas", items: ["2-3 cánulas venosas de drenaje ajustadas a talla y peso", "2-3 cánulas de retorno ajustadas a talla y peso", "Introductores arteriales 7 Fr y 8 Fr x2", "Cánulas de perfusión distal 7 Fr x2 y 8 Fr x2"] },
      { g: "Tubos y conexiones", items: ["Tubos 3/8, 1/4 y 3/16", "Conexiones 3/8 x 3/8 con luer", "Conexiones 3/8 x 3/8, 3/8 x 1/4, 1/4 x 1/4 y 1/4 x 3/16", "Sets de punción x4"] },
      { g: "Quirúrgico", items: ["4 prolene 5/0", "4 seda 3/0", "6 seda del nº 1", "Surgicel", "2 separadores Faraboeuf", "Catéter de micropunción", "Guía larga de 100 cm", "Clorhexidina acuosa 250 cc", "Ecógrafo portátil si el centro receptor no dispone"] },
    ] },
    { id: "uci", title: "Maleta UCI y medicación", groups: [
      { g: "Vía aérea", items: ["TET 6,5 / 7 / 7,5 / 8 con guías", "Videolaringoscopio o Airtraq", "Guía tipo Frova"] },
      { g: "Catéteres", items: ["CVC de 3 luces x2", "Arterial radial x2", "Arterial femoral x2"] },
      { g: "Sedación y relajación", items: ["Propofol x5", "Midazolam x5", "Fentanilo x3", "Cisatracurio x3", "Diazepam 10 mg x3"] },
      { g: "Vasoactivos y antiarrítmicos", items: ["Noradrenalina 10 mg x5", "Fenilefrina x2", "Adrenalina 1 mg x10", "Atropina x5", "Dobutamina x2", "Isoproterenol x5", "Labetalol x3", "Amiodarona x3"] },
    ] },
    { id: "traslado", title: "Preparación del traslado", groups: [
      { g: "Coordinación", items: ["Hospital emisor y receptor confirmados, con distancia en km", "Teléfonos de ambas UCI anotados", "Roles asignados: intensivista, cirujano cardiaco, perfusionista, coordinador ECMO", "Cama en UCI confirmada en el centro receptor", "Aviso al hospital de referencia con tiempo estimado de llegada"] },
      { g: "Información del centro emisor", items: ["Datos demográficos e historia clínica básica", "Tratamiento actual: sedación, inotrópicos, antibióticos y antifúngicos", "Signos vitales y configuración del ventilador", "Laboratorio reciente con las últimas gasometrías", "Pruebas de imagen relevantes", "Accesos vasculares con fecha de inserción"] },
      { g: "Antes de mover al paciente", items: ["Gasometría arterial del paciente y postmembrana", "Parámetros del ECMO monitorizados y anotados", "Rx de tórax que confirma la posición de las cánulas", "Anticoagulación sistemática iniciada", "Cánulas fijadas, aseguradas y lo más cortas posible", "Perfusiones preparadas minimizando el número de bombas", "Material del ECMO montado y fijado frente a aceleración y vibración"] },
      { g: "En el SVA", items: ["Monitor con ECG, SpO2, TA y NIBP", "Desfibrilador con parches ya colocados", "Respirador portátil y bombas de infusión", "Caudalímetro y bala de O2 comprobados, más bala de repuesto", "Autonomía eléctrica y de gas calculada para el trayecto", "Fluidoterapia para reposición enérgica", "Medicación no disponible en el vehículo", "Hemoderivados previsibles"] },
    ] },
  ];

  function renderChecklists() {
    var host = document.getElementById("checklists-host");
    if (!host) return;
    CHECKLISTS.forEach(function (cl) {
      var total = 0;
      cl.groups.forEach(function (g) { total += g.items.length; });
      var card = document.createElement("div");
      card.className = "cl-card";
      var head = document.createElement("div");
      head.className = "cl-head";
      head.innerHTML = '<h3>' + cl.title + '</h3><span class="cl-prog" id="prog-' + cl.id + '">0/' + total + '</span>';
      card.appendChild(head);
      var bar = document.createElement("div");
      bar.className = "cl-bar";
      bar.innerHTML = '<i id="bar-' + cl.id + '"></i>';
      card.appendChild(bar);
      cl.groups.forEach(function (g, gi) {
        var h = document.createElement("div");
        h.className = "cl-grp";
        h.textContent = g.g;
        card.appendChild(h);
        g.items.forEach(function (it, ii) {
          var key = "ecmo_cl_" + cl.id + "_" + gi + "_" + ii;
          var lab = document.createElement("label");
          lab.className = "cl-item";
          var bx = document.createElement("span");
          bx.className = "bx";
          var sp = document.createElement("span");
          sp.textContent = it;
          if (ls(key) === "1") lab.classList.add("done");
          lab.appendChild(bx);
          lab.appendChild(sp);
          lab.addEventListener("click", function () {
            var done = lab.classList.toggle("done");
            ls(key, done ? "1" : "0");
            updateProg(cl.id, total);
          });
          card.appendChild(lab);
        });
      });
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cl-reset";
      btn.textContent = "Reiniciar";
      btn.style.cssText = "font-family:inherit;font-size:12px;background:var(--surface-2);border:1px solid var(--line-2);border-radius:8px;padding:0 16px;min-height:44px;color:var(--ink-2)";
      btn.addEventListener("click", function () {
        $$('.cl-item', card).forEach(function (lab2) { lab2.classList.remove("done"); });
        cl.groups.forEach(function (g, gi) { g.items.forEach(function (it, ii) { ls("ecmo_cl_" + cl.id + "_" + gi + "_" + ii, "0"); }); });
        updateProg(cl.id, total);
      });
      card.appendChild(btn);
      host.appendChild(card);
      updateProg(cl.id, total);
    });
  }
  function updateProg(id, total) {
    var done = 0;
    var card = document.getElementById("prog-" + id);
    if (!card) return;
    var host = card.closest(".cl-card");
    done = $$(".cl-item.done", host).length;
    card.textContent = done + "/" + total;
    var b = document.getElementById("bar-" + id);
    if (b) b.style.width = (total ? (done / total * 100) : 0) + "%";
  }

  // ---------- Supervivencia ELSO / scores ----------
  var ELSO = [
    { title: "Adulto", cap: "Registro ELSO, acumulado histórico", rows: [
      { label: "VV · respiratorio", value: 60, n: "76 111 casos" }, { label: "VA · cardiaco", value: 49, n: "84 624 casos" }, { label: "ECPR", value: 31, n: "26 952 casos" }] },
    { title: "Pediátrico", cap: "Registro ELSO, acumulado histórico", rows: [
      { label: "Respiratorio", value: 63, n: "16 294 casos" }, { label: "Cardiaco", value: 57, n: "22 053 casos" }, { label: "ECPR", value: 41, n: "8 827 casos" }] },
    { title: "Neonatal", cap: "Registro ELSO, acumulado histórico", rows: [
      { label: "Respiratorio", value: 72, n: "37 567 casos" }, { label: "Cardiaco", value: 46, n: "13 239 casos" }, { label: "ECPR", value: 42, n: "3 229 casos" }] },
  ];
  var SCORES = [
    { title: "RESP score — ECMO respiratorio", cap: "Supervivencia al alta por clase de riesgo (Schmidt 2014)", rows: [
      { label: "I · ≥ 6", value: 92, n: "la mejor clase" }, { label: "II · 3 a 5", value: 76, n: "" }, { label: "III · −1 a 2", value: 57, n: "" }, { label: "IV · −5 a −2", value: 33, n: "" }, { label: "V · ≤ −6", value: 18, n: "la peor clase" }] },
    { title: "SAVE score — VA-ECMO", cap: "Supervivencia al alta por clase de riesgo (Schmidt 2015)", rows: [
      { label: "I · > 5", value: 75, n: "la mejor clase" }, { label: "II · 1 a 5", value: 58, n: "" }, { label: "III · −4 a 0", value: 42, n: "" }, { label: "IV · −9 a −5", value: 30, n: "" }, { label: "V · ≤ −10", value: 18, n: "la peor clase" }] },
  ];


  // ---------- Informes de ronda ----------
  var INFORMES_KEY = "ecmo_informes";

  function getInformes() { try { return JSON.parse(ls(INFORMES_KEY) || "[]"); } catch (e) { return []; } }
  function setInformes(lista) { ls(INFORMES_KEY, JSON.stringify(lista)); }

  function fmtFechaInforme(iso) {
    var d = new Date(iso);
    var dd = ("0" + d.getDate()).slice(-2), mm = ("0" + (d.getMonth() + 1)).slice(-2);
    var hh = ("0" + d.getHours()).slice(-2), mi = ("0" + d.getMinutes()).slice(-2);
    return dd + "/" + mm + "/" + d.getFullYear() + " · " + hh + ":" + mi;
  }

  function capitalizar(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function primeraFrase(m) {
    var idx = m.search(/\.\s/);
    if (idx > -1) return m.slice(0, idx + 1);
    return m.length > 140 ? m.slice(0, 137) + "…" : m;
  }

  /* ---- resumen clínico redactado, por aparatos y sistemas ---- */
  function resumenRespiratorio(d) {
    var partes = [];
    if (d.modo === "vv") {
      if (isFinite(d.sao2)) {
        if (d.sao2 < 80) partes.push("hipoxemia significativa (SaO₂ " + n0(d.sao2) + " %, objetivo 85–92 %)" + (isFinite(d.dv) ? ", con DO₂/VO₂ de " + n1(d.dv) + (d.dv < 3 ? " — aporte insuficiente" : "") : ""));
        else if (d.sao2 < 85) partes.push("SaO₂ algo por debajo del objetivo (" + n0(d.sao2) + " %, objetivo 85–92 %)");
        else if (d.sao2 > 92) partes.push("SaO₂ por encima del objetivo (" + n0(d.sao2) + " %); valorar test de oxigenación si el pulmón está recuperando");
        else partes.push("oxigenación en objetivo, SaO₂ " + n0(d.sao2) + " %" + (isFinite(d.dv) ? " con DO₂/VO₂ de " + n1(d.dv) : ""));
      }
      if (isFinite(d.paco2) || isFinite(d.ph)) {
        var acidbase = [];
        if (isFinite(d.paco2)) acidbase.push("PaCO₂ " + n0(d.paco2) + " mmHg");
        if (isFinite(d.ph)) acidbase.push("pH " + n2(d.ph));
        var alertaAB = (isFinite(d.paco2) && (d.paco2 > 45 || d.paco2 < 35)) || (isFinite(d.ph) && (d.ph < 7.35 || d.ph > 7.45));
        partes.push((alertaAB ? "alteración del equilibrio ácido-base" : "equilibrio ácido-base conservado") + " (" + acidbase.join(", ") + ")");
      }
      if (isFinite(d.pplat) || isFinite(d.peep)) {
        var vent = [];
        if (isFinite(d.pplat)) vent.push("meseta " + n0(d.pplat) + " cmH₂O");
        if (isFinite(d.peep)) vent.push("PEEP " + n0(d.peep) + " cmH₂O");
        if (isFinite(d.dp)) vent.push("driving pressure " + n0(d.dp) + " cmH₂O");
        var ventAlerta = (isFinite(d.pplat) && d.pplat > 25) || (isFinite(d.dp) && d.dp > 15);
        partes.push("ventilador en parámetros de " + (ventAlerta ? "reposo no del todo conseguidos" : "reposo") + " (" + vent.join(", ") + ")");
      }
    } else {
      if (isFinite(d.sao2)) {
        if (d.sao2 < 95) partes.push("SaO₂ por debajo del objetivo VA (" + n0(d.sao2) + " %, objetivo 95–100 %); descartar síndrome de Arlequín si la muestra es de radial derecha");
        else partes.push("oxigenación en objetivo, SaO₂ " + n0(d.sao2) + " %");
      }
    }
    var dP = isFinite(d.dpm) ? d.dpm : d.p3;
    if (isFinite(d.flujoKg) || isFinite(dP) || isFinite(d.po2post)) {
      var circ = [];
      if (isFinite(d.flujoKg)) circ.push("flujo " + n0(d.flujoKg) + " mL/kg/min");
      if (isFinite(dP)) circ.push("ΔP de membrana " + n0(dP) + " mmHg");
      if (isFinite(d.po2post)) circ.push("PO₂ postmembrana " + n0(d.po2post) + " mmHg");
      var circAlerta = (isFinite(dP) && dP > 35) || (isFinite(d.po2post) && d.po2post < 300) || (isFinite(d.flujoKg) && (d.flujoKg < 50 || d.flujoKg > 80));
      partes.push("circuito " + (circAlerta ? "con signos a vigilar" : "sin signos de disfunción") + " (" + circ.join(", ") + ")");
    }
    return partes.length ? capitalizar(partes.join("; ")) + "." : "Sin datos suficientes para valorar la situación respiratoria.";
  }

  function resumenHemodinamico(d) {
    var partes = [];
    if (d.modo === "va") {
      if (isFinite(d.pam)) partes.push((d.pam < 65 ? "PAM baja" : d.pam > 95 ? "PAM elevada" : "PAM en rango") + " (" + n0(d.pam) + " mmHg, objetivo 65–95)");
      if (isFinite(d.pp)) partes.push((d.pp < 15 ? "presión de pulso muy baja, sospechar distensión del VI" : d.pp < 30 ? "presión de pulso baja, no cumple criterio de destete" : "presión de pulso conservada") + " (" + n0(d.pp) + " mmHg)");
      if (isFinite(d.ic)) partes.push((d.ic < 2.2 ? "índice cardiaco en rango de shock" : d.ic < 2.5 ? "índice cardiaco por debajo del objetivo" : "índice cardiaco adecuado") + " (" + n1(d.ic) + " L/min/m²)");
      if (isFinite(d.fc)) partes.push("FC " + n0(d.fc) + " lpm" + (d.fc > 120 ? " (taquicardia)" : ""));
    } else {
      var base = "el ECMO VV no aporta soporte circulatorio, por lo que la hemodinámica se maneja como en cualquier paciente crítico";
      if (isFinite(d.fc) || (isFinite(d.tas) && isFinite(d.tad))) {
        var vv = [];
        if (isFinite(d.fc)) vv.push("FC " + n0(d.fc) + " lpm");
        if (isFinite(d.tas) && isFinite(d.tad)) vv.push("TA " + n0(d.tas) + "/" + n0(d.tad) + " mmHg");
        base += " (" + vv.join(", ") + ")";
      }
      partes.push(base);
    }
    if (isFinite(d.lactato) || isFinite(d.diuresis)) {
      var perf = [];
      if (isFinite(d.lactato)) perf.push("lactato " + n1(d.lactato) + " mmol/L");
      if (isFinite(d.diuresis)) perf.push("diuresis " + n1(d.diuresis) + " mL/kg/h");
      var perfAlerta = (isFinite(d.lactato) && d.lactato > 2) || (isFinite(d.diuresis) && d.diuresis < 0.5);
      partes.push((perfAlerta ? "datos de hipoperfusión" : "sin datos de hipoperfusión") + " (" + perf.join(", ") + ")");
    }
    if (isFinite(d.temp)) {
      if (d.temp > 37.5) partes.push("hipertermia (" + n1(d.temp) + " °C)");
      else if (d.temp < 35.5) partes.push("hipotermia (" + n1(d.temp) + " °C)");
    }
    return partes.length ? capitalizar(partes.join("; ")) + "." : "Sin datos suficientes para valorar la situación hemodinámica.";
  }

  function resumenHematologico(d) {
    var partes = [];
    if (isFinite(d.hb)) partes.push((d.hb < 7 ? "anemia significativa, por debajo del umbral transfusional" : d.hb < 8 ? "hemoglobina por debajo del objetivo" : "hemoglobina en rango") + " (" + n1(d.hb) + " g/dL)");
    if (isFinite(d.plaq)) {
      var umbral = d.sangrado === "no" ? 50 : 100;
      partes.push((d.plaq < umbral ? "plaquetopenia por debajo del umbral transfusional" : d.plaq < 100 ? "plaquetas bajas, vigilar tendencia" : "plaquetas adecuadas") + " (" + n0(d.plaq) + " ×10⁹/L)");
    }
    if (isFinite(d.fibri)) partes.push((d.fibri < (d.sangrado === "no" ? 1.0 : 1.5) ? "fibrinógeno bajo, a corregir" : (d.fibri < 2 ? "fibrinógeno en el límite" : "fibrinógeno adecuado")) + " (" + n1(d.fibri) + " g/L)");
    if (isFinite(d.ldh)) partes.push((d.ldh > 1000 ? "LDH muy elevada, sospechar hemólisis por el circuito" : d.ldh > 350 ? "LDH elevada, vigilar hemólisis" : "LDH normal") + " (" + n0(d.ldh) + " UI/L)");
    var anticoag = [];
    if (isFinite(d.act)) anticoag.push("ACT " + n0(d.act) + " s");
    if (isFinite(d.ttpa)) anticoag.push("TTPa " + n0(d.ttpa) + " s");
    if (anticoag.length) {
      var actAlerta = isFinite(d.act) && (d.act < 160 || d.act > 180);
      var ttpaAlerta = isFinite(d.ttpa) && (d.ttpa < 46 || d.ttpa > 70);
      partes.push("anticoagulación " + ((actAlerta || ttpaAlerta) ? "fuera de rango diana" : "en rango diana") + " (" + anticoag.join(", ") + ")");
    }
    if (d.sangrado === "grave") partes.push("hemorragia grave activa");
    else if (d.sangrado === "leve") partes.push("sangrado leve");
    return partes.length ? capitalizar(partes.join("; ")) + "." : "Sin datos suficientes para valorar la situación hematológica.";
  }

  function generarInforme() {
    if (!ultimaRonda || rondaEjemplo) return;
    var relevantes = ultimaRonda.findings.filter(function (x) { return x.sev === "crit" || x.sev === "warn"; });
    if (!relevantes.length) { window.alert("No hay hallazgos críticos ni a vigilar en esta ronda: no se genera informe."); return; }
    var camaEl = document.getElementById("r-cama");
    var d = ultimaRonda.datos || {};
    var informe = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      modo: ultimaRonda.modo,
      cama: camaEl ? camaEl.value.trim() : "",
      hallazgos: relevantes,
      datos: datosTrend(d),
      firma: S.firma || "",
      resumen: {
        respiratorio: resumenRespiratorio(d),
        hemodinamica: resumenHemodinamico(d),
        hematologico: resumenHematologico(d)
      }
    };
    var lista = getInformes();
    lista.unshift(informe);
    setInformes(lista);
    renderListaInformes();
    var fb = document.getElementById("r-informe-fb");
    if (fb) {
      fb.textContent = "Informe guardado (" + relevantes.length + (relevantes.length === 1 ? " hallazgo" : " hallazgos") + ").";
      fb.classList.add("on");
      clearTimeout(fb._t);
      fb._t = setTimeout(function () { fb.classList.remove("on"); }, 2800);
    }
  }

  function tituloInforme(inf) { return (inf.cama ? inf.cama + " · " : "") + "ECMO " + inf.modo.toUpperCase(); }
  var TREND = [["po2post", "PO₂ post", 0], ["dpm", "ΔP", 0], ["sao2", "SaO₂", 0], ["paco2", "PaCO₂", 0], ["plaq", "Plaq", 0], ["fibri", "Fib", 1],
    ["hb", "Hb", 1], ["lactato", "Lac", 1], ["act", "ACT", 0], ["ldh", "LDH", 0], ["pp", "P. pulso", 0]];
  function datosTrend(d) { var o = {}; TREND.forEach(function (t) { if (isFinite(d[t[0]])) o[t[0]] = d[t[0]]; }); return o; }
  function etiquetaDia(iso) {
    var d = new Date(iso), hoy = new Date();
    var a = new Date(d.getFullYear(), d.getMonth(), d.getDate()), b = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    var dias = Math.round((b - a) / 86400000);
    if (dias === 0) return "Hoy";
    if (dias === 1) return "Ayer";
    return capitalizar(d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }));
  }
  function tendencias(inf, lista) {
    if (!inf.datos) return "";
    var idx = lista.indexOf(inf), prev = null;
    for (var i = idx + 1; i < lista.length; i++) if ((lista[i].cama || "") === (inf.cama || "") && lista[i].datos) { prev = lista[i]; break; }
    if (!prev) return "";
    var marcados = {};
    inf.hallazgos.forEach(function (h) { keysOfFinding(h.t).forEach(function (k) { marcados[k] = true; }); if (/pulso|^PAM/.test(h.t)) marcados.pp = true; });
    var items = [];
    TREND.forEach(function (t) {
      var a = prev.datos[t[0]], b = inf.datos[t[0]];
      if (!isFinite(a) || !isFinite(b) || a === b) return;
      items.push({ m: !!marcados[t[0]], h: '<span>' + t[1] + ' <b class="' + (marcados[t[0]] ? "up" : "ok") + '">' + (b > a ? "↑ " : "↓ ") + numES(a, t[2]) + "→" + numES(b, t[2]) + '</b></span>' });
    });
    items.sort(function (x, y) { return (y.m ? 1 : 0) - (x.m ? 1 : 0); });
    return items.length ? '<div class="trd">' + items.slice(0, 3).map(function (x) { return x.h; }).join("") + '</div>' : "";
  }
  function renderListaInformes() {
    var host = document.getElementById("informes-list");
    if (!host) return;
    var lista = getInformes();
    var fil = document.getElementById("inf-filtro");
    var filtro = fil ? fil.value : "";
    if (fil) {
      var camas = [];
      lista.forEach(function (x) { if (x.cama && camas.indexOf(x.cama) < 0) camas.push(x.cama); });
      camas.sort(function (a, b) { return a.localeCompare(b, "es", { numeric: true }); });
      fil.innerHTML = '<option value="">Todas las camas</option>' + camas.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join("");
      fil.value = camas.indexOf(filtro) > -1 ? filtro : "";
      filtro = fil.value;
      fil.parentNode.hidden = !camas.length;
    }
    var empty = document.getElementById("informes-empty");
    if (empty) empty.style.display = lista.length ? "none" : "block";
    var html = "", dia = "";
    lista.forEach(function (inf) {
      if (filtro && inf.cama !== filtro) return;
      var et = etiquetaDia(inf.fecha);
      if (et !== dia) { html += '<div class="grp">' + et + '</div>'; dia = et; }
      var nc = inf.hallazgos.filter(function (x) { return x.sev === "crit"; }).length;
      var nw = inf.hallazgos.filter(function (x) { return x.sev === "warn"; }).length;
      var d = new Date(inf.fecha);
      html += '<div class="swipe" data-id="' + inf.id + '"><div class="sw-acts">' +
        '<button type="button" class="sw-share" data-share-id="' + inf.id + '" tabindex="-1">' + SVG_SHARE + 'Compartir</button>' +
        '<button type="button" class="sw-del" data-del-id="' + inf.id + '" tabindex="-1">' + SVG_TRASH + 'Eliminar</button></div>' +
        '<button class="icard" data-open-informe="' + inf.id + '"><div class="top"><span class="bx">' + esc(inf.cama || "Sin box") + '</span>' +
        '<span class="badge ' + inf.modo + '">' + inf.modo.toUpperCase() + '</span><span class="tm">' + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + '</span></div>' +
        '<div class="bdg">' + (nc ? '<span class="badge crit">' + nc + (nc === 1 ? " crítico" : " críticos") + '</span>' : "") + (nw ? '<span class="badge warn">' + nw + ' a vigilar</span>' : "") + '</div>' +
        tendencias(inf, lista) + '</button></div>';
    });
    host.innerHTML = html + (html ? '<p class="sw-hint">Desliza un informe hacia la izquierda para compartirlo o eliminarlo.</p>' : "");
    var cnt = document.getElementById("inf-count");
    if (cnt) { cnt.textContent = lista.length; cnt.hidden = !lista.length; }
  }
  var infFiltro = document.getElementById("inf-filtro");
  if (infFiltro) infFiltro.addEventListener("change", renderListaInformes);

  function planDeGuardia(inf) {
    return inf.hallazgos.slice().sort(function (a, b) { return (a.sev === "crit" ? 0 : 1) - (b.sev === "crit" ? 0 : 1); });
  }

  function abrirInforme(id) {
    var inf = getInformes().filter(function (x) { return x.id === id; })[0];
    if (!inf) return;
    document.getElementById("informe-titulo").textContent = tituloInforme(inf);
    document.getElementById("informe-fecha").textContent = fmtFechaInforme(inf.fecha);

    var r = inf.resumen || {};
    var plan = planDeGuardia(inf);

    var html = "";
    html += '<h3 class="rh">Respiratorio</h3><p class="narr">' + (r.respiratorio || "—") + '</p>';
    html += '<h3 class="rh">Hemodinámica</h3><p class="narr">' + (r.hemodinamica || "—") + '</p>';
    html += '<h3 class="rh">Hematológico</h3><p class="narr">' + (r.hematologico || "—") + '</p>';
    html += '<h3 class="rh plan">Plan de guardia</h3><ol class="plan-list">' +
      plan.map(function (x) {
        return '<li class="' + x.sev + '"><span class="t">' + x.t + (x.v && x.v !== "—" ? " (" + x.v + ")" : "") + '</span><span class="d">' + primeraFrase(x.m) + '</span></li>';
      }).join("") + '</ol>';
    if (inf.firma) html += '<p class="firma">Firmado: ' + esc(inf.firma) + '</p>';

    document.getElementById("informe-body").innerHTML = html;
    document.getElementById("informe-del-btn").setAttribute("data-del-informe", id);
    document.getElementById("informe-copiar-btn").setAttribute("data-copiar-informe", id);
    document.getElementById("informe-share-btn").setAttribute("data-share-informe", id);
    document.getElementById("informes-view-lista").classList.remove("on");
    document.getElementById("informes-view-detalle").classList.add("on");
    capaAbierta("informe", cerrarInforme);
  }

  function textoPlanoInforme(inf) {
    var r = inf.resumen || {};
    var plan = planDeGuardia(inf);
    var lineas = [];
    lineas.push(tituloInforme(inf));
    lineas.push(fmtFechaInforme(inf.fecha));
    lineas.push("");
    lineas.push("RESPIRATORIO");
    lineas.push(r.respiratorio || "—");
    lineas.push("");
    lineas.push("HEMODINÁMICA");
    lineas.push(r.hemodinamica || "—");
    lineas.push("");
    lineas.push("HEMATOLÓGICO");
    lineas.push(r.hematologico || "—");
    lineas.push("");
    lineas.push("PLAN DE GUARDIA");
    plan.forEach(function (x, i) {
      lineas.push((i + 1) + ". " + (x.sev === "crit" ? "[CRÍTICO] " : "[A VIGILAR] ") + x.t + (x.v && x.v !== "—" ? " (" + x.v + ")" : "") + " — " + primeraFrase(x.m));
    });
    lineas.push("");
    if (inf.firma) lineas.push("Firmado: " + inf.firma);
    lineas.push("Apoyo de lectura, no sustituye al protocolo ni al juicio clínico.");
    return lineas.join("\n");
  }

  function copiarAlPortapapeles(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = texto;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) resolve(); else reject(new Error("execCommand copy failed"));
      } catch (e) { reject(e); }
    });
  }

  function cerrarInforme() {
    document.getElementById("informes-view-detalle").classList.remove("on");
    document.getElementById("informes-view-lista").classList.add("on");
    capaCerrada("informe");
  }

  function eliminarInforme(id) {
    if (!window.confirm("¿Eliminar este informe? No se puede deshacer.")) return;
    setInformes(getInformes().filter(function (x) { return x.id !== id; }));
    renderListaInformes();
    cerrarInforme();
  }

  document.addEventListener("click", function (e) {
    var openBtn = e.target.closest("[data-open-informe]");
    if (openBtn) { abrirInforme(Number(openBtn.dataset.openInforme)); return; }
    var delBtn = e.target.closest("[data-del-informe]");
    if (delBtn) { eliminarInforme(Number(delBtn.dataset.delInforme)); return; }
  });

  var informeBtnEl = document.getElementById("r-informe-btn");
  if (informeBtnEl) informeBtnEl.addEventListener("click", generarInforme);
  var informeBackEl = document.getElementById("informe-back-btn");
  if (informeBackEl) informeBackEl.addEventListener("click", cerrarInforme);

  var informeCopiarEl = document.getElementById("informe-copiar-btn");
  if (informeCopiarEl) {
    informeCopiarEl.addEventListener("click", function () {
      var id = Number(informeCopiarEl.dataset.copiarInforme);
      var inf = getInformes().filter(function (x) { return x.id === id; })[0];
      if (!inf) return;
      var lbl = informeCopiarEl.querySelector("span") || informeCopiarEl;
      var textoOriginal = lbl.textContent;
      copiarAlPortapapeles(textoPlanoInforme(inf)).then(function () {
        lbl.textContent = "Copiado ✓";
        setTimeout(function () { lbl.textContent = textoOriginal; }, 1800);
      }).catch(function () {
        window.alert("No se ha podido copiar automáticamente. Mantén pulsado el texto del informe para copiarlo a mano.");
      });
    });
  }


  // =====================================================================
  //  Interfaz: ronda (teselas, resumen, hoja de teclado), búsqueda,
  //  favoritos, modo crisis, calculadoras, supervivencia y ajustes
  // =====================================================================

  var SVG_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>';
  var SVG_CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>';
  var SVG_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var SVG_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';
  var SVG_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  var SVG_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4M12 2v13"/></svg>';
  var SVG_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>';
  var SVG_MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>';
  var SVG_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  var SVG_DEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z"/><path d="M17 9l-5 6M12 9l5 6"/></svg>';

  // ---- de cada aviso al campo que lo dispara ----
  var FMAP = [
    [/^Flujo/, ["flujo"]], [/^rpm/, ["rpm"]], [/^Succión/, ["p1"]], [/premembrana alta/, ["p2"]], [/transmembrana/, ["dpm"]],
    [/postmembrana|^Membrana/, ["po2post"]], [/^PaCO₂/, ["paco2"]], [/gas:sangre/, ["sweep"]], [/^Acidosis|^Alcalosis/, ["ph"]],
    [/^Hipoxemia|^SaO₂/, ["sao2"]], [/^PaO₂/, ["pao2"]], [/recirculación|SvO₂ premembrana|venosa baja/, ["svo2"]],
    [/meseta/, ["pplat"]], [/^PEEP/, ["peep"]], [/^Driving/, ["pplat", "peep"]], [/FiO₂ del/, ["vfio2"]],
    [/^PAM|pulso/, ["tas", "tad"]], [/Índice cardiaco/, ["ic"]], [/^Taquicardia/, ["fc"]], [/^Lactato/, ["lactato"]],
    [/^Diuresis/, ["diuresis"]], [/termia/, ["temp"]], [/^Hemoglobina/, ["hb"]], [/^Plaquetas/, ["plaq"]],
    [/^Fibrinógeno/, ["fibri"]], [/^LDH/, ["ldh"]], [/^ACT$/, ["act"]], [/^TTPa$/, ["ttpa"]]
  ];
  function keysOfFinding(t) { for (var i = 0; i < FMAP.length; i++) if (FMAP[i][0].test(t)) return FMAP[i][1]; return []; }
  var SEV_RANK = { crit: 3, warn: 2, info: 1, ok: 0 };
  var fieldSev = {}, fieldFinding = {};
  var SHORT = { flujo: "Flujo", sweep: "Sweep", rpm: "rpm", p1: "P1", p2: "P2", p3m: "P3", po2post: "PO₂ post", dias: "Día",
    fc: "FC", tas: "TAS", tad: "TAD", gc: "GC", ic: "IC", lactato: "Lac", sao2: "SaO₂", svo2: "Spre", pao2: "PaO₂", paco2: "PaCO₂",
    ph: "pH", svmix: "SvO₂", hb: "Hb", plaq: "Plaq", fibri: "Fib", act: "ACT", ttpa: "TTPa", ldh: "LDH", ritmo: "Hep",
    pplat: "Pplat", peep: "PEEP", vfio2: "FiO₂", peso: "Peso", diuresis: "Diur", temp: "T" };

  function tileOf(key) { return document.querySelector('.vt[data-edit="' + key + '"]'); }
  function tileVisible(key) { var b = tileOf(key); return !!b && !b.hidden && !b.closest("[hidden]"); }

  // ---- ronda: estado guardado ----
  var RONDA_LS = "ecmo_ronda";
  var RONDA_DEF = {};
  RONDA_KEYS.forEach(function (k) { RONDA_DEF[k] = stepState[k].v; });
  // La ronda arranca vacía: los valores de stepState solo sirven como ejemplo (menú ⋯) y como punto
  // de partida de la regla deslizable. Un valor de ejemplo nunca debe pasar por dato de un paciente.
  RONDA_KEYS.forEach(function (k) { stepState[k].v = null; });
  var rondaEditada = false, rondaT = 0, rondaNc = 0, rondaEjemplo = false;
  function marcarEditada() { rondaEditada = true; rondaT = Date.now(); }
  // Hasta la v26, con solo tocar VV/VA se guardaba la ronda con todos los valores de ejemplo como si
  // fueran del paciente. Las rondas sin la marca "ej: 0" se limpian una vez: cada valor idéntico al de
  // ejemplo se vacía y se conservan solo los que se escribieron a mano.
  function leerRonda() {
    var s;
    try { s = JSON.parse(ls(RONDA_LS) || "null"); } catch (e) { return null; }
    if (!s || !s.vals || s.ej === 0) return s;
    var quedan = 0;
    RONDA_KEYS.forEach(function (k) {
      if (!(k in s.vals)) return;
      if (s.vals[k] === RONDA_DEF[k]) s.vals[k] = null;
      if (s.vals[k] !== null && s.vals[k] !== undefined) quedan++;
    });
    if (!quedan && !s.cama) { ls(RONDA_LS, ""); return null; }
    s.ej = 0;
    ls(RONDA_LS, JSON.stringify(s));
    return s;
  }
  function guardarRonda() {
    if (!S.recordar || !rondaEditada || rondaEjemplo) return;
    var vals = {};
    RONDA_KEYS.forEach(function (k) { vals[k] = stepState[k].v; });
    var sg = document.getElementById("r-sangrado");
    ls(RONDA_LS, JSON.stringify({ t: rondaT, modo: modo, vals: vals, sangrado: sg ? sg.value : "no", cama: document.getElementById("r-cama").value, nc: rondaNc, ej: 0 }));
  }
  function haceCuanto(t) {
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "hace un momento";
    if (m < 60) return "hace " + m + " min";
    var h = Math.round(m / 60);
    if (h < 24) return "hace " + h + " h";
    var d = new Date(t);
    return "el " + ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2);
  }
  function fechaCorta(d) {
    var s = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" }).replace(",", "").replace(/\.$/, "");
    return capitalizar(s) + " · " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  function updateHero() {
    var t = document.getElementById("hero-t"), d = document.getElementById("hero-d");
    if (!t || !d) return;
    var s = S.recordar ? leerRonda() : null;
    if (s && s.t) {
      t.textContent = "Continuar ronda" + (s.cama ? " · " + s.cama : "");
      d.textContent = (s.modo || "vv").toUpperCase() + " · guardada " + haceCuanto(s.t) + (s.nc ? " · " + s.nc + (s.nc === 1 ? " crítico" : " críticos") : "");
    } else {
      t.textContent = "Ronda diaria";
      d.textContent = "Valores de hoy y avisos automáticos";
    }
  }

  // ---- ronda: pintar estado de teselas, secciones y resumen ----
  // Barra de rango bajo cada valor de la ronda: mismos tramos que la hoja (rangeOf) y que los avisos.
  function rangoDe(k) {
    var r = S.rangos ? rangeOf(k) : null;
    return r && r.z ? { a: r.min, b: r.max, z: r.z } : null;
  }
  function pintarBarra(b, k, val) {
    var r = rangoDe(k), el = b.querySelector(".rb");
    if (!r) { if (el) el.remove(); b.classList.remove("hasrb"); return; }
    if (!el) { el = document.createElement("span"); el.className = "rb"; el.setAttribute("aria-hidden", "true"); el.innerHTML = '<i class="tr"></i><i class="mk"></i>'; b.appendChild(el); }
    b.classList.add("hasrb");
    var pc = function (x) { return Math.max(0, Math.min(100, (x - r.a) / (r.b - r.a) * 100)); };
    var stops = [], prev = 0;
    r.z.forEach(function (z) { var e = pc(z[0]); stops.push("var(--rb-" + z[1] + ") " + prev.toFixed(2) + "% " + e.toFixed(2) + "%"); prev = e; });
    el.firstChild.style.background = "linear-gradient(90deg," + stops.join(",") + ")";
    var v = val !== undefined ? val : sv(k), mk = el.lastChild;
    if (!isFinite(v)) { mk.hidden = true; return; }
    var sev = r.z[r.z.length - 1][1];
    for (var i = 0; i < r.z.length; i++) if (v < r.z[i][0]) { sev = r.z[i][1]; break; }
    mk.hidden = false; mk.className = "mk " + sev; mk.style.left = pc(v) + "%";
  }

  function rondaUI(f) {
    fieldSev = {}; fieldFinding = {};
    f.forEach(function (x) {
      keysOfFinding(x.t).forEach(function (k) {
        if (!(k in fieldSev) || SEV_RANK[x.sev] > SEV_RANK[fieldSev[k]]) { fieldSev[k] = x.sev; fieldFinding[k] = x; }
      });
    });
    var groups = {};
    TILE_ORDER.ronda.forEach(function (k) {
      var b = tileOf(k);
      if (!b) return;
      var sev = fieldSev[k];
      b.classList.toggle("crit", sev === "crit");
      b.classList.toggle("warn", sev === "warn");
      pintarBarra(b, k);
      var fs = FIELD_META[k].fs, id = fs.dataset.group;
      var g = groups[id] || (groups[id] = { fs: fs, n: 0, filled: 0, c: 0, w: 0, sum: [] });
      if (b.hidden) return;
      g.n++;
      var st = stepState[k];
      if (st.v !== null && st.v !== undefined) {
        g.filled++;
        if (g.sum.length < 4) g.sum.push((SHORT[k] || FIELD_META[k].label) + " " + fmtDisplay(k));
      }
      if (sev === "crit") g.c++; else if (sev === "warn") g.w++;
    });
    var dEl = document.getElementById("r-dpm");
    if (dEl) {
      var dv = sv("p2") - sv("p3m"), ds = fieldSev.dpm;
      document.getElementById("r-dpm-v").textContent = isFinite(dv) ? n0(dv) : "—";
      dEl.classList.toggle("empty", !isFinite(dv));
      dEl.classList.toggle("crit", ds === "crit");
      dEl.classList.toggle("warn", ds === "warn");
      pintarBarra(dEl, "dpm", dv);
      var gc = groups.cir;
      if (gc) {
        if (ds === "crit") gc.c++; else if (ds === "warn") gc.w++;
        if (isFinite(dv)) { var i3 = gc.sum.indexOf("P3 " + fmtDisplay("p3m")); gc.sum.splice(i3 > -1 ? i3 + 1 : gc.sum.length, 0, "ΔP " + n0(dv)); gc.sum = gc.sum.slice(0, 5); }
      }
    }
    Object.keys(groups).forEach(function (id) {
      var g = groups[id], head = g.fs.querySelector(".fs-head");
      head.querySelector(".fs-sum").textContent = g.sum.join(" · ") || "Sin valores";
      head.querySelector(".fs-cnt").textContent = g.filled + " de " + g.n;
      head.querySelector(".fs-bdg").innerHTML = (g.c ? '<span class="badge crit">' + g.c + '</span>' : "") + (g.w ? '<span class="badge warn">' + g.w + '</span>' : "");
    });
    var nc = f.filter(function (x) { return x.sev === "crit"; }).length;
    var nw = f.filter(function (x) { return x.sev === "warn"; }).length;
    var nk = f.filter(function (x) { return x.sev === "ok"; }).length;
    rondaNc = nc;
    var sum = document.getElementById("r-sum");
    if (sum) sum.innerHTML = '<span class="badge ' + (nc ? "crit" : "zero") + '">' + nc + (nc === 1 ? " crítico" : " críticos") + '</span>' +
      '<span class="badge ' + (nw ? "warn" : "zero") + '">' + nw + ' a vigilar</span><span class="badge ' + (nk ? "ok" : "zero") + '">' + nk + ' en rango</span><span class="sp"></span>' +
      '<button type="button" class="go" id="r-go-avisos">Avisos' + SVG_CHEV + '</button>';
    var fe = document.getElementById("r-fecha");
    if (fe) fe.textContent = fechaCorta(new Date()) + (isFinite(sv("dias")) ? " · día " + n0(sv("dias")) + " de soporte" : "");
    var ej = document.getElementById("r-ejemplo");
    var hayValores = RONDA_KEYS.some(function (k) { return stepState[k].v !== null && stepState[k].v !== undefined; });
    if (ej) ej.hidden = rondaEjemplo || hayValores;
    var demo = document.getElementById("r-demo");
    if (demo) demo.hidden = !rondaEjemplo;
    var bi = document.getElementById("r-informe-btn");
    if (bi && rondaEjemplo) { bi.disabled = true; bi.title = "Con valores de ejemplo no se genera informe"; }
    else if (bi) bi.title = "";
    guardarRonda();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("#r-go-avisos")) {
      var a = document.getElementById("r-avisos");
      if (a) scrollA(a);
    }
  });

  // ---- ronda: box y menú ----
  function buildBoxes() {
    var sel = document.getElementById("r-box");
    if (!sel) return;
    var cur = document.getElementById("r-cama").value;
    var n = Math.max(1, Math.min(40, parseInt(S.boxes, 10) || 30));
    var html = '<option value="">Sin box</option>';
    for (var i = 1; i <= n; i++) html += '<option value="Box ' + i + '">Box ' + i + '</option>';
    sel.innerHTML = html;
    if (cur && !sel.querySelector('option[value="' + cur + '"]')) sel.insertAdjacentHTML("beforeend", '<option value="' + esc(cur) + '">' + esc(cur) + '</option>');
    sel.value = cur;
  }
  var rBox = document.getElementById("r-box");
  if (rBox) rBox.addEventListener("change", function () {
    document.getElementById("r-cama").value = rBox.value;
    marcarEditada();
    guardarRonda();
  });
  var rMenu = document.getElementById("r-menu"), rMenuBtn = document.getElementById("r-menu-btn");
  if (rMenuBtn) rMenuBtn.addEventListener("click", function (e) { e.stopPropagation(); rMenu.hidden = !rMenu.hidden; });
  document.addEventListener("click", function (e) { if (rMenu && !rMenu.hidden && !e.target.closest("#r-menu")) rMenu.hidden = true; });
  if (rMenu) rMenu.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-act]");
    if (!b) return;
    rMenu.hidden = true;
    var sg = document.getElementById("r-sangrado");
    if (b.dataset.act === "vaciar") {
      if (!rondaEjemplo && !window.confirm("¿Vaciar todos los valores de la ronda?")) return;
      vaciarRonda();
    } else {
      RONDA_KEYS.forEach(function (k) { stepState[k].v = RONDA_DEF[k]; });
      if (sg) { sg.value = "no"; syncSeg(sg); }
      rondaEjemplo = true;
      rondaEditada = false;
      ls(RONDA_LS, "");
    }
    RONDA_KEYS.forEach(refreshStepOutputs);
    ronda();
    updateHero();
  });
  function vaciarRonda() {
    var sg = document.getElementById("r-sangrado");
    RONDA_KEYS.forEach(function (k) { stepState[k].v = null; });
    if (sg) { sg.value = "no"; syncSeg(sg); }
    rondaEjemplo = false;
    rondaEditada = false;
    ls(RONDA_LS, "");
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#r-demo-vaciar")) return;
    vaciarRonda();
    RONDA_KEYS.forEach(refreshStepOutputs);
    ronda();
    updateHero();
  });
  document.getElementById("ronda-seg").addEventListener("click", function (e) {
    if (e.isTrusted && e.target.closest("button[data-mode]")) { marcarEditada(); guardarRonda(); }
  });
  var rSangradoEl = document.getElementById("r-sangrado");
  if (rSangradoEl) rSangradoEl.addEventListener("change", function () { marcarEditada(); });
  function setModo(m) { var b = document.querySelector('#ronda-seg [data-mode="' + m + '"]'); if (b) b.click(); }
  function restaurarRonda() {
    var s = S.recordar ? leerRonda() : null;
    var m = S.modo === "va" ? "va" : "vv";
    if (s && s.vals) {
      // Un campo que no estaba en la ronda guardada (p. ej. P3 postmembrana, nuevo) queda vacío, no con el valor de ejemplo.
      RONDA_KEYS.forEach(function (k) { stepState[k].v = (k in s.vals) ? s.vals[k] : null; });
      var sg = document.getElementById("r-sangrado");
      if (sg && s.sangrado) { sg.value = s.sangrado; syncSeg(sg); }
      document.getElementById("r-cama").value = s.cama || "";
      if (s.modo) m = s.modo;
      rondaEditada = true;
      rondaT = s.t || Date.now();
    }
    buildBoxes();
    Object.keys(FIELD_META).forEach(refreshStepOutputs);
    setModo(m);
  }

  // ---- hoja para escribir un valor ----
  function rangeOf(key) {
    var sang = (document.getElementById("r-sangrado") || {}).value || "no";
    var kg = function (x) { return x * sv("peso") / 1000; };
    var R = {
      po2post: { min: 0, max: 600, z: [[150, "crit"], [300, "warn"], [600, "ok"]], ref: "Objetivo > 300 mmHg · por debajo de 150, valorar el cambio de membrana." },
      dpm: { min: 0, max: 80, z: [[35, "ok"], [50, "warn"], [80, "crit"]], ref: "ΔP = P2 − P3. Límite 50 mmHg · un ascenso del 30–50 % sobre el basal sugiere trombosis." },
      p1: { min: -150, max: 0, z: [[-100, "crit"], [-80, "warn"], [-50, "info"], [0, "ok"]], ref: "No pasar de −80 mmHg; −100 es succión excesiva; por debajo de −50, posibles microembolias." },
      p2: { min: 0, max: 300, z: [[200, "ok"], [300, "warn"]], ref: "Premembrana. Límite del protocolo: 200 mmHg. Lo que se vigila es el ΔP (P2 − P3)." },
      p3m: { ref: "Postmembrana. Se usa para calcular el ΔP = P2 − P3." },
      rpm: { min: 1000, max: 5000, z: [[3500, "ok"], [5000, "warn"]], ref: "Por encima de 3500 rpm aumenta la hemólisis." },
      paco2: { min: 20, max: 80, z: [[35, "warn"], [45, "ok"], [60, "warn"], [80, "crit"]], ref: "Objetivo 35–45 mmHg." },
      ph: { min: 7.0, max: 7.7, z: [[7.25, "crit"], [7.35, "warn"], [7.45, "ok"], [7.7, "warn"]], ref: "Objetivo 7,35–7,45." },
      lactato: { min: 0, max: 8, z: [[2, "ok"], [5, "warn"], [8, "crit"]], ref: "Objetivo < 2 mmol/L; importa la tendencia." },
      hb: { min: 5, max: 14, z: [[7, "crit"], [8, "warn"], [14, "ok"]], ref: "El protocolo pide > 8 g/dL." },
      ldh: { min: 0, max: 1500, z: [[350, "ok"], [1000, "warn"], [1500, "crit"]], ref: "Por encima de 1000 UI/L, sospechar coágulos en el cabezal." },
      act: sang === "grave" ? null : { min: 60, max: 360, z: [[90, "crit"], [160, "warn"], [180, "ok"], [320, "warn"], [360, "crit"]], ref: "Diana del protocolo: 160–180 s." },
      ttpa: sang === "grave" ? null : { min: 20, max: 110, z: [[35, "crit"], [46, "warn"], [70, "ok"], [90, "warn"], [110, "crit"]], ref: "Diana del protocolo: 46–70 s." },
      diuresis: { min: 0, max: 2, z: [[0.5, "warn"], [3, "ok"]], ref: "Objetivo > 0,5 mL/kg/h." },
      temp: { min: 34, max: 40, z: [[35.5, "warn"], [37.5, "ok"], [40, "warn"]], ref: "Normotermia: 35,5–37,5 °C." },
      pplat: { min: 10, max: 40, z: [[25, "ok"], [30, "warn"], [40, "crit"]], ref: "Recomendable < 25, aceptable hasta 30 cmH₂O." },
      peep: { min: 0, max: 24, z: [[10, "warn"], [20, "ok"]], ref: "≥ 10 cmH₂O en reposo." },
      vfio2: { min: 21, max: 100, z: [[50, "ok"], [100, "warn"]], ref: "En reposo, 30–50 %." },
      plaq: { min: 0, max: 300, z: [[sang === "no" ? 50 : 100, "crit"], [100, "warn"], [300, "ok"]], ref: sang === "no" ? "Sin sangrado: > 50–100 ×10⁹/L." : "Con sangrado: > 100 ×10⁹/L." },
      fibri: { min: 0, max: 5, z: [[sang === "no" ? 1 : 1.5, "crit"], [2, "warn"], [5, "ok"]], ref: sang === "no" ? "Sin sangrado: > 1 g/L (ELSO pide 2,5–3)." : "Con sangrado: > 1,5 g/L (ELSO pide 2,5–3)." },
      sao2: modo === "vv" ? { min: 60, max: 100, z: [[80, "crit"], [85, "warn"], [92, "ok"], [100, "info"]], ref: "VV: objetivo 85–92 %." }
        : { min: 80, max: 100, z: [[95, "crit"], [100, "ok"]], ref: "VA: objetivo 95–100 %, en radial derecha." },
      pao2: modo === "vv" ? { min: 30, max: 150, z: [[60, "warn"], [150, "ok"]], ref: "VV: objetivo > 60 mmHg." } : null,
      svo2: { min: 40, max: 100, z: [[modo === "vv" ? 70 : 65, "warn"], [100, "ok"]], ref: modo === "vv" ? "Premembrana: objetivo > 70 %." : "Objetivo > 65 % en el sistema y > 70 % en la cánula venosa." },
      ic: modo === "va" ? { min: 1, max: 4, z: [[2.2, "crit"], [2.5, "warn"], [4, "ok"]], ref: "Objetivo total (bomba + gasto residual) ≥ 2,5 L/min/m²." } : null,
      flujo: { min: 0, max: Math.max(7, kg(100)), z: sv("peso") > 0 ? [[kg(40), "crit"], [kg(50), "warn"], [kg(80), "ok"], [Math.max(7, kg(100)), "warn"]] : null, ref: "Objetivo 50–80 mL/kg/min" + (isFinite(sv("flujo")) && sv("peso") > 0 ? " (ahora " + n0(sv("flujo") * 1000 / sv("peso")) + " mL/kg/min)." : ".") }
    };
    if (FIELD_META[key] && FIELD_META[key].scope !== "ronda") return null;
    return R[key] || null;
  }
  var sheet = document.getElementById("sheet"), scrim = document.getElementById("sheet-scrim");
  var SH = { key: null, buf: "", fresh: true, err: "", prev: null };
  function bufFromState(key) {
    var st = stepState[key];
    if (st.v === null || st.v === undefined) return "";
    return enKpa(key) ? (st.v / KPA).toFixed(1) : st.v.toFixed(st.dec);
  }
  function fmtBuf(b) { return b.replace(".", ",").replace("-", "−"); }
  function ordenDe(key) { return TILE_ORDER[FIELD_META[key].scope].filter(tileVisible); }
  function recalcScope(key) {
    if (!key || !FIELD_META[key]) return;
    if (FIELD_META[key].scope === "ronda") ronda(); else calcCriterios();
  }
  function openSheet(key) {
    if (!FIELD_META[key]) return;
    SH.key = key; SH.fresh = true; SH.err = ""; SH.buf = bufFromState(key); SH.prev = stepState[key].v;
    renderSheet();
    sheet.hidden = false; scrim.hidden = false;
    capaAbierta("hoja", closeSheet);
    colocarRegla();
    void sheet.offsetWidth;
    sheet.classList.add("on"); scrim.classList.add("on");
    vibrar();
  }
  function closeSheet() {
    if (sheet.hidden) return;
    if (!commitBuf(true)) { stepState[SH.key].v = SH.prev; refreshStepOutputs(SH.key); }
    sheet.classList.remove("on"); scrim.classList.remove("on");
    var k = SH.key;
    setTimeout(function () { if (!sheet.classList.contains("on")) { sheet.hidden = true; scrim.hidden = true; } }, 330);
    recalcScope(k);
    var t = tileOf(k); if (t) t.focus({ preventScroll: true });
    capaCerrada("hoja");
  }
  function parseBuf() {
    if (SH.buf === "" || SH.buf === "-") return null;
    var x = parseFloat(SH.buf);
    return isFinite(x) ? x : NaN;
  }
  function commitBuf(final) {
    var key = SH.key, st = stepState[key], x = parseBuf();
    if (x === null) { st.v = null; SH.err = ""; }
    else if (isNaN(x)) return false;
    else {
      var v = enKpa(key) ? x * KPA : x;
      var p = Math.pow(10, st.dec);
      v = Math.round(v * p) / p;
      if (v < st.min || v > st.max) {
        if (final) {
          var lo = enKpa(key) ? numES(st.min / KPA, 1) : numES(st.min, st.dec), hi = enKpa(key) ? numES(st.max / KPA, 1) : numES(st.max, st.dec);
          SH.err = "Fuera del rango admitido: " + lo + " a " + hi + " " + unitOf(key) + ".";
          return false;
        }
        return true;
      }
      SH.err = "";
      st.v = v;
    }
    refreshStepOutputs(key);
    if (FIELD_META[key].scope === "ronda") marcarEditada();
    recalcScope(key);
    return true;
  }
  function renderSheet() {
    var key = SH.key, m = FIELD_META[key], st = stepState[key];
    var grupo = ordenDe(key).filter(function (k) { return FIELD_META[k].fs === m.fs; }), i = grupo.indexOf(key);
    var orden = ordenDe(key), io = orden.indexOf(key);
    var unit = unitOf(key);
    var dec = enKpa(key) ? 1 : st.dec;
    var html = '<div class="grab"></div><div class="sh-top"><div class="tx"><div class="sh-ctx">' + esc(m.group) + ' · ' + (i + 1) + ' de ' + grupo.length + '</div>' +
      '<h2 class="sh-title" id="sh-title">' + esc(m.label) + '</h2></div><button type="button" class="sh-x" aria-label="Cerrar">' + SVG_X + '</button></div>';
    var f = m.scope === "ronda" ? fieldFinding[key] : null;
    var chip = "";
    if (f && (f.sev === "crit" || f.sev === "warn")) chip = '<span class="sh-st ' + f.sev + '">' + esc(f.t) + '</span>';
    else if (f && f.sev === "ok") chip = '<span class="sh-st ok">En rango</span>';
    html += '<div class="sh-card"><div class="sh-val"><span class="sh-num' + (SH.buf === "" || SH.buf === "-" ? " ph" : "") + '">' + (SH.buf === "" ? "—" : fmtBuf(SH.buf)) + '</span><span class="sh-caret"></span><span class="sh-unit">' + esc(unit) + '</span><span class="sp"></span>' + chip + '</div>';
    var r = S.rangos ? rangeOf(key) : null;
    if (r && r.z) {
      var span = r.max - r.min, prev = r.min, zones = "", ticks = "";
      var conv = function (x) { if (enKpa(key)) return numES(x / KPA, 1); var d = Math.abs(x - Math.round(x)) < 1e-9 ? 0 : Math.abs(x * 10 - Math.round(x * 10)) < 1e-6 ? 1 : 2; return numES(x, d).replace("-", "−"); };
      r.z.forEach(function (z, zi) {
        zones += '<span class="z-' + z[1] + '" style="width:' + ((z[0] - prev) / span * 100) + '%"></span>';
        if (zi < r.z.length - 1) ticks += '<span style="left:' + ((z[0] - r.min) / span * 100) + '%">' + conv(z[0]) + '</span>';
        prev = z[0];
      });
      var pos = st.v === null || st.v === undefined ? null : Math.max(0, Math.min(100, (st.v - r.min) / span * 100));
      html += '<div class="rbar"><div class="zones">' + zones + '</div>' + (pos === null ? "" : '<span class="mk" style="left:' + pos + '%"></span>') +
        '<div class="ticks"><span class="t0">' + conv(r.min) + '</span>' + ticks + '<span class="t1">' + conv(r.max) + '</span></div></div>';
    }
    if (r && r.ref) html += '<div class="sh-ref">' + esc(r.ref) + (/mmHg/.test(r.ref) && enKpa(key) ? " (umbrales del protocolo en mmHg)" : "") + '</div>';
    if (SH.err) html += '<div class="sh-err">' + esc(SH.err) + '</div>';
    html += '</div>';
    var d = enKpa(key) ? 0.1 : m.delta;
    html += '<div class="sh-rul"><button type="button" data-q="' + (-d) + '" aria-label="Restar ' + numES(d, d % 1 ? (d < 0.1 ? 2 : 1) : 0) + '">' + SVG_MINUS + '</button>' +
      reglaHTML(key) + '<button type="button" data-q="' + d + '" aria-label="Sumar ' + numES(d, d % 1 ? (d < 0.1 ? 2 : 1) : 0) + '">' + SVG_PLUS + '</button></div>';
    var special = dec > 0 ? '<button type="button" data-k=".">,</button>' : (st.min < 0 ? '<button type="button" data-k="sign" aria-label="Cambiar signo">±</button>' : '<button type="button" data-k="clear" aria-label="Borrar todo">C</button>');
    html += '<div class="sh-k">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button type="button" data-k="' + n + '">' + n + '</button>'; }).join("") +
      special + '<button type="button" data-k="0">0</button><button type="button" data-k="back" aria-label="Borrar">' + SVG_DEL + '</button></div>';
    var prevK = io > 0 ? orden[io - 1] : null, nextK = io < orden.length - 1 ? orden[io + 1] : null;
    html += '<div class="sh-nav">' + (prevK ? '<button type="button" class="prev" data-nav="prev">' + SVG_CHEV_L + '<span>' + esc(SHORT[prevK] || FIELD_META[prevK].label) + '</span></button>' : "") +
      '<button type="button" class="next" data-nav="next"><span>' + (nextK ? "Siguiente: " + esc(FIELD_META[nextK].label.toLowerCase()) : "Hecho") + '</span>' + (nextK ? SVG_CHEV : SVG_OK) + '</button></div>';
    sheet.innerHTML = html;
    colocarRegla();
  }

  // ---- regla deslizable: se arrastra con el dedo y encaja en cada paso; el teclado sigue disponible ----
  var RUL_STEP = { vfio2: 1, "k-fio2": 1 };
  function reglaDe(key) {
    var st = stepState[key], kp = enKpa(key);
    var step = kp ? 0.1 : (RUL_STEP[key] || FIELD_META[key].delta);
    var dmin = kp ? st.min / KPA : st.min, dmax = kp ? st.max / KPA : st.max;
    var lo = Math.ceil(dmin / step - 1e-9) * step, hi = Math.floor(dmax / step + 1e-9) * step;
    var n = Math.round((hi - lo) / step);
    return { step: step, lo: lo, hi: hi, n: n, px: n < 40 ? 16 : 9, dec: kp ? 1 : st.dec, kp: kp };
  }
  function reglaHTML(key) {
    var g = reglaDe(key), w = g.n * g.px;
    var i0 = ((10 - (Math.round(g.lo / g.step) % 10)) % 10 + 10) % 10, labs = "";
    for (var i = i0; i <= g.n; i += 10) {
      var v = g.lo + i * g.step;
      labs += '<span class="lb" style="left:' + (i * g.px) + 'px">' + numES(v, Math.abs(Math.round(v) - v) > 1e-9 ? (g.step < 0.1 ? 2 : 1) : 0).replace("-", "−") + '</span>';
    }
    var band = "";
    var r = S.rangos ? rangeOf(key) : null;
    if (r && r.z) {
      var toPx = function (x) { var xv = g.kp ? x / KPA : x; return Math.max(0, Math.min(w, (xv - g.lo) / g.step * g.px)); };
      var prev = 0, stops = [];
      r.z.forEach(function (z, zi) {
        var e = zi === r.z.length - 1 ? w : toPx(z[0]);
        stops.push("var(--rb-" + z[1] + ") " + prev + "px " + e + "px"); prev = e;
      });
      band = '<i class="band" style="background:linear-gradient(90deg,' + stops.join(",") + ')"></i>';
    }
    return '<div class="rul-w"><div class="rul" role="slider" tabindex="-1" aria-label="Deslizar para elegir el valor" style="--px:' + g.px + 'px">' +
      '<div class="rul-in"><div class="rul-tr" style="width:' + w + 'px"><i class="tk"></i><i class="tk mj" style="background-position:' + (i0 * g.px) + 'px 0"></i>' + band + labs + '</div></div></div><i class="rul-c" aria-hidden="true"></i></div>';
  }
  var RUL = { el: null, set: false, t: 0 };
  function valorRegla(key) {
    var st = stepState[key], g = reglaDe(key);
    var v = st.v !== null && st.v !== undefined ? st.v : (st.blankStart !== undefined ? st.blankStart : RONDA_DEF[key]);
    if (v === null || v === undefined || !isFinite(v)) v = (st.min + st.max) / 2;
    return g.kp ? v / KPA : v;
  }
  function colocarRegla() {
    var el = sheet.querySelector(".rul");
    RUL.el = el;
    if (!el) return;
    var g = reglaDe(SH.key), v = valorRegla(SH.key);
    var x = Math.max(0, Math.min(g.n, Math.round((v - g.lo) / g.step))) * g.px;
    RUL.set = x; el.scrollLeft = x;
    el.setAttribute("aria-valuemin", g.lo); el.setAttribute("aria-valuemax", g.hi); el.setAttribute("aria-valuenow", v);
    if (!el.dataset.on) { el.dataset.on = "1"; el.addEventListener("scroll", alDeslizar, { passive: true }); }
  }
  function alDeslizar() {
    var el = RUL.el;
    if (!el || !SH.key) return;
    // Mientras la regla siga en la posición que fijó el programa, no cambia el valor (un campo vacío sigue vacío).
    if (RUL.set !== false && Math.abs(el.scrollLeft - RUL.set) < 1) return;
    RUL.set = false;
    var g = reglaDe(SH.key);
    var i = Math.max(0, Math.min(g.n, Math.round(el.scrollLeft / g.px)));
    var buf = (g.lo + i * g.step).toFixed(g.dec);
    clearTimeout(RUL.t);
    RUL.t = setTimeout(function () { if (RUL.el === el && Math.abs(el.scrollLeft - i * g.px) >= 1) el.scrollTo({ left: i * g.px, behavior: "smooth" }); }, 160);
    if (buf === SH.buf) return;
    SH.buf = buf; SH.fresh = false;
    if (i % 10 === 0) vibrar();
    commitBuf(false);
    refrescarHoja();
  }
  // Actualiza la cifra, el estado y la barra de la hoja sin redibujarla (no interrumpe el deslizamiento).
  function refrescarHoja() {
    var key = SH.key, st = stepState[key];
    var num = sheet.querySelector(".sh-num");
    if (num) { num.textContent = SH.buf === "" ? "—" : fmtBuf(SH.buf); num.classList.toggle("ph", SH.buf === "" || SH.buf === "-"); }
    var f = FIELD_META[key].scope === "ronda" ? fieldFinding[key] : null;
    var chip = sheet.querySelector(".sh-st"), html = "";
    if (f && (f.sev === "crit" || f.sev === "warn")) html = '<span class="sh-st ' + f.sev + '">' + esc(f.t) + '</span>';
    else if (f && f.sev === "ok") html = '<span class="sh-st ok">En rango</span>';
    if (chip) chip.outerHTML = html || '<span class="sh-st" hidden></span>';
    else if (html) sheet.querySelector(".sh-val").insertAdjacentHTML("beforeend", html);
    var mk = sheet.querySelector(".rbar .mk"), r = S.rangos ? rangeOf(key) : null;
    if (mk && r && st.v !== null && st.v !== undefined) mk.style.left = Math.max(0, Math.min(100, (st.v - r.min) / (r.max - r.min) * 100)) + "%";
    if (RUL.el) RUL.el.setAttribute("aria-valuenow", SH.buf);
  }
  function pressKey(k) {
    var st = stepState[SH.key];
    var dec = enKpa(SH.key) ? 1 : st.dec;
    if (k === "clear") { SH.buf = ""; SH.fresh = false; }
    else if (k === "back") { SH.buf = SH.fresh ? "" : SH.buf.slice(0, -1); SH.fresh = false; }
    else if (k === "sign") { SH.buf = SH.buf.charAt(0) === "-" ? SH.buf.slice(1) : "-" + SH.buf; SH.fresh = false; }
    else {
      if (SH.fresh) { SH.buf = st.max <= 0 ? "-" : ""; SH.fresh = false; }
      if (k === ".") {
        if (dec > 0 && SH.buf.indexOf(".") < 0) SH.buf = (SH.buf === "" || SH.buf === "-" ? SH.buf + "0" : SH.buf) + ".";
      } else {
        var parts = SH.buf.split(".");
        if (parts.length > 1 && parts[1].length >= dec) return;
        if (SH.buf.replace(/[-.]/g, "").length >= 5) return;
        SH.buf = (SH.buf === "0" ? "" : SH.buf === "-0" ? "-" : SH.buf) + k;
      }
    }
    commitBuf(false);
    renderSheet();
  }
  function quick(q) {
    var key = SH.key, st = stepState[key];
    var x = parseBuf();
    var base = (x === null || isNaN(x)) ? (st.v !== null && st.v !== undefined ? st.v : (st.blankStart !== undefined ? st.blankStart : RONDA_DEF[key])) : (enKpa(key) ? x * KPA : x);
    if (base === null || base === undefined || !isFinite(base)) base = Math.max(st.min, 0);
    var v = base + (enKpa(key) ? q * KPA : q);
    v = Math.max(st.min, Math.min(st.max, v));
    SH.buf = enKpa(key) ? (v / KPA).toFixed(1) : v.toFixed(st.dec);
    SH.fresh = false;
    commitBuf(false);
    renderSheet();
  }
  function navSheet(dir) {
    if (!commitBuf(true)) { renderSheet(); return; }
    var orden = ordenDe(SH.key), i = orden.indexOf(SH.key), n = orden[i + dir];
    if (!n) { closeSheet(); return; }
    SH.key = n; SH.fresh = true; SH.err = ""; SH.buf = bufFromState(n); SH.prev = stepState[n].v;
    renderSheet();
  }
  if (sheet) sheet.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    vibrar();
    if (b.classList.contains("sh-x")) { closeSheet(); return; }
    if (b.dataset.k !== undefined) { pressKey(b.dataset.k); return; }
    if (b.dataset.q !== undefined) { quick(parseFloat(b.dataset.q)); return; }
    if (b.dataset.nav) navSheet(b.dataset.nav === "prev" ? -1 : 1);
  });
  if (scrim) scrim.addEventListener("click", closeSheet);
  document.addEventListener("click", function (e) {
    var t = e.target.closest(".vt[data-edit]");
    if (t) openSheet(t.dataset.edit);
  });
  document.addEventListener("keydown", function (e) {
    if (sheet && !sheet.hidden) {
      if (/^[0-9]$/.test(e.key)) pressKey(e.key);
      else if (e.key === "," || e.key === ".") pressKey(".");
      else if (e.key === "Backspace") pressKey("back");
      else if (e.key === "-") pressKey("sign");
      else if (e.key === "Enter") navSheet(1);
      else if (e.key === "Escape") closeSheet();
      else return;
      e.preventDefault();
      return;
    }
    if (e.key === "Escape") {
      if (crisisEl && !crisisEl.hidden) closeCrisis();
      if (rMenu) rMenu.hidden = true;
    }
  });

  // ---- secciones de las pantallas de referencia ----
  function cleanTitle(h) {
    var c = h.cloneNode(true);
    $$(".pill", c).forEach(function (p) { p.parentNode.removeChild(p); });
    return c.textContent.split(" — ")[0].split("—")[0].trim();
  }
  function marcarExternos() {
    ["vv", "va", "anticoag", "escalas", "complicaciones"].forEach(function (name) {
      var c = screens[name] && screens[name].querySelector(".content");
      if (!c) return;
      $$("h3.rh", c).forEach(function (h) {
        if (!h.querySelector(".pill.elso")) return;
        h.classList.add("ext");
        var n = h.nextElementSibling;
        while (n && !n.matches("h3.rh, h2.h2")) { n.classList.add("ext"); n = n.nextElementSibling; }
      });
      $$("h4.rh4", c).forEach(function (h) {
        if (!h.querySelector(".pill.elso")) return;
        h.classList.add("ext");
        if (h.nextElementSibling) h.nextElementSibling.classList.add("ext");
      });
      $$(".dl-row, .note", c).forEach(function (r) { if (r.querySelector(".pill.elso")) r.classList.add("ext"); });
    });
  }
  function buildSecnav(name) {
    var scr = screens[name];
    var nav = scr && scr.querySelector("[data-secnav]");
    var content = scr && scr.querySelector(".content");
    if (!nav || !content) return;
    var hs = $$("h3.rh", content);
    var chips = hs.map(function (h) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = cleanTitle(h);
      if (h.classList.contains("ext")) b.classList.add("ext");
      b.addEventListener("click", function () {
        content.scrollTo({ top: Math.max(0, h.offsetTop - content.offsetTop - 10), behavior: "smooth" });
      });
      nav.appendChild(b);
      return b;
    });
    var actual = -1;
    function spy() {
      var y = content.scrollTop + 60, idx = 0;
      hs.forEach(function (h, i) { if (h.offsetParent !== null && h.offsetTop - content.offsetTop <= y) idx = i; });
      // Al final del todo, la última sección puede no llegar arriba: se marca su pestaña si se ve.
      if (content.scrollTop + content.clientHeight >= content.scrollHeight - 4) {
        for (var j = hs.length - 1; j > idx; j--) {
          if (hs[j].offsetParent !== null && hs[j].offsetTop - content.offsetTop < content.scrollTop + content.clientHeight) { idx = j; break; }
        }
      }
      if (idx === actual) return;
      actual = idx;
      chips.forEach(function (c, i) { c.classList.toggle("on", i === idx); });
      var c = chips[idx];
      if (c) nav.scrollTo({ left: Math.max(0, c.offsetLeft - 14), behavior: "smooth" });
    }
    content.addEventListener("scroll", spy, { passive: true });
    spy();
  }

  // ---- favoritos ----
  var FAV_INFO = {
    vv: { t: "ECMO VV", d: "Soporte respiratorio", tile: ".tile.vv", bg: "var(--accent-soft)", fg: "var(--accent)" },
    va: { t: "ECMO VA", d: "Soporte circulatorio", tile: ".tile.va", bg: "var(--va-soft)", fg: "var(--va)" },
    anticoag: { t: "Anticoagulación", d: "Heparina y hemoderivados", tile: ".tile.neutral", bg: "var(--surface-2)", fg: "var(--ink-2)" },
    escalas: { t: "Escalas", d: "Murray, APSS, SCAI, INTERMACS", tile: '.tile[data-go="escalas"]', bg: "var(--surface-2)", fg: "var(--ink-2)" },
    complicaciones: { t: "Complicaciones", d: "Emergencias y vigilancia diaria", tile: ".tile.warn", bg: "var(--warn-soft)", fg: "var(--warn)" },
    checklists: { t: "Checklists", d: "Material de transporte y canulación", tile: '.tile[data-go="checklists"]', bg: "var(--surface-2)", fg: "var(--ink-2)" },
    perlas: { t: "Perlas", d: "Vídeos y esquemas prácticos", tile: '.tile[data-go="perlas"]', bg: "var(--surface-2)", fg: "var(--ink-2)" }
  };
  function iconoDe(sel) { var t = document.querySelector(sel + " .tic"); return t ? t.innerHTML : ""; }
  function renderFavs() {
    var host = document.getElementById("fav-host"), grp = document.getElementById("fav-grp");
    var favs = S.favs.filter(function (k) { return FAV_INFO[k]; });
    if (host) {
      host.hidden = grp.hidden = !favs.length;
      host.innerHTML = favs.map(function (k) {
        var f = FAV_INFO[k];
        return '<button class="item" data-fav-go="' + k + '"><div class="ic" style="background:' + f.bg + ';color:' + f.fg + '">' + iconoDe(f.tile) + '</div>' +
          '<div class="tx"><div class="t">' + f.t + '</div><div class="d">' + f.d + '</div></div><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>';
      }).join("");
    }
    var ed = document.getElementById("fav-edit");
    if (ed) ed.innerHTML = favs.map(function (k) { return '<div><span>' + FAV_INFO[k].t + '</span><button type="button" data-fav-del="' + k + '">Quitar</button></div>'; }).join("");
    $$("[data-fav]").forEach(function (b) {
      var on = S.favs.indexOf(b.dataset.fav) > -1;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", on ? "Quitar de favoritos" : "Añadir a favoritos");
    });
  }
  document.addEventListener("click", function (e) {
    var f = e.target.closest("[data-fav]");
    if (f) {
      var k = f.dataset.fav, i = S.favs.indexOf(k);
      if (i > -1) S.favs.splice(i, 1); else S.favs.push(k);
      saveS(); renderFavs(); vibrar();
      return;
    }
    var g = e.target.closest("[data-fav-go]");
    if (g) { go(g.dataset.favGo); return; }
    var d = e.target.closest("[data-fav-del]");
    if (d) { S.favs = S.favs.filter(function (x) { return x !== d.dataset.favDel; }); saveS(); renderFavs(); }
  });

  // ---- buscador ----
  var SCREEN_T = { vv: "ECMO VV", va: "ECMO VA", anticoag: "Anticoagulación", complicaciones: "Complicaciones", escalas: "Escalas",
    checklists: "Checklists", perlas: "Perlas", datos: "Supervivencia", fuentes: "Fuentes", calc: "Calculadoras", ronda: "Ronda diaria" };
  var SCREEN_IC = { vv: ".tile.vv", va: ".tile.va", anticoag: ".tile.neutral", complicaciones: ".tile.warn", escalas: '.tile[data-go="escalas"]',
    checklists: '.tile[data-go="checklists"]', perlas: '.tile[data-go="perlas"]', calc: '.tile[data-go="calc"]', ronda: ".hero" };
  var SCREEN_CLS = { vv: "vv", va: "va", complicaciones: "comp" };
  var SYN = { harlequin: ["arlequin"], arlequin: ["harlequin"], sweep: ["barrido"], barrido: ["sweep"], antixa: ["anti-xa", "anticoagul"],
    weaning: ["destete"], destete: ["weaning"], chatter: ["cimbreo"], cimbreo: ["chatter"], lv: ["vi"], ecpr: ["rcp"], hit: ["4ts", "pf4"] };
  var IDX = null, lastRes = [];
  function normStr(s) {
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      out += c.length === 1 ? c : (c.charAt(0) || " ");
    }
    return out;
  }
  function textoHasta(el, stopSel) {
    var t = "", n = el.nextElementSibling;
    while (n && !n.matches(stopSel) && t.length < 600) { t += " " + textoDe(n); n = n.nextElementSibling; }
    return t.replace(/\s+/g, " ").trim();
  }
  function textoDe(el) { return (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim(); }
  function scrollA(el) {
    var c = el.closest(".content");
    if (!c) return;
    var y = el.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop - 10;
    c.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }
  function buildIndex() {
    IDX = [];
    ["vv", "va", "anticoag", "complicaciones", "escalas", "datos", "fuentes"].forEach(function (s) {
      var c = screens[s].querySelector(".content");
      if (!c) return;
      $$("h3.rh", c).forEach(function (h) { IDX.push({ s: s, p: SCREEN_T[s], t: cleanTitle(h), x: textoHasta(h, "h3.rh, h2.h2"), el: h }); });
      $$(".dl-row", c).forEach(function (r) {
        var k = r.querySelector(".dl-k"), v = r.querySelector(".dl-v");
        var prevH = null, n = r.closest(".deflist");
        while (n && (n = n.previousElementSibling)) { if (n.matches("h3.rh")) { prevH = n; break; } }
        if (k) IDX.push({ s: s, p: SCREEN_T[s] + (prevH ? " › " + cleanTitle(prevH) : ""), t: cleanTitle(k), x: v ? textoDe(v) : "", el: r });
      });
      $$(".kc", c).forEach(function (r) { IDX.push({ s: s, p: SCREEN_T[s] + " › Indicaciones", t: r.querySelector(".kv").textContent, x: r.textContent, el: r }); });
      $$(".steps", c).forEach(function (st) {
        var h = st.querySelector(".st-h");
        var e = { s: s, p: SCREEN_T[s] + (st.classList.contains("em-src") ? " › emergencia" : ""), t: h ? h.textContent : "", x: st.textContent.replace(/\s+/g, " "), el: st };
        if (st.classList.contains("em-src")) { e.crisis = $$("#screen-complicaciones .em-src").indexOf(st); e.el = null; }
        IDX.push(e);
      });
    });
    $$("#screen-checklists .cl-card").forEach(function (card) {
      var title = card.querySelector("h3").textContent;
      $$(".cl-item", card).forEach(function (it) { IDX.push({ s: "checklists", p: "Checklists › " + title, t: it.textContent, x: "", el: it }); });
    });
    [["criterios", "Indicación de ECMO VV", "Murray, APSS, PaFiO₂, índice de oxigenación y criterios ELSO, CESAR, ECMOnet, EOLIA"],
      ["recirc", "Recirculación", "Fórmula del protocolo para VV con SpreO₂, SpostO₂ y SvO₂"],
      ["hep", "Heparina", "Bolo de canulación, preparación de la perfusión, dosis actual y bivalirudina"],
      ["resp", "RESP score", "Supervivencia en ECMO respiratorio (Schmidt 2014)"],
      ["save", "SAVE score", "Supervivencia en ECMO VA (Schmidt 2015)"]].forEach(function (c) {
      IDX.push({ s: "calc", tab: c[0], p: "Calculadora", t: c[1], x: c[2] });
    });
    (PERLAS || []).forEach(function (pl) {
      IDX.push({ s: "perlas", perla: pl.id, p: "Perlas › " + pl.cat, t: pl.titulo, x: pl.resumen + " " + (pl.puntos || []).join(" ").replace(/<[^>]+>/g, "") });
    });
    IDX.forEach(function (e) { e.n = normStr(e.p + " " + e.t + " " + e.x); e.nt = normStr(e.t); });
  }
  function variantes(w) { return [w].concat(SYN[w] || []); }
  function buscar(q) {
    if (!IDX) buildIndex();
    var words = normStr(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    var din = [];
    if (ultimaRonda) ultimaRonda.findings.forEach(function (f) {
      if (f.sev !== "crit" && f.sev !== "warn") return;
      var e = { s: "ronda", p: "Ronda diaria › aviso", t: f.t, x: f.m, el: document.getElementById("r-avisos") };
      e.n = normStr(e.p + " " + e.t + " " + e.x); e.nt = normStr(e.t);
      din.push(e);
    });
    var out = [];
    IDX.concat(din).forEach(function (e) {
      if (e.el && e.el.closest && e.el.closest(".ext") && S.fuentes === "chub") return;
      var score = 0;
      for (var i = 0; i < words.length; i++) {
        var vs = variantes(words[i]), hit = false;
        for (var j = 0; j < vs.length; j++) {
          if (e.nt.indexOf(vs[j]) > -1) { score += 3; hit = true; break; }
          if (e.n.indexOf(vs[j]) > -1) { score += 1; hit = true; break; }
        }
        if (!hit) return;
      }
      out.push({ e: e, sc: score });
    });
    out.sort(function (a, b) { return b.sc - a.sc; });
    return out.slice(0, 40).map(function (o) { return o.e; });
  }
  function resaltar(text, words, recorte) {
    var n = normStr(text), idx = -1, len = 0;
    words.forEach(function (w) {
      variantes(w).forEach(function (v) { var k = n.indexOf(v); if (k > -1 && (idx < 0 || k < idx)) { idx = k; len = v.length; } });
    });
    var start = 0, pre = "";
    if (recorte && idx > 70) { start = text.lastIndexOf(" ", idx - 50); if (start < 0) start = idx - 50; pre = "…"; }
    var end = recorte ? Math.min(text.length, start + 170) : text.length;
    var post = end < text.length ? "…" : "";
    if (idx < 0 || idx >= end) return pre + esc(text.slice(start, end)) + post;
    return pre + esc(text.slice(start, idx)) + "<mark>" + esc(text.slice(idx, idx + len)) + "</mark>" + esc(text.slice(idx + len, end)) + post;
  }
  var RECIENTES_KEY = "ecmo_busquedas";
  function recientes() { try { return JSON.parse(ls(RECIENTES_KEY) || "[]"); } catch (e) { return []; } }
  function renderSearch() {
    var q = document.getElementById("q"), host = document.getElementById("q-host");
    if (!q || !host) return;
    var v = q.value.trim();
    if (!v) {
      var rec = recientes();
      host.innerHTML = (rec.length ? '<div class="grp">Búsquedas recientes</div><div class="qchips">' + rec.map(function (r) { return '<button type="button" data-q-rec="' + esc(r) + '">' + esc(r) + '</button>'; }).join("") + '</div>' : "") +
        '<div class="grp">También encuentra</div><p class="qempty">Sin tildes ni mayúsculas, y con sinónimos: «harlequin» → Arlequín · «sweep» → gas de barrido · «weaning» → destete · «chatter» → cimbreo.</p>';
      return;
    }
    lastRes = buscar(v);
    var words = normStr(v).split(/\s+/).filter(Boolean);
    host.innerHTML = '<div class="qcount">' + lastRes.length + (lastRes.length === 1 ? " resultado" : " resultados") + '</div>' +
      (lastRes.length ? '<div class="qres">' + lastRes.map(function (e, i) {
        return '<button type="button" class="qr" data-r="' + i + '"><span class="ic ' + (SCREEN_CLS[e.s] || "") + '">' + (SCREEN_IC[e.s] ? iconoHero(SCREEN_IC[e.s]) : "") + '</span>' +
          '<span class="tx"><span class="p">' + esc(e.p) + '</span><div class="t">' + resaltar(e.t, words, false) + '</div>' + (e.x ? '<div class="x">' + resaltar(e.x, words, true) + '</div>' : "") + '</span></button>';
      }).join("") + '</div>' : '<p class="qempty">Nada para «' + esc(v) + '». Prueba con otra palabra o un sinónimo.</p>');
  }
  function iconoHero(sel) { var el = document.querySelector(sel + " .tic, " + sel + " .hic"); return el ? el.innerHTML : ""; }
  function irA(e) {
    var q = document.getElementById("q").value.trim();
    if (q) { var rec = recientes().filter(function (r) { return r !== q; }); rec.unshift(q); ls(RECIENTES_KEY, JSON.stringify(rec.slice(0, 6))); }
    go(e.s);
    if (e.tab) selectCalcTab(e.tab);
    if (e.crisis !== undefined && e.crisis > -1) { openCrisis(e.crisis); return; }
    if (e.perla) { abrirPerla(e.perla); return; }
    if (e.el) setTimeout(function () {
      scrollA(e.el);
      e.el.classList.remove("flash"); void e.el.offsetWidth; e.el.classList.add("flash");
    }, 80);
  }
  var qInput = document.getElementById("q");
  if (qInput) qInput.addEventListener("input", renderSearch);
  var qHost = document.getElementById("q-host");
  if (qHost) qHost.addEventListener("click", function (e) {
    var r = e.target.closest("[data-r]");
    if (r) { irA(lastRes[+r.dataset.r]); return; }
    var c = e.target.closest("[data-q-rec]");
    if (c) { qInput.value = c.dataset.qRec; renderSearch(); }
  });
  var homeSearch = document.getElementById("home-search");
  if (homeSearch) homeSearch.addEventListener("focus", function () {
    homeSearch.blur();
    go("buscar");
  });
  document.addEventListener("click", function (e) { if (e.target.closest("[data-find]")) go("buscar"); });

  // ---- visor de esquemas de canulación ----
  var ESQUEMAS = {
    "vv-femoro-femoral": { t: "Fémoro-femoral", k: "ECMO VV · esquema de canulación",
      cap: "<b>Retorno</b> por femoral derecha, con la punta dentro de la aurícula derecha y orientada hacia la tricúspide. <b>Drenaje</b> multiperforado por femoral izquierda, con la punta en la VCI intrahepática. Confirmar la posición con ecografía y Rx." },
    "vv-femoro-yugular": { t: "Fémoro-yugular", k: "ECMO VV · esquema de canulación",
      cap: "<b>Retorno</b> por yugular interna derecha, con la punta dentro de la aurícula derecha y orientada hacia la tricúspide. <b>Drenaje</b> multiperforado por femoral derecha, con la punta en la VCI intrahepática. Confirmar la posición con ecografía y Rx." },
    "va-femoro-femoral": { t: "Fémoro-femoral", k: "ECMO VA · esquema de canulación",
      cap: "<b>Drenaje</b> multiperforado por femoral izquierda, con la punta en la aurícula derecha. <b>Retorno</b> corto en la femoral común derecha: flujo retrógrado por la aorta. <b>Perfusión distal</b> en la femoral superficial desde el inicio." },
    "va-femoro-axilar": { t: "Fémoro-axilar", k: "ECMO VA · esquema de canulación",
      cap: "<b>Drenaje</b> multiperforado por femoral, con la punta en la aurícula derecha. <b>Retorno</b> en la arteria axilar izquierda, directo o con injerto, hacia el arco aórtico: flujo anterógrado en la aorta. Sin acceso femoral o si hace falta flujo anterógrado." }
  };
  var viewerEl = document.getElementById("viewer");
  function abrirEsquema(k) {
    var e = ESQUEMAS[k];
    if (!e || !viewerEl) return;
    viewerEl.innerHTML = '<div class="vh"><button type="button" class="back" data-vclose aria-label="Cerrar">' + SVG_CHEV_L + '</button><div style="flex:1 1 auto;min-width:0"><div class="k">' + e.k + '</div><div class="t" id="viewer-t">' + e.t + '</div></div></div>' +
      '<div class="vb"><div class="fig" id="viewer-fig" aria-busy="true"></div><p class="cap">' + e.cap + '</p></div>';
    viewerEl.hidden = false; void viewerEl.offsetWidth; viewerEl.classList.add("on");
    capaAbierta("esquema", cerrarEsquema);
    var f = document.getElementById("viewer-fig"), img = new Image();
    img.alt = "Esquema de canulación " + e.t.toLowerCase();
    img.onload = function () { f.removeAttribute("aria-busy"); };
    img.onerror = function () { f.innerHTML = '<p class="cap">No se ha podido cargar el esquema sin conexión.</p>'; };
    img.src = "img/" + k + ".svg";
    f.appendChild(img);
  }
  function cerrarEsquema() {
    if (!viewerEl || viewerEl.hidden) return;
    $$("video", viewerEl).forEach(function (v) { try { v.pause(); } catch (e) { /* sin vídeo */ } });
    viewerEl.classList.remove("on");
    setTimeout(function () { if (!viewerEl.classList.contains("on")) viewerEl.hidden = true; }, 220);
    capaCerrada("esquema");
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-esquema]");
    if (b) { abrirEsquema(b.dataset.esquema); return; }
    if (e.target.closest("[data-vclose]")) cerrarEsquema();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarEsquema(); });

  // ---- perlas: vídeos, GIF y esquemas prácticos (perlas/perlas.json; ver perlas/LEEME.md) ----
  var PERLAS = null, perlaCat = "";
  var SVG_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
  var SVG_FILM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.2 9.4v5.2l4.4-2.6z" fill="currentColor"/></svg>';
  function cargarPerlas() {
    if (PERLAS) { renderPerlas(); return; }
    fetch("perlas/perlas.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      PERLAS = (d && d.perlas) || [];
      IDX = null;
      renderPerlas();
    }).catch(function () {
      var host = document.getElementById("perlas-host");
      if (host && !PERLAS) host.innerHTML = '<p class="ref-lede">No se han podido cargar las perlas. Ábrelas una vez con conexión para tenerlas sin ella.</p>';
    });
  }
  function estadoPerla(pl) {
    var m = pl.media;
    if (!m) return '<span class="pst pend">Vídeo pendiente' + (/propuesta/i.test(pl.fuente || "") ? " · propuesta" : "") + '</span>';
    return '<span class="pst ok">' + (m.tipo === "video" ? "Vídeo" : m.tipo === "gif" ? "GIF" : "Esquema animado") + '</span>';
  }
  function miniaturaPerla(pl) {
    var m = pl.media;
    if (!m) return '<span class="pthumb pend">' + SVG_FILM + '</span>';
    var src = m.tipo === "video" ? m.poster : m.src;
    return '<span class="pthumb">' + (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : SVG_FILM) + '<span class="pl">' + SVG_PLAY + '</span></span>';
  }
  function renderPerlas() {
    var host = document.getElementById("perlas-host"), chips = document.getElementById("perlas-chips");
    if (!host || !PERLAS) return;
    var cats = [];
    PERLAS.forEach(function (pl) { if (pl.cat && cats.indexOf(pl.cat) < 0) cats.push(pl.cat); });
    if (cats.indexOf(perlaCat) < 0) perlaCat = "";
    if (chips) chips.hidden = cats.length < 2;
    if (chips) chips.innerHTML = [""].concat(cats).map(function (c) {
      return '<button type="button" data-pcat="' + esc(c) + '"' + (c === perlaCat ? ' class="on"' : "") + '>' + (c ? esc(c) : "Todas") + '</button>';
    }).join("");
    var lista = PERLAS.filter(function (pl) { return !perlaCat || pl.cat === perlaCat; });
    host.innerHTML = lista.length ? '<div class="plist">' + lista.map(function (pl) {
      return '<button type="button" class="pcard" data-perla="' + esc(pl.id) + '">' + miniaturaPerla(pl) +
        '<span class="ptx"><span class="pcat">' + esc(pl.cat || "") + '</span><b>' + esc(pl.titulo) + '</b><span class="pres">' + esc(pl.resumen || "") + '</span>' + estadoPerla(pl) + '</span></button>';
    }).join("") + '</div>' : '<p class="ref-lede">Todavía no hay perlas en esta categoría.</p>';
  }
  function abrirPerla(id) {
    if (!PERLAS) { cargarPerlas(); return; }
    var pl = PERLAS.filter(function (x) { return x.id === id; })[0];
    if (!pl || !viewerEl) return;
    var m = pl.media, fig;
    if (!m) fig = '<div class="pend-media">' + SVG_FILM + '<p>Vídeo pendiente de grabar.</p></div>';
    else if (m.tipo === "video") fig = '<video src="' + esc(m.src) + '"' + (m.poster ? ' poster="' + esc(m.poster) + '"' : "") + ' controls autoplay muted loop playsinline preload="metadata"></video>';
    else fig = '<img src="' + esc(m.src) + '" alt="' + esc(pl.titulo) + '">';
    viewerEl.innerHTML = '<div class="vh"><button type="button" class="back" data-vclose aria-label="Cerrar">' + SVG_CHEV_L + '</button><div style="flex:1 1 auto;min-width:0"><div class="k">Perla · ' + esc(pl.cat || "") + '</div><div class="t" id="viewer-t">' + esc(pl.titulo) + '</div></div></div>' +
      '<div class="vb"><div class="fig' + (m && m.tipo === "video" ? " vid" : "") + (m ? "" : " pend") + '">' + fig + '</div>' +
      '<div class="vpts"><h4>Puntos clave</h4><ul class="lst">' + (pl.puntos || []).map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul>' +
      (pl.fuente ? '<p class="vsrc">' + esc(pl.fuente) + '</p>' : "") + '</div></div>';
    viewerEl.hidden = false; void viewerEl.offsetWidth; viewerEl.classList.add("on");
    capaAbierta("esquema", cerrarEsquema);
  }
  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-pcat]");
    if (c) { perlaCat = c.dataset.pcat; renderPerlas(); return; }
    var b = e.target.closest("[data-perla]");
    if (b) abrirPerla(b.dataset.perla);
  });
  cargarPerlas();

  // ---- emergencias y modo crisis ----
  var EM_ICONS = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8" cy="9" r="3"/><circle cx="16" cy="15" r="4"/><circle cx="17" cy="6" r="1.5"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4M12 16h.01"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 14 10"/><path d="M14 10l2-2a3 3 0 0 1 4 4l-2 2"/><path d="M9 9l6 6"/></svg>'
  ];
  function buildEmergencias() {
    var host = document.getElementById("em-grid");
    if (!host) return;
    host.innerHTML = $$("#screen-complicaciones .em-src").map(function (st, i) {
      var t = st.querySelector(".st-h").textContent, n = $$("li", st).length;
      return '<button type="button" class="em" data-crisis="' + i + '"><span class="ic">' + (EM_ICONS[i] || EM_ICONS[2]) + '</span><span><span class="t">' + esc(t) + '</span><span class="n">' + n + ' pasos</span></span></button>';
    }).join("");
  }
  var crisisEl = document.getElementById("crisis");
  var CR = { steps: [], i: 0, t0: 0, timer: null, lock: null, title: "", sig: "" };
  function reloj() {
    var s = Math.floor((Date.now() - CR.t0) / 1000);
    return ("0" + Math.floor(s / 60)).slice(-2) + ":" + ("0" + (s % 60)).slice(-2);
  }
  function plano(html) { var d = document.createElement("div"); d.innerHTML = html; return d.textContent; }
  function renderCrisis() {
    var n = CR.steps.length, i = CR.i, fin = i >= n;
    var prog = CR.steps.map(function (s, k) { return '<i class="' + (k < i ? "d" : k === i ? "c" : "") + '"></i>'; }).join("");
    var hechos = CR.steps.slice(0, i).map(function (s) { return '<div><i>' + SVG_OK + '</i>' + esc(plano(s)) + '</div>'; }).join("");
    var main = fin
      ? '<div class="cr-n">Secuencia completada</div><div class="cr-step">Todos los pasos hechos en ' + reloj() + '.</div>'
      : '<div class="cr-n">Paso ' + (i + 1) + ' de ' + n + '</div><div class="cr-step">' + CR.steps[i] + '</div>' +
        (i + 1 < n ? '<div class="cr-next"><span class="k">Después</span><span class="v">' + (i + 2) + ' · ' + esc(plano(CR.steps[i + 1])) + '</span></div>' : "");
    crisisEl.innerHTML = '<div class="cr-top"><button type="button" class="cr-x" data-cr="x" aria-label="Salir del modo crisis">' + SVG_X + '</button>' +
      '<div class="tx"><div class="cr-k">Emergencia</div><div class="cr-t">' + esc(CR.title) + '</div></div>' +
      '<div class="cr-clock"><b id="cr-clock">' + reloj() + '</b><span>desde el inicio</span></div></div>' +
      '<div class="cr-prog">' + prog + '</div>' + (CR.sig ? '<div class="cr-sig">' + esc(CR.sig) + '</div>' : "") +
      (hechos ? '<div class="cr-done">' + hechos + '</div>' : "") +
      '<div class="cr-main">' + main + '</div>' +
      '<div class="cr-acts"><button type="button" class="bk" data-cr="bk"' + (i === 0 ? " disabled" : "") + '>Atrás</button>' +
      (fin ? '<button type="button" class="ok" data-cr="x">' + SVG_OK + 'Cerrar</button>'
        : '<button type="button" class="ok" data-cr="ok">' + SVG_OK + (i + 1 < n ? "Hecho · siguiente" : "Hecho · terminar") + '</button>') + '</div>';
  }
  function openCrisis(idx) {
    var src = $$("#screen-complicaciones .em-src")[idx];
    if (!src) return;
    CR.title = src.querySelector(".st-h").textContent;
    var sig = src.querySelector(".st-sig");
    CR.sig = sig ? sig.textContent : "";
    CR.steps = $$("li", src).map(function (li) { return li.innerHTML; });
    CR.i = 0; CR.t0 = Date.now();
    renderCrisis();
    crisisEl.hidden = false; void crisisEl.offsetWidth; crisisEl.classList.add("on");
    capaAbierta("crisis", closeCrisis);
    clearInterval(CR.timer);
    CR.timer = setInterval(function () { var c = document.getElementById("cr-clock"); if (c) c.textContent = reloj(); }, 1000);
    if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request("screen").then(function (l) { CR.lock = l; }).catch(function () { /* sin bloqueo */ });
    vibrar();
  }
  function closeCrisis() {
    crisisEl.classList.remove("on");
    clearInterval(CR.timer);
    if (CR.lock) { try { CR.lock.release(); } catch (e) { /* ya liberado */ } CR.lock = null; }
    setTimeout(function () { if (!crisisEl.classList.contains("on")) crisisEl.hidden = true; }, 220);
    capaCerrada("crisis");
  }
  if (crisisEl) crisisEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-cr]");
    if (!b) return;
    vibrar();
    if (b.dataset.cr === "x") closeCrisis();
    else if (b.dataset.cr === "bk") { CR.i = Math.max(0, CR.i - 1); renderCrisis(); }
    else if (b.dataset.cr === "ok") { CR.i++; renderCrisis(); }
  });
  document.addEventListener("click", function (e) { var b = e.target.closest("[data-crisis]"); if (b) openCrisis(+b.dataset.crisis); });

  // ---- calculadoras: segmentados, casillas, barra de resultado ----
  var OPT_CORTA = { "Menos de 3 horas": "< 3 h", "Entre 3 y 6 horas": "3–6 h", "Más de 6 horas": "> 6 h" };
  function segmentar(sel) {
    var opts = $$("option", sel);
    var cortas = opts.every(function (o) { return o.textContent.trim().length <= 3; });
    if (!(opts.length <= 4 || cortas)) { sel.removeAttribute("style"); sel.classList.add("nice"); return; }
    sel.classList.add("segsel");
    var seg = document.createElement("div");
    seg.className = "segc";
    var quitarAnios = opts.every(function (o) { return / años$/.test(o.textContent); });
    opts.forEach(function (o, i) {
      var b = document.createElement("button");
      b.type = "button";
      var t = o.textContent.trim();
      if (quitarAnios) t = t.replace(/ años$/, "");
      b.textContent = OPT_CORTA[t] || t;
      b.dataset.i = i;
      seg.appendChild(b);
    });
    if (quitarAnios) { var lab = sel.parentNode.querySelector("label"); if (lab && !/años/.test(lab.textContent)) lab.textContent += " (años)"; }
    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      sel.selectedIndex = +b.dataset.i;
      syncSeg(sel);
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      vibrar();
    });
    sel.parentNode.insertBefore(seg, sel.nextSibling);
    sel._seg = seg;
    syncSeg(sel);
  }
  function syncSeg(sel) {
    if (!sel || !sel._seg) return;
    $$("button", sel._seg).forEach(function (b, i) {
      b.classList.toggle("on", i === sel.selectedIndex);
      b.setAttribute("aria-pressed", i === sel.selectedIndex ? "true" : "false");
    });
  }
  function agruparChecks(root) {
    $$("label.chk", root).forEach(function (l) {
      var sp = l.querySelector("span");
      var m = sp && sp.textContent.match(/\s*\(([+−-]\s?\d+)\)\s*$/);
      if (m) {
        sp.textContent = sp.textContent.slice(0, m.index);
        l.insertAdjacentHTML("beforeend", '<span class="pts">' + m[1].replace("-", "−") + '</span>');
      }
      var prev = l.previousElementSibling;
      if (prev && prev.classList.contains("tgroup")) prev.appendChild(l);
      else {
        var g = document.createElement("div");
        g.className = "tgroup";
        l.parentNode.insertBefore(g, l);
        g.appendChild(l);
      }
    });
  }
  function selectCalcTab(t) {
    calcTab = t;
    $$("#calc-chips button").forEach(function (b) { b.classList.toggle("on", b.dataset.tab === t); });
    CALC_TABS.forEach(function (x) { var p = document.getElementById("pane-" + x); if (p) p.classList.toggle("on", x === t); });
    var c = document.querySelector("#screen-calc .content");
    if (c) c.scrollTop = 0;
    var chip = document.querySelector('#calc-chips button[data-tab="' + t + '"]');
    if (chip && chip.scrollIntoView) chip.scrollIntoView({ block: "nearest", inline: "nearest" });
    updateResbar();
  }
  var calcTab = "criterios", LAST_CRIT = null, resbarTxt = "";
  function updateResbar() {
    var r = document.getElementById("calc-res");
    if (!r) return;
    var cells = null;
    if (calcTab === "criterios" && LAST_CRIT) {
      cells = [["P/F", isFinite(LAST_CRIT.pf) ? n0(LAST_CRIT.pf) : "—"], ["Murray", isFinite(LAST_CRIT.murray) ? n2(LAST_CRIT.murray) : "—"], ["APSS", isFinite(LAST_CRIT.ap) ? LAST_CRIT.ap + "/9" : "—"]];
      resbarTxt = "PaO₂/FiO₂ " + cells[0][1] + " · Murray " + cells[1][1] + " · APSS " + cells[2][1];
    } else if (calcTab === "resp" || calcTab === "save") {
      var p = calcTab;
      cells = [["Puntuación", $("#" + p + "-pts").textContent], ["Clase", $("#" + p + "-cls").textContent], ["Supervivencia", $("#" + p + "-surv").textContent]];
      resbarTxt = (p === "resp" ? "RESP" : "SAVE") + " " + cells[0][1] + " · clase " + cells[1][1] + " · supervivencia al alta " + cells[2][1];
    }
    r.hidden = !cells;
    if (!cells) return;
    r.innerHTML = cells.map(function (c, i) {
      return (i ? '<span class="bar"></span>' : "") + '<div class="c' + (i === cells.length - 1 ? " f" : "") + '"><span class="k">' + c[0] + '</span><span class="v">' + c[1] + '</span></div>';
    }).join("") + '<button type="button" class="cp" aria-label="Copiar resultado">' + SVG_COPY + '</button>';
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("#calc-res .cp");
    if (!b) return;
    copiarAlPortapapeles(resbarTxt).then(function () { b.innerHTML = SVG_OK; setTimeout(function () { b.innerHTML = SVG_COPY; }, 1400); }).catch(function () { /* sin portapapeles */ });
  });
  var ULT_KEY = "ecmo_ult_score";
  function guardarClase(tipo, cls) { var o = {}; try { o = JSON.parse(ls(ULT_KEY) || "{}") || {}; } catch (e) { o = {}; } o[tipo] = cls; ls(ULT_KEY, JSON.stringify(o)); }
  function leerClase(tipo) { try { return (JSON.parse(ls(ULT_KEY) || "{}") || {})[tipo] || null; } catch (e) { return null; } }
  function initCalc() {
    $$("#screen-calc select, #screen-ronda select#r-sangrado").forEach(segmentar);
    agruparChecks(document.getElementById("screen-calc"));
    $$("#screen-calc h4[style]").forEach(function (h) { h.removeAttribute("style"); h.className = "sublbl"; });
    ["resp", "save"].forEach(function (p) {
      var h = document.querySelector("#pane-" + p + " .card h3");
      if (!h) return;
      h.insertAdjacentHTML("beforeend", '<button type="button" class="reset" data-reset="' + p + '">Reiniciar</button>');
      $$("#pane-" + p + " select, #pane-" + p + " input[type=checkbox]").forEach(function (el) {
        el.addEventListener("change", function () { guardarClase(p, $("#" + p + "-cls").textContent); });
      });
    });
    var bar = document.createElement("div");
    bar.className = "resbar"; bar.id = "calc-res"; bar.hidden = true;
    var tb = document.querySelector("#screen-calc .tabbar");
    tb.parentNode.insertBefore(bar, tb);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-reset]");
    if (!b) return;
    var p = b.dataset.reset;
    $$("#pane-" + p + " select").forEach(function (s) { s.selectedIndex = 0; syncSeg(s); });
    $$("#pane-" + p + " input[type=checkbox]").forEach(function (c) { c.checked = false; });
    if (p === "resp") calcResp(); else calcSave();
  });

  // ---- supervivencia ----
  // Cifras agregadas del registro de llamadas del programa (solo recuentos,
  // medianas y tasas; ninguna fila de paciente). Actualizar a mano en cada corte.
  var PROGRAMA = {
    corte: "02/10/2026",
    activaciones: 89,
    porAnio: [["2024", 18], ["2025", 35], ["2026", 36, true]],
    canulados: 47,
    tipos: [["VV", 47], ["VA", 29], ["DAC (donación)", 10], ["VAV híbrida", 3]],
    superv: { fav: 30, n: 37, ic: [65.8, 90.5] },
    supervTipo: [["VV", 22, 26, [66.5, 93.9]], ["VA", 8, 11, [43.4, 90.3]]],
    diasEcmo: { med: 8, p25: 2, p75: 18 },
    salidas: 57
  };
  function renderPrograma() {
    var host = document.getElementById("prog-host");
    if (!host) return;
    var P = PROGRAMA, pct = Math.round(P.superv.fav / P.superv.n * 100);
    var maxA = Math.max.apply(null, P.porAnio.map(function (a) { return a[1]; }));
    var maxT = P.tipos[0][1];
    var TCOL = ["var(--accent)", "var(--va)", "var(--c-cir)", "var(--tools)"];
    host.innerHTML = '<div><h3 class="ch">Programa ECMO CHUB</h3><p class="cap" style="margin:2px 0 0">Registro de llamadas del equipo · corte ' + P.corte + '</p></div>' +
      '<div class="kpis">' +
      '<div class="kpi"><span class="k">Activaciones</span><span class="v">' + P.activaciones + '</span><span class="s">' + P.salidas + ' con salida del equipo</span></div>' +
      '<div class="kpi"><span class="k">Canulaciones</span><span class="v">' + P.canulados + '</span><span class="s">' + Math.round(P.canulados / P.activaciones * 100) + ' % de las activaciones</span></div>' +
      '<div class="kpi"><span class="k">Supervivencia en UCI</span><span class="v">' + pct + ' %</span><span class="s">' + P.superv.fav + ' de ' + P.superv.n + ' · IC95 ' + Math.round(P.superv.ic[0]) + '–' + Math.round(P.superv.ic[1]) + '</span></div>' +
      '<div class="kpi"><span class="k">Días de ECMO</span><span class="v">' + P.diasEcmo.med + '</span><span class="s">mediana · RIC ' + P.diasEcmo.p25 + '–' + P.diasEcmo.p75 + '</span></div></div>' +
      '<div class="sv-sub">Activaciones por año</div><div class="yr">' + P.porAnio.map(function (a) {
        return '<div class="c' + (a[2] ? " parcial" : "") + '"><span class="n">' + a[1] + '</span><span class="b" style="height:' + Math.max(4, a[1] / maxA * 80) + 'px"></span><span class="a">' + a[0] + (a[2] ? " *" : "") + '</span></div>';
      }).join("") + '</div>' +
      '<div class="sv-sub">Activaciones por tipo de soporte</div>' + P.tipos.map(function (t, i) {
        return '<div class="br"><div class="h"><i style="background:' + TCOL[i] + '"></i>' + t[0] + '<b>' + t[1] + '</b></div><div class="tr"><span style="width:' + (t[1] / maxT * 100) + '%;background:' + TCOL[i] + '"></span></div></div>';
      }).join("") +
      '<div class="sv-sub">Supervivencia en UCI por modalidad</div>' + P.supervTipo.map(function (t, i) {
        var p = Math.round(t[1] / t[2] * 100), c = TCOL[i];
        return '<div class="br"><div class="h"><i style="background:' + c + '"></i>' + t[0] + ' <span style="color:var(--ink-3);font-size:12.5px">' + t[1] + ' de ' + t[2] + '</span><b>' + p + ' %</b></div>' +
          '<div class="ci"><span class="rg" style="left:' + t[3][0] + '%;width:' + (t[3][1] - t[3][0]) + '%;background:' + c + '"></span><span class="pt" style="left:' + p + '%;background:' + c + '"></span></div>' +
          '<div class="n">IC95 ' + Math.round(t[3][0]) + '–' + Math.round(t[3][1]) + ' %</div></div>';
      }).join("") +
      '<p class="cap">* 2026 hasta el ' + P.corte + '. Supervivencia al alta de UCI de los canulados para soporte con desenlace conocido. Con series cortas los intervalos son anchos, y no es comparable sin más con ELSO: depende de a quién se canula.</p>';
  }
  var MOD_COL = ["var(--accent)", "var(--va)", "var(--tools)"];
  var elsoG = 0, scoreS = 0;
  function renderSurv() {
    var g = ELSO[elsoG], host = document.getElementById("elso-host");
    if (!host) return;
    renderPrograma();
    document.getElementById("elso-cap").textContent = g.title + " · " + g.cap.replace("Registro ELSO, ", "");
    host.innerHTML = g.rows.map(function (r, i) {
      return '<div class="br"><div class="h"><i style="background:' + MOD_COL[i] + '"></i>' + r.label + '<b>' + r.value + ' %</b></div>' +
        '<div class="tr"><span style="width:' + r.value + '%;background:' + MOD_COL[i] + '"></span></div><div class="n">' + r.n + '</div></div>';
    }).join("");
    var sc = SCORES[scoreS], tipo = scoreS ? "save" : "resp", mia = leerClase(tipo);
    document.getElementById("score-host").innerHTML = sc.rows.map(function (r) {
      var cls = r.label.split(" · ")[0];
      return '<div class="clr' + (cls === mia ? " me" : "") + '"><span class="k">' + cls + '</span><span class="tr"><span style="width:' + r.value + '%"></span></span><span class="v">' + r.value + ' %</span></div>';
    }).join("");
    document.getElementById("score-cap").innerHTML = "Clases: " + sc.rows.map(function (r) { return r.label; }).join(" · ") + ". " + (scoreS ? "Schmidt, Eur Heart J 2015." : "Schmidt, AJRCCM 2014.") +
      (mia ? " Tu última puntuación: <b>clase " + mia + "</b>." : " Calcula el " + (scoreS ? "SAVE" : "RESP") + " en Calculadoras para marcar tu clase.");
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("#elso-seg button");
    if (a) { elsoG = +a.dataset.g; $$("#elso-seg button").forEach(function (b) { b.classList.toggle("on", b === a); }); renderSurv(); return; }
    var s = e.target.closest("#score-seg button");
    if (s) { scoreS = +s.dataset.s; $$("#score-seg button").forEach(function (b) { b.classList.toggle("on", b === s); }); renderSurv(); }
  });

  // ---- ajustes ----
  function syncAjustes() {
    $$("#screen-ajustes .segc[data-set]").forEach(function (seg) {
      $$("button", seg).forEach(function (b) { b.classList.toggle("on", String(S[seg.dataset.set]) === b.dataset.v); });
    });
    $$("#screen-ajustes input[data-set]").forEach(function (inp) {
      var k = inp.dataset.set;
      if (inp.type === "checkbox") inp.checked = !!S[k]; else if (document.activeElement !== inp) inp.value = S[k];
    });
  }
  function onAjuste(k) {
    saveS();
    if (k === "tema" || k === "letra" || k === "densidad" || k === "fuentes") applyAjustes();
    if (k === "gases") { Object.keys(FIELD_META).forEach(refreshStepOutputs); ronda(); calcCriterios(); }
    if (k === "boxes") buildBoxes();
    if (k === "recordar") { if (!S.recordar) ls(RONDA_LS, ""); else { marcarEditada(); guardarRonda(); } updateHero(); }
    syncAjustes();
  }
  function initAjustes() {
    $$("#screen-ajustes .segc[data-set]").forEach(function (seg) {
      seg.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        S[seg.dataset.set] = b.dataset.v;
        vibrar();
        onAjuste(seg.dataset.set);
      });
    });
    $$("#screen-ajustes input[data-set]").forEach(function (inp) {
      var k = inp.dataset.set;
      inp.addEventListener(inp.type === "text" || inp.type === "range" ? "input" : "change", function () {
        if (inp.type === "checkbox") S[k] = inp.checked;
        else if (inp.type === "range") S[k] = +inp.value;
        else if (inp.type === "number") S[k] = Math.max(1, Math.min(40, parseInt(inp.value, 10) || 30));
        else S[k] = inp.value.trim();
        onAjuste(k);
      });
    });
    syncAjustes();
  }

  function compartirInforme(id) {
    var inf = getInformes().filter(function (x) { return x.id === id; })[0];
    if (!inf) return;
    var texto = textoPlanoInforme(inf);
    if (navigator.share) navigator.share({ title: tituloInforme(inf), text: texto }).catch(function () { /* cancelado */ });
    else copiarAlPortapapeles(texto).then(function () { window.alert("Este navegador no permite compartir: el informe se ha copiado al portapapeles."); });
  }
  var shareEl = document.getElementById("informe-share-btn");
  if (shareEl) shareEl.addEventListener("click", function () { compartirInforme(Number(shareEl.dataset.shareInforme)); });

  // ---- deslizar un informe de la lista: compartir o eliminar ----
  var SW_OPEN = -168;
  function cerrarSwipes(excepto) {
    $$("#informes-list .swipe.open").forEach(function (w) {
      if (w === excepto) return;
      w.classList.remove("open");
      w.querySelector(".icard").style.transform = "";
    });
  }
  var infList = document.getElementById("informes-list");
  if (infList) {
    var SWP = null;
    infList.addEventListener("pointerdown", function (e) {
      var card = e.target.closest(".swipe .icard");
      if (!card || (e.button !== undefined && e.button !== 0)) return;
      var w = card.parentNode;
      SWP = { w: w, card: card, x0: e.clientX, y0: e.clientY, base: w.classList.contains("open") ? SW_OPEN : 0, dx: 0, drag: false, id: e.pointerId };
    });
    infList.addEventListener("pointermove", function (e) {
      if (!SWP || e.pointerId !== SWP.id) return;
      var dx = e.clientX - SWP.x0, dy = e.clientY - SWP.y0;
      if (!SWP.drag) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) { if (Math.abs(dy) > 10) SWP = null; return; }
        SWP.drag = true;
        SWP.w.classList.add("drag");
        try { SWP.card.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
        cerrarSwipes(SWP.w);
      }
      SWP.dx = dx;
      var x = Math.max(SW_OPEN - 24, Math.min(0, SWP.base + dx));
      SWP.card.style.transform = "translateX(" + x + "px)";
    });
    function soltarSwipe() {
      if (!SWP) return;
      var s = SWP; SWP = null;
      if (!s.drag) return;
      s.w.classList.remove("drag");
      var abrir = s.base + s.dx < SW_OPEN / 2;
      s.w.classList.toggle("open", abrir);
      s.card.style.transform = abrir ? "translateX(" + SW_OPEN + "px)" : "";
      s.card._noClick = true;
      setTimeout(function () { s.card._noClick = false; }, 350);
      if (abrir) vibrar();
    }
    infList.addEventListener("pointerup", soltarSwipe);
    infList.addEventListener("pointercancel", soltarSwipe);
    // un toque sobre una tarjeta abierta o recién deslizada la cierra en vez de abrir el informe
    infList.addEventListener("click", function (e) {
      var card = e.target.closest(".swipe .icard");
      if (card && (card._noClick || card.parentNode.classList.contains("open"))) {
        e.stopPropagation(); e.preventDefault();
        if (!card._noClick) cerrarSwipes();
        return;
      }
      var sh = e.target.closest("[data-share-id]");
      if (sh) { e.stopPropagation(); compartirInforme(Number(sh.dataset.shareId)); cerrarSwipes(); return; }
      var dl = e.target.closest("[data-del-id]");
      if (dl) { e.stopPropagation(); eliminarInforme(Number(dl.dataset.delId)); }
    }, true);
  }
  document.addEventListener("pointerdown", function (e) { if (!e.target.closest("#informes-list .swipe")) cerrarSwipes(); });
  var printEl = document.getElementById("informe-print-btn");
  if (printEl) printEl.addEventListener("click", function () { window.print(); });

  // ---------- service worker (offline) ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function () {
        /* si falla el registro, la app sigue funcionando online */
      });
    });
    // En cuanto se active una versión nueva del service worker (tras subir
    // cambios), recargar la página una sola vez para mostrarla al momento,
    // en vez de quedarse con una versión vieja cacheada sin que se note.
    var swRecargando = false;
    var habiaControlador = !!navigator.serviceWorker.controller; // no recargar en la 1.ª visita
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (swRecargando || !habiaControlador) return;
      swRecargando = true;
      window.location.reload();
    });
  }

  // ---------- init ----------
  initCalc();
  marcarExternos();
  ["vv", "va", "anticoag", "escalas"].forEach(buildSecnav);
  buildEmergencias();
  initAjustes();
  renderFavs();
  restaurarRonda();
  ronda();
  calcCriterios();
  calcResp();
  calcSave();
  renderChecklists();
  renderListaInformes();
  renderSurv();
  updateHero();
  selectCalcTab("criterios");
})();
