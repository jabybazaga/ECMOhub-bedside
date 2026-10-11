/* =====================================================================
   Perlas interactivas: respirador en VV, destete VV/VA, cavitación,
   revisión de la membrana y síndrome de Arlequín.
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
      '<div class="pix-row">' + pausaHTML() + '<span class="pix-nota">Paciente de ejemplo: varón de 1,70 m, peso ideal 66 kg. Crs de 15 a 30 mL/cmH₂O en 4 semanas (rangos publicados en ECMO VV). Aquí se comprimen en menos de un minuto.</span></div>' +
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
    var VEL = 2;                                   // la animación corre al doble del tiempo real del modelo
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
      var t = (ts - t0) / 1000 * VEL;
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

  // ------------------------------------------------------------------
  // 4. Revisión diaria de la membrana: consola (puntos 1–2) y analítica (3–4)
  //    Cifras de ejemplo; umbrales del protocolo CHUB tal como los recoge la app.
  // ------------------------------------------------------------------
  var MEMB = {
    ok: {
      rpm: 3200, flujo: "4,2", p1: -40, p2: 180, p3: 160,
      gas: [["PO₂", "mmHg", 40, 420], ["PCO₂", "mmHg", 46, 32], ["SatO₂", "%", 70, 100]],
      lab: { hbl: 8, ldh: 280, hapto: "1,2", bili: "0,8", fib: 320, plaq: 180, dd: 4, inr: "1,1" }
    },
    mal: {
      rpm: 3200, flujo: "3,8", p1: -45, p2: 260, p3: 190,
      gas: [["PO₂", "mmHg", 41, 130], ["PCO₂", "mmHg", 47, 44], ["SatO₂", "%", 71, 98]],
      lab: { hbl: 85, ldh: 1250, hapto: "&lt; 0,1", bili: "3,4", fib: 140, plaq: 65, dd: 32, inr: "1,6" }
    }
  };
  function membrana(el) {
    el.innerHTML =
      '<div class="mb">' +
        '<div class="segc mb-vista" role="radiogroup" aria-label="Qué revisar">' +
          boton("1–2 · Consola", ' role="radio" aria-checked="true" data-v="consola" class="on"') +
          boton("3–4 · Analítica", ' role="radio" aria-checked="false" data-v="lab"') +
        '</div>' +
        '<div class="segc mini mb-esc" role="radiogroup" aria-label="Escenario de la membrana">' +
          boton("Normal", ' role="radio" aria-checked="true" data-e="ok" class="on"') +
          boton("Con problemas", ' role="radio" aria-checked="false" data-e="mal"') +
        '</div>' +
        '<div class="mb-body" aria-live="polite"></div>' +
        '<p class="pix-nota">Cifras de ejemplo. Umbrales del protocolo CHUB.</p>' +
      '</div>';
    var body = el.querySelector(".mb-body"), vista = "consola", esc = "ok";
    function chip(sev, txt) { return '<span class="mb-flag ' + sev + '">' + txt + '</span>'; }

    function consola(d) {
      var dp = d.p2 - d.p3, mal = esc === "mal";
      var gases = d.gas.map(function (g) {
        var post = g[3], flag = "";
        if (g[0] === "PO₂") flag = post < 150 ? chip("crit", "&lt; 150") : post < 300 ? chip("warn", "&lt; 300") : chip("ok", "&gt; 300");
        if (g[0] === "PCO₂") flag = (g[2] - post) < 5 ? chip("warn", "apenas baja") : chip("ok", "−" + (g[2] - post));
        return '<tr><th scope="row">' + g[0] + ' <small>' + g[1] + '</small></th><td>' + g[2] + '</td><td class="post">' + post + '</td><td>' + flag + '</td></tr>';
      }).join("");
      return '' +
        '<div class="mb-cons" role="group" aria-label="Pantalla de consola de ECMO">' +
          '<div class="mc-top"><span class="mc-tag">CONSOLA</span><span class="mc-big"><b>' + d.rpm + '</b> rpm</span><span class="mc-big"><b>' + d.flujo + '</b> L/min</span></div>' +
          '<svg class="mc-circ" viewBox="0 0 340 160" role="img" aria-label="Circuito: drenaje, bomba, oxigenador con tomas de gases pre y post, y retorno; conectores marcados">' +
            '<path class="ln ven" d="M10 130 H66 Q82 130 82 114 V94"/><path class="ln ven fl" d="M10 130 H66 Q82 130 82 114 V94"/>' +
            '<circle class="bomba" cx="82" cy="76" r="18"/><path class="rotor" d="M82 63 V89 M69 76 H95"/>' +
            '<path class="ln ven" d="M100 76 H160"/><path class="ln ven fl" d="M100 76 H160"/>' +
            '<rect class="oxi" x="160" y="44" width="60" height="64" rx="10"/>' +
            '<path class="fibras" d="M168 56 H212 M168 66 H212 M168 76 H212 M168 86 H212 M168 96 H212"/>' +
            (mal ? '<g class="trombo"><circle cx="167" cy="58" r="5"/><circle cx="171" cy="95" r="4"/><circle cx="165" cy="78" r="3"/></g>' : '') +
            '<path class="ln art" d="M220 76 H292 Q308 76 308 92 V130 H334"/><path class="ln art fl" d="M220 76 H292 Q308 76 308 92 V130 H334"/>' +
            '<g class="conector' + (mal ? ' mal' : '') + '"><rect x="34" y="123" width="12" height="14" rx="3"/><rect x="106" y="69" width="12" height="14" rx="3"/><rect x="270" y="69" width="12" height="14" rx="3"/>' +
            (mal ? '<circle class="coag" cx="40" cy="130" r="3.5"/><circle class="coag" cx="276" cy="76" r="3.5"/>' : '') + '</g>' +
            '<g class="toma pre"><circle cx="138" cy="76" r="6"/><text x="144" y="104" text-anchor="end">gas pre</text></g>' +
            '<g class="toma post"><circle cx="246" cy="76" r="6"/><text x="240" y="104" text-anchor="start">gas post</text></g>' +
            '<text x="190" y="126" text-anchor="middle" class="lb">Oxigenador</text>' +
            '<text x="82" y="46" text-anchor="middle" class="lb">bomba</text>' +
            '<text x="40" y="154" text-anchor="middle" class="lb">conector</text>' +
          '</svg>' +
          '<div class="mc-p">' +
            '<div><span>P1</span><b>' + String(d.p1).replace("-", "−") + '</b></div>' +
            '<div' + (d.p2 > 200 ? ' class="warn"' : '') + '><span>P2 pre</span><b>' + d.p2 + '</b></div>' +
            '<div><span>P3 post</span><b>' + d.p3 + '</b></div>' +
            '<div class="dp ' + (dp > 50 ? "crit" : dp > 35 ? "warn" : "ok") + '"><span>ΔP</span><b>' + dp + '</b></div>' +
          '</div>' +
        '</div>' +
        '<section class="mb-card"><h5><span class="n">1</span>Oxigenación y lavado de CO₂</h5>' +
          '<p>Comparar los <b>gases premembrana y postmembrana</b>.</p>' +
          '<table class="mb-gas"><thead><tr><th></th><th>Pre</th><th>Post</th><th></th></tr></thead><tbody>' + gases + '</tbody></table>' +
          '<p class="mb-ref">PO₂ postmembrana: objetivo &gt; 300 mmHg; por debajo de 150, el protocolo obliga al cambio.</p></section>' +
        '<section class="mb-card"><h5><span class="n">2</span>Coágulos</h5>' +
          '<p><b>Inspeccionar las conexiones</b>: el flujo turbulento acumula coágulos. Monitorizar el <b>ΔP = P2 − P3</b> para detectar los que no se ven dentro de la membrana.</p>' +
          '<p class="mb-ref">ΔP &gt; 50 mmHg o un ascenso del 30–50 % sobre el basal sugiere trombosis. Ahora: <b>ΔP ' + dp + ' mmHg</b>.</p></section>';
    }

    // Folio de laboratorio: resultado, indicador H/L, unidades y umbral del protocolo.
    // Los valores alterados llevan rotulador; los puntos 3 y 4, anotación a mano en el margen.
    function fila(prueba, val, flag, uni, ref, sev) {
      return '<tr class="' + (sev || "") + '"><th scope="row">' + prueba + '</th>' +
        '<td class="v"><span class="tinta">' + val + '</span></td>' +
        '<td class="f">' + (flag ? '<b aria-label="' + (flag.charAt(0) === "H" ? "alto" : "bajo") + '">' + flag + '</b>' : '') + '</td>' +
        '<td class="u">' + uni + '</td><td class="r">' + ref + '</td></tr>';
    }
    function analitica(d) {
      var L = d.lab, mal = esc === "mal";
      var hem = [
        fila("Hemoglobina libre", L.hbl, L.hbl > 50 ? "H*" : "", "mg/dL", "&gt; 50: hemólisis", L.hbl > 50 ? "crit" : ""),
        fila("LDH", L.ldh, L.ldh > 350 ? (L.ldh > 1000 ? "H*" : "H") : "", "UI/L", "&gt; 350 · &gt; 1000 cabezal", L.ldh > 1000 ? "crit" : L.ldh > 350 ? "warn" : ""),
        fila("Haptoglobina", L.hapto, mal ? "L" : "", "g/L", "baja si hemólisis", mal ? "warn" : ""),
        fila("Bilirrubina total", L.bili, mal ? "H" : "", "mg/dL", "sube si hemólisis", mal ? "warn" : "")
      ].join("");
      var coa = [
        fila("Plaquetas", L.plaq, L.plaq < 100 ? "L" : "", "×10⁹/L", "&gt; 50–100 · descenso", L.plaq < 100 ? "warn" : ""),
        fila("Fibrinógeno (Clauss)", L.fib, L.fib < 200 ? "L*" : "", "mg/dL", "&lt; 200: consumo", L.fib < 200 ? "crit" : ""),
        fila("Dímero D", L.dd, L.dd > 25 ? "H*" : "", "mg/L", "&gt; 25–30: trombosis", L.dd > 25 ? "crit" : ""),
        fila("INR (TP)", L.inr, mal ? "H" : "", "", "alargado: coagulopatía", mal ? "warn" : "")
      ].join("");
      return '' +
        '<figure class="folio" aria-label="Hoja de resultados de laboratorio de ejemplo">' +
          '<div class="fo-hd">' +
            '<div class="fo-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/></svg></div>' +
            '<div class="fo-tit"><b>Laboratorio de análisis clínicos</b><span>Informe de resultados</span></div>' +
            '<div class="fo-meta"><span>Sangre · 07:30</span><span>UCI · ECMO</span></div>' +
          '</div>' +
          '<div class="fo-pac"><span>Paciente: <i>— (ejemplo)</i></span><span>Peticionario: Medicina Intensiva</span></div>' +
          '<table class="fo-t"><thead><tr><th>Determinación</th><th>Resultado</th><th></th><th>Unid.</th><th>Umbral ECMO</th></tr></thead><tbody>' +
            '<tr class="sec"><td colspan="5"><span class="fo-s">Bioquímica</span><span class="pluma">③ Hemólisis</span></td></tr>' + hem +
            '<tr class="sec"><td colspan="5"><span class="fo-s">Hemostasia · hematimetría</span><span class="pluma">④ Consumo</span></td></tr>' + coa +
          '</tbody></table>' +
          '<div class="fo-pie"><span>* Valor crítico · H alto · L bajo</span><span>Página 1 de 1</span></div>' +
          '<svg class="fo-firma" viewBox="0 0 120 30" aria-hidden="true"><path d="M4 22 C14 6 20 26 28 14 S40 4 44 18 S58 26 64 12 S80 8 86 18 S104 24 116 10"/></svg>' +
          '<span class="fo-sello" aria-hidden="true">EJEMPLO</span>' +
        '</figure>' +
        '<section class="mb-card"><h5><span class="n">3</span>Hemólisis</h5><p>El dato directo es la <b>hemoglobina libre</b>. Indirectos: <b>LDH</b>, <b>haptoglobina</b> y <b>bilirrubina</b>.</p></section>' +
        '<section class="mb-card"><h5><span class="n">4</span>Coagulopatía de consumo</h5><p>Buscar <b>consumo de fibrinógeno</b>, <b>plaquetopenia</b> o <b>coagulopatía</b>.</p>' +
          '<p class="mb-ref">La columna «Umbral ECMO» recoge los del protocolo CHUB. Haptoglobina, bilirrubina e INR no tienen umbral en el protocolo: vigilar la tendencia.</p></section>';
    }
    function pintar() {
      var d = MEMB[esc];
      body.innerHTML = vista === "consola" ? consola(d) : analitica(d);
      el.querySelector(".mb").setAttribute("data-esc", esc);
    }
    function marcar(sel, attr, val) {
      Array.prototype.forEach.call(el.querySelectorAll(sel + " button"), function (b) {
        var on = b.getAttribute(attr) === val;
        b.classList.toggle("on", on);
        b.setAttribute("aria-checked", String(on));
      });
    }
    el.querySelector(".mb-vista").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-v]");
      if (!b) return;
      vista = b.getAttribute("data-v"); marcar(".mb-vista", "data-v", vista); pintar();
    });
    el.querySelector(".mb-esc").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-e]");
      if (!b) return;
      esc = b.getAttribute("data-e"); marcar(".mb-esc", "data-e", esc); pintar();
    });
    pintar();
    return function () {};
  }

  // ------------------------------------------------------------------
  // 5. Síndrome de Arlequín: el punto de mezcla recorre la aorta según
  //    cuánto eyecta el corazón nativo. Saturaciones y velocidades ilustrativas.
  // ------------------------------------------------------------------
  var ARL_ROJO = [200, 40, 52], ARL_AZUL = [47, 104, 212];
  var ARL = [
    { gc: 0.08, lat: 0.012, seg: "GC muy bajo", t: "1 · GC nativo muy disminuido",
      m: "El corazón apenas eyecta. La oxigenación de todo el cuerpo, <b>cerebro incluido</b>, depende del flujo del ECMO VA periférico: la gasometría de radial derecha, radial izquierda y pierna muestra sangre muy oxigenada y el NIRS cerebral es simétrico.",
      sat: [1, 1, 1] },
    { gc: 0.55, lat: 0.045, seg: "Empieza a recuperar", t: "2 · El corazón empieza a recuperar",
      m: "Con el pulmón aún sin intercambio, el VI eyecta sangre <b>poco oxigenada</b> hacia el tronco braquiocefálico y el punto de mezcla se desplaza por el cayado. El pulsioxímetro y la gasometría de la <b>mano derecha</b> caen; la mano izquierda y la pierna siguen bien oxigenadas. El <b>NIRS derecho</b> cae y aparece la asimetría R/L.",
      sat: [0, 1, 1] },
    { gc: 1, lat: 0.075, seg: "Recupera más", t: "3 · Recupera más contractilidad",
      m: "El punto de mezcla pasa a la aorta descendente, más allá de la subclavia izquierda. <b>Todo el cerebro</b> recibe sangre poco oxigenada y los pulsioxímetros de <b>ambas manos</b> marcan 80–85 %; caen <b>ambos NIRS</b>. Las piernas siguen bien oxigenadas.",
      sat: [0, 0, 1] }
  ];
  function arlequin(el) {
    var P = {
      A: "M158 172 C150 156 146 136 152 124 C158 112 176 110 184 120 C190 128 188 140 186 152 L178 250 C174 262 150 268 142 290 L137 328",
      BCT: "M154 120 C150 108 146 100 142 96",
      RC: "M142 96 C144 86 146 76 147 52",
      RS: "M142 96 C130 96 112 98 101 110 L85 180 L76 246",
      LCC: "M167 112 C168 98 171 84 173 52",
      LSA: "M179 114 C190 104 206 100 219 110 L235 180 L244 246",
      RL: "M137 328 L134 382",
      LI: "M178 250 C182 262 182 272 182 290 L184 382"
    };
    var ID = ["A", "BCT", "RC", "RS", "LCC", "LSA", "RL", "LI"];
    el.innerHTML =
      '<div class="arl">' +
        '<p class="arl-req"><span>ECMO VA periférica</span><i>+</i><span>Fallo respiratorio</span><i>+</i><span>Recuperación cardiaca</span></p>' +
        '<div class="segc arl-seg" role="radiogroup" aria-label="Gasto cardiaco nativo">' +
          ARL.map(function (s, i) { return boton(s.seg, ' role="radio" aria-checked="' + (i === 0) + '" data-i="' + i + '"' + (i === 0 ? ' class="on"' : "")); }).join("") +
        '</div>' +
        '<svg class="arl-sc" viewBox="0 0 320 408" role="img" aria-label="Silueta con el corazón, la aorta, los troncos supraaórticos y la cánula de retorno femoral del ECMO. El color de cada vaso indica si lleva sangre del corazón, poco oxigenada, o del ECMO, oxigenada.">' +
          '<defs><pattern id="arl-pul" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="pul-f"/><path d="M0 0 V6" class="pul-l"/></pattern></defs>' +
          '<g class="cuerpo">' +
            '<ellipse cx="160" cy="44" rx="30" ry="34"/><rect x="146" y="72" width="28" height="26"/>' +
            '<path d="M108 96 Q160 88 212 96 L218 120 L214 270 Q160 282 106 270 L102 120 Z"/>' +
            '<path d="M108 98 Q92 100 88 118 L70 238 Q68 250 76 252 Q84 252 86 240 L104 132 Z"/>' +
            '<path d="M212 98 Q228 100 232 118 L250 238 Q252 250 244 252 Q236 252 234 240 L216 132 Z"/>' +
            '<path d="M110 262 L157 272 L151 392 L125 392 Z"/><path d="M210 262 L163 272 L169 392 L195 392 Z"/>' +
          '</g>' +
          '<path class="hemi" data-hemi="d" d="M158 18 C140 18 134 32 134 44 C134 58 144 68 158 68 Z"/>' +
          '<path class="hemi" data-hemi="i" d="M162 18 C180 18 186 32 186 44 C186 58 176 68 162 68 Z"/>' +
          '<path class="pulmon" d="M120 124 Q110 162 118 206 Q134 214 146 202 L148 132 Q138 116 120 124 Z"/>' +
          '<path class="pulmon" d="M200 124 Q210 162 202 206 Q186 214 174 204 L172 140 Q182 116 200 124 Z"/>' +
          '<path class="canula-v" d="M152 213 C146 240 132 262 126 290 L120 334"/><path class="dren-core" d="M152 213 C146 240 132 262 126 290 L120 334"/>' +
          '<path class="linea-dren" d="M120 334 C100 330 70 314 44 326"/>' +
          '<path class="ruta" data-ruta="dren" d="M152 213 C146 240 132 262 126 290 L120 334 C100 330 70 314 44 326"/>' +
          '<path class="ruta" data-ruta="ret" d="M62 342 C88 346 106 352 118 356 L137 328"/>' +
          '<g data-corazon><path class="corazon" d="M160 182 C154 170 138 172 140 186 C142 200 160 210 168 216 C176 208 192 198 192 186 C192 172 174 170 170 182 Z"/></g>' +
          ID.map(function (k) { return '<path class="vaso" data-v="' + k + '" d="' + P[k] + '"/>'; }).join("") +
          '<path class="vaso az" data-az d="' + P.A + '"/>' +
          '<g data-gotas></g>' +
          '<g data-m><circle class="m-halo" r="13"/><circle class="m-pt" r="7"/><text class="m-tx" y="4">M</text></g>' +
          '<path class="canula" d="M118 356 L137 328"/>' +
          '<path class="linea-ecmo" d="M62 342 C88 346 106 352 118 356"/>' +
          '<g transform="translate(14 326)"><rect class="ecmo" width="48" height="32" rx="6"/><text class="ecmo-t" x="24" y="20">ECMO</text></g>' +
          '<text class="lb" x="6" y="384">Drenaje: VCI</text><text class="lb" x="6" y="398">Retorno: femoral</text>' +
          '<rect class="sensor" x="140" y="22" width="11" height="7" rx="2"/><rect class="sensor" x="169" y="22" width="11" height="7" rx="2"/>' +
          '<g class="nirs" transform="translate(222 6)"><rect width="94" height="52" rx="8"/><text class="k" x="8" y="15">NIRS cerebral</text>' +
            '<text class="k" x="10" y="40">R</text><text class="nv" data-nirs="r" x="21" y="42">80</text>' +
            '<text class="k" x="52" y="40">L</text><text class="nv" data-nirs="l" x="62" y="42">80</text></g>' +
          [["Mano dcha", 2, 270], ["Mano izda", 242, 270], ["Pierna", 204, 352]].map(function (t, i) {
            return '<g class="tag" data-o="' + i + '" transform="translate(' + t[1] + " " + t[2] + ')"><rect width="76" height="46" rx="8"/><text class="k" x="7" y="13">' + t[0] + '</text><text class="v" x="7" y="29">—</text><path d=""/></g>';
          }).join("") +
          '<g class="clip" transform="translate(76 262)"><rect x="-9" y="-6" width="18" height="12" rx="4"/></g>' +
          '<g class="clip" transform="translate(244 262)"><rect x="-9" y="-6" width="18" height="12" rx="4"/></g>' +
          '<g class="clip" transform="translate(180 384)"><rect x="-9" y="-6" width="18" height="12" rx="4"/></g>' +
          
        '</svg>' +
        '<div class="arl-ley"><span><i class="az"></i>Poco oxigenada: corazón y drenaje</span><span><i class="ro"></i>Oxigenada: retorno del ECMO</span><span><i class="mz"></i>M · punto de mezcla</span><span><i class="pu"></i>Pulmón sin intercambio</span></div>' +
        '<div class="pix-row">' + pausaHTML() + '<span class="pix-nota">Animación y saturaciones ilustrativas.</span></div>' +
        '<div class="cav-card arl-card" aria-live="polite"></div>' +
      '</div>';

    var svg = el.querySelector(".arl-sc"), V = {};
    ID.forEach(function (k) { V[k] = svg.querySelector('[data-v="' + k + '"]'); });
    var az = svg.querySelector("[data-az]"), gG = svg.querySelector("[data-gotas]"), mk = svg.querySelector("[data-m]");
    var corazon = svg.querySelector("[data-corazon]"), card = el.querySelector(".arl-card");
    var LA = V.A.getTotalLength(), LEN = {};
    ID.forEach(function (k) { LEN[k] = V[k].getTotalLength(); });
    // Longitud sobre la aorta donde nace cada tronco
    function origen(x, y) {
      var mejor = 0, dmin = 1e9;
      for (var l = 0; l <= LA; l += 1) { var p = V.A.getPointAtLength(l), d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (d < dmin) { dmin = d; mejor = l; } }
      return mejor;
    }
    var O = { BCT: origen(154, 120), LCC: origen(167, 112), LSA: origen(179, 114) };
    // Punto de mezcla de cada situación: raíz · entre braquiocefálico y carótida izda · pasada la subclavia izda
    var MZ = [6, O.BCT + 0.75 * (O.LCC - O.BCT), O.LSA + 26];
    var NS = "http://www.w3.org/2000/svg", pool = [];
    for (var i = 0; i < 150; i++) { var c = document.createElementNS(NS, "circle"); c.setAttribute("r", "1.9"); c.setAttribute("class", "gota"); gG.appendChild(c); pool.push(c); }
    var idx = 0, est = 0, lm = MZ[0], gc = ARL[0].gc, reloj = 0, raf = 0, tAnt = 0;

    var RUTA = { dren: svg.querySelector('[data-ruta="dren"]'), ret: svg.querySelector('[data-ruta="ret"]') };
    RUTA.lDren = RUTA.dren.getTotalLength(); RUTA.lRet = RUTA.ret.getTotalLength();
    function nirs(lado, k) {
      var t = svg.querySelector('[data-nirs="' + lado + '"]');
      t.textContent = Math.round(80 - 25 * k);
      t.setAttribute("class", "nv" + (k > 0.5 ? " baja" : ""));
    }
    function mezcla(a, b, k) { return "rgb(" + a.map(function (v, j) { return Math.round(v + (b[j] - v) * k); }).join(",") + ")"; }
    // 0 = sangre del ECMO (roja) · 1 = sangre del corazón (azul)
    function azulDe(o) { return Math.max(0, Math.min(1, (lm - o) / 5)); }
    function colores() {
      var k = { BCT: azulDe(O.BCT), LCC: azulDe(O.LCC), LSA: azulDe(O.LSA) };
      k.RC = k.RS = k.BCT;
      ID.forEach(function (n) { if (n !== "A") V[n].style.stroke = mezcla(ARL_ROJO, ARL_AZUL, k[n] || 0); });
      svg.querySelector('[data-hemi="d"]').style.fill = mezcla(ARL_ROJO, ARL_AZUL, k.RC);
      svg.querySelector('[data-hemi="i"]').style.fill = mezcla(ARL_ROJO, ARL_AZUL, k.LCC);
      // NIRS: simétrico en 80; cae a 55 en el hemisferio que recibe sangre del corazón
      nirs("r", k.RC); nirs("l", k.LCC);
      az.setAttribute("stroke-dasharray", lm.toFixed(1) + " " + (LA + 10));
      var p = V.A.getPointAtLength(lm);
      mk.setAttribute("transform", "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")");
      return k;
    }
    function gotas(k) {
      var n = 0;
      function tramo(path, desde, hasta, vel, inverso) {
        var largo = hasta - desde;
        if (largo <= 2) return;
        var fase = (reloj * vel) % 12;
        for (var s = fase; s < largo && n < pool.length; s += 12) {
          var l = inverso ? hasta - s : desde + s, p = path.getPointAtLength(l), g = pool[n++];
          g.setAttribute("cx", p.x.toFixed(1)); g.setAttribute("cy", p.y.toFixed(1)); g.style.display = "";
        }
      }
      var vEcmo = 34, vCor = 34 * gc;
      tramo(V.A, 0, lm, vCor, false);
      tramo(V.A, lm, LA, vEcmo, true);
      ["BCT", "RC", "RS", "LCC", "LSA"].forEach(function (t) { tramo(V[t], 0, LEN[t], (k[t] > 0.5 ? vCor : vEcmo) * 0.8, false); });
      tramo(V.RL, 0, LEN.RL, vEcmo * 0.6, false);
      tramo(V.LI, 0, LEN.LI, vEcmo * 0.7, false);
      tramo(RUTA.dren, 0, RUTA.lDren, vEcmo, false);
      tramo(RUTA.ret, 0, RUTA.lRet, vEcmo, false);
      for (; n < pool.length; n++) pool[n].style.display = "none";
    }
    function pleth(i, ok) {
      var amp = 0.6 + 7 * ARL[est].gc, d = "M7 42";
      for (var x = 0; x <= 62; x += 2) {
        var f = (x % 19) / 19, y = f < 0.3 ? Math.sin(f / 0.3 * Math.PI / 2) : Math.max(0, 1 - (f - 0.3) / 0.7) * (1 + 0.25 * Math.sin((f - 0.3) * 14));
        d += " L" + (7 + x) + " " + (42 - amp * y).toFixed(1);
      }
      var o = svg.querySelector('.tag[data-o="' + i + '"]');
      o.querySelector("path").setAttribute("d", d);
      o.setAttribute("class", "tag " + (ok ? "ok" : "baja"));
      o.querySelector(".v").textContent = ok ? "95–100 %" : "80–85 %";
    }
    function paso(dt) {
      reloj += dt;
      var obj = MZ[est], ogc = ARL[est].gc;
      lm += (obj - lm) * Math.min(1, dt * 2.2);
      gc += (ogc - gc) * Math.min(1, dt * 2.2);
      var k = colores();
      gotas(k);
      var lat = 1 + ARL[est].lat * Math.pow(Math.max(0, Math.sin(reloj * Math.PI * 2 * 1.2)), 3);
      corazon.setAttribute("transform", "translate(166 192) scale(" + lat.toFixed(3) + ") translate(-166 -192)");
      var h = 0.5 + 0.5 * Math.sin(reloj * 4);
      mk.querySelector(".m-halo").setAttribute("r", (11 + 4 * h).toFixed(1));
    }
    function ver(i) {
      est = i;
      var s = ARL[i];
      card.innerHTML = "<b>" + s.t + "</b><p>" + s.m + '</p><span class="src">Medir en <b>radial derecha</b>: es la primera en caer. La pulsioximetría de la pierna engaña.</span>';
      Array.prototype.forEach.call(el.querySelectorAll(".arl-seg button"), function (b) {
        var on = +b.getAttribute("data-i") === i;
        b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on));
      });
      gc = REDUCIR ? s.gc : gc;
      s.sat.forEach(function (ok, j) { pleth(j, ok); });
      if (REDUCIR) { lm = MZ[i]; paso(0); }
    }
    function frame(ts) {
      var dt = tAnt ? Math.min(0.05, (ts - tAnt) / 1000) : 0;
      tAnt = ts;
      paso(dt);
      raf = requestAnimationFrame(frame);
    }
    el.querySelector(".arl-seg").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-i]");
      if (b) { ver(+b.getAttribute("data-i")); if (raf) return; paso(0.5); }
    });
    ver(0);
    paso(0);
    if (!REDUCIR) raf = requestAnimationFrame(frame);
    enlazarPausa(el, function (p) {
      if (p) { cancelAnimationFrame(raf); raf = 0; } else { tAnt = 0; raf = requestAnimationFrame(frame); }
    });
    return function () { cancelAnimationFrame(raf); };
  }

  window.ECMO_PIX = { respirador: respirador, destete: destete, cavitacion: cavitacion, membrana: membrana, arlequin: arlequin };
})();
