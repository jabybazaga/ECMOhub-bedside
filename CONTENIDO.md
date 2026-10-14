# Inventario de contenido clínico

ECMO HUB bedside — © 2026 Luis Javier Pérez Bazaga. Todos los derechos reservados.

Este documento dice de dónde sale cada bloque de contenido clínico de la app. Servirá de base para separar más adelante una versión genérica (para tiendas) de la versión del servicio. No se ha movido código: cada fila dice dónde está hoy.

## Orígenes

| Origen | Qué es |
|---|---|
| **ELSO** | Guías publicadas de la Extracorporeal Life Support Organization, citadas: *ELSO Guidelines for Adult Respiratory Failure* y *General Guidelines for all ECLS Cases* (v1.4, 2017) y el ELSO Live Registry. |
| **CHUB** | Protocolo ECMO del Servicio de Medicina Intensiva del Complejo Hospitalario Universitario de Badajoz (aprobado el 02/05/2024) y sus anexos. Pertenece a sus autores. |
| **Otras publicaciones** | Fuentes externas que no son ELSO: Algoritmos ECMO v2 del Hospital Clínic (2025), SCAI SHOCK (Naidu 2022), Kapur 2022, RESP y SAVE (Schmidt 2014-2015), EOLIA (Combes 2018) y Crs en ECMO VV (Ann Intensive Care 2023). |
| **Propio** | Lo escrito para la app: calculadoras, motor de reglas de la ronda, redacción del informe, perlas interactivas y textos de apoyo. Usa umbrales de CHUB o ELSO, pero la lógica y la redacción son de la app. |
| **Registro SES** | Módulo de registro de llamadas. Solo tiene sentido dentro del servicio: columnas del Excel de la unidad, hospitales de Extremadura, carpeta de SharePoint y flujo de Power Automate. |

> En pantalla, el contenido del protocolo lleva la etiqueta **CHUB**. Todas las fuentes externas, ELSO incluida, llevan la etiqueta **EXTERNO** (o **EXT** en Fuentes): hoy no hay una etiqueta «ELSO» separada.

## Tipo de contenido

- **Recomienda:** propone una actuación o un objetivo (avisos, «PLAN DE GUARDIA», algoritmos).
- **Calcula:** hace una operación con los datos que se escriben y muestra el resultado, sin decir qué hacer.
- **Informa:** referencia de lectura (indicaciones, criterios, umbrales, definiciones).
- **Registra:** guarda datos para exportarlos.

## Inventario

| Pantalla / bloque | Dónde está | Origen | Tipo |
|---|---|---|---|
| **Ronda diaria** · Valores derivados (PAM, presión de pulso, flujo/kg, relación gas:sangre, CaO₂, DO₂, VO₂, DO₂/VO₂, SaO₂−SvO₂, driving pressure) | `reglas.js` (`evaluar`, bloque «derivados») | Propio | Calcula |
| **Ronda diaria** · Avisos «Qué revisar hoy» (crítico / a vigilar / en rango) de circuito, gasometría, ventilación, hemodinámica, analítica y anticoagulación | `reglas.js` (`evaluar`, bloque «reglas») | Propio, con umbrales CHUB (64 avisos), ELSO 1.4 (1), CHUB + ELSO (6) y CHUB + Clínic (2) | **Recomienda** |
| **Informes** · Resúmenes Respiratorio, Hemodinámica y Hematológico | `app.js` (`resumenRespiratorio`, `resumenHemodinamico`, `resumenHematologico`) | Propio | Informa (redacta los valores de la ronda) |
| **Informes** · «PLAN DE GUARDIA» (avisos críticos y a vigilar, con la primera frase de su recomendación) | `app.js` (`planDeGuardia`, `abrirInforme`, `textoPlanoInforme`) | Propio, a partir de los avisos de la ronda | **Recomienda** |
| **Calculadoras** · Valores derivados y «Qué criterio cumple» | `index.html` (`#screen-calc`), `app.js` | Propio, con criterios CHUB | Calcula |
| **Calculadoras** · Recirculación | `index.html` (`#screen-calc`), `app.js` | CHUB | Calcula |
| **Calculadoras** · Heparina según protocolo (bolo, perfusión en UI/kg/h, bivalirudina) | `index.html` (`#screen-calc`), `app.js` | CHUB | Calcula (dosis según la pauta del protocolo) |
| **Calculadoras** · RESP y SAVE | `index.html` (`#screen-calc`), `app.js` | Otras publicaciones (Schmidt) | Calcula |
| **ECMO VV** · Indicaciones, contraindicaciones, configuración, ventilación de reposo, hipoxemia refractaria, recirculación, destete | `index.html` (`#screen-vv`) | CHUB y ELSO | Informa |
| **ECMO VA** · Shock refractario, indicaciones, contraindicaciones, canulación, distensión del VI, Arlequín (con escalado), ECPR, destete | `index.html` (`#screen-va`) | CHUB, ELSO y SCAI | Informa; el escalado del Arlequín **recomienda** |
| **Anticoagulación** · Pauta de heparina, ajuste de la perfusión, situaciones especiales, bivalirudina, umbrales de hemoderivados | `index.html` (`#screen-anticoag`) | CHUB y ELSO | Informa (pautas del protocolo) |
| **Complicaciones** · Emergencias (modo crisis: pasos de actuación) | `index.html` (`#screen-complicaciones .em-src`), `app.js` (`buildEmergencias`) | CHUB | **Recomienda** |
| **Complicaciones** · Vigilancia diaria: fallo del circuito, hemólisis, complicaciones del paciente | `index.html` (`#screen-complicaciones`) | CHUB | Informa |
| **Escalas** · Murray, APSS, AOI, INTERMACS | `index.html` (`#screen-escalas`), `app.js` | CHUB | Calcula |
| **Escalas** · SCAI SHOCK, RESP y SAVE | `index.html` (`#screen-escalas`), `app.js` | Otras publicaciones | Calcula / Informa |
| **Checklists** · Maletas virtuales (circuito y consola, fluidos y fármacos, punto de cuidado…) | `app.js` (maletas) | CHUB | Informa (lista de comprobación) |
| **Perlas** · Hemofiltro, membrana, respirador VV, destete, cavitación, condensación | `perlas/perlas.json`, `perlas-interactivas.js` | CHUB; respirador VV también Ann Intensive Care 2023; animaciones propias | Informa |
| **Perlas** · Síndrome de Arlequín (algoritmo simplificado) | `perlas/perlas.json` (`algoritmo`), `perlas-interactivas.js` | CHUB e indicaciones del equipo | **Recomienda** |
| **Supervivencia** · Registro ELSO al alta y por clase de riesgo | `index.html` (`#screen-datos`), `app.js` (`renderSurv`) | ELSO (Live Registry) y EOLIA | Informa |
| **Fuentes** | `index.html` (`#screen-fuentes`) | CHUB, ELSO y otras publicaciones | Informa |
| **Inicio** · «Iniciar traslado» | `index.html`, `app.js` | Registro SES | Registra |
| **Registro de llamadas** · Formulario, listas cerradas, columnas calculadas (Año, Semestre, Grupo de edad, driving pressure) y envío al registro | `registro.js`, `xlsx.js`, `config.js`, `app.js` | Registro SES | Registra / Calcula |
| **Acerca de** y aviso clínico | `index.html` (`#screen-acerca`, `#aviso-ini`), `app.js` | Propio | Informa |

## Qué recomienda y qué no, en la ronda y el informe

| Parte | Recomienda | Solo calcula o informa |
|---|---|---|
| Ronda · Valores derivados | | ✔ Calcula |
| Ronda · Avisos «Qué revisar hoy» en **crítico** y **a vigilar** | ✔ Cada aviso trae un mensaje con la actuación sugerida | |
| Ronda · Avisos **en rango** e **información** | | ✔ Informa |
| Informe · Respiratorio, Hemodinámica, Hematológico | | ✔ Informa |
| Informe · «PLAN DE GUARDIA» | ✔ Lista los avisos críticos y a vigilar con su recomendación | |
| Informe · Pie («Apoyo de lectura, no sustituye al protocolo ni al juicio clínico») | | ✔ Informa |

