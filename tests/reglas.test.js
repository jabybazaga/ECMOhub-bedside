// Pruebas de las reglas clínicas de la ronda (reglas.js).
// Se ejecutan con:  node --test tests/
// Cada umbral del protocolo se prueba a los dos lados del límite. Si alguien
// cambia un número en reglas.js sin querer, alguna de estas pruebas falla.

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluar } = require("../reglas.js");

// Devuelve la gravedad del aviso cuyo título encaja con `re`, o null si no hay aviso.
function sev(valores, re, modo = "vv", sangrado = "no") {
  const f = evaluar(valores, modo, sangrado).findings.filter((x) => re.test(x.t));
  assert.ok(f.length <= 1, "más de un aviso para " + re + ": " + f.map((x) => x.t).join(" | "));
  return f.length ? f[0].sev : null;
}

// [valores, gravedad esperada] para un mismo aviso
function casos(nombre, re, tabla, modo = "vv", sangrado = "no") {
  test(nombre, () => {
    for (const [v, esperado] of tabla) {
      assert.equal(sev(v, re, modo, sangrado), esperado, nombre + " con " + JSON.stringify(v) + " (" + modo + ", sangrado " + sangrado + ")");
    }
  });
}

test("sin valores no hay avisos", () => {
  assert.equal(evaluar({}, "vv", "no").findings.length, 0);
  assert.equal(evaluar({ p2: null, flujo: "" }, "va", "no").findings.length, 0);
});

/* ---------- circuito ---------- */
casos("flujo por peso: <40 crítico, 40–49 vigilar, 50–80 en rango, >80 vigilar", /^Flujo/, [
  [{ peso: 100, flujo: 3.9 }, "crit"], [{ peso: 100, flujo: 4.0 }, "warn"],
  [{ peso: 100, flujo: 4.9 }, "warn"], [{ peso: 100, flujo: 5.0 }, "ok"],
  [{ peso: 100, flujo: 8.0 }, "ok"], [{ peso: 100, flujo: 8.1 }, "warn"],
  [{ flujo: 4 }, null],
]);
casos("rpm: por encima de 3500 vigilar", /^rpm/, [[{ rpm: 3500 }, null], [{ rpm: 3501 }, "warn"]]);
casos("succión P1: ≤ −100 crítico, ≤ −80 vigilar, < −50 informativo", /^Succión/, [
  [{ p1: -100 }, "crit"], [{ p1: -99 }, "warn"], [{ p1: -80 }, "warn"],
  [{ p1: -79 }, "info"], [{ p1: -51 }, "info"], [{ p1: -50 }, "ok"],
]);
casos("P2 premembrana: por encima de 200 vigilar", /premembrana alta/, [[{ p2: 200 }, null], [{ p2: 201 }, "warn"]]);
casos("ΔP = P2 − P3: > 35 vigilar, > 50 crítico", /transmembrana/, [
  [{ p2: 185, p3m: 150 }, "ok"], [{ p2: 186, p3m: 150 }, "warn"],
  [{ p2: 200, p3m: 150 }, "warn"], [{ p2: 201, p3m: 150 }, "crit"],
  [{ p2: 200 }, null], [{ p3m: 150 }, null],
]);
casos("PO₂ postmembrana: < 150 crítico, < 300 vigilar", /postmembrana|^Membrana/, [
  [{ po2post: 149 }, "crit"], [{ po2post: 150 }, "warn"], [{ po2post: 299 }, "warn"], [{ po2post: 300 }, "ok"],
]);

/* ---------- gasometría ---------- */
casos("PaCO₂: 35–45 en rango, > 45 vigilar, > 60 crítico, < 35 vigilar", /^PaCO₂/, [
  [{ paco2: 34 }, "warn"], [{ paco2: 35 }, "ok"], [{ paco2: 45 }, "ok"],
  [{ paco2: 46 }, "warn"], [{ paco2: 60 }, "warn"], [{ paco2: 61 }, "crit"],
]);
casos("pH: < 7,25 crítico, < 7,35 vigilar, > 7,45 vigilar", /^Acidosis|^Alcalosis/, [
  [{ ph: 7.24 }, "crit"], [{ ph: 7.25 }, "warn"], [{ ph: 7.34 }, "warn"],
  [{ ph: 7.35 }, null], [{ ph: 7.45 }, null], [{ ph: 7.46 }, "warn"],
]);
casos("relación gas:sangre por encima de 2,5 informativa", /gas:sangre/, [
  [{ sweep: 10, flujo: 4 }, null], [{ sweep: 10.1, flujo: 4 }, "info"],
]);

/* ---------- VV ---------- */
casos("VV SaO₂: < 80 crítico, < 85 vigilar, 85–92 objetivo, > 92 informativo", /^Hipoxemia|^SaO₂/, [
  [{ sao2: 79 }, "crit"], [{ sao2: 80 }, "warn"], [{ sao2: 84 }, "warn"],
  [{ sao2: 85 }, "ok"], [{ sao2: 92 }, "ok"], [{ sao2: 93 }, "info"],
]);
casos("VV PaO₂: < 60 vigilar", /^PaO₂/, [[{ pao2: 59 }, "warn"], [{ pao2: 60 }, null]]);
casos("VV recirculación: premembrana > SaO₂ − 10 con SaO₂ < 90", /recirculación/, [
  [{ sao2: 85, svo2: 76 }, "crit"], [{ sao2: 85, svo2: 75 }, null], [{ sao2: 90, svo2: 85 }, null],
]);
casos("VV SvO₂ premembrana: < 70 vigilar", /SvO₂ premembrana/, [[{ svo2: 69 }, "warn"], [{ svo2: 70 }, null]]);
casos("VV meseta: > 25 vigilar, > 30 crítico", /meseta/, [
  [{ pplat: 25 }, null], [{ pplat: 26 }, "warn"], [{ pplat: 30 }, "warn"], [{ pplat: 31 }, "crit"],
]);
casos("VV PEEP: < 10 vigilar", /^PEEP/, [[{ peep: 9 }, "warn"], [{ peep: 10 }, null]]);
casos("VV driving pressure: > 15 vigilar", /^Driving/, [
  [{ pplat: 25, peep: 10 }, null], [{ pplat: 26, peep: 10 }, "warn"],
]);
casos("VV FiO₂ del ventilador: > 50 vigilar", /FiO₂ del/, [[{ vfio2: 50 }, null], [{ vfio2: 51 }, "warn"]]);
test("VV DO₂/VO₂: < 2 crítico, < 3 vigilar, ≥ 3 adecuado", () => {
  // gc 5, Hb 10, SaO₂ 90 (CaO₂ ≈ 12,06); el cociente depende de la saturación venosa
  const base = { gc: 5, hb: 10, sao2: 90, pao2: 0 };
  const dv = (svo2) => evaluar({ ...base, svo2 }, "vv", "no").datos.dv;
  const s = (svo2) => sev({ ...base, svo2 }, /^DO₂\/VO₂/);
  assert.ok(dv(40) < 2); assert.equal(s(40), "crit");
  assert.ok(dv(55) >= 2 && dv(55) < 3); assert.equal(s(55), "warn");
  assert.ok(dv(65) >= 3); assert.equal(s(65), "ok");
});

/* ---------- VA ---------- */
casos("VA SaO₂: < 95 crítico", /^SaO₂/, [[{ sao2: 94 }, "crit"], [{ sao2: 95 }, "ok"]], "va");
casos("VA PAM: < 65 crítico, > 95 vigilar", /^PAM/, [
  // PAM = (TAS + 2·TAD) / 3
  [{ tas: 95, tad: 49 }, "crit"], [{ tas: 95, tad: 50 }, "ok"],
  [{ tas: 135, tad: 75 }, "ok"], [{ tas: 135, tad: 76 }, "warn"],
], "va");
casos("VA presión de pulso: < 15 crítico, < 30 vigilar", /pulso/, [
  [{ tas: 84, tad: 70 }, "crit"], [{ tas: 85, tad: 70 }, "warn"], [{ tas: 99, tad: 70 }, "warn"], [{ tas: 100, tad: 70 }, "ok"],
], "va");
casos("VA índice cardiaco: < 2,2 crítico, < 2,5 vigilar", /Índice cardiaco/, [
  [{ ic: 2.1 }, "crit"], [{ ic: 2.2 }, "warn"], [{ ic: 2.4 }, "warn"], [{ ic: 2.5 }, "ok"],
], "va");
casos("VA saturación venosa: < 65 vigilar", /venosa baja/, [[{ svo2: 64 }, "warn"], [{ svo2: 65 }, null]], "va");
casos("VA taquicardia: > 120 informativa", /^Taquicardia/, [[{ fc: 120 }, null], [{ fc: 121 }, "info"]], "va");
test("las reglas de un modo no saltan en el otro", () => {
  assert.equal(sev({ pplat: 35 }, /meseta/, "va"), null);
  assert.equal(sev({ ic: 1.5 }, /Índice cardiaco/, "vv"), null);
  assert.equal(sev({ sao2: 90 }, /^SaO₂|^Hipoxemia/, "va"), "crit");
  assert.equal(sev({ sao2: 90 }, /^SaO₂|^Hipoxemia/, "vv"), "ok");
});

/* ---------- analítica ---------- */
casos("lactato: > 2 vigilar, > 5 crítico", /^Lactato/, [
  [{ lactato: 2 }, "ok"], [{ lactato: 2.1 }, "warn"], [{ lactato: 5 }, "warn"], [{ lactato: 5.1 }, "crit"],
]);
casos("diuresis: < 0,5 vigilar", /^Diuresis/, [[{ diuresis: 0.4 }, "warn"], [{ diuresis: 0.5 }, null]]);
casos("temperatura: fuera de 35,5–37,5 vigilar", /termia/, [
  [{ temp: 35.4 }, "warn"], [{ temp: 35.5 }, null], [{ temp: 37.5 }, null], [{ temp: 37.6 }, "warn"],
]);
casos("hemoglobina: < 7 crítico, < 8 vigilar", /^Hemoglobina/, [
  [{ hb: 6.9 }, "crit"], [{ hb: 7 }, "warn"], [{ hb: 7.9 }, "warn"], [{ hb: 8 }, "ok"],
]);
casos("plaquetas sin sangrado: < 50 crítico, < 100 vigilar", /^Plaquetas/, [
  [{ plaq: 49 }, "crit"], [{ plaq: 50 }, "warn"], [{ plaq: 99 }, "warn"], [{ plaq: 100 }, "ok"],
]);
casos("plaquetas con sangrado: < 100 crítico", /^Plaquetas/, [[{ plaq: 99 }, "crit"], [{ plaq: 100 }, "ok"]], "vv", "leve");
casos("fibrinógeno sin sangrado: < 1 crítico, < 2 vigilar", /^Fibrinógeno/, [
  [{ fibri: 0.9 }, "crit"], [{ fibri: 1 }, "warn"], [{ fibri: 1.9 }, "warn"], [{ fibri: 2 }, "ok"],
]);
casos("fibrinógeno con sangrado: < 1,5 crítico", /^Fibrinógeno/, [[{ fibri: 1.4 }, "crit"], [{ fibri: 1.5 }, "warn"]], "vv", "leve");
casos("LDH: > 350 vigilar, > 1000 crítico", /^LDH/, [
  [{ ldh: 350 }, "ok"], [{ ldh: 351 }, "warn"], [{ ldh: 1000 }, "warn"], [{ ldh: 1001 }, "crit"],
]);

/* ---------- anticoagulación ---------- */
casos("ACT: diana 160–180", /^ACT$/, [
  [{ act: 89 }, "crit"], [{ act: 90 }, "warn"], [{ act: 159 }, "warn"], [{ act: 160 }, "ok"],
  [{ act: 180 }, "ok"], [{ act: 181 }, "warn"], [{ act: 320 }, "warn"], [{ act: 321 }, "crit"],
]);
casos("TTPa: diana 46–70", /^TTPa$/, [
  [{ ttpa: 34 }, "crit"], [{ ttpa: 35 }, "warn"], [{ ttpa: 45 }, "warn"], [{ ttpa: 46 }, "ok"],
  [{ ttpa: 70 }, "ok"], [{ ttpa: 71 }, "warn"], [{ ttpa: 90 }, "warn"], [{ ttpa: 91 }, "crit"],
]);
test("hemorragia grave: aviso crítico y sin ajuste de ACT ni TTPa", () => {
  assert.equal(sev({}, /^Hemorragia/, "vv", "grave"), "crit");
  assert.equal(sev({ act: 120 }, /^ACT$/, "vv", "grave"), null);
  assert.equal(sev({ ttpa: 30 }, /^TTPa$/, "vv", "grave"), null);
  assert.equal(sev({}, /^Hemorragia/, "vv", "leve"), "warn");
});
test("ACT: la propuesta de ritmo suma o resta 2,5 o 5 mL/h", () => {
  const m = (act) => evaluar({ act, ritmo: 10 }, "vv", "no").findings.find((x) => x.t === "ACT").m;
  assert.match(m(80), /pasaría a 15 mL\/h/);
  assert.match(m(150), /pasaría a 12,5 mL\/h/);
  assert.match(m(200), /pasaría a 7,5 mL\/h/);
  assert.match(m(400), /pasaría a 5 mL\/h/);
  assert.doesNotMatch(m(170), /pasaría/);
});
casos("vigilancia de HIT desde el día 2", /HIT/, [
  [{ plaq: 150, dias: 1 }, null], [{ plaq: 150, dias: 2 }, "info"],
]);

/* ---------- derivados ---------- */
test("valores derivados", () => {
  const d = evaluar({ tas: 120, tad: 60, peso: 80, flujo: 4, p2: 180, p3m: 150, pplat: 25, peep: 10, sweep: 4 }, "vv", "no").datos;
  assert.equal(d.pp, 60);
  assert.equal(d.pam, 80);
  assert.equal(d.flujoKg, 50);
  assert.equal(d.dpm, 30);
  assert.equal(d.dp, 15);
  assert.equal(d.ratio, 1);
  const o = evaluar({ hb: 10, sao2: 100, pao2: 100 }, "vv", "no").datos;
  assert.ok(Math.abs(o.cao2 - 13.7) < 1e-9); // 10 × 1,34 × 1 + 0,003 × 100
});
