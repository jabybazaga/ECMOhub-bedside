(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var n0 = function (v) { return Math.round(v).toString(); };
  var n1 = function (v) { return (Math.round(v * 10) / 10).toString().replace(".", ","); };
  var n2 = function (v) { return (Math.round(v * 100) / 100).toString().replace(".", ","); };
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var ultimaRonda = null;

  // ---------- navegación entre pantallas ----------
  var screenNames = ["inicio", "ronda", "calc", "vv", "va", "anticoag", "complicaciones", "escalas", "checklists", "datos", "fuentes", "informes"];
  var screens = {};
  screenNames.forEach(function (n) { screens[n] = document.getElementById("screen-" + n); });

  function go(name) {
    if (!screens[name]) return;
    screenNames.forEach(function (k) {
      screens[k].classList.toggle("on", k === name);
    });
    document.querySelectorAll(".tab[data-go]").forEach(function (btn) {
      btn.classList.toggle("on", btn.dataset.go === name);
    });
    var content = screens[name].querySelector(".content");
    if (content) content.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  document.querySelectorAll("[data-go]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      go(el.dataset.go);
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
    p2: { v: 180, min: 0, max: 300, dec: 0 },
    p3: { v: 28, min: 0, max: 100, dec: 0 },
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

  var RONDA_KEYS = ["peso", "diuresis", "temp", "flujo", "sweep", "rpm", "p1", "p2", "p3", "po2post", "dias",
    "fc", "tas", "tad", "gc", "ic", "lactato", "sao2", "svo2", "pao2", "paco2", "ph", "svmix",
    "hb", "plaq", "fibri", "act", "ttpa", "ldh", "ritmo", "pplat", "peep", "vfio2"];

  function sv(key) {
    var st = stepState[key];
    if (!st || st.v === null || st.v === undefined) return NaN;
    return st.v;
  }

  function refreshStepOutputs(key) {
    var st = stepState[key];
    document.querySelectorAll('[data-val="' + key + '"]').forEach(function (out) {
      out.textContent = (st.v === null || st.v === undefined) ? "—" : (st.dec ? st.v.toFixed(st.dec) : String(st.v));
    });
  }

  document.querySelectorAll("[data-step]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.dataset.step;
      var delta = parseFloat(btn.dataset.delta);
      var st = stepState[key];
      if (!st) return;
      var base = (st.v === null || st.v === undefined) ? st.blankStart : st.v;
      var v = base + (st.v === null || st.v === undefined ? 0 : delta);
      if (v < st.min) v = st.min;
      if (v > st.max) v = st.max;
      st.v = Math.round(v * Math.pow(10, st.dec)) / Math.pow(10, st.dec);
      refreshStepOutputs(key);
      if (RONDA_KEYS.indexOf(key) > -1) ronda();
      if (key.indexOf("k-") === 0) calcCriterios();
    });
  });

  // ---------- Ronda diaria: modo VV/VA ----------
  var modo = "vv";
  document.getElementById("ronda-seg").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-mode]");
    if (!btn) return;
    this.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); });
    btn.classList.add("on");
    modo = btn.dataset.mode;
    $$("#screen-ronda [data-only]").forEach(function (el) {
      el.hidden = el.getAttribute("data-only") !== modo;
    });
    ronda();
  });
  $$("#screen-ronda [data-only]").forEach(function (el) {
    el.hidden = el.getAttribute("data-only") !== modo;
  });

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

  function F(sev, titulo, valor, mensaje, fuente) { return { sev: sev, t: titulo, v: valor, m: mensaje, src: fuente }; }

  function dlRow(k, v) { return '<div class="dl-row"><span class="dl-k">' + k + '</span><span class="dl-v">' + v + '</span></div>'; }

  function ronda() {
    var peso = sv("peso"), flujo = sv("flujo"), sweep = sv("sweep"), rpm = sv("rpm");
    var p1 = sv("p1"), p2 = sv("p2"), p3 = sv("p3"), po2post = sv("po2post"), dias = sv("dias");
    var fc = sv("fc"), tas = sv("tas"), tad = sv("tad"), ic = sv("ic"), lactato = sv("lactato");
    var sao2 = sv("sao2"), svo2 = sv("svo2"), pao2 = sv("pao2"), paco2 = sv("paco2"), ph = sv("ph");
    var hb = sv("hb"), plaq = sv("plaq"), fibri = sv("fibri"), act = sv("act"), ttpa = sv("ttpa"), ldh = sv("ldh");
    var diuresis = sv("diuresis"), temp = sv("temp"), ritmo = sv("ritmo");
    var gc = sv("gc"), svmix = sv("svmix");
    var sangrado = $("#r-sangrado") ? $("#r-sangrado").value : "no";
    var pplat = sv("pplat"), peep = sv("peep"), vfio2 = sv("vfio2");

    /* --- derivados --- */
    var pp = (isFinite(tas) && isFinite(tad)) ? tas - tad : NaN;
    var pam = (isFinite(tas) && isFinite(tad)) ? (tas + 2 * tad) / 3 : NaN;
    var flujoKg = (isFinite(flujo) && peso > 0) ? flujo * 1000 / peso : NaN;
    var ratio = (isFinite(sweep) && isFinite(flujo) && flujo > 0) ? sweep / flujo : NaN;
    var svUsada = isFinite(svmix) ? svmix : svo2;
    var svEsPre = !isFinite(svmix);
    var cao2 = (isFinite(hb) && isFinite(sao2)) ? hb * 1.34 * sao2 / 100 + 0.003 * (isFinite(pao2) ? pao2 : 0) : NaN;
    var cvo2 = (isFinite(hb) && isFinite(svUsada)) ? hb * 1.34 * svUsada / 100 : NaN;
    var do2 = (isFinite(gc) && isFinite(cao2)) ? gc * cao2 * 10 : NaN;
    var vo2 = (isFinite(gc) && isFinite(cao2) && isFinite(cvo2)) ? gc * (cao2 - cvo2) * 10 : NaN;
    var dv = (isFinite(do2) && isFinite(vo2) && vo2 > 0) ? do2 / vo2 : NaN;
    var gap = (isFinite(sao2) && isFinite(svUsada)) ? sao2 - svUsada : NaN;
    var dp = (isFinite(pplat) && isFinite(peep)) ? pplat - peep : NaN;

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
    $("#r-derived").innerHTML = der.map(function (d) { return dlRow(d[0], d[1]); }).join("");

    /* --- reglas --- */
    var f = [];
    var CH = "Protocolo CHUB", EL = "ELSO 1.4", CL = "Algoritmos Clínic";
    function tagCat(from, cat) { for (var i = from; i < f.length; i++) if (!f[i].cat) f[i].cat = cat; }

    var _iCirc = f.length;
    if (isFinite(flujoKg)) {
      if (flujoKg < 40) f.push(F("crit", "Flujo muy bajo", n0(flujoKg) + " mL/kg/min", "Por debajo de 40–50 mL/kg/min no se consigue transporte de O₂ adecuado. Subir rpm si el drenaje lo permite; si la succión lo impide, revisar volemia y posición de cánula.", CH));
      else if (flujoKg < 50) f.push(F("warn", "Flujo por debajo del objetivo", n0(flujoKg) + " mL/kg/min", "El objetivo es 50–80 mL/kg/min. Comprobar si es una decisión (destete) o una limitación del drenaje.", CH));
      else if (flujoKg > 80) f.push(F("warn", "Flujo por encima del rango", n0(flujoKg) + " mL/kg/min", "Por encima de 80 mL/kg/min. En VV, más flujo también significa más recirculación.", CH));
      else f.push(F("ok", "Flujo en rango", n0(flujoKg) + " mL/kg/min", "Dentro de 50–80 mL/kg/min.", CH));
    }
    if (isFinite(rpm) && rpm > 3500) f.push(F("warn", "rpm elevadas", n0(rpm) + " rpm", "Por encima de 3500 rpm aumenta la hemólisis. Revisar LDH y hemoglobina libre.", CH));

    if (isFinite(p1)) {
      if (p1 <= -100) f.push(F("crit", "Succión excesiva", n0(p1) + " mmHg", "Límite del protocolo superado. Bajar rpm de inmediato. Descartar hipovolemia, cánula acodada o mal posicionada, taponamiento, neumotórax y presión intraabdominal alta. No subir rpm: si es precarga, incluso bajarlas.", CH + " · " + CL));
      else if (p1 <= -80) f.push(F("warn", "Succión en el límite", n0(p1) + " mmHg", "El protocolo pide no pasar de −80 mmHg. Vigilar hemólisis y revisar volemia.", CH));
      else if (p1 < -50) f.push(F("info", "Succión moderada", n0(p1) + " mmHg", "Por debajo de −50 mmHg ya son posibles microembolias gaseosas.", CH));
      else f.push(F("ok", "Succión correcta", n0(p1) + " mmHg", "Dentro del rango seguro.", CH));
    }
    if (isFinite(p2) && p2 > 200) f.push(F("warn", "Presión de retorno alta", n0(p2) + " mmHg", "Límite del protocolo 200 mmHg. Descartar hipertensión, cánula de retorno obstruida o acodada, y membrana coagulada.", CH));
    if (isFinite(p3)) {
      if (p3 > 50) f.push(F("crit", "Gradiente transmembrana alto", n0(p3) + " mmHg", "Por encima del límite de 50 mmHg: sospechar trombosis del oxigenador. Comprobar gasometría pre y post, dímero D y plaquetas, y programar el recambio antes de que sea urgente.", CH));
      else if (p3 > 35) f.push(F("warn", "Gradiente transmembrana en ascenso", n0(p3) + " mmHg", "Comparar con el valor basal: un ascenso del 30–50 % sugiere trombosis, aunque no se alcance el límite absoluto.", CH));
      else f.push(F("ok", "Gradiente transmembrana normal", n0(p3) + " mmHg", "Por debajo de 50 mmHg.", CH));
    }
    if (isFinite(po2post)) {
      if (po2post < 150) f.push(F("crit", "PO₂ postmembrana baja", n0(po2post) + " mmHg", "Alerta de malfunción de la membrana. Con PaFi del oxigenador por debajo de 150 el protocolo obliga al cambio. Antes, descartar condensación: flush a 10 L/min durante 30 s y repetir la gasometría.", CH));
      else if (po2post < 300) f.push(F("warn", "PO₂ postmembrana por debajo del objetivo", n0(po2post) + " mmHg", "El objetivo es > 300 mmHg. Vigilar la tendencia junto con el gradiente transmembrana.", CH));
      else f.push(F("ok", "Membrana con buen intercambio", n0(po2post) + " mmHg", "Por encima de 300 mmHg.", CH));
    }

    tagCat(_iCirc, "circuito");
    var _iGas = f.length;
    if (isFinite(paco2)) {
      if (paco2 > 45) {
        var extra = (isFinite(dias) && dias <= 1) ? " Si la PaCO₂ de partida era alta, corregir despacio: 10–20 mmHg por hora, para no provocar oscilaciones de perfusión cerebral." : "";
        f.push(F(paco2 > 60 ? "crit" : "warn", "PaCO₂ alta", n0(paco2) + " mmHg", "Objetivo 35–45 mmHg: subir el gas de barrido." + extra, CH + (extra ? " · " + EL : "")));
      } else if (paco2 < 35) f.push(F("warn", "PaCO₂ baja", n0(paco2) + " mmHg", "Objetivo 35–45 mmHg: bajar el gas de barrido. Si el paciente está despierto, el extremo bajo (35) es el razonable.", CH));
      else f.push(F("ok", "PaCO₂ en rango", n0(paco2) + " mmHg", "Dentro de 35–45 mmHg.", CH));
    }
    if (isFinite(ratio) && isFinite(flujo) && flujo > 0) {
      if (ratio > 2.5) f.push(F("info", "Relación gas:sangre alta", n2(ratio) + " : 1", "Muy por encima del 1:1 de arranque. Si la PaCO₂ está en rango, no hace falta; si no baja, sospechar agua en la fase gas y purgar.", CH + " · " + EL));
    }
    if (isFinite(ph)) {
      if (ph < 7.35) f.push(F(ph < 7.25 ? "crit" : "warn", "Acidosis", n2(ph), "Objetivo 7,35–7,45. Descartar componente metabólico: con lactato alto, el problema es de perfusión, no de barrido.", CH));
      else if (ph > 7.45) f.push(F("warn", "Alcalosis", n2(ph), "Objetivo 7,35–7,45. Valorar bajar el gas de barrido.", CH));
    }

    tagCat(_iGas, "gasometria");

    if (modo === "vv") {
      var _iGasVV = f.length;
      if (isFinite(sao2)) {
        if (sao2 < 80) f.push(F("crit", "Hipoxemia significativa", n0(sao2) + " %", "Recorrer las cinco causas del protocolo: flujo efectivo, SvO₂ baja por consumo o anemia, gasto cardiaco nativo alto, fallo del oxigenador y pérdida de función pulmonar residual. El algoritmo del Clínic lo resuelve con la gasometría postmembrana: si es baja, es la membrana; si es normal con SvO₂ premembrana alta, es recirculación.", CH + " · " + CL));
        else if (sao2 < 85) f.push(F("warn", "SaO₂ por debajo del objetivo", n0(sao2) + " %", "El objetivo del protocolo es 85–92 %. Se acepta en torno al 80 % si el DO₂/VO₂ es 3–4 y no hay signos de hipoperfusión.", CH));
        else if (sao2 > 92) f.push(F("info", "SaO₂ por encima del objetivo", n0(sao2) + " %", "Objetivo 85–92 %. Si el pulmón está recuperando, puede ser momento de plantear el test de oxigenación.", CH));
        else f.push(F("ok", "SaO₂ en objetivo", n0(sao2) + " %", "Dentro de 85–92 %.", CH));
      }
      if (isFinite(pao2) && pao2 < 60) f.push(F("warn", "PaO₂ baja", n0(pao2) + " mmHg", "El objetivo del protocolo es > 60 mmHg.", CH));
      if (isFinite(svo2) && isFinite(sao2)) {
        if (svo2 > sao2 - 10 && sao2 < 90) f.push(F("crit", "Patrón de recirculación", n0(svo2) + " % premembrana", "La saturación premembrana está muy próxima a la arterial con SaO₂ baja: es el patrón de recirculación. Optimizar el flujo, reevaluar la posición de las cánulas con Rx y ecografía, y valorar aumentar el gasto cardiaco.", CH));
      }
      if (isFinite(svo2) && svo2 < 70) f.push(F("warn", "SvO₂ premembrana baja", n0(svo2) + " %", "Objetivo > 70 %. Mirar consumo (fiebre, agitación, desadaptación, infección), hemoglobina y flujo.", CH));
      if (isFinite(dv)) {
        var nota = svEsPre ? " Calculado con la saturación premembrana: en VV la recirculación la sube y el VO₂ sale infraestimado, así que el cociente real puede ser peor." : "";
        if (dv < 2) f.push(F("crit", "DO₂/VO₂ insuficiente", n1(dv), "Por debajo de 2 el aporte es inadecuado. Subir flujo, corregir hemoglobina o reducir el consumo." + nota, CH + " · " + EL));
        else if (dv < 3) f.push(F("warn", "DO₂/VO₂ por debajo del objetivo", n1(dv), "El objetivo del protocolo es 3:1. Con 3–4 se tolera una SaO₂ en torno al 80 %." + nota, CH));
        else f.push(F("ok", "DO₂/VO₂ adecuado", n1(dv), "Igual o por encima de 3, el objetivo del protocolo." + nota, CH));
      }
      tagCat(_iGasVV, "gasometria");
      var _iVentVV = f.length;
      if (isFinite(pplat)) {
        if (pplat > 30) f.push(F("crit", "Presión meseta por encima del máximo", n0(pplat) + " cmH₂O", "El aceptable del protocolo es 30 y el recomendable < 25. Si no se alcanzan los parámetros de reposo, el soporte extracorpóreo es insuficiente: se optimiza el ECMO, no el ventilador.", CH + " · " + EL));
        else if (pplat > 25) f.push(F("warn", "Presión meseta por encima de lo recomendable", n0(pplat) + " cmH₂O", "Recomendable < 25 cmH₂O, aceptable hasta 30.", CH));
      }
      if (isFinite(peep) && peep < 10) f.push(F("warn", "PEEP baja", n0(peep) + " cmH₂O", "El protocolo pide PEEP ≥ 10 cmH₂O en reposo.", CH));
      if (isFinite(dp) && dp > 15) f.push(F("warn", "Driving pressure alta", n0(dp) + " cmH₂O", "Mantener por debajo de 15 cmH₂O.", CH));
      if (isFinite(vfio2) && vfio2 > 50) f.push(F("warn", "FiO₂ del ventilador alta", n0(vfio2) + " %", "En reposo, lo aceptable es 30–50 %. Evitar la tentación de subirla por una hipoxemia tolerada.", CH + " · " + EL));
      if (isFinite(fc) || isFinite(tas)) f.push(F("info", "Hemodinámica en VV", "—", "El VV no da soporte circulatorio: la frecuencia y la tensión se manejan como en cualquier crítico. No hay objetivos de FC, TA ni presión de pulso propios del modo VV — los de PAM 50–70 y presión de pulso ≥ 10 son del modo VA.", EL));
      tagCat(_iVentVV, "ventilacion");
    } else {
      var _iGasVA = f.length;
      if (isFinite(sao2)) {
        if (sao2 < 95) f.push(F("crit", "SaO₂ por debajo del objetivo", n0(sao2) + " %", "En VA el objetivo es 95–100 %. Si la muestra es de radial derecha, sospechar síndrome de Arlequín: comparar con la extremidad inferior y con NIRS. Escalado: subir flujo de ECMO → valorar reducir el gasto nativo → retorno axilar o central → V-VA.", CH));
        else f.push(F("ok", "SaO₂ en objetivo", n0(sao2) + " %", "Dentro de 95–100 %. Confirmar que la muestra es de radial derecha.", CH));
      }
      tagCat(_iGasVA, "gasometria");
      var _iHemoVA = f.length;
      if (isFinite(pam)) {
        if (pam < 65) f.push(F("crit", "PAM baja", n0(pam) + " mmHg", "Objetivo ≥ 65 mmHg. No variar el flujo de la bomba: tratar con medicación. Pensar en resistencias bajas (sepsis, hipertermia) y en hipocalcemia.", CH));
        else if (pam > 95) f.push(F("warn", "PAM alta", n0(pam) + " mmHg", "Por encima de 95–100 mmHg favorece la distensión del VI y empeora el flujo de la bomba. Vasodilatar (nitroprusiato, urapidilo) en lugar de bajar el flujo.", CH));
        else f.push(F("ok", "PAM en rango", n0(pam) + " mmHg", "Entre 65 y 95 mmHg.", CH));
      }
      if (isFinite(pp)) {
        if (pp < 15) f.push(F("crit", "Presión de pulso muy baja", n0(pp) + " mmHg", "Sospechar distensión del ventrículo izquierdo. Eco urgente: apertura de la válvula aórtica, PCP, trombos. El protocolo es explícito en que la descarga mecánica es necesaria en la mayoría de los casos — Impella, o balón si hay trombo o no se puede colocar. Antes, dobutamina < 10 µg/kg/min y reducción de poscarga.", CH));
        else if (pp < 30) f.push(F("warn", "Presión de pulso baja", n0(pp) + " mmHg", "Por debajo de 30 mmHg no se cumplen los criterios de destete. Vigilar la apertura de la válvula aórtica en la eco diaria.", CH));
        else f.push(F("ok", "Presión de pulso conservada", n0(pp) + " mmHg", "Por encima de 30 mmHg: criterio favorable de destete.", CH));
      }
      if (isFinite(ic)) {
        if (ic < 2.2) f.push(F("crit", "Índice cardiaco bajo", n1(ic) + " L/min/m²", "Por debajo de 2,2 es el umbral de shock del propio protocolo. El objetivo de índice cardiaco total, bomba más gasto residual, es ≥ 2,5.", CH));
        else if (ic < 2.5) f.push(F("warn", "Índice cardiaco por debajo del objetivo", n1(ic) + " L/min/m²", "El objetivo total es ≥ 2,5 L/min/m².", CH));
        else f.push(F("ok", "Índice cardiaco adecuado", n1(ic) + " L/min/m²", "Igual o por encima de 2,5.", CH));
      }
      if (isFinite(svo2) && svo2 < 65) f.push(F("warn", "Saturación venosa baja", n0(svo2) + " %", "Objetivo > 65 % en el sistema y > 70 % en la cánula venosa. Ajustar el flujo de bomba.", CH));
      if (isFinite(fc) && fc > 120) f.push(F("info", "Taquicardia", n0(fc) + " lpm", "Ninguna de las fuentes fija un objetivo de frecuencia en ECMO. La arritmia más frecuente es la fibrilación auricular; TV y FV se relacionan con isquemia o dilatación ventricular.", CH));
      tagCat(_iHemoVA, "hemodinamica");
    }

    var _iAnalitica = f.length;
    if (isFinite(lactato)) {
      if (lactato > 5) f.push(F("crit", "Lactato muy elevado", n1(lactato) + " mmol/L", "Aporte insuficiente: revisar flujo, saturación venosa y PAM. En VA el protocolo espera normalización en las primeras 4–6 horas.", CH));
      else if (lactato > 2) f.push(F("warn", "Lactato elevado", n1(lactato) + " mmol/L", "Objetivo < 2 mmol/L. Lo que importa es la tendencia más que el valor aislado.", CH));
      else f.push(F("ok", "Lactato normal", n1(lactato) + " mmol/L", "Por debajo de 2 mmol/L.", CH));
    }
    if (isFinite(diuresis) && diuresis < 0.5) f.push(F("warn", "Diuresis baja", n1(diuresis) + " mL/kg/h", "Objetivo > 0,5 mL/kg/h. Es uno de los criterios de hipoperfusión del protocolo. Valorar depuración extrarrenal si no se consigue balance negativo.", CH));
    if (isFinite(temp)) {
      if (temp > 37.5) f.push(F("warn", "Hipertermia", n1(temp) + " °C", "Aumenta el consumo de O₂ y empeora la relación DO₂/VO₂. Antipirético endovenoso; no modificar la temperatura del intercambiador salvo casos rebeldes.", CH));
      else if (temp < 35.5) f.push(F("warn", "Hipotermia", n1(temp) + " °C", "Fuera de la normotermia objetivo, salvo que sea deliberada tras parada cardiaca.", CH));
    }

    if (isFinite(hb)) {
      if (hb < 7) f.push(F("crit", "Hemoglobina baja", n1(hb) + " g/dL", "Por debajo del umbral de transfusión. El protocolo pide > 8 g/dL y transfundir hasta cerca de 10 si cae el flujo o hay hemólisis.", CH));
      else if (hb < 8) f.push(F("warn", "Hemoglobina por debajo del objetivo", n1(hb) + " g/dL", "El protocolo pide > 8 g/dL. ELSO va más allá y prefiere hematocrito > 40 % para permitir flujos más bajos.", CH + " · " + EL));
      else f.push(F("ok", "Hemoglobina en rango", n1(hb) + " g/dL", "Por encima de 8 g/dL.", CH));
    }
    if (isFinite(plaq)) {
      var umbral = sangrado === "no" ? 50 : 100;
      if (plaq < umbral) f.push(F("crit", "Plaquetas por debajo del umbral", n0(plaq) + " ×10⁹/L", "Transfundir: el protocolo pide > 50–100 ×10⁹/L sin sangrado y > 100 con sangrado. Una trombopenia aislada también puede indicar trombosis de la membrana.", CH));
      else if (plaq < 100) f.push(F("warn", "Plaquetas bajas", n0(plaq) + " ×10⁹/L", "Dentro del margen sin sangrado, pero vigilar la tendencia: un descenso continuo es uno de los signos de fallo del circuito.", CH));
      else f.push(F("ok", "Plaquetas adecuadas", n0(plaq) + " ×10⁹/L", "Por encima de 100 ×10⁹/L.", CH));
    }
    if (isFinite(fibri)) {
      var uf = sangrado === "no" ? 1.0 : 1.5;
      if (fibri < uf) f.push(F("crit", "Fibrinógeno bajo", n1(fibri) + " g/L", "Corregir: el protocolo pide > 1 g/L sin sangrado y > 1,5 con sangrado. ELSO es bastante más exigente (2,5–3 g/L); el aviso sigue al protocolo.", CH));
      else if (fibri < 2.0) f.push(F("warn", "Fibrinógeno en el límite", n1(fibri) + " g/L", "Por encima del umbral del protocolo pero por debajo de los 200 mg/dL que la tabla de detección de fallo del circuito marca como normales.", CH));
      else f.push(F("ok", "Fibrinógeno adecuado", n1(fibri) + " g/L", "Por encima de 2 g/L.", CH));
    }
    if (isFinite(ldh)) {
      if (ldh > 1000) f.push(F("crit", "LDH muy elevada", n0(ldh) + " UI/L", "Marcador de coágulos en el cabezal. Pedir hemoglobina libre, bilirrubina y haptoglobina, revisar el color de la orina y el circuito con linterna, y valorar el cambio de sistema.", CH));
      else if (ldh > 350) f.push(F("warn", "LDH elevada", n0(ldh) + " UI/L", "Por encima del valor normal de la tabla del protocolo. Vigilar hemólisis: presión de succión, rpm y gradiente de membrana.", CH));
      else f.push(F("ok", "LDH normal", n0(ldh) + " UI/L", "Por debajo de 350 UI/L.", CH));
    }

    tagCat(_iAnalitica, "analitica");
    var _iAnticoag = f.length;
    if (sangrado === "grave") {
      f.push(F("crit", "Hemorragia grave", "—", "Suspender la heparina y reevaluar a las 12 horas. Si hay coagulopatía, corregirla. Transfundir plaquetas por encima de 100 ×10⁹/L y valorar antifibrinolíticos.", CH + " · " + EL));
    } else if (sangrado === "leve") {
      f.push(F("warn", "Hemorragia leve", "—", "Mantener la perfusión para un TTPa en torno a 40 s.", CH));
    }
    if (isFinite(act) && sangrado !== "grave") {
      var msg, sev;
      if (act < 90) { sev = "crit"; msg = "Aumentar 20 % — subir la perfusión 5 mL/h."; }
      else if (act < 160) { sev = "warn"; msg = "Aumentar 10 % — subir la perfusión 2,5 mL/h."; }
      else if (act <= 180) { sev = "ok"; msg = "En el rango diana del protocolo (160–180). Mantener la perfusión sin cambios."; }
      else if (act <= 320) { sev = "warn"; msg = "Disminuir 10 % — bajar la perfusión 2,5 mL/h."; }
      else { sev = "crit"; msg = "Disminuir 20 % — bajar la perfusión 5 mL/h."; }
      if (isFinite(ritmo) && ritmo > 0 && sev !== "ok") {
        var delta = (act < 90 || act > 320) ? 5 : 2.5;
        var nuevo = (act < 160) ? ritmo + delta : ritmo - delta;
        msg += " Con " + n1(ritmo) + " mL/h actuales, pasaría a " + n1(Math.max(0, nuevo)) + " mL/h.";
      }
      if (isFinite(flujo) && flujo < 1.5) msg += " Ojo: con flujo por debajo de 1,5 L/min el objetivo cambia a ACT 200 y TTPa 80.";
      f.push(F(sev, "ACT", n0(act) + " s", msg, CH));
    }
    if (isFinite(ttpa) && sangrado !== "grave") {
      var m2, s2;
      if (ttpa < 35) { s2 = "crit"; m2 = "Aumentar 20 % — subir la perfusión 5 mL/h."; }
      else if (ttpa < 46) { s2 = "warn"; m2 = "Aumentar 10 % — subir la perfusión 2,5 mL/h."; }
      else if (ttpa <= 70) { s2 = "ok"; m2 = "En el rango diana del protocolo (46–70 s)."; }
      else if (ttpa <= 90) { s2 = "warn"; m2 = "Disminuir 10 % — bajar la perfusión 2,5 mL/h."; }
      else { s2 = "crit"; m2 = "Disminuir 20 % — bajar la perfusión 5 mL/h."; }
      f.push(F(s2, "TTPa", n0(ttpa) + " s", m2, CH));
    }
    if (isFinite(plaq) && plaq > 0 && isFinite(dias) && dias >= 2) {
      f.push(F("info", "Vigilancia de HIT", "—", "Una caída de plaquetas del 50 % obliga a aplicar la escala 4Ts, pedir anti-PF4 y parar la perfusión. Incidencia descrita 0,3–0,6 %.", CH));
    }
    tagCat(_iAnticoag, "anticoagulacion");

    ultimaRonda = { modo: modo, findings: f.slice() };
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
  }

  // ---------- Calculadoras: chips ----------
  var CALC_TABS = ["criterios", "recirc", "hep", "resp", "save"];
  document.getElementById("calc-chips").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    this.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); });
    btn.classList.add("on");
    CALC_TABS.forEach(function (t) {
      var pane = document.getElementById("pane-" + t);
      if (pane) pane.classList.toggle("on", t === btn.dataset.tab);
    });
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
        '<div style="font-size:12px;color:var(--ink-3);margin-bottom:7px">' + g.sub + '</div>' +
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
      btn.style.cssText = "font-family:inherit;font-size:12px;background:var(--surface-2);border:1px solid var(--line-2);border-radius:8px;padding:7px 14px;color:var(--ink-2)";
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
  function renderBars(host, group) {
    var box = document.createElement("div");
    box.style.marginBottom = "18px";
    var rowsHtml = group.rows.map(function (r) {
      return '<div class="bar-row"><div class="bar-lbl"><span>' + r.label + '</span><b>' + r.value + ' %</b></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + r.value + '%"></div></div>' +
        (r.n ? '<div class="bar-n">' + r.n + '</div>' : '') + '</div>';
    }).join("");
    box.innerHTML = '<h4 style="font-family:var(--cond);font-size:14px;font-weight:700;margin:0 0 2px">' + group.title + '</h4>' +
      '<p style="font-size:12px;color:var(--ink-3);margin:0 0 10px;line-height:1.45">' + group.cap + '</p>' +
      '<div class="bars">' + rowsHtml + '</div>';
    host.appendChild(box);
  }

  // ---------- Curva flujo / saturación ----------
  var SVGNS = "http://www.w3.org/2000/svg";
  function el(t, a) { var e = document.createElementNS(SVGNS, t); for (var k in a) { e.setAttribute(k, a[k]); } return e; }
  function drawCurve() {
    var gcEl = document.getElementById("cv-gc"), recEl = document.getElementById("cv-rec"), svo2El = document.getElementById("cv-svo2");
    var host = document.getElementById("curve-host");
    if (!gcEl || !host) return;
    var gc = +gcEl.value, rec = +recEl.value / 100, svo2v = +svo2El.value;
    document.getElementById("cv-gc-v").textContent = n1(gc);
    document.getElementById("cv-rec-v").textContent = n0(rec * 100);
    document.getElementById("cv-svo2-v").textContent = n0(svo2v);
    host.innerHTML = "";
    var W = 320, H = 200, L = 40, R = 12, T = 12, B = 30;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Saturación arterial estimada según el flujo de ECMO" });
    var x = function (f) { return L + (f / 8) * (W - L - R); };
    var y = function (s) { return T + (1 - (s - 40) / 60) * (H - T - B); };
    [40, 55, 70, 85, 100].forEach(function (s) {
      svg.appendChild(el("line", { x1: L, y1: y(s), x2: W - R, y2: y(s), stroke: "var(--line)", "stroke-width": 1 }));
      var t = el("text", { x: L - 6, y: y(s) + 3.5, "text-anchor": "end", "font-size": 9.5, fill: "var(--ink-3)", "font-family": "var(--mono)" });
      t.textContent = s; svg.appendChild(t);
    });
    [0, 2, 4, 6, 8].forEach(function (ff) {
      var t = el("text", { x: x(ff), y: H - 12, "text-anchor": "middle", "font-size": 9.5, fill: "var(--ink-3)", "font-family": "var(--mono)" });
      t.textContent = ff; svg.appendChild(t);
    });
    var ax = el("text", { x: (L + W - R) / 2, y: H - 1, "text-anchor": "middle", "font-size": 10, fill: "var(--ink-3)", "font-family": "var(--serif)" });
    ax.textContent = "Flujo de ECMO (L/min)"; svg.appendChild(ax);
    svg.appendChild(el("line", { x1: L, y1: y(85), x2: W - R, y2: y(85), stroke: "var(--good)", "stroke-width": 1.5, "stroke-dasharray": "4 4" }));
    var gl = el("text", { x: L + 4, y: y(85) - 5, "text-anchor": "start", "font-size": 9.5, fill: "var(--good)", "font-family": "var(--mono)", "font-weight": 500 });
    gl.textContent = "objetivo 85 %"; svg.appendChild(gl);
    var d = "", pts = [];
    for (var ff2 = 0; ff2 <= 8.001; ff2 += 0.1) {
      var eff = ff2 * (1 - rec), fr = Math.min(1, gc > 0 ? eff / gc : 0), s = fr * 100 + (1 - fr) * svo2v;
      pts.push([ff2, s]);
      d += (d ? "L" : "M") + x(ff2).toFixed(1) + " " + y(s).toFixed(1) + " ";
    }
    svg.appendChild(el("path", { d: d, fill: "none", stroke: "var(--accent)", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    var p4 = pts[40];
    svg.appendChild(el("circle", { cx: x(p4[0]), cy: y(p4[1]), r: 4, fill: "var(--accent)", stroke: "var(--surface)", "stroke-width": 2 }));
    var lb = el("text", { x: Math.min(x(p4[0]) + 8, W - 70), y: y(p4[1]) - 7, "font-size": 10, fill: "var(--ink)", "font-family": "var(--mono)", "font-weight": 500 });
    lb.textContent = "4 L/min → " + n0(p4[1]) + " %"; svg.appendChild(lb);
    host.appendChild(svg);
  }
  ["cv-gc", "cv-rec", "cv-svo2"].forEach(function (id) {
    var elx = document.getElementById(id);
    if (elx) elx.addEventListener("input", drawCurve);
  });

  // ---------- Informes de ronda ----------
  var CAT_INFO = {
    circuito: "Circuito ECMO",
    ventilacion: "Ventilación",
    gasometria: "Gasometría",
    hemodinamica: "Hemodinámica",
    analitica: "Analítica / hemostasia",
    anticoagulacion: "Anticoagulación"
  };
  var CAT_ORDEN = ["circuito", "ventilacion", "gasometria", "hemodinamica", "analitica", "anticoagulacion"];
  var INFORMES_KEY = "ecmo_informes";

  function getInformes() { try { return JSON.parse(ls(INFORMES_KEY) || "[]"); } catch (e) { return []; } }
  function setInformes(lista) { ls(INFORMES_KEY, JSON.stringify(lista)); }

  function fmtFechaInforme(iso) {
    var d = new Date(iso);
    var dd = ("0" + d.getDate()).slice(-2), mm = ("0" + (d.getMonth() + 1)).slice(-2);
    var hh = ("0" + d.getHours()).slice(-2), mi = ("0" + d.getMinutes()).slice(-2);
    return dd + "/" + mm + "/" + d.getFullYear() + " · " + hh + ":" + mi;
  }

  function generarInforme() {
    if (!ultimaRonda) return;
    var relevantes = ultimaRonda.findings.filter(function (x) { return x.sev === "crit" || x.sev === "warn"; });
    if (!relevantes.length) { window.alert("No hay hallazgos críticos ni a vigilar en esta ronda: no se genera informe."); return; }
    var camaEl = document.getElementById("r-cama");
    var informe = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      modo: ultimaRonda.modo,
      cama: camaEl ? camaEl.value.trim() : "",
      hallazgos: relevantes
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

  function renderListaInformes() {
    var host = document.getElementById("informes-list");
    if (!host) return;
    var lista = getInformes();
    var empty = document.getElementById("informes-empty");
    if (empty) empty.style.display = lista.length ? "none" : "block";
    host.innerHTML = lista.map(function (inf) {
      var nc = inf.hallazgos.filter(function (x) { return x.sev === "crit"; }).length;
      var nw = inf.hallazgos.filter(function (x) { return x.sev === "warn"; }).length;
      var cama = inf.cama ? " · " + inf.cama : "";
      return '<button class="item" data-open-informe="' + inf.id + '">' +
        '<div class="ic" style="background:var(--accent-soft)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1Z"/><rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 12h6M9 16h4"/></svg></div>' +
        '<div class="tx"><div class="t">ECMO ' + inf.modo.toUpperCase() + cama + '</div><div class="d">' + fmtFechaInforme(inf.fecha) + ' · ' + nc + ' críticos · ' + nw + ' a vigilar</div></div>' +
        '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>' +
        '</button>';
    }).join("");
  }

  function abrirInforme(id) {
    var inf = getInformes().filter(function (x) { return x.id === id; })[0];
    if (!inf) return;
    document.getElementById("informe-titulo").textContent = "ECMO " + inf.modo.toUpperCase() + (inf.cama ? " · " + inf.cama : "");
    document.getElementById("informe-fecha").textContent = fmtFechaInforme(inf.fecha);
    var porCat = {};
    inf.hallazgos.forEach(function (h) { var c = h.cat || "otros"; (porCat[c] = porCat[c] || []).push(h); });
    var html = "";
    CAT_ORDEN.concat(["otros"]).forEach(function (cat) {
      var items = porCat[cat];
      if (!items || !items.length) return;
      items.sort(function (a, b) { return (a.sev === "crit" ? 0 : 1) - (b.sev === "crit" ? 0 : 1); });
      html += '<h3 class="rh">' + (CAT_INFO[cat] || "Otros") + '</h3>' +
        items.map(function (x) {
          return '<div class="fi ' + x.sev + '"><div class="body"><div class="t">' + x.t +
            (x.v && x.v !== "—" ? ' <span class="val">' + x.v + '</span>' : '') +
            '</div><div class="m">' + x.m + '</div><span class="src">' + x.src + '</span></div></div>';
        }).join("");
    });
    document.getElementById("informe-body").innerHTML = html;
    document.getElementById("informe-del-btn").setAttribute("data-del-informe", id);
    document.getElementById("informes-view-lista").classList.remove("on");
    document.getElementById("informes-view-detalle").classList.add("on");
  }

  function cerrarInforme() {
    document.getElementById("informes-view-detalle").classList.remove("on");
    document.getElementById("informes-view-lista").classList.add("on");
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

  // ---------- service worker (offline) ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function () {
        /* si falla el registro, la app sigue funcionando online */
      });
    });
  }

  // ---------- init ----------
  ronda();
  calcCriterios();
  calcResp();
  calcSave();
  renderChecklists();
  renderListaInformes();
  var elsoHost = document.getElementById("elso-host");
  if (elsoHost) ELSO.forEach(function (grp) { renderBars(elsoHost, grp); });
  var scoreHost = document.getElementById("score-host");
  if (scoreHost) SCORES.forEach(function (grp) { renderBars(scoreHost, grp); });
  drawCurve();
})();
