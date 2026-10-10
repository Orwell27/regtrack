# Calibración de la revisión del mandato

Protocolo **2026-10-10-v2**, corte editorial **10 de octubre de 2026**. Segunda pasada realizada por el mismo agente que preparó las fichas. No es una revisión independiente ni ciega. **Exactitud no medida; revisión humana independiente pendiente.**

## Alcance y decisión de uso

Las 30 promesas se desglosan en 61 comprobaciones de norma, ejecución o resultado. Siguen siendo 30 promesas de un inventario de 203 identificadores distintos, comprobados en el CSV original. La selección heredada es temática y no representativa. No se reconstruye una justificación individual de las exclusiones que no se registró. Los componentes y las medidas compartidas no se suman como logros adicionales.

Se releyeron las 30 fichas frente al corpus conservado. La búsqueda de evidencia nueva se concentró en el objetivo fuera de plazo, los cinco resultados no concluyentes y las fichas 10, 78 y 139. No se afirma que se hayan vuelto a descargar todas las fuentes ni que la búsqueda externa sea exhaustiva para las treinta fichas. Los indicadores conservan sus periodos y capturas anteriores.

El balance permite consultar hechos acotados, fuentes y lagunas. No permite una puntuación global de cumplimiento, una tasa de veracidad, atribuir efectos causales al Gobierno ni extrapolar a todo el mandato. Las clasificaciones generales permanecen: 18 medidas, 6 resultados parciales, 1 objetivo fuera de plazo y 5 resultados no concluyentes.

## Reglas aplicadas

- Cada componente tiene objetivo, criterio editorial, etapa, hallazgo, referencias y estado de evidencia. «Hecho documentado» califica el hallazgo delimitado, no el cumplimiento de toda la promesa.
- Una norma acredita su contenido. Una nota institucional se atribuye al organismo. Dos notas del mismo ministerio no constituyen dos corroboraciones independientes.
- Se conserva evidencia contraria. Falta de evidencia no equivale a incumplimiento. Un objetivo fuera de plazo exige meta, vencimiento y evidencia aplicable al vencimiento.
- Una referencia de contexto no se convierte en prueba de ejecución. Una mejora estadística no acredita por sí sola causalidad.
- Se explicitan los solapamientos y qué documentos o registros requieren una revisión futura. Son pendientes editoriales manuales; no hay automatización nueva.
- Cada cambio de redacción conserva antes, después, motivo y fecha. Todas las evaluaciones v1 se conservan, incluidas las que no cambiaron.

## Corrección y aclaraciones

| Ficha | Tipo | Cambio y efecto sobre la conclusión |
| --- | --- | --- |
| 1 · Dependencia | Precisión | Financiación aprobada no prueba disponibilidad efectiva o desembolso. No cambia el veredicto. |
| 53 · Pago de becas | Alcance | El acuerdo propone «tender» al pago al inicio de curso. No se transforma en un plazo universal de pago. Sigue no concluyente. |
| 65 · Salud bucodental | Atribución | Las dos comunicaciones sanitarias tienen el mismo origen institucional. Se atribuye lo comunicado, sin llamarlo ejecución independiente auditada. |
| 78 · Becas | Error factual | El RD 179/2026 fija umbrales y cuantías; no es por sí mismo la convocatoria. Se corrigen la descripción y su efecto práctico. |
| 87 · Grandes fortunas | Evidencia añadida | El informe de Hacienda aporta información recaudatoria atribuida al emisor. No prueba una evaluación territorial independiente ni reforma definitiva. Sigue no concluyente. |
| 112 · Vivienda | Alcance temporal | El objetivo del 20 % se formula a medio y largo plazo. Se separa de las 184.000 viviendas y no se inventa un vencimiento al final de la legislatura. |
| 139 · Permisos | Precisión | Se distingue la distribución de las diecinueve semanas y las dos utilizables hasta los ocho años, frente a los componentes del acuerdo de veinte semanas y permiso parental. |
| 170 · Jornada | Contexto contrario a una lectura incompleta | Se documenta el proyecto devuelto por el Congreso. Hubo iniciativa; no se alcanzó el máximo general de 37,5 horas en el plazo prometido. |

Una corrección factual y siete aclaraciones o ampliaciones **no son una estimación de la tasa de errores**. También se añaden referencias al acuerdo original en componentes cuyo texto no cambia, como el SMI. Las etiquetas de tipo de cambio describen esta pasada, no su severidad ni una puntuación de confianza.

## Fuentes y trazabilidad

El conjunto pasa de 42 a 45 fuentes: dos PDF oficiales conservados íntegros y un registro editorial de lectura del acuerdo original.

- [Congreso, BOCG 58-3](https://www.congreso.es/public_oficiales/L15/CONG/BOCG/A/BOCG-15-A-58-3.PDF), página 1: acuerdo del 10 de septiembre de 2025; publicación del 16 de septiembre. Captura PDF y SHA-256.
- [Hacienda, Informe de Progreso Anual 2025](https://www.hacienda.gob.es/cdi/estabilidad%20presupuestaria/planfiscalestructural/informe-progreso-2025.pdf), anexo VII, página 36. Información del organismo; fecha exacta de publicación no verificada y conservada como nula. Captura PDF y SHA-256.
- [Acuerdo de coalición de 2023](https://www.psoe.es/media-content/2023/10/ACUERDO_GOBIERNO_COALICIO%CC%81N_2023-DEF.pdf), páginas 11, 22, 28, 29 y 38. Consultado por el lector web. La descarga directa devolvió HTML en lugar del PDF: se rechaza como captura original. La huella identifica únicamente el registro editorial conservado y así se declara en la web.

Los dos PDF archivados se comprobaron además mediante extracción local de su texto. No se atribuye al acuerdo original una huella que no se ha obtenido de sus bytes.

`data/mandate/calibration.json` contiene reglas y comprobaciones. `data/mandate/commitments.json` conserva `assessmentHistory` con las evaluaciones v1. La API expone una proyección con criterios, referencias públicas e historial de texto; no expone rutas internas ni los documentos completos. Las fuentes nuevas no alteran textos oficiales, declaraciones gubernamentales ni plazos del inventario.

## Verificación y siguiente calibración

Las pruebas de integridad y comportamiento no sustituyen una revisión factual independiente. Se comprueba que la aplicación rechace atribuciones de independencia o exactitud inexistentes, afirmaciones positivas sin fuente, declaraciones presentadas como prueba directa, referencias rotas e historiales incoherentes. El recorrido de navegador comprueba los componentes de las treinta fichas, citas, historial y presentación móvil.

Para medir exactitud será necesario definir por adelantado una muestra de referencia, revisar las fuentes con una persona independiente que registre su valoración antes de ver la anterior, resolver los desacuerdos y publicar denominador, tipos de error y alcance. Una segunda IA por sí sola no resuelve esa limitación. Esta entrega deja esa revisión pendiente; no inventa sus resultados.

Validación ejecutada sobre el código de `22c99a2`: TypeScript, ESLint y compilación de producción Webpack correctos. Catorce recorridos locales Playwright pasan, incluida la lectura de los 61 componentes de las treinta fichas y sus citas, el historial y el móvil; capturas de calibración y corrección inspeccionadas. El guard de empaquetado valida 49 trazas, 80 dependencias y seis lectores obligatorios. Comparación por contenido frente a v1: los treinta textos oficiales, declaraciones, plazos y evaluaciones históricas se conservan.

La suite local ejecutó 314 pruebas: 308 pasaron inicialmente, cinco no se ejecutaron y una falló por tiempo de inicialización de PGlite. Las dos suites afectadas pasan después aisladas (12 pruebas, un trabajador y margen de inicialización ampliado). No se modificaron sus aserciones. La integración continua completa del [PR21, ejecución 38030490769](https://github.com/Orwell27/regtrack/actions/runs/38030490769), pasa con los tiempos habituales, incluida la suite completa, lint, compilación, empaquetado y 18 recorridos de navegador (observatorio y comunidad).

Entrega en rama `feat/calibracion-balance`, [PR21](https://github.com/Orwell27/regtrack/pull/21), sin integrar en producción. La [vista previa de Vercel](https://regtrack-8v1bjpr36-orwell27s-projects.vercel.app/observatorio/mandato) está compilada y requiere autenticación de Vercel. API remota comprobada mediante la sesión existente: versión v2, treinta fichas y exactitud nula; las comprobaciones visuales descritas son locales. La publicación vigente sigue siendo v1 (`7270204`).
