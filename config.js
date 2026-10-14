/* ECMO HUB bedside — © 2026 Luis Javier Pérez Bazaga. Todos los derechos reservados. */
/* =====================================================================
   Configuración del envío de llamadas al registro de la unidad.

   metodoEnvio
     'compartir'  Hoy. La app genera el .xlsx y abre el menú Compartir del
                  móvil (OneDrive, SharePoint, Teams…); el usuario lo guarda en
                  SharePoint › uci-ecmo › REGISTRO › Entradas app. Sin menú
                  Compartir, el archivo se descarga. Le pasa al ordenador y a
                  Chrome en Android, que no deja compartir archivos de Excel
                  desde una web; en iPhone y iPad sí se abre el menú.
     'graph'      Futuro. Subida directa con Microsoft Graph (MSAL.js, permiso
                  delegado Sites.Selected) cuando informática del SES registre la
                  app en Entra ID. Para activarla: escribir en app.js la función
                  ENVIO.graph(archivo), rellenar los cuatro datos de abajo y poner
                  aquí 'graph'. Nada más cambia.

   enlaceCarpeta  Dirección de la carpeta «Entradas app» en SharePoint. La app la
                  abre con el botón «Abrir Entradas app» para subir el archivo
                  descargado (Cargar → Descargas). Vacío: no se muestra el botón.

   Datos para 'graph' (vacíos mientras no haya registro en Entra ID):
     clientId        Id. de aplicación (cliente) del registro en Entra ID.
     tenantId        Id. del inquilino (directorio) de Microsoft 365 del SES.
     siteUrl         URL del sitio de SharePoint, p. ej. https://<inquilino>.sharepoint.com/sites/uci-ecmo
     carpetaDestino  Ruta dentro de la biblioteca Documentos, p. ej. REGISTRO/Entradas app
   ===================================================================== */
(function (raiz) {
  "use strict";
  raiz.ECMO_CONFIG = {
    metodoEnvio: "compartir",
    enlaceCarpeta: "https://saludjuntaex.sharepoint.com/sites/uci-ecmo/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2Fuci-ecmo%2FShared%20Documents%2FREGISTRO%2FEntradas%20app",
    clientId: "",
    tenantId: "",
    siteUrl: "",
    carpetaDestino: ""
  };
})(this);
