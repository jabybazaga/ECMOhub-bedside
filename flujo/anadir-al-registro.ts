/* ECMO HUB bedside — © 2026 Luis Javier Pérez Bazaga. Todos los derechos reservados. */
/* =====================================================================
   Office Script «Añadir al registro» (Excel para la web › Automatizar), versión 2.
   Lo ejecuta el flujo de Power Automate sobre Registro_llamadas_ECMO_ordenado.xlsx.

   Recibe las llamadas de la tabla «Llamadas» del archivo de la app (script «Leer
   llamadas») y las añade a la tabla «Registro» con las reglas del registro:
   · Nº llamada: el siguiente correlativo.
   · Paciente nuevo: el siguiente P-000 y el siguiente E-000 libres; Llamada nº = 1.
   · Paciente ya registrado: su código; Llamada nº = sus llamadas + 1. Episodio nuevo
     si han pasado más de 7 días desde su llamada anterior y ese episodio ya acabó en
     canulación, o más de 60 días; si no, el mismo episodio que su llamada anterior.
   · Lo que no se puede asignar con seguridad no entra en «Registro»: va a la tabla
     «Revisar» con el motivo, para completarlo y pasarlo a mano.
   Al final ordena «Registro» por Fecha activación y Nº llamada, y devuelve un
   resumen para el correo de aviso.
   ===================================================================== */

type Valor = string | number | boolean;
type Fila = { [columna: string]: Valor };
interface Resultado { anadidas: number; revisar: number; detalle: string; }

// Desenlaces que cierran el episodio («la canulación se ha completado»). Un episodio está
// cerrado si alguna de sus llamadas tiene uno de estos desenlaces: así, una «Gestión de
// traslado» posterior a la canulación no lo reabre.
const CANULACION = ["Canulado"];

function main(workbook: ExcelScript.Workbook, llamadas: string, archivo?: string): Resultado {
  const entrantes: Fila[] = JSON.parse(llamadas || "[]");
  const reg = workbook.getTable("Registro");
  const cab = reg.getHeaderRowRange().getValues()[0].map((c) => String(c));
  const col = (n: string) => cab.indexOf(n);
  const C = {
    n: col("Nº llamada"), pac: col("Cód. paciente"), epi: col("Cód. episodio"),
    llam: col("Llamada nº (del paciente)"), fecha: col("Fecha activación"), des: col("Desenlace")
  };
  const filas: Valor[][] = reg.getRowCount() > 0 ? reg.getRangeBetweenHeaderAndTotal().getValues() : [];

  // Lo que ya hay en el registro (y lo que se va añadiendo en esta ejecución)
  type Llamada = { n: number; pac: string; epi: string; fecha: number; des: string };
  const hechas: Llamada[] = filas.map((f) => ({
    n: Number(f[C.n]) || 0, pac: codigo(f[C.pac], "P"), epi: codigo(f[C.epi], "E"),
    fecha: serie(f[C.fecha]), des: String(f[C.des] || "")
  }));
  let sigN = Math.max(0, ...hechas.map((h) => h.n)) + 1;
  let sigP = Math.max(0, ...hechas.map((h) => numero(h.pac, "P"))) + 1;
  let sigE = Math.max(0, ...hechas.map((h) => numero(h.epi, "E"))) + 1;

  const nuevas: Valor[][] = [];
  const revisar: { f: Fila; motivo: string }[] = [];
  const lineas: string[] = [];

  // En orden de fecha, para que la regla de episodio vea antes las llamadas anteriores
  const orden = entrantes.map((f, i) => ({ f, i })).sort((a, b) => (serie(a.f["Fecha activación"]) - serie(b.f["Fecha activación"])) || (a.i - b.i));

  for (const { f } of orden) {
    const fecha = serie(f["Fecha activación"]);
    const ident = String(f["Paciente en el registro"] || "");
    const fuera = (motivo: string) => { revisar.push({ f, motivo }); };
    if (!isFinite(fecha)) { fuera("Sin fecha de activación."); continue; }

    let pac = "", epi = "", llam = 0, nota = "";
    if (ident === "Nuevo") {
      pac = "P-" + tres(sigP++);
      epi = "E-" + tres(sigE++);
      llam = 1;
      nota = "paciente nuevo";
    } else if (ident === "Ya registrado") {
      pac = codigo(f["Cód. paciente"], "P");
      const suyas = hechas.filter((h) => h.pac === pac);
      if (!numero(pac, "P")) { fuera("Paciente marcado como ya registrado pero sin Cód. paciente válido."); continue; }
      if (!suyas.length) { fuera("El Cód. paciente " + pac + " no está en el registro."); continue; }
      if (suyas.some((h) => h.fecha > fecha)) { fuera(pac + " tiene llamadas posteriores a esta fecha: revisa episodio y «Llamada nº»."); continue; }
      const previa = suyas.slice().sort((a, b) => (a.fecha - b.fecha) || (a.n - b.n))[suyas.length - 1];
      llam = suyas.length + 1;
      const escrito = codigo(f["Cód. episodio"], "E");
      if (escrito) {
        if (!suyas.some((h) => h.epi === escrito)) { fuera("El Cód. episodio " + escrito + " no es de " + pac + "."); continue; }
        epi = escrito;
        nota = "episodio indicado en la app";
      } else {
        const dias = fecha - previa.fecha;
        const cerrado = suyas.some((h) => h.epi === previa.epi && CANULACION.indexOf(h.des) > -1);
        const nuevo = (dias > 7 && cerrado) || dias > 60;
        epi = nuevo ? "E-" + tres(sigE++) : previa.epi;
        nota = nuevo ? "episodio nuevo (" + dias + " días desde la llamada anterior)" : "mismo episodio";
      }
    } else {
      fuera("Paciente sin identificar en la app."); continue;
    }

    const n = sigN++;
    const valores: { [c: string]: Valor } = {
      "Nº llamada": n, "Cód. paciente": pac, "Cód. episodio": epi, "Llamada nº (del paciente)": llam
    };
    nuevas.push(cab.map((c) => (c in valores ? valores[c] : (f[c] === undefined || f[c] === null ? "" : f[c]))));
    hechas.push({ n, pac, epi, fecha, des: String(f["Desenlace"] || "") });
    lineas.push("Nº " + n + " · " + pac + " · " + epi + " · " + fechaTexto(fecha) + " — " + nota + (ident === "Nuevo" ? ". Escribe su nombre en «Paciente»." : "."));
  }

  if (nuevas.length) {
    reg.addRows(-1, nuevas);
    if (C.fecha > -1) reg.getSort().apply(C.n > -1 ? [{ key: C.fecha, ascending: true }, { key: C.n, ascending: true }] : [{ key: C.fecha, ascending: true }]);
  }
  if (revisar.length) {
    const rev = workbook.getTable("Revisar");
    const cabR = rev.getHeaderRowRange().getValues()[0].map((c) => String(c));
    rev.addRows(-1, revisar.map((r) => cabR.map((c) =>
      c === "Motivo de revisión" ? r.motivo : c === "Archivo de origen" ? (archivo || "") : (r.f[c] === undefined || r.f[c] === null ? "" : r.f[c]))));
  }

  const partes: string[] = [];
  if (nuevas.length) partes.push(nuevas.length + (nuevas.length === 1 ? " llamada añadida" : " llamadas añadidas") + " al registro:\n" + lineas.join("\n"));
  if (revisar.length) partes.push(revisar.length + (revisar.length === 1 ? " llamada" : " llamadas") + " en la hoja «Revisar»:\n" +
    revisar.map((r) => "· " + fechaTexto(serie(r.f["Fecha activación"])) + (r.f["Hospital de origen"] ? " · " + r.f["Hospital de origen"] : "") + " — " + r.motivo).join("\n"));
  return { anadidas: nuevas.length, revisar: revisar.length, detalle: partes.join("\n\n") || "El archivo no traía llamadas." };
}

// "p90", "P090", "90" → "P-090"; vacío → ""
function codigo(v: Valor, letra: string): string {
  const t = String(v === undefined || v === null ? "" : v).trim();
  if (!t) return "";
  const m = new RegExp("^" + letra + "?\\s*-?\\s*(\\d+)$", "i").exec(t);
  return m ? letra + "-" + tres(Number(m[1])) : t.toUpperCase();
}
function numero(c: string, letra: string): number {
  const m = new RegExp("^" + letra + "-(\\d+)$").exec(c);
  return m ? Number(m[1]) : 0;
}
function tres(n: number): string { const s = String(n); return s.length >= 3 ? s : ("00" + s).slice(-3); }
// Fecha → número de serie de Excel (acepta número, dd/mm/aaaa y aaaa-mm-dd)
function serie(v: Valor): number {
  if (typeof v === "number") return Math.floor(v);
  const t = String(v === undefined || v === null ? "" : v).trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) return (Date.UTC(+m[3], +m[2] - 1, +m[1]) - Date.UTC(1899, 11, 30)) / 86400000;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000;
  return NaN;
}
function fechaTexto(s: number): string {
  if (!isFinite(s)) return "sin fecha";
  const d = new Date(Date.UTC(1899, 11, 30) + s * 86400000);
  return ("0" + d.getUTCDate()).slice(-2) + "/" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "/" + d.getUTCFullYear();
}
