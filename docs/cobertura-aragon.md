# Aragón: acuerdo de 2026 y transcripción provisional

## Alcance y límites

El ámbito es `r-02`, mandato iniciado en 2026. El Real Decreto 367/2026 identifica la investidura de 28–29 de abril; no se reutiliza el programa de 2023 como documento del nuevo mandato. El acuerdo PP–VOX está fechado y firmado el 22/04/2026.

Se importan **117 apartados con viñeta principal**, distribuidos en 13 capítulos, de una copia escaneada de 39 páginas. Las sublistas y continuaciones quedan dentro del apartado. Hay 17 bloques de contexto: índice, dos páginas de bases, 13 epígrafes y firma. Las bases contienen compromisos sobre coalición y presupuestos de 2027–2030: están conservadas, pero falta conciliarlas como promesas independientes. Tampoco se deduplican las reiteraciones. No es un universo cerrado de promesas del mandato.

La Vanguardia y Cadena SER alojan **exactamente los mismos bytes** (SHA-256 `d7a95e019ee42488ac297813490a63a93e40100368e54555b2f95c6d90092e8c`). No son dos corroboraciones independientes. No se ha recuperado una copia publicada por los firmantes. La comunicación de VOX confirma la firma, no autentica cada página de las copias.

`programmeCopy`, `inventoryKind` y `transcriptionPending` impiden presentar el inventario original como completo. El aviso de OCR aparece en el balance, en las notas de cada apartado y entre los pendientes de cobertura. Las dos revisiones son parciales (ocho componentes); quedan **115 apartados sin revisión sustantiva** y **cero revisiones humanas independientes**.

## Extracción reproducible

Los PDF carecen de capa de texto. Se conserva esa extracción vacía, el OCR íntegro con coordenadas, el orden por geometría y las huellas de cada archivo. Windows.Media.Ocr en español procesa las páginas renderizadas por PDFium a escala 2. No proporciona puntuaciones de confianza y no se inventan.

1. Renderizar `programme.pdf` a `.artifacts/aragon-pages/page-01.png`…`page-39.png` con PDFium, escala 2.
2. Ejecutar `scripts/ocr-aragon-programme.ps1` con Windows PowerShell 5.1, parámetros `-ImageDirectory` y `-OutputPath`; conservar el JSON como `programme.ocr.json`, UTF-8 sin BOM. No se cambia la política del sistema.
3. Ejecutar `scripts/extract-aragon-programme.py` (Pillow). Detecta las 117 viñetas por posición física y registra todos los renglones OCR, incluidos los decorativos excluidos. Los epígrafes se fijan por localizadores explícitos.
4. Ejecutar `scripts/import-aragon-programme.py` (solo biblioteca estándar). Cada renglón no decorativo tiene un único destino comprobable en fichas o contexto. Reordena fragmentos horizontales y conserva los saltos entre páginas.
5. Ejecutar `scripts/register-aragon-sources.py`. Comprueba bytes, tamaños, huellas y extracciones; las dos copias idénticas conservan una misma familia de autoría.

Hay correcciones puntuales de confusiones OCR `eI/el`, `EI/El` y contextos concretos; no se sustituyen globalmente cifras `10`, `I` u `O`. La tabla fiscal de la página 4 se transcribe por filas tras verla; se conserva el OCR sin corregir. Las firmas de la página 39 se ordenan por firmante tras revisión visual. Se han visto también los pasajes de las revisiones (páginas 29 y 38) y la discrepancia fiscal/educativa (4 y 30). **Falta el cotejo íntegro independiente de toda la transcripción.** Los controles de integridad no prueban exactitud semántica del OCR.

La deducción para refuerzo educativo conserva los dos plazos del acuerdo: 2028 en el apartado fiscal y 2027 en el educativo. Las notas de `r-02-2` y `r-02-81` señalan la discrepancia, sin resolverla editorialmente.

## Revisiones

### Bachillerato (`r-02-80`)

La Orden ECD/515/2026 se publicó el 8/04, antes del pacto y la investidura. Regula una convocatoria, no acredita concesiones ni pagos. El anuncio del 7/04 se atribuye a la consejera en funciones y reconoce ocho centros preexistentes: no se cuentan como ampliación conseguida en el nuevo mandato.

Los recurrentes comunican una suspensión cautelar el 11/06. Ayuntamiento de Zaragoza y Grupo San Valero describen consecuencias sobre Distrito7 el 25 y 26/06. Son fuentes de intereses distintos, involucradas en el mismo proceso, no auditorías externas. El proyecto incluye FP; no se extrapola su aplazamiento a todas las aulas de Bachillerato. No se ha incorporado el auto judicial, por lo que su alcance íntegro queda sin resolver. Una cautelar no es sentencia sobre el fondo.

Se conserva la consulta oficial abierta del 21/08 al 9/09 y su memoria. El estado «Concluido» corresponde al plazo de aportaciones, no a la aprobación del decreto. Faltan la normativa posterior, resoluciones finales, unidades, alumnado y pagos, y el cierre del curso 2026–2027. No se marca como vencido el curso completo en octubre.

### Vicepresidencia (`r-02-114`)

El BOA del 4/05 documenta el nombramiento de Nolasco como vicepresidente y consejero de Desregulación, Bienestar Social y Familia. El decreto de nombramiento no fija por sí mismo la precedencia de «primera». Se conserva esa diferencia como cotejo pendiente con las normas organizativas, sin inferir incumplimiento. Nombrar un cargo no prueba reducción de trámites; tampoco da por revisadas las otras viñetas del reparto institucional.

## Fuentes y cierre pendiente

Doce fuentes registradas, seis familias: PP–VOX, Gobierno de España, Gobierno de Aragón, organizaciones recurrentes, Ayuntamiento de Zaragoza y Grupo San Valero. Once archivos originales y una nota editorial de la comunicación de VOX; la huella de esta última corresponde a la nota, no al HTML inaccesible. Los títulos identifican quién firma y quién aloja cada documento.

Antes de cerrar Aragón: recuperar el archivo del firmante y cotejar toda la transcripción; conciliar bases y reiteraciones; revisar los otros 115 apartados; recuperar el auto y la normativa posterior; revisar organización y reparto institucional; completar revisión humana independiente. El objetivo general de 70 administraciones sigue abierto. Esta incorporación deja 53 territorios sin inventario (ocho comunidades y 45 capitales).

## Verificación local

420 pruebas Vitest comprobadas: 418 pasaron en la ejecución general; dos agotaron 5 segundos durante la carga concurrente y pasaron al repetir los 27 casos de sus dos archivos con un trabajador, sin cambiar tiempos ni aserciones. Los 67 controles Python y ESLint pasan. Build webpack y TypeScript correctos; guardián de 51 trazas, 118 dependencias y ocho rutas correcto. En navegador pasaron 46 recorridos y uno falló por un selector que apuntaba al título en vez de a la sección; corregido, pasan los dos recorridos de Aragón. Capturas móviles de cabecera y contraste inspeccionadas, sin desbordamiento. Estos resultados locales no sustituyen la CI ni la comprobación del despliegue.
