# Vigilancia fiable: alcance y comprobaciones

## Qué significa una ejecución verde

El flujo recoge BOE y BORM de los últimos tres días naturales; el resto de boletines aporta las publicaciones recientes disponibles en sus canales. Las fuentes fallidas no detienen a las sanas, pero hacen que la ejecución termine con error. Un canal vacío aparece como «sin resultados», no como cobertura demostrada. La ausencia de errores tampoco prueba exhaustividad jurídica.

Cada ejecución conserva durante 30 días en GitHub Actions:
- `scan-report.json`: estado por fuente y fecha; documentos guardados, descartados con motivo, de score bajo, ya existentes, fallidos y pendientes.
- `scan-summary.md`: resumen legible; también se muestra en la ejecución.
- `schedule-health.json`: última ejecución programada y alertas de continuidad.

Los informes se escriben antes de empezar, después de recoger las fuentes y tras cada documento. Si se interrumpe el proceso, el JSON conserva estado `running`, no un éxito falso. Los documentos fallidos no se insertan como descartados y se reintentan si siguen en la ventana del siguiente escaneo. Los fallos fuera de esa ventana requieren recuperación explícita; no existe aún una cola durable de reintentos.

## Comandos

```powershell
npm test
npx tsc --noEmit
# Solo fuentes públicas: no consume IA ni escribe en la BD.
npm run pipeline -- --scan-only
# Recuperación por fechas, BOE y BORM (máximo 31 días por lote).
npm run backfill -- --from 2026-09-01 --to 2026-09-30
# Comprobar primero sin IA ni escrituras.
npm run backfill -- --from 2026-09-01 --to 2026-09-30 --scan-only
# Diagnóstico de continuidad; exit 1 si hay hueco, fallo o desactivación.
npx tsx actions/check-schedule.ts
```

La recuperación comparte exactamente el procesamiento del flujo diario e incluye sábados. El comando antiguo `backfill --days` se sustituye por un intervalo explícito para limitar el trabajo y el gasto. Se detiene a los 24 minutos y conserva qué queda pendiente, antes del límite del job de 30 minutos. No recupera automáticamente el hueco julio-septiembre de 2026 ni el histórico de los otros 13 boletines. Las URLs ya guardadas no vuelven a analizarse; los descartes se auditan en el artefacto pero no se cachean, por lo que el solapamiento puede aumentar el coste de IA. Medirlo en el piloto.

## BORM y documentos completos

El conector usa la API de la propia web, consultando boletín ordinario y suplementos por fecha. Esto sustituye el índice anual de transparencia, que puede devolver HTML y no cubre años anteriores. El TXT oficial se descarga después de deduplicar, antes de clasificar y analizar. Se conserva el contenido completo hasta 120.000 caracteres; por encima de ese límite se marca pendiente para análisis por partes, sin cortar silenciosamente. BOE utiliza el mismo límite. Los demás RSS pueden seguir aportando solo resúmenes: no presentar su contenido como lectura íntegra.

Fuentes de las rutas, comprobadas el 30-sep-2026:
- https://www.borm.es/scripts/boletines/factories/boletinFactory.js
- https://www.borm.es/scripts/suplementos/factories/suplementoFactory.js
- https://www.borm.es/scripts/anuncio/factories/anuncioFactory.js

**Bloqueo observado:** desde Node en esta máquina, BORM redirige al CAPTCHA de Radware; se detecta explícitamente y no se intenta sortear. Las consultas públicas realizadas antes de detectar el bloqueo permitieron verificar el formato y obtener el TXT real del Decreto 256/2019 (fixture de 41.426 caracteres). Eso no acredita acceso autónomo desde Actions. Antes de activar el cambio hace falta verificar una vía de acceso automatizado autorizada por el proveedor. Si no existe, el documento queda pendiente de recuperación manual.

El índice del catálogo oficial de datos abiertos también devolvió HTTP 302 al CAPTCHA. El lector detiene la redirección antes de pedir el desafío y no vuelve a solicitar esa fuente por cada fecha o documento durante el mismo escaneo. No se ha encontrado una vía utilizable de acceso completo para Murcia. La evidencia y una consulta preparada, sin enviar, están en [borm-acceso-automatizado.md](borm-acceso-automatizado.md).

## Fuentes reparadas y comprobadas

Lecturas reales desde Node del 30-sep-2026, sin IA ni base de datos:

| Fuente | Resultado | Reparación |
|---|---:|---|
| BOCM | 101 documentos | RSS vigente `https://www.bocm.es/ultimo-boletin.xml`, título sustantivo y fecha oficial. |
| DOGC | 92 documentos | Servicios públicos de consulta usados por el portal; recorrido completo de cabeceras, subcabeceras y anexos anunciados. |
| BOCYL | 43 documentos | Un único item RSS agrupaba las 43 disposiciones; se separan todas y se decodifican referencias XML simples sin permitir DTD ni expansión recursiva. |
| BOE | 38 documentos hoy; 46 el 14-mar-2020 | Se recorren todas las ediciones del día, incluidas extraordinarias, y los nodos de forma variable de la API. |

BOCM, DOGC y BOCYL aportan **sumarios**, no el articulado íntegro. Es el último boletín disponible, sin garantía de recuperar días perdidos. Las pruebas usan capturas reales con procedencia documentada y detectan cambios de estructura. DOGC usa la API del portal, no un contrato público de estabilidad; los suplementos de notificaciones personales quedan fuera.

En BOE, el texto se extrae del nodo oficial completo en su orden original. Se eliminó un corte adicional por la palabra «Jefatura», que podía eliminar artículos anteriores si aparecía dentro del articulado. La lectura real del documento BOE-A-2020-3692 devolvió 33.082 caracteres, incluidos el artículo inicial y la disposición final. Esa prueba comprueba extracción, no vigencia actual ni interpretación jurídica.

## Programador y aviso independiente

El cron propuesto corre todos los días a las 08:17 UTC. `check-schedule.ts` considera anómalo un intervalo superior a 36 horas sin ejecución programada; una ejecución manual no oculta ese hueco. Dentro del flujo se excluye la ejecución actual: su arranque no puede tapar el intervalo perdido ni el fallo anterior. El chequeo avisa pero no bloquea la recuperación. El comando puede utilizarse desde un monitor externo.

Un flujo no puede avisar mientras su propio programador está parado. **No se ha instalado un monitor externo en este PR.** GitHub documenta que en repositorios públicos puede desactivar schedules por 60 días de inactividad y que puede retrasar ejecuciones. Esto es compatible con parte del riesgo observado, no demuestra la causa histórica. La API consultada el 30-sep devuelve workflow `active`, actualizado esa mañana, y última ejecución programada del 6-jul. La recuperación del siguiente disparo automático solo se confirma observándolo tras integrar.

- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- https://www.boe.es/diario_boe/ayuda.php (BOE también publica sábados).

## Validación y límites

Baseline del primer cambio: 75 tests en verde; primera entrega y actualización de main: 119 tests. Tras reparar las fuentes: **164 tests en 25 archivos**, TypeScript, ESLint dirigido y build de producción correctos. Fallos verificados primero en rojo: HTTP 404 convertido en vacío, HTML tratado como RSS, errores de clasificación convertidos en irrelevancia, ediciones extraordinarias BOE omitidas, texto cortado por «Jefatura» y arranque del cron que ocultaba el hueco anterior. También se reprodujo y corrigió un bloqueo conocido durante la recopilación que no se respetaba al descargar documentos de otra fecha de la misma fuente.

Cobertura de la suite: aislamiento de fallos por fuente; sábado y fechas Madrid; suplementos BORM; formatos reales BOCM/DOGC/BOCYL/BOE; error de texto completo; error de BD al deduplicar; fallo de IA reintentable; interrupción API con pendientes; ruta positiva que guarda para revisión editorial; CAPTCHA y corte compartido por fuente; conservación de la disposición final de un decreto real situada después del carácter 8.000, también en las peticiones de ambas etapas de IA.

La IA está simulada en las pruebas. No se ejecutó un clasificador de pago contra un conjunto jurídico revisado ni se midieron precisión/omisiones jurídicas. Esta es la primera capa operativa; el siguiente piloto debe auditar una muestra de alertas y de descartes, con un conjunto de casos mantenido aparte y revisado por una persona competente. No se ha cambiado la revisión editorial ni se publican alertas automáticamente.

Quedan fuera: resolver el acceso bloqueado del BORM, medir los feeds vacíos, integrar #8/#9/#11, conectar configuración del panel al pipeline, actualizar reglas jurídicas, modificar permisos de administración, migraciones o despliegues. Los errores de correlación/sectorial siguen su comportamiento previo de enriquecimiento no bloqueante; este PR distingue fallos de ingesta y clasificación/impacto, no garantiza el éxito de todo enriquecimiento.
