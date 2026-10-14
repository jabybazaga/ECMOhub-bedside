"use strict";
const test = require("node:test");
const assert = require("node:assert");
const R = require("../registro.js");
const X = require("../xlsx.js");

// Cabecera literal de la hoja «Registro» del Excel de la unidad
const CABECERA_EXCEL = "Nº llamada\tCód. paciente\tCód. episodio\tPaciente\tLlamada nº (del paciente)\tFecha activación\tAño\tSemestre\tEdad (años)\tGrupo de edad\tEtiología (texto original)\tCategoría clínica\tTipo de asistencia\tFinalidad\tHospital de origen\tUnidad / centro\tÁmbito\tDesplazamiento del equipo\tDesenlace\tMotivo de no canulación\tDetalle del motivo\tTraslado sin asistencia\tÉxitus en UCI\tDías de VM\tDías de ECMO\tTraslado a otro hospital\tRecambio de membrana\tNº recambios membrana\tRecambio de cánulas\tTraqueostomía\tObservaciones";

test("las 30 primeras columnas coinciden en nombre y orden con el Excel, sin «Paciente»", () => {
  const sinNombre = CABECERA_EXCEL.split("\t").filter((c) => c !== "Paciente");
  assert.strictEqual(sinNombre.length, 30);
  assert.deepStrictEqual(R.cabecera().slice(0, 30), sinNombre);
  assert.ok(!R.cabecera().includes("Paciente"));
});

test("las columnas del traslado van detrás y sin nombres repetidos", () => {
  const c = R.cabecera();
  assert.strictEqual(c.length, 48);
  assert.deepStrictEqual(c.slice(30, 32), ["Hora inicio traslado", "pH"]);
  assert.strictEqual(c[46], "Driving pressure (cmH2O)");
  assert.strictEqual(c[47], "Paciente en el registro");
  assert.strictEqual(new Set(c.map((x) => x.toLowerCase())).size, c.length);
});

test("la driving pressure se calcula como plateau − PEEP salvo que se escriba", () => {
  assert.strictEqual(R.calculados({ plateau: "26", peep: "12" }).driving, 14);
  assert.strictEqual(R.calculados({ plateau: "26", peep: "12", driving: "13" }).driving, 13);
  assert.strictEqual(R.calculados({ plateau: "26" }).driving, "");
});

test("Año, Semestre y Grupo de edad siguen las fórmulas del Excel", () => {
  const ags = (r) => { const c = R.calculados(r); return [c.anio, c.semestre, c.grupoedad]; };
  assert.deepStrictEqual(ags({ fecha: "2024-05-28", edad: 62 }), [2024, "1er semestre", "Adulto"]);
  assert.deepStrictEqual(ags({ fecha: "2025-07-01", edad: 17 }), [2025, "2º semestre", "Pediátrico (<18)"]);
  assert.strictEqual(ags({ fecha: "2025-06-30", edad: 18 })[1], "1er semestre");
  assert.deepStrictEqual(ags({}), ["", "", ""]);
});

test("la fila exportada no lleva el nombre y convierte tipos", () => {
  const f = R.fila({ nllamada: "12", codpac: "P-090", fecha: "2026-10-14", edad: "45", tipo: "VA", diasecmo: "3,5", paciente: "no debe salir", ph: "7,31" });
  assert.strictEqual(f.length, 48);
  assert.ok(!f.includes("no debe salir"));
  assert.strictEqual(f[31], 7.31);
  assert.strictEqual(f[0], 12);
  assert.ok(f[4] instanceof Date);
  assert.strictEqual(f[5], 2026);
  assert.strictEqual(f[8], "Adulto");
  assert.strictEqual(f[11], "VA");
  assert.strictEqual(f[23], 3.5);
});

test("CRC32 y número de serie de fecha de Excel", () => {
  assert.strictEqual(X.crc32(new TextEncoder().encode("123456789")), 0xCBF43926);
  assert.strictEqual(X.serie(new Date(2024, 4, 28)), 45440);
  assert.strictEqual(X.columna(0), "A");
  assert.strictEqual(X.columna(30), "AE");
});

test("el libro es un ZIP con las seis partes de un .xlsx", () => {
  const b = X.libro("Registro", [R.cabecera(), R.fila({ fecha: "2026-10-14", obs: "a < b & «c»" })]);
  assert.strictEqual(String.fromCharCode(b[0], b[1]), "PK");
  const txt = Buffer.from(b).toString("latin1");
  ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml"]
    .forEach((n) => assert.ok(txt.includes(n), n));
  assert.ok(Buffer.from(b).toString("utf8").includes("a &lt; b &amp; «c»"));
});

test("con opciones.tabla el libro lleva una tabla de Excel sobre todo el rango", () => {
  const b = X.libro("Registro", [R.cabecera(), R.fila({ codpac: "P-1" })], { tabla: "Llamadas" });
  const t = Buffer.from(b).toString("utf8");
  assert.ok(t.includes("xl/tables/table1.xml"));
  assert.ok(t.includes('name="Llamadas"') && t.includes('ref="A1:AV2"'));
  assert.ok(t.includes('<tableColumns count="48">'));
});

test("los códigos se normalizan a P-000 / E-000", () => {
  assert.deepStrictEqual(["p90", "P090", "90", "P-1", " p - 7 ", "P-1234", ""].map((x) => R.codigo(x, "P")),
    ["P-090", "P-090", "P-090", "P-001", "P-007", "P-1234", ""]);
  assert.strictEqual(R.codigo("e12", "E"), "E-012");
  assert.strictEqual(R.codigo("abc", "P"), "ABC");
});

test("no se puede enviar sin fecha ni identificación del paciente", () => {
  assert.strictEqual(R.faltas({}).length, 2);
  assert.deepStrictEqual(R.faltas({ fecha: "2026-10-14", ident: "Nuevo" }), []);
  assert.deepStrictEqual(R.faltas({ fecha: "2026-10-14", ident: "No lo sé" }), []);
  assert.strictEqual(R.faltas({ fecha: "2026-10-14", ident: "Ya registrado" }).length, 1);
  assert.deepStrictEqual(R.faltas({ fecha: "2026-10-14", ident: "Ya registrado", codpac: "90" }), []);
  assert.strictEqual(R.faltas({ fecha: "2026-10-14", ident: "Ya registrado", codpac: "90", codepi: "x" }).length, 1);
});

test("un paciente nuevo sale sin códigos; uno registrado, con el código normalizado", () => {
  const i = (k) => R.COLUMNAS.findIndex((c) => c.k === k);
  const nuevo = R.fila({ fecha: "2026-10-14", ident: "Nuevo", codpac: "P-5", codepi: "E-9" });
  assert.strictEqual(nuevo[i("codpac")], "");
  assert.strictEqual(nuevo[i("codepi")], "");
  assert.strictEqual(nuevo[47], "Nuevo");
  const ya = R.fila({ fecha: "2026-10-14", ident: "Ya registrado", codpac: "p90" });
  assert.strictEqual(ya[i("codpac")], "P-090");
  assert.strictEqual(ya[i("codepi")], "");
});
