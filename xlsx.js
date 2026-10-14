/* =====================================================================
   Generador mínimo de .xlsx (Office Open XML) sin dependencias.
   Una hoja, texto en línea, números y fechas con formato dd/mm/aaaa.
   Funciona sin conexión: el archivo se arma en el propio dispositivo.
   Uso: ECMO_XLSX.libro("Registro", filas) → Uint8Array
        filas = [[celda, …], …]; celda = texto | número | Date | null
   La primera fila se escribe en negrita (cabecera).
   ===================================================================== */
(function (raiz) {
  "use strict";

  var CRC = (function () {
    var t = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(b) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function utf8(s) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s);
    return new Uint8Array(Buffer.from(s, "utf8"));
  }

  // ZIP sin compresión (método 0): Excel lo abre igual y no hace falta deflate.
  function zip(archivos) {
    var partes = [], central = [], off = 0;
    function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
    function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }
    archivos.forEach(function (f) {
      var nombre = utf8(f.nombre), datos = utf8(f.texto), crc = crc32(datos);
      var cab = [].concat(u32(0x04034B50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
        u32(crc), u32(datos.length), u32(datos.length), u16(nombre.length), u16(0));
      partes.push(new Uint8Array(cab), nombre, datos);
      central.push(new Uint8Array([].concat(u32(0x02014B50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
        u32(crc), u32(datos.length), u32(datos.length), u16(nombre.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), nombre);
      off += cab.length + nombre.length + datos.length;
    });
    var tamCentral = central.reduce(function (s, p) { return s + p.length; }, 0);
    var fin = new Uint8Array([].concat(u32(0x06054B50), u16(0), u16(0), u16(archivos.length), u16(archivos.length),
      u32(tamCentral), u32(off), u16(0)));
    var todo = partes.concat(central, [fin]);
    var total = todo.reduce(function (s, p) { return s + p.length; }, 0), out = new Uint8Array(total), pos = 0;
    todo.forEach(function (p) { out.set(p, pos); pos += p.length; });
    return out;
  }

  function xml(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; })
      // caracteres de control no válidos en XML
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  }
  function columna(i) {
    var s = "";
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s;
    return s;
  }
  // Fecha → número de serie de Excel (días desde 1899-12-30), sin desfase horario.
  function serie(d) {
    return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000;
  }

  function hoja(filas) {
    var ancho = filas.reduce(function (m, f) { return Math.max(m, f.length); }, 0);
    var cols = "";
    for (var c = 0; c < ancho; c++) {
      var max = filas.reduce(function (m, f) { var v = f[c]; return Math.max(m, v == null ? 0 : (v instanceof Date ? 10 : String(v).length)); }, 6);
      cols += '<col min="' + (c + 1) + '" max="' + (c + 1) + '" width="' + Math.min(48, max + 2) + '" customWidth="1"/>';
    }
    var cuerpo = filas.map(function (f, r) {
      var celdas = f.map(function (v, c) {
        var ref = columna(c) + (r + 1);
        if (v == null || v === "") return "";
        if (v instanceof Date) return '<c r="' + ref + '" s="1"><v>' + serie(v) + "</v></c>";
        if (typeof v === "number" && isFinite(v)) return '<c r="' + ref + '"' + (r === 0 ? ' s="2"' : "") + "><v>" + v + "</v></c>";
        return '<c r="' + ref + '" t="inlineStr"' + (r === 0 ? ' s="2"' : "") + '><is><t xml:space="preserve">' + xml(v) + "</t></is></c>";
      }).join("");
      return '<row r="' + (r + 1) + '">' + celdas + "</row>";
    }).join("");
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      (cols ? "<cols>" + cols + "</cols>" : "") + "<sheetData>" + cuerpo + "</sheetData></worksheet>";
  }

  function libro(nombreHoja, filas) {
    var nom = xml(String(nombreHoja || "Hoja1").replace(/[\\\/?*\[\]:]/g, " ").slice(0, 31));
    return zip([
      { nombre: "[Content_Types].xml", texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { nombre: "_rels/.rels", texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { nombre: "xl/workbook.xml", texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + nom + '" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { nombre: "xl/_rels/workbook.xml.rels", texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { nombre: "xl/styles.xml", texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' },
      { nombre: "xl/worksheets/sheet1.xml", texto: hoja(filas) }
    ]);
  }

  var api = { libro: libro, crc32: crc32, serie: serie, columna: columna };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.ECMO_XLSX = api;
})(this);
