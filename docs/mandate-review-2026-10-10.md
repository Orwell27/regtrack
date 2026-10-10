# Balance nacional: revisión de los 30 compromisos

Corte editorial: **10 de octubre de 2026**. Este documento conserva la primera revisión (v1). La [segunda pasada y sus correcciones](mandate-calibration-2026-10-10.md) documentan la versión v2; los documentos del 7 de octubre describen el estado inicial. El inventario del Gobierno conserva su propio corte: **30 de junio de 2026**. Revisar hoy no convierte una observación histórica en un dato de hoy.

## Entrega

Las 30 fichas tienen resultado esperado, evidencia observada, ámbito, periodo comprobado, consecuencia práctica, datos que faltan y fuentes con localizadores. Las 22 que no tenían contraste reciben una revisión individual; las ocho anteriores se revisan también. El texto y la declaración oficial del inventario se conservan sin alterarlos.

El balance separa cuatro conclusiones editoriales, con filtro y acceso desde el resumen:

| Conclusión | Fichas | Significado |
| --- | ---: | --- |
| Medidas acreditadas; efecto por verificar | 18 | Hay norma, instrumento o decisión documentados. Un anuncio ministerial se atribuye al organismo y no se presenta como ejecución independiente auditada. |
| Resultado parcial documentado | 6 | Se puede contrastar un componente o una evolución acotados. No significa que el compromiso entero esté parcialmente cumplido con una proporción calculable. |
| Objetivo no alcanzado en el plazo | 1 | Jornada general de 37,5 horas: plazo explícito de 2025 y máximo legal de 40 horas comprobado tanto al vencer como al corte. No atribuye intención ni responsabilidad exclusiva. |
| Resultado no concluyente | 5 | Se revisaron las fuentes, pero falta la evidencia necesaria para juzgar el resultado prometido. Se identifica qué falta en cada ficha. |

La cobertura de primera revisión es **30/30**, no 100 % de cumplimiento. No hay nota global ni extrapolación a los 203 compromisos del inventario. Los 30 forman una selección editorial no representativa. Las conclusiones no recomiendan el voto.

## Hallazgos y límites que deben conservarse

- **Jornada (170):** acuerdo de coalición, página 11; artículo 34.1 del Estatuto en versiones al 31-12-2025 y 10-10-2026. No confundir máximo legal general, convenios y jornada de la AGE.
- **Permisos (139):** diecinueve semanas generales en el régimen consultado frente al objetivo de veinte y otros componentes del acuerdo. Separar las partes del permiso y sus fechas.
- **SMI (107):** cuantía anual de 2026 y garantía legal permanente del 60 % son cuestiones distintas. La ficha contrasta el artículo 27 y no fabrica una base estadística del salario medio.
- **Vivienda (17, 55, 74, 76, 112, 160 y 186):** incorporar RD 326/2026 y RDL 29/2026, publicado el 7 de octubre. Las reglas tienen entrada en vigor y transitorios propios. No afirmar que ya se hayan ejecutado las ayudas, entregado las viviendas o producido efectos en precios. Revisar convalidación, modificaciones y aplicación territorial antes de convertir la ficha en orientación individual.
- **Clientes financieros (123):** anteproyecto y autoridad en tramitación no son norma en vigor ni órgano operativo. El RDL 29/2026 sí aporta un cambio específico en cesiones hipotecarias. Las notas de abril/julio conservan su fecha; no se afirma que describan por sí solas el estado parlamentario de octubre.
- **Cuentas públicas (32):** el inventario comunica un déficit del 2,2 % del PIB en 2025 y la captura Eurostat conservada registra un saldo del −2,4 %. Se conserva la discrepancia; no se mezclan bases ni se atribuye sin prueba su causa. El saldo de todas las administraciones no es exclusivamente el del Gobierno central.
- **Paro europeo (79):** comparación homogénea de la misma tabla mensual Eurostat: distancia España–UE 4,5 puntos en agosto de 2025 y 3,9 en agosto de 2026. No sustituirla por una mezcla de EPA trimestral y paro europeo mensual; no equivale a convergencia completa ni a evaluación causal.
- **Género (33):** la observación de paro por sexo acredita una brecha, pero no permite juzgar el avance de toda la brecha de empleo. No se usa la antigua nota EPA 2023 no recuperable como si fuera una serie comparable.
- **Empleo público (58):** procesos estabilizados no son una tasa agregada. La norma de 2021 es antecedente anterior al mandato; la nota de junio de 2026 distingue AGE y autonomías. No inferir una tasa nacional a partir de grupos con denominadores distintos.
- **Banca/energéticas (187):** se añade el acuerdo de derogación del gravamen energético de 2025, que no estaba contrastado. La existencia del impuesto bancario no acredita continuidad de ambas figuras.

## Fuentes y reproducción

`data/mandate/commitments.json` es la fuente canónica de las fichas. Cada `assessment` referencia los identificadores de las fuentes de su revisión, y `review.history` conserva el contraste del 7 de octubre. La API publica una proyección explícita: no expone rutas de archivo, capturas completas ni la memoria privada.

Se conservan **42 fuentes**: las 16 anteriores, 21 nuevas capturas oficiales y cinco respuestas estadísticas ya utilizadas por los indicadores. Las cinco respuestas se reutilizan byte por byte con su fecha original del 7 de octubre; no se declaran descargadas de nuevo el día 10. Las capturas nuevas tienen URL, productor, fecha cuando consta, localizador en cada ficha y SHA-256. Las versiones consolidadas del Estatuto tienen fecha de consulta/versionado, no una supuesta fecha nueva de publicación.

El script `node scripts/capture-mandate-review.mjs` completa el conjunto cerrado de 21 fuentes de esta revisión. Conserva capturas existentes, no las sobrescribe, y falla ante un error. **No es un actualizador periódico:** una revisión nueva necesita URLs/versiones y evaluación editorial nuevas. El dominio inicial de Economía falló; la información del anteproyecto se obtuvo en el Centro Europeo del Consumidor, también fuente pública oficial, y así figura atribuida. El intento de recuperar EPA3T23 en la ruta moderna devolvió 404; no se incluyó ni se sustituyó por una cifra inventada.

## Comprobaciones y mantenimiento

Los tests verifican conservación de capturas y metadatos BOE, referencias válidas, campos obligatorios, cortes temporales y rechazo de datos dañados. El recorrido de navegador comprueba las 30 fichas, sus fuentes, grupos, filtros, consulta y móvil. No equivalen a una auditoría humana independiente de todas las conclusiones.

Validación local ejecutada: 304 pruebas en 40 archivos; tras el último ajuste de consulta, las 30 pruebas de los cuatro archivos de mandato pasan de nuevo. ESLint y compilación de producción con Webpack correctos. Los 13 recorridos Playwright del observatorio, biblioteca y mandato pasan contra esa compilación (53,7 segundos), con capturas de escritorio y móvil inspeccionadas. El guard de despliegue comprueba 49 trazas, 79 dependencias y seis lectores obligatorios, sin empaquetar archivos privados. La comparación con el estado anterior confirma que los 30 textos oficiales, declaraciones y plazos permanecen intactos.

Una actualización requiere conservar la revisión anterior, leer el nuevo documento, explicar cambios y repetir las comprobaciones. Revisar especialmente convalidaciones de normas recientes, datos de ejecución, pagos de becas, parque público entregado y series con desfase. No hay cron nuevo ni promesa de actualización continua. La IA en directo sigue apagada; esta entrega no llama a proveedores de modelos ni modifica producción.
