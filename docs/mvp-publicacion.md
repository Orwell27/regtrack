# Preparación de publicación del MVP

## Resultado y alcance

El recorrido privado ya abre documentos con sesión real, guarda originales y explica una captura concreta con citas. Se incorpora un modo de captura sin IA y confirmación remota antes de analizar o insertar alertas. Estas mejoras están preparadas en PR18; no activan por sí solas producción ni el cron.

## Captura sin consumo de IA

En un archivo local separado, sin sincronización remota:

```powershell
$env:REGTRACK_KNOWLEDGE_DIR = '.knowledge/captura-prueba'
$env:REGTRACK_MEMORY_SYNC = '0'
npm run pipeline -- --memory-only --from 2026-09-30 --to 2026-09-30
```

Descarga los índices BOE/BORM del periodo y sus textos accesibles. Conserva sumarios, originales e informe; no clasifica, analiza, consulta `alertas`, inserta alertas ni llama a Claude. Un índice o una fuente bloqueada quedan como pendientes/error, nunca como una interpretación jurídica. No se intenta resolver CAPTCHA.

La captura admite hasta un millón de caracteres por documento, sin recortar; el análisis con IA mantiene su límite de 120.000. Los textos que lo superan se conservan íntegros y quedan pendientes de lectura por partes, antes de gastar IA.

Con `REGTRACK_MEMORY_SYNC=1`, el worker confirma las capturas en la memoria privada de Supabase antes de continuar. El modo completo también confirma el análisis antes de crear la alerta. Una caída de sincronización detiene el procesamiento; el informe final intenta conservar todo lo pendiente. `--scan-only` conserva su contrato de diagnóstico sin IA ni clientes de base de datos; es incompatible con `--memory-only`.

El workflow admite `mode=memory`, exige la variable de sincronización activa y `scan_only=false`, y no entrega la clave Anthropic a ese modo. La selección manual no cambia el modo del cron. Todavía no se ha activado la variable de GitHub ni ejecutado este nuevo modo allí.

La confirmación por captura reduce lo que se pierde si el worker cae después. **No es una cola duradera para escrituras fallidas:** un runner temporal puede perder la última captura no confirmada. Tampoco resuelve BORM, los conectores con solo índices ni el límite provisional del lector (5.000 versiones/20 MiB). Un archivo confirmado no equivale a cobertura completa.

## Caso real de aceptación: vivienda turística de Murcia

`npm run memory:case -- --vault RUTA` prepara localmente una lectura editorial del Decreto 256/2019 ya conservado. Exige el texto histórico completo, fecha de publicación y SHA256 fijado; no descarga fuentes ni llama a un modelo. Un segundo uso no duplica la misma lectura. La fuente y sus capturas previas no se sobrescriben.

Se ha incorporado **una lectura pendiente de revisión**, vinculada exactamente a la captura existente: artículo 6.1, disposición adicional primera y regla histórica de entrada en vigor. La vista muestra también sus limitaciones sin abrir desplegables. Distingue seis meses de veinte días y no crea un plazo nuevo desde la observación de 2026. Es una aceptación del recorrido documental, no una medición de la calidad del modelo.

La [sede oficial de la CARM, procedimiento 1890](https://sede.carm.es/web/pagina?IDCONTENIDO=1890&IDTIPO=240&RASTRO=c%24m40288), consultada el 1-oct-2026, remite al decreto y contiene requisitos posteriores. Por eso el caso de 2019 no certifica una actividad concreta ni sustituye el contraste actual. El TXT de BORM no fue accesible con el navegador de investigación en esta comprobación; se utiliza la captura oficial histórica ya conservada, con procedencia en `tests/fixtures/borm-2019-6433.source.md`.

## Dependencia de seguridad antes de publicar

PR14 de Claude sigue abierto y no se modifica ni fusiona sin autorización. Comparación con `main`:

- `app/api/admin/grupos-telegram/route.ts`: borrado en main, modificado en PR14. La resolución propuesta conserva su retirada.
- `app/api/alertas/[id]/enviar/route.ts`: main publica en web; PR14 aún parte del envío por Telegram. La resolución propuesta conserva la publicación web y añade `requireAdmin()` antes de consultar la alerta.
- Los tests de PR14 deben retirar las rutas y efectos de Telegram desaparecidos y conservar controles positivos de publicación web, además del rechazo de visitante, cookie falsificada y suscriptor.

**PR14 no resuelve por sí solo los permisos heredados de `usuarios`.** El registro público inserta perfiles directamente desde el navegador; endurecer sus permisos requiere preparar y probar también ese recorrido. La lista privada `REGTRACK_MEMORY_READER_IDS` protege Memoria independientemente, pero no acredita seguridad de todo el panel. No se ha aplicado ninguna migración adicional ni cambiado el registro.

## Condiciones para publicar y activar

1. Resolver la dependencia de seguridad autorizada, probar rutas y permisos y completar CI/build del resultado combinado.
2. Aprobar ese resultado concreto y configurar el backend/IDs privados en Production, sin exponer claves al navegador.
3. Integrar y comprobar la sesión real en la URL publicada. El preview tiene además protección de Vercel.
4. Habilitar la sincronización del worker y lanzar primero una captura acotada sin IA. Confirmar originales, informe, integridad y comportamiento ante errores.
5. Observar varias ejecuciones programadas y resolver recuperación de pendientes antes de afirmar autonomía. El consumo de IA adicional y cualquier publicación editorial requieren su autorización correspondiente.

No se han realizado estos pasos de activación en esta entrega. Se mantienen las fuentes originales, revisión humana pendiente y distinción entre ausencia de resultados y fallo de cobertura.

## Verificación del 1 de octubre de 2026

- 292 pruebas en 34 archivos. Los controles nuevos fallaron antes de implementar el guardado previo y el modo sin IA. Un primer test contenía una aserción dentro de una llamada capturada por el pipeline: se corrigió para comprobar fuera el orden observado y se verificó su fallo antes del arreglo.
- TypeScript y build correctos, con las dos rutas de memoria comprobadas sin archivos privados empaquetados. ESLint dirigido correcto en el código nuevo; el lector BOE mantiene tres errores `no-explicit-any` ya presentes en HEAD, verificados también sobre esa versión anterior.
- Respaldo completo local posterior a la lectura de Murcia: ocho registros y 24 archivos, verificados y restaurados en un destino separado. No equivale a un respaldo externo ni de los volúmenes de los servicios.
- Sesión real local: ficha de Murcia, explicación, límites visibles, acciones y citas desplegadas. Escritura/lectura de una única lectura editorial en el archivo privado confirmada; las siete fuentes originales siguen intactas. Repetir `memory:case` devuelve la misma versión.
- Captura real BOE/BORM del 30-sep, en vault local separado, sin clave de IA ni servicio de BD: primer intento, 39 índices BOE, 36 textos y tres errores de tamaño; BORM bloqueado. Esa evidencia motivó separar el límite de captura del de análisis.
- Repetición corregida: **39 textos BOE íntegros**, 36 capturas pendientes de análisis ordinario y tres pendientes de lectura por partes; **79 registros** contando sumarios e informe. BORM sigue bloqueado por CAPTCHA. Informe incompleto, cero alertas y cero IA; no hubo sincronización remota de este ensayo. Evidencia local ignorada en `artifacts/capture-validation-20261001-v2/verification.json`.
- No se ha medido la precisión de Claude tras las correcciones ni la continuidad programada. El caso editorial de Murcia no sustituye ese ensayo.
