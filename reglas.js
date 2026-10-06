/* Reglas clínicas de la ronda diaria de ECMO a pie de cama.
 *
 * Funciones puras, sin acceso a la página: reciben los valores de la ronda
 * y devuelven los valores derivados y los avisos. Las usa app.js en el móvil
 * y las comprueban las pruebas de tests/reglas.test.js (node --test).
 *
 * Cualquier cambio de un umbral aquí debe ir acompañado del cambio en su
 * prueba: así un número mal tecleado no llega a publicarse.
 */
(function (root) {
  "use strict";

  var n0 = function (v) { return Math.round(v).toString(); };
  var n1 = function (v) { return (Math.round(v * 10) / 10).toString().replace(".", ","); };
  var n2 = function (v) { return (Math.round(v * 100) / 100).toString().replace(".", ","); };
  function F(sev, titulo, valor, mensaje, fuente) { return { sev: sev, t: titulo, v: valor, m: mensaje, src: fuente }; }

  // v: { peso, flujo, ... } en mmHg y unidades del protocolo (null o vacío = sin dato).
  // modo: "vv" | "va". sangrado: "no" | "leve" | "grave".
  function evaluar(v, modo, sangrado) {
    v = v || {};
    sangrado = sangrado || "no";
    var x = function (k) { var n = v[k]; return (n === null || n === undefined || n === "") ? NaN : Number(n); };
      var peso = x("peso"), flujo = x("flujo"), sweep = x("sweep"), rpm = x("rpm");
      var p1 = x("p1"), p2 = x("p2"), p3m = x("p3m"), po2post = x("po2post"), dias = x("dias");
      // P2 premembrana y P3 postmembrana (ambas positivas); ΔP = P2 − P3 es el gradiente de la membrana.
      var dpm = (isFinite(p2) && isFinite(p3m)) ? p2 - p3m : NaN;
      var fc = x("fc"), tas = x("tas"), tad = x("tad"), ic = x("ic"), lactato = x("lactato");
      var sao2 = x("sao2"), svo2 = x("svo2"), pao2 = x("pao2"), paco2 = x("paco2"), ph = x("ph");
      var hb = x("hb"), plaq = x("plaq"), fibri = x("fibri"), act = x("act"), ttpa = x("ttpa"), ldh = x("ldh");
      var diuresis = x("diuresis"), temp = x("temp"), ritmo = x("ritmo");
      var gc = x("gc"), svmix = x("svmix");
      var pplat = x("pplat"), peep = x("peep"), vfio2 = x("vfio2");

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
      if (isFinite(p2) && p2 > 200) f.push(F("warn", "Presión premembrana alta", n0(p2) + " mmHg", "Límite del protocolo 200 mmHg. Si sube también el ΔP, sospechar trombosis de la membrana. Si P3 sube a la par y el ΔP no cambia, la resistencia está después del oxigenador: línea o cánula de retorno acodada u obstruida, o hipertensión.", CH));
      if (isFinite(dpm)) {
        var p3 = dpm;
        if (p3 > 50) f.push(F("crit", "Gradiente transmembrana alto (ΔP)", n0(p3) + " mmHg", "Por encima del límite de 50 mmHg: sospechar trombosis del oxigenador. Comprobar gasometría pre y post, dímero D y plaquetas, y programar el recambio antes de que sea urgente.", CH));
        else if (p3 > 35) f.push(F("warn", "Gradiente transmembrana en ascenso (ΔP)", n0(p3) + " mmHg", "Comparar con el valor basal: un ascenso del 30–50 % sugiere trombosis, aunque no se alcance el límite absoluto.", CH));
        else f.push(F("ok", "Gradiente transmembrana normal (ΔP)", n0(p3) + " mmHg", "ΔP = P2 − P3 por debajo de 50 mmHg.", CH));
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


    return {
      findings: f,
      datos: {
        modo: modo, peso: peso, flujo: flujo, sweep: sweep, rpm: rpm,
        p1: p1, p2: p2, p3m: p3m, dpm: dpm, po2post: po2post, dias: dias,
        fc: fc, tas: tas, tad: tad, ic: ic, lactato: lactato,
        sao2: sao2, svo2: svo2, pao2: pao2, paco2: paco2, ph: ph,
        hb: hb, plaq: plaq, fibri: fibri, act: act, ttpa: ttpa, ldh: ldh,
        diuresis: diuresis, temp: temp, ritmo: ritmo, gc: gc, svmix: svmix,
        sangrado: sangrado, pplat: pplat, peep: peep, vfio2: vfio2,
        pp: pp, pam: pam, flujoKg: flujoKg, ratio: ratio, svUsada: svUsada, svEsPre: svEsPre,
        cao2: cao2, cvo2: cvo2, do2: do2, vo2: vo2, dv: dv, gap: gap, dp: dp
      }
    };
  }

  var api = { evaluar: evaluar };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ECMO_REGLAS = api;
})(typeof self !== "undefined" ? self : this);
