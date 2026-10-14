/* =====================================================================
   Registro de llamadas ECMO: mismas columnas y listas cerradas que la hoja
   «Registro» del Excel de la unidad (Registro_llamadas_ECMO_ordenado.xlsx),
   en el mismo orden, para que las filas exportadas se peguen tal cual.
   Año, Semestre y Grupo de edad se calculan igual que las fórmulas del Excel.
   La app NO recoge el nombre: la columna «Paciente» se exporta vacía.
   ===================================================================== */
(function (raiz) {
  "use strict";

  var SI_NO = ["Sí", "No"];
  var LISTAS = {
    categoria: ["SDRA / neumonía / IRA", "Shock cardiogénico", "Politraumatismo", "Shock séptico", "TEP", "Vía aérea / fístula", "Donación en asistolia (DAC)", "Otros"],
    tipo: ["VV", "VA", "VAV (híbrida)", "DAC"],
    finalidad: ["Soporte al paciente", "Donación (DAC)"],
    hospital: ["Badajoz", "Cáceres", "Mérida", "Don Benito-Villanueva", "Plasencia", "Zafra", "Fuera de la comunidad"],
    ambito: ["Propio (Área de Badajoz)", "Otro centro de Badajoz capital", "Otro hospital de la comunidad", "Fuera de la comunidad"],
    desenlace: ["Canulado", "Canulado por equipo externo", "Rechazado", "No canulado — otra alternativa", "No canulado — sin motivo registrado", "Gestión de traslado", "Incidencia en paciente ya canulado"],
    motivo: ["Mejoría / respuesta a otro tratamiento", "No indicación", "Futilidad", "Comorbilidad / situación basal", "Edad", "Contraindicación para anticoagulación", "DAC sin receptor", "Canulación por equipo externo", "Otros"]
  };

  // Columnas A–AE del Excel. tipo: num | txt | fecha | lista | sino | calc | nombre
  var COLUMNAS = [
    { k: "nllamada", t: "Nº llamada", tipo: "num", grupo: "id", ayuda: "El siguiente correlativo del registro" },
    { k: "codpac", t: "Cód. paciente", tipo: "txt", grupo: "id", ph: "P-000" },
    { k: "codepi", t: "Cód. episodio", tipo: "txt", grupo: "id", ph: "E-000" },
    { k: "paciente", t: "Paciente", tipo: "nombre" },
    { k: "llamadanum", t: "Llamada nº (del paciente)", tipo: "num", grupo: "id" },
    { k: "fecha", t: "Fecha activación", tipo: "fecha", grupo: "id" },
    { k: "anio", t: "Año", tipo: "calc" },
    { k: "semestre", t: "Semestre", tipo: "calc" },
    { k: "edad", t: "Edad (años)", tipo: "num", grupo: "id" },
    { k: "grupoedad", t: "Grupo de edad", tipo: "calc" },
    { k: "etiologia", t: "Etiología (texto original)", tipo: "txt", grupo: "llamada" },
    { k: "categoria", t: "Categoría clínica", tipo: "lista", lista: "categoria", grupo: "llamada" },
    { k: "tipo", t: "Tipo de asistencia", tipo: "lista", lista: "tipo", grupo: "llamada" },
    { k: "finalidad", t: "Finalidad", tipo: "lista", lista: "finalidad", grupo: "llamada" },
    { k: "hospital", t: "Hospital de origen", tipo: "lista", lista: "hospital", grupo: "llamada" },
    { k: "unidad", t: "Unidad / centro", tipo: "txt", grupo: "llamada" },
    { k: "ambito", t: "Ámbito", tipo: "lista", lista: "ambito", grupo: "llamada" },
    { k: "desplaz", t: "Desplazamiento del equipo", tipo: "sino", grupo: "llamada" },
    { k: "desenlace", t: "Desenlace", tipo: "lista", lista: "desenlace", grupo: "desenlace" },
    { k: "motivo", t: "Motivo de no canulación", tipo: "lista", lista: "motivo", grupo: "desenlace" },
    { k: "detalle", t: "Detalle del motivo", tipo: "txt", grupo: "desenlace" },
    { k: "trasladosin", t: "Traslado sin asistencia", tipo: "sino", grupo: "desenlace" },
    { k: "exitus", t: "Éxitus en UCI", tipo: "sino", grupo: "evolucion" },
    { k: "diasvm", t: "Días de VM", tipo: "num", grupo: "evolucion" },
    { k: "diasecmo", t: "Días de ECMO", tipo: "num", grupo: "evolucion" },
    { k: "trasladootro", t: "Traslado a otro hospital", tipo: "sino", grupo: "evolucion" },
    { k: "recambiomb", t: "Recambio de membrana", tipo: "sino", grupo: "evolucion" },
    { k: "nrecambios", t: "Nº recambios membrana", tipo: "num", grupo: "evolucion" },
    { k: "recambiocan", t: "Recambio de cánulas", tipo: "sino", grupo: "evolucion" },
    { k: "traqueo", t: "Traqueostomía", tipo: "sino", grupo: "evolucion" },
    { k: "obs", t: "Observaciones", tipo: "txt", grupo: "obs", largo: true }
  ];
  var GRUPOS = [
    { id: "id", t: "Identificación" },
    { id: "llamada", t: "La llamada" },
    { id: "desenlace", t: "Desenlace" },
    { id: "evolucion", t: "Evolución", ayuda: "Se puede completar más adelante." },
    { id: "obs", t: "Observaciones" }
  ];

  // "2026-10-14" → Date local (sin desfase horario)
  function fechaDe(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  // Mismas fórmulas que las columnas grises del Excel (G, H, J)
  function calculados(r) {
    var f = fechaDe(r.fecha), e = r.edad === "" || r.edad == null ? null : +r.edad;
    return {
      anio: f ? f.getFullYear() : "",
      semestre: f ? (f.getMonth() + 1 <= 6 ? "1er semestre" : "2º semestre") : "",
      grupoedad: e == null || isNaN(e) ? "" : e < 18 ? "Pediátrico (<18)" : "Adulto"
    };
  }
  // Una fila del Excel, en el orden de las columnas
  function fila(r) {
    var c = calculados(r);
    return COLUMNAS.map(function (col) {
      if (col.tipo === "nombre") return "";
      if (col.tipo === "calc") return c[col.k];
      var v = r[col.k];
      if (v == null || v === "") return "";
      if (col.tipo === "fecha") return fechaDe(v) || "";
      if (col.tipo === "num") { var n = Number(String(v).replace(",", ".")); return isFinite(n) ? n : ""; }
      return String(v);
    });
  }
  function cabecera() { return COLUMNAS.map(function (c) { return c.t; }); }

  var api = { COLUMNAS: COLUMNAS, GRUPOS: GRUPOS, LISTAS: LISTAS, SI_NO: SI_NO, calculados: calculados, fila: fila, cabecera: cabecera, fechaDe: fechaDe };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.ECMO_REGISTRO = api;
})(this);
