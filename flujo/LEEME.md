# Volcado de la app al registro de llamadas ECMO

ECMO HUB bedside — © 2026 Luis Javier Pérez Bazaga. Todos los derechos reservados.

Encargo para Cowork (o para quien mantenga el flujo). Explica qué hay que cambiar en el Excel y en Power Automate para que cada llamada entre en el registro **con su paciente, su episodio y en orden**.

## Cómo queda el sistema

1. En la app, cada llamada dice si el paciente es **Nuevo**, **Ya registrado** (con su Cód. paciente, P-000) o **No lo sé**. La app no deja enviar una llamada sin esa respuesta. Esa respuesta llega en la última columna de la tabla «Llamadas», **«Paciente en el registro»**, que no está en la hoja «Registro».
2. El flujo lee el archivo y ejecuta el script **«Añadir al registro» (versión 2)** sobre el registro. Ese script asigna los códigos con las reglas de la hoja «Cómo usar este registro»:
   - **Nº llamada:** el siguiente correlativo.
   - **Paciente nuevo:** recibe el siguiente P-000 libre, el siguiente E-000 libre y «Llamada nº» = 1. Su nombre se escribe después a mano en «Paciente».
   - **Paciente ya registrado:** conserva su código y su «Llamada nº» pasa a ser sus llamadas + 1. El episodio es nuevo si han pasado **más de 7 días** desde su llamada anterior y ese episodio ya acabó en canulación, o si han pasado **más de 60 días**. Si no, es el mismo episodio que su llamada anterior.
   - Si en la app se escribió un Cód. episodio, se respeta, siempre que sea de ese paciente.
3. Lo que no se puede asignar con seguridad **no entra en «Registro»**: va a la tabla **«Revisar»** con el motivo. Los motivos posibles son:
   - paciente sin identificar;
   - código que no existe en el registro;
   - episodio de otro paciente;
   - llamada con fecha anterior a otras del mismo paciente;
   - llamada sin fecha.
4. Al terminar, el script ordena «Registro» por Fecha activación (y Nº llamada). Después llega un correo con lo que se ha añadido y lo que queda por revisar.

## 1. Excel del registro: hoja y tabla «Revisar»

Archivo: `REGISTRO/Registro_llamadas_ECMO_ordenado.xlsx`, sitio uci-ecmo.

Tiene datos reales de pacientes, así que:
- no copies datos a ningún otro sitio;
- edítalo con Excel, no con una librería de Python.

Pasos:
1. Añade una hoja nueva llamada **Revisar**.
2. En la fila 1 de esa hoja, copia **las cabeceras de la tabla «Registro», en el mismo orden** (solo las cabeceras, ninguna fila). A continuación de ellas añade tres columnas: **Paciente en el registro**, **Motivo de revisión** y **Archivo de origen**.
3. Convierte esas cabeceras en una tabla con encabezados y llámala **Revisar**.

## 2. Script «Añadir al registro», versión 2

En Excel para la web, abre el registro y ve a **Automatizar**. Abre el script **«Añadir al registro»** y sustituye todo su código por el del fichero [`anadir-al-registro.ts`](anadir-al-registro.ts) de esta carpeta. Guarda con el mismo nombre.

El script **«Leer llamadas»** no cambia: ya lee todas las columnas por su nombre.

Notas sobre el script:
- Los desenlaces que cierran un episodio están en la constante `CANULACION`, al principio del script. Hoy solo es «Canulado». Si «Canulado por equipo externo» también debe cerrar el episodio, se añade a esa lista.
- Un episodio está cerrado si **alguna** de sus llamadas acabó en canulación. Así, una «Gestión de traslado» posterior a la canulación no lo reabre.

## 3. Flujo de Power Automate

En el flujo que ya funciona (desencadenador en `REGISTRO/Entradas app` → «Leer llamadas» → «Añadir al registro» → mover a «Entradas app procesadas»):

1. En el paso **Ejecutar script «Añadir al registro»**:
   - el parámetro `llamadas` se queda como está (`result` de «Leer llamadas»);
   - rellena el parámetro nuevo **`archivo`** con el **Nombre de archivo** del desencadenador.
2. Justo después, añade **Office 365 Outlook · Enviar un correo electrónico (V2)**:
   - **Para:** el correo del responsable del registro.
   - **Asunto:** `Registro ECMO: @{outputs('Añadir_al_registro')?['body/result/anadidas']} añadidas, @{outputs('Añadir_al_registro')?['body/result/revisar']} a revisar` (ajusta el nombre del paso al tuyo).
   - **Cuerpo:** `detalle` del resultado de «Añadir al registro».
3. El paso de mover el archivo a «Entradas app procesadas» no cambia.

## 4. Prueba (después borra lo añadido)

Con la app en la versión 48 o posterior, crea tres llamadas ficticias de hoy y envíalas a «Entradas app»:

| Llamada | Identificación | Qué debe pasar |
|---|---|---|
| A | **Nuevo** | Entra en «Registro» con el siguiente P-000 y el siguiente E-000 libres, y «Llamada nº» 1. |
| B | **Ya registrado**, con el código de un paciente cuya última llamada fue hace menos de 7 días | Entra con su mismo episodio y su «Llamada nº» + 1. |
| C | **No lo sé** | No entra en «Registro»: aparece en «Revisar» con el motivo «Paciente sin identificar en la app». |

Comprueba también:
- llega el correo con el resumen;
- «Registro» queda ordenado por fecha;
- «Resumen» y «Dashboard» siguen calculando bien.

Después borra las filas de prueba de «Registro» y de «Revisar».

## Qué hacer con una fila de «Revisar»

1. Complétala: Cód. paciente, Cód. episodio, Llamada nº y Nº llamada (el siguiente correlativo).
2. Cópiala a «Registro» con *Pegado especial → Valores*.
3. Bórrala de «Revisar».
