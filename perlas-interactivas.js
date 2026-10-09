/* =====================================================================
   Perlas interactivas: respirador en VV, destete VV/VA y cavitación.
   Cada componente recibe el contenedor y devuelve una función que lo
   detiene (se llama al cerrar el visor). Los textos clínicos salen del
   protocolo CHUB; las curvas y cifras animadas son ilustrativas.
   ===================================================================== */
(function () {
  "use strict";
  var REDUCIR = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function boton(txt, extra) { return '<button type="button"' + (extra || "") + ">" + txt + "</button>"; }
  function pausaHTML() {
    return '<button type="button" class="pix-pausa" aria-pressed="false"><span class="ico" aria-hidden="true"></span><span class="tx">Pausar</span></button>';
  }
  function enlazarPausa(el, cb) {
    var b = el.querySelector(".pix-pausa");
    if (!b) return;
    b.addEventListener("click", function () {
      var p = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(p));
      b.querySelector(".tx").textContent = p ? "Reanudar" : "Pausar";
      cb(p);
    });
    if (REDUCIR) b.hidden = true;
  }

  // ------------------------------------------------------------------
  // 1. Respirador en ECMO VV: curvas que corren y VTe que mejora
  // ------------------------------------------------------------------
  var PARAMS = [
    { id: "peep", n: "PEEP", v: "10", u: "cmH₂O", t: "PEEP", obj: "≥ 10 (10–24)",
      d: "Arranque en 10 cmH₂O y titular desde ahí, dentro del rango 10–24." },
    { id: "fr", n: "FR", v: "10", u: "rpm", t: "Frecuencia respiratoria", obj: "4–15",
      d: "Arranque en 10 respiraciones por minuto y titular desde ahí, dentro del rango 4–15." },
    { id: "pc", n: "PC", v: "10", u: "sobre PEEP", t: "Presión control", obj: "pico 20",
      d: "La PC <b>se mantiene en 10</b> durante todo el soporte. Al principio la compliance es muy baja y el VTe también. Con el paso de <b>días y semanas</b>, si se va resolviendo la causa, la compliance mejora y el <b>VTe</b> (volumen tidal espiratorio) aumenta sin necesidad de subir la PC.<br><b>Compliance estática</b> = VTe ÷ (Pmeseta − PEEP), con pausa inspiratoria. Con PC 10 y flujo cero al final de la inspiración, Pmeseta − PEEP ≈ 10, así que Crs ≈ VTe ÷ 10. Meseta &lt; 25 (aceptable ≤ 30) y driving pressure &lt; 15." },
    { id: "fio2", n: "FiO₂", v: "30–50", u: "%", t: "FiO₂", obj: "mínima",
      d: "La mínima posible, entre 30 y 50 %. No subir el ventilador por una hipoxemia tolerada." }
  ];

  function respirador(el) {
    el.innerHTML =
      '<div class="vent" role="group" aria-label="Pantalla de respirador en presión control">' +
        '<div class="vent-top"><span class="vent-mode">PC</span><span class="vent-sub">Presión control · reposo</span><span class="sp"></span><span class="vent-tag">REGLA DEL 10</span></div>' +
        '<div class="vent-main">' +
          '<canvas class="vent-cv" aria-label="Curvas de presión, flujo y volumen"></canvas>' +
          '<div class="vent-side">' +
            '<div class="vm"><span class="k">Pmeseta</span><span class="v sm"><span data-pm>—</span></span><span class="u">PEEP 10</span></div>' +
            '<div class="vm vte"><span class="k">VTe</span><span class="v"><span data-vte>—</span></span><span class="u"><span data-vkg>—</span> mL/kg</span><span class="tr" data-tr aria-hidden="true"></span></div>' +
            '<div class="vm"><span class="k">Crs</span><span class="v sm"><span data-cd>—</span></span><span class="u">mL/cmH₂O</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="vent-fx" aria-live="off"><span>Crs = VTe ÷ (Pmeseta − PEEP)</span><b data-fx>—</b></div>' +
        '<div class="vent-tl">' +
          '<div class="tl-h"><span>Misma <b>PC 10</b> todo el soporte</span><b data-dia>Semana 1 · día 1</b></div>' +
          '<div class="tl-bar" aria-hidden="true"><i data-tlp></i></div>' +
          '<div class="tl-sem">' + [1, 2, 3, 4].map(function (w) { return '<span data-sem="' + w + '"><span class="k">Sem ' + w + '</span><span class="v">—</span></span>'; }).join("") + '</div>' +
        '</div>' +
        '<div class="vent-knobs" role="radiogroup" aria-label="Parámetros programados">' +
          PARAMS.map(function (p) {
            return boton('<span class="k">' + p.n + '</span><span class="v">' + p.v + '</span><span class="u">' + p.u + '</span>',
              ' role="radio" aria-checked="' + (p.id === "pc") + '" data-p="' + p.id + '"' + (p.id === "pc" ? ' class="on"' : ""));
          }).join("") +
        '</div>' +
      '</div>' +
      '<div class="pix-row">' + pausaHTML() + '<span class="pix-nota">Paciente de ejemplo: varón de 1,70 m, peso ideal 66 kg. Crs de 15 a 30 mL/cmH₂O en 4 semanas (rangos publicados en ECMO VV). Aquí se comprimen en minuto y medio.</span></div>' +
      '<div class="vent-card" aria-live="polite"></div>';

    var card = el.querySelector(".vent-card");
    function verParam(id) {
      var p = PARAMS.filter(function (x) { return x.id === id; })[0];
      card.innerHTML = '<div class="h"><b>' + p.t + '</b><span>' + p.obj + '</span></div><p>' + p.d + '</p>';
      Array.prototype.forEach.call(el.querySelectorAll(".vent-knobs button"), function (b) {
        var on = b.getAttribute("data-p") === id;
        b.classList.toggle("on", on);
        b.setAttribute("aria-checked", String(on));
      });
    }
    el.querySelector(".vent-knobs").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-p]");
      if (b) verParam(b.getAttribute("data-p"));
    });
    verParam("pc");

    // Modelo RC en presión control: PEEP 10, PC 10, FR 10 (ciclo 6 s), Ti 2 s.
    // R 15 cmH₂O·s/L y Ti 2 s: con τ = R·C ≤ 0,45 s la inspiración llega a flujo cero (Ti ≥ 4,4 τ),
    // así que la presión alveolar al final de la inspiración (la Pmeseta con pausa) es casi PEEP + PC.
    var PEEP = 10, PC = 10, T = 6, TI = 2, R = 15, PESO_IDEAL = 66; // varón de 170 cm: 50 + 0,91·(170 − 152,4)
    var CMIN = 0.015, CMAX = 0.030, CICLOS = 16;   // Crs 15 → 30 mL/cmH₂O en 16 ciclos = 4 semanas
    var DIAS = 28;
    var VENTANA = 12;                              // segundos visibles en pantalla
    var cv = el.querySelector(".vent-cv"), ctx = cv.getContext("2d");
    var vteEl = el.querySelector("[data-vte]"), cdEl = el.querySelector("[data-cd]"), trEl = el.querySelector("[data-tr]");
    var pmEl = el.querySelector("[data-pm]"), vkgEl = el.querySelector("[data-vkg]"), fxEl = el.querySelector("[data-fx]");
    var diaEl = el.querySelector("[data-dia]"), tlpEl = el.querySelector("[data-tlp]");
    var W = 0, H = 0, dpr = 1, raf = 0, t0 = 0, pausado = false, tPausa = 0, ultimo = null, vtePrev = null;

    function progreso(ciclo) { return Math.min(1, (ciclo % (CICLOS + 3)) / CICLOS); }
    function compliance(ciclo) {
      var k = progreso(ciclo);
      return CMIN + (CMAX - CMIN) * k * k * (3 - 2 * k); // mejora lenta al principio, más clara después
    }
    function estado(t) {
      var ciclo = Math.floor(t / T), tc = t - ciclo * T, C = compliance(ciclo), tau = R * C;
      var vi = PC * C * (1 - Math.exp(-TI / tau)); // volumen al final de la inspiración (L)
      if (tc < TI) {
        var sube = 1 - Math.exp(-tc / 0.06);
        return { p: PEEP + PC * sube, f: (PC / R) * Math.exp(-tc / tau) * sube, v: PC * C * (1 - Math.exp(-tc / tau)), ciclo: ciclo, vi: vi, C: C };
      }
      var te = tc - TI, baja = Math.exp(-te / 0.05);
      return { p: PEEP + PC * baja, f: -(vi / tau) * Math.exp(-te / tau), v: vi * Math.exp(-te / tau), ciclo: ciclo, vi: vi, C: C };
    }
    var CANALES = [
      { k: "p", l: "Paw", u: "cmH₂O", min: 0, max: 25, col: "#F1C96E", ref: [10, 20] },
      { k: "f", l: "Flujo", u: "L/min", min: -60, max: 60, col: "#7FB8EC", ref: [0], esc: 60 },
      { k: "v", l: "Volumen", u: "mL", min: 0, max: 500, col: "#8FDBAE", ref: [], esc: 1000 }
    ];
    function y(ch, val, i) {
      var lane = H / 3, top = i * lane + 16, alto = lane - 24;
      var x = ch.esc ? val * ch.esc : val;
      return top + alto - (x - ch.min) / (ch.max - ch.min) * alto;
    }
    function fondo() {
      ctx.clearRect(0, 0, W, H);
      ctx.font = "500 12px 'IBM Plex Mono', monospace";
      CANALES.forEach(function (ch, i) {
        ctx.fillStyle = "#9CAAB8";
        ctx.fillText(ch.l + " · " + ch.u, 6, i * H / 3 + 12);
        ctx.strokeStyle = "#22303C"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ch.ref.forEach(function (r) { var yy = Math.round(y(ch, ch.esc ? r / ch.esc : r, i)) + 0.5; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); });
        ctx.setLineDash([]);
        if (i) { ctx.strokeStyle = "#1B2733"; ctx.beginPath(); ctx.moveTo(0, i * H / 3 + 0.5); ctx.lineTo(W, i * H / 3 + 0.5); ctx.stroke(); }
      });
    }
    function medir() {
      dpr = window.devicePixelRatio || 1;
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fondo(); ultimo = null;
    }
    function trazar(desde, hasta) {
      // dibuja el tramo [desde, hasta] (segundos) y borra una franja por delante
      var xa = (desde % VENTANA) / VENTANA * W, xb = (hasta % VENTANA) / VENTANA * W;
      if (xb < xa) { trazar(desde, desde + (VENTANA - desde % VENTANA) - 1e-6); trazar(hasta - hasta % VENTANA, hasta); return; }
      var borra = 14;
      ctx.clearRect(xb + 1, 0, borra, H);
      CANALES.forEach(function (ch, i) {
        if (ch.ref.length) {
          ctx.strokeStyle = "#22303C"; ctx.setLineDash([3, 4]);
          ch.ref.forEach(function (r) { var yy = Math.round(y(ch, ch.esc ? r / ch.esc : r, i)) + 0.5; ctx.beginPath(); ctx.moveTo(xb + 1, yy); ctx.lineTo(xb + 1 + borra, yy); ctx.stroke(); });
          ctx.setLineDash([]);
        }
        if (i) { ctx.strokeStyle = "#1B2733"; ctx.beginPath(); ctx.moveTo(xb + 1, i * H / 3 + 0.5); ctx.lineTo(xb + 1 + borra, i * H / 3 + 0.5); ctx.stroke(); }
        if (xb < 130) { ctx.fillStyle = "#9CAAB8"; ctx.font = "500 12px 'IBM Plex Mono', monospace"; ctx.fillText(ch.l + " · " + ch.u, 6, i * H / 3 + 12); }
        ctx.strokeStyle = ch.col; ctx.lineWidth = 2; ctx.lineJoin = "round";
        ctx.beginPath();
        var pasos = Math.max(2, Math.ceil((xb - xa) / 1.5));
        for (var s = 0; s <= pasos; s++) {
          var tt = desde + (hasta - desde) * s / pasos, e = estado(tt), x = xa + (xb - xa) * s / pasos;
          var val = ch.k === "p" ? e.p : ch.k === "f" ? e.f : e.v;
          if (s) ctx.lineTo(x, y(ch, val, i)); else ctx.moveTo(x, y(ch, val, i));
        }
        ctx.stroke();
      });
    }
    function pintarCifras(t) {
      var e = estado(t), ciclo = e.ciclo;
      // el VTe se actualiza al terminar cada espiración, como en un respirador
      var prev = estado(Math.max(0, (ciclo) * T - 0.01)), cic = ciclo ? prev : e;
      var vte = Math.round(cic.vi * 1000);
      // Pmeseta = presión alveolar al final de la inspiración (pausa): PEEP + VT / C
      var pmes = PEEP + cic.vi / cic.C, crs = vte / (pmes - PEEP);
      // día y semana de soporte que representa el ciclo mostrado
      var cMostrado = ciclo ? ciclo - 1 : 0, k = progreso(cMostrado), dia = 1 + Math.round(k * (DIAS - 1)), sem = Math.min(4, Math.ceil(dia / 7));
      diaEl.textContent = "Semana " + sem + " · día " + dia;
      tlpEl.style.width = (k * 100).toFixed(1) + "%";
      Array.prototype.forEach.call(el.querySelectorAll("[data-sem]"), function (s) {
        var w = +s.getAttribute("data-sem");
        s.classList.toggle("on", w === sem);
        if (w < sem || (w === sem && dia === DIAS)) { if (!s.classList.contains("hecho")) { s.classList.add("hecho"); s.querySelector(".v").textContent = vte + " mL"; } }
        else if (w > sem || dia === 1) { s.classList.remove("hecho"); s.querySelector(".v").textContent = "—"; }
      });
      if (vte !== vtePrev) {
        vteEl.textContent = vte;
        vkgEl.textContent = (vte / PESO_IDEAL).toFixed(1).replace(".", ",");
        pmEl.textContent = pmes.toFixed(1).replace(".", ",");
        cdEl.textContent = Math.round(crs);
        fxEl.textContent = vte + " ÷ (" + pmes.toFixed(1).replace(".", ",") + " − 10) = " + Math.round(crs);
        trEl.textContent = vtePrev === null || vte === vtePrev ? "" : vte > vtePrev ? "▲" : "▼";
        trEl.className = "tr " + (vtePrev !== null && vte > vtePrev ? "up" : "");
        vtePrev = vte;
      }
    }
    function frame(ts) {
      if (!t0) t0 = ts;
      var t = (ts - t0) / 1000;
      if (ultimo === null) ultimo = Math.max(0, t - 0.05);
      if (t > ultimo) trazar(ultimo, t);
      ultimo = t;
      pintarCifras(t);
      raf = requestAnimationFrame(frame);
    }
    medir();
    if (REDUCIR) {
      // sin movimiento: una ventana completa con la compliance ya mejorada
      var base = (CICLOS + 1) * T;
      trazar(base, base + VENTANA - 0.01);
      pintarCifras(base + T + 0.1);
    } else {
      raf = requestAnimationFrame(frame);
    }
    enlazarPausa(el, function (p) {
      pausado = p;
      if (p) { cancelAnimationFrame(raf); raf = 0; tPausa = performance.now(); }
      else { t0 += performance.now() - tPausa; raf = requestAnimationFrame(frame); }
    });
    function alRedimensionar() {
      var t = ultimo; medir(); ultimo = t;
      if (t !== null) trazar(Math.max(0, t - (t % VENTANA)), REDUCIR ? t : Math.max(t - (t % VENTANA) + 0.001, t));
    }
    window.addEventListener("resize", alRedimensionar);
    return function () { cancelAnimationFrame(raf); window.removeEventListener("resize", alRedimensionar); };
  }

  // ------------------------------------------------------------------
  // 2. Destete VV (con el gas) y VA (con el flujo)
  // ------------------------------------------------------------------
  function destete(el) {
    el.innerHTML =
      '<div class="dst">' +
        '<div class="segc dst-seg" role="radiogroup" aria-label="Tipo de soporte">' +
          boton("ECMO VV · con el gas", ' role="radio" aria-checked="true" data-m="vv" class="on"') +
          boton("ECMO VA · con el flujo", ' role="radio" aria-checked="false" data-m="va"') +
        '</div>' +
        '<div class="dst-body" aria-live="polite"></div>' +
      '</div>';
    var body = el.querySelector(".dst-body");
    var VV =
      '<section class="dst-card"><h5>Antes de la prueba</h5>' +
        '<div class="dst-kpi">' +
          '<div><span>Sweep gas</span><b>&lt; 1</b><span>L/min</span></div>' +
          '<div><span>Paciente</span><b>RASS 0</b><span>despierto</span></div>' +
          '<div><span>Presión soporte</span><b>&lt; 12</b></div>' +
          '<div><span>FiO₂ del ECMO</span><b>100 %</b><span>se mantiene</span></div>' +
        '</div></section>' +
      '<section class="dst-card"><h5><span class="n vv">1</span>Clampar el sweep gas</h5>' +
        '<p>Con la <b>FiO₂ del ECMO al 100 %</b>, se clampa el sweep gas.</p>' +
        '<svg class="sweep" viewBox="0 0 330 92" role="img" aria-label="Línea de gas del oxigenador: el caudalímetro marca menos de 1 litro por minuto y una pinza cierra la línea hasta 0">' +
          '<rect class="cm" x="10" y="14" width="44" height="64" rx="8"/>' +
          '<path class="cm-tubo" d="M32 24 V68"/><circle class="cm-bola" cx="32" cy="60" r="6"/>' +
          '<text x="32" y="90" text-anchor="middle">sweep</text>' +
          '<path class="gas" d="M54 46 H232"/><path class="gas-on" d="M54 46 H232"/>' +
          '<rect class="oxi" x="232" y="20" width="92" height="52" rx="10"/><text x="278" y="50" text-anchor="middle" class="b">Oxigenador</text>' +
          '<g class="pinza"><path d="M136 26 L150 46 L136 66"/><path d="M164 26 L150 46 L164 66"/></g>' +
          '<text x="150" y="16" text-anchor="middle" class="b">&lt; 1 → 0 L/min</text>lt; 1 → 0 L/min</text>' +
        '</svg></section>' +
      '<section class="dst-card aborta"><h5><span class="n vv">2</span>Vigilar el esfuerzo · abortar si</h5>' +
        '<div class="dst-kpi tres">' +
          '<div><span>FR</span><b>&gt; 25–30</b><span>rpm</span></div>' +
          '<div><span>P0.1</span><b>&gt; 5</b><span>cmH₂O</span></div>' +
          '<div><span>SatO₂</span><b>&lt; 92</b><span>%</span></div>' +
        '</div></section>' +
      '<p class="dst-pie">Siempre con el gas: <b>nunca bajando el flujo de sangre</b>.</p>';
    var VA =
      '<section class="dst-card"><h5>Antes de empezar · ≥ 72 h</h5><p>Causa tratada y signos de recuperación.</p>' +
        '<div class="dst-kpi">' +
          '<div><span>Noradrenalina</span><b>&lt; 0,05</b><span>o dobutamina &lt; 5 mcg/kg/min</span></div>' +
          '<div><span>Presión de pulso</span><b>&gt; 30</b></div>' +
          '<div><span>Índice cardiaco</span><b>&gt; 2,2</b></div>' +
          '<div><span>PCP</span><b>&lt; 15</b></div>' +
        '</div></section>' +
      '<section class="dst-card"><h5>Criterios ecográficos</h5>' +
        '<div class="dst-kpi">' +
          '<div><span>IVT</span><b>&gt; 10–12</b><span>cm/s</span></div>' +
          '<div><span>FEVI</span><b>20–25 %</b></div>' +
          '<div><span>TDSa</span><b>&gt; 6</b><span>cm/s</span></div>' +
          '<div><span>Ventrículo izquierdo</span><b>sin estasis</b><span>ni humo</span></div>' +
        '</div><p class="dst-src">Anexo «Destete ECMO» del protocolo CHUB.</p></section>' +
      '<section class="dst-card"><h5><span class="n va">1</span>Prueba de bajada de flujo</h5>' +
        '<p><b>−0,5 L/min cada 10–15 min hasta 1,5 L/min</b>, valorando eco y hemodinámica en cada escalón.</p>' +
        '<svg class="flujo" viewBox="0 0 330 124" role="img" aria-label="El flujo baja en escalones de 0,5 hasta 1,5 litros por minuto; si la eco confirma el destete, sube a 2 a 2,5 litros por minuto hasta el quirófano">' +
          '<path class="eje" d="M4 116 H326"/>' +
          '<path class="esc" d="M8 20 H48 V38 H88 V56 H128 V74 H168 V92 H200 V52 H322"/>' +
          '<circle class="eco" cx="200" cy="92" r="6"/>' +
          '<text x="8" y="12">flujo actual</text>' +
          '<text x="130" y="108" class="b">1,5 L/min</text>' +
          '<text x="212" y="100" class="ok">eco ✓</text>' +
          '<text x="212" y="44" class="b">2–2,5 L/min</text>' +
          '<text x="212" y="72">hasta quirófano</text>' +
        '</svg></section>' +
      '<section class="dst-card"><h5><span class="n va">2</span>Eco y subida hasta el quirófano</h5>' +
        '<p>Si la <b>ecocardiografía</b> cumple los criterios ecográficos, <b>subir a 2–2,5 L/min</b> y mantener hasta la <b>decanulación en quirófano</b>, con ACT 180–200 durante ese periodo.</p></section>' +
      '<div class="note red"><b>Fracaso:</b> caída de PAM &gt; 10–20 o PAM &lt; 65 · aumento de presiones de llenado · arritmias · caída del gasto. Repetir la prueba a las 24 h.</div>';
    function ver(m) {
      body.innerHTML = m === "va" ? VA : VV;
      el.querySelector(".dst").setAttribute("data-m", m);
      Array.prototype.forEach.call(el.querySelectorAll(".dst-seg button"), function (b) {
        var on = b.getAttribute("data-m") === m;
        b.classList.toggle("on", on);
        b.setAttribute("aria-checked", String(on));
      });
    }
    el.querySelector(".dst-seg").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-m]");
      if (b) ver(b.getAttribute("data-m"));
    });
    ver("vv");
    return function () {};
  }

  // ------------------------------------------------------------------
  // 3. Cavitación: la presión de drenaje (P1) y las microburbujas
  // ------------------------------------------------------------------
  var NIVELES = [
    { p: -30, sev: "ok", t: "Succión correcta", m: "Dentro del rango seguro.", burb: 0, temblor: 0, colapso: 0 },
    { p: -65, sev: "info", t: "Succión moderada", m: "Por debajo de −50 mmHg ya son posibles microembolias gaseosas.", burb: 0.6, temblor: 0, colapso: 0.15 },
    { p: -90, sev: "warn", t: "Succión en el límite", m: "El protocolo pide no pasar de −80 mmHg. Vigilar hemólisis y revisar volemia.", burb: 2, temblor: 0.6, colapso: 0.4 },
    { p: -120, sev: "crit", t: "Succión excesiva · cavitación", m: "Bajar rpm de inmediato. Descartar hipovolemia, cánula acodada o mal posicionada, taponamiento, neumotórax y presión intraabdominal alta. No subir rpm: si es precarga, incluso bajarlas.", burb: 6, temblor: 1.6, colapso: 1 }
  ];
  function cavitacion(el) {
    el.innerHTML =
      '<div class="cav">' +
        '<div class="segc cav-seg" role="radiogroup" aria-label="Presión de drenaje P1">' +
          NIVELES.map(function (n, i) { return boton("P1 " + String(n.p).replace("-", "−"), ' role="radio" aria-checked="' + (i === 0) + '" data-i="' + i + '"' + (i === 0 ? ' class="on"' : "")); }).join("") +
        '</div>' +
        '<svg class="cav-sc" viewBox="0 0 360 230" role="img" aria-label="Cánula de drenaje en la vena cava, línea hasta la bomba centrífuga y microburbujas a la entrada de la bomba">' +
          '<defs><radialGradient id="cav-b" cx="35%" cy="35%" r="65%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9DCEC"/></radialGradient></defs>' +
          '<text x="14" y="20" class="lb">Vena cava</text>' +
          '<path class="vaso" d="M10 40 H130 V128 H10"/>' +
          '<path class="vaso-in" data-vaso d="M10 50 Q70 50 120 50 V118 Q70 118 10 118 Z"/>' +
          '<g data-linea><path class="canula" d="M40 84 H160 Q186 84 186 110 V150 Q186 176 212 176 H232"/>' +
          '<path class="sangre" d="M40 84 H160 Q186 84 186 110 V150 Q186 176 212 176 H232"/>' +
          '<circle class="toma" cx="186" cy="128" r="9"/><text x="200" y="124" class="lb b">P1</text><text x="200" y="140" class="lb mono" data-p1>−30 mmHg</text></g>' +
          '<g transform="translate(270 176)"><circle class="bomba" r="38"/><g data-rotor><path class="rotor" d="M0 -26 V26 M-26 0 H26 M-18 -18 L18 18 M-18 18 L18 -18"/></g><circle class="eje" r="6"/></g>' +
          '<text x="244" y="120" class="lb">Bomba</text>' +
          '<path class="salida" d="M308 176 H350"/>' +
          '<g data-burbujas></g>' +
          '<text x="14" y="222" class="lb mono" data-flujo>Flujo 4,2 L/min</text>' +
        '</svg>' +
        '<div class="pix-row">' + pausaHTML() + '<span class="pix-nota">Animación ilustrativa.</span></div>' +
        '<div class="cav-card" aria-live="polite"></div>' +
      '</div>';
    var svg = el.querySelector(".cav-sc"), gB = svg.querySelector("[data-burbujas]"), rotor = svg.querySelector("[data-rotor]");
    var linea = svg.querySelector("[data-linea]"), vaso = svg.querySelector("[data-vaso]"), p1 = svg.querySelector("[data-p1]");
    var flujo = svg.querySelector("[data-flujo]"), card = el.querySelector(".cav-card");
    var nivel = NIVELES[0], burbujas = [], raf = 0, tAnt = 0, ang = 0, acum = 0, pausado = false, reloj = 0;
    var NS = "http://www.w3.org/2000/svg";
    function ver(i) {
      nivel = NIVELES[i];
      p1.textContent = String(nivel.p).replace("-", "−") + " mmHg";
      el.querySelector(".cav").setAttribute("data-sev", nivel.sev);
      card.className = "cav-card " + nivel.sev;
      card.innerHTML = '<b>' + nivel.t + '</b><p>' + nivel.m + '</p><span class="src">Protocolo CHUB · umbrales de P1</span>';
      Array.prototype.forEach.call(el.querySelectorAll(".cav-seg button"), function (b) {
        var on = +b.getAttribute("data-i") === i;
        b.classList.toggle("on", on);
        b.setAttribute("aria-checked", String(on));
      });
      if (REDUCIR) estatico();
    }
    function nuevaBurbuja() {
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("fill", "url(#cav-b)");
      c.setAttribute("stroke", "#7FA6C8");
      c.setAttribute("stroke-width", "0.8");
      gB.appendChild(c);
      // nacen en el codo, justo antes de la bomba, y viajan hacia ella
      return { el: c, s: 0, v: 0.35 + Math.random() * 0.25, dy: (Math.random() - 0.5) * 8, r: 2 + Math.random() * 3 };
    }
    function posicion(s) {
      // recorrido: codo de la línea (186,110) → entrada de la bomba (232,176)
      if (s < 0.5) { var k = s / 0.5; return [186, 110 + 40 * k]; }
      var q = (s - 0.5) / 0.5; return [186 + 46 * q, 150 + 26 * q];
    }
    function paso(dt) {
      reloj += dt;
      ang = (ang + dt * 540) % 360;
      rotor.setAttribute("transform", "rotate(" + ang.toFixed(1) + ")");
      acum += dt * nivel.burb;
      while (acum > 1) { acum -= 1; burbujas.push(nuevaBurbuja()); }
      burbujas = burbujas.filter(function (b) {
        b.s += dt * b.v;
        if (b.s >= 1) { b.el.remove(); return false; }
        var pt = posicion(b.s), r = b.s > 0.82 ? b.r * (1 - (b.s - 0.82) / 0.18) : b.r; // colapsan al llegar a la bomba
        b.el.setAttribute("cx", (pt[0] + b.dy * 0.3).toFixed(1));
        b.el.setAttribute("cy", (pt[1] + b.dy * 0.4).toFixed(1));
        b.el.setAttribute("r", Math.max(0.2, r).toFixed(2));
        return true;
      });
      var tb = nivel.temblor ? Math.sin(reloj * 55) * nivel.temblor : 0;
      linea.setAttribute("transform", "translate(" + (tb * 0.6).toFixed(2) + " " + tb.toFixed(2) + ")");
      // la pared de la vena se cierra sobre la cánula con la succión (chugging)
      var cierre = nivel.colapso * (0.55 + 0.45 * Math.max(0, Math.sin(reloj * 3.2)));
      var a = 50 + 22 * cierre, bb = 118 - 22 * cierre;
      vaso.setAttribute("d", "M10 50 Q70 " + a.toFixed(1) + " 120 50 V118 Q70 " + bb.toFixed(1) + " 10 118 Z");
      var f = 4.2 - (nivel.sev === "crit" ? 0.5 + 0.6 * Math.max(0, Math.sin(reloj * 3.2)) : nivel.sev === "warn" ? 0.1 : 0);
      flujo.textContent = "Flujo " + f.toFixed(1).replace(".", ",") + " L/min" + (nivel.sev === "crit" ? " · oscila" : "");
    }
    function frame(ts) {
      var dt = tAnt ? Math.min(0.05, (ts - tAnt) / 1000) : 0;
      tAnt = ts;
      paso(dt);
      raf = requestAnimationFrame(frame);
    }
    function estatico() {
      gB.innerHTML = ""; burbujas = [];
      var n = Math.round(nivel.burb * 1.5);
      for (var i = 0; i < n; i++) { var b = nuevaBurbuja(); b.s = 0.1 + 0.75 * i / Math.max(1, n); burbujas.push(b); }
      paso(0);
    }
    el.querySelector(".cav-seg").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-i]");
      if (b) ver(+b.getAttribute("data-i"));
    });
    ver(0);
    if (!REDUCIR) raf = requestAnimationFrame(frame); else estatico();
    enlazarPausa(el, function (p) {
      pausado = p;
      if (p) { cancelAnimationFrame(raf); raf = 0; } else { tAnt = 0; raf = requestAnimationFrame(frame); }
    });
    return function () { cancelAnimationFrame(raf); };
  }

  window.ECMO_PIX = { respirador: respirador, destete: destete, cavitacion: cavitacion };
})();
