# Cierre de la sección de balances y lanzamiento

Alcance acordado con Alfonso el 10 de octubre de 2026: balance estatal, 17 comunidades autónomas, Ceuta y Melilla y las 50 capitales de provincia. Otros municipios se amplían después. Objetivo orientativo de lanzamiento: alrededor del 17 de octubre; no es una tarea programada ni una promesa de auditoría terminada sin evidencia.

## Condiciones para dar una ficha por revisada

1. Identificar territorio, administración, mandato y documento original del compromiso. No heredar automáticamente 2023–2027: hay cambios de legislatura autonómica.
2. Conservar el texto y su fuente, fecha, localizador y alcance; separar el balance declarado por el Gobierno de la valoración editorial.
3. Buscar actuación, ejecución y resultado; explicar qué acredita cada documento y qué no. Un presupuesto aprobado no es gasto ejecutado ni entrega.
4. Buscar evidencia contraria o limitaciones y registrar las fuentes realmente consultadas. Dos publicaciones del mismo emisor no se cuentan como corroboraciones independientes.
5. No asignar cumplimiento o incumplimiento sin criterio y plazo aplicables. Una laguna queda abierta y visible, no se rellena por inferencia.
6. Validar referencias, integridad, navegación, consulta, móvil y límites de las respuestas. Conservar revisiones anteriores y correcciones.

## Entregas de trabajo

- Inventario nacional completo de 203 compromisos, con conservación exacta del CSV y trazabilidad de la selección anterior.
- Matriz de 70 ámbitos: España, 19 gobiernos autonómicos/ciudades autónomas y 50 ayuntamientos capitales. Ceuta y Melilla no se duplican como capitales de provincia.
- Fuentes primarias de compromisos, seguimiento y control externo por territorio. Los territorios sin material suficiente deben mostrar esa carencia.
- Contrastes sustantivos y límites por ficha, con cobertura medida por documentos revisados y no solo por enlaces o territorios presentes.
- Sección navegable, consulta documental y pruebas de producción; lista de pendientes operativos para abrir RegTrack.

## Plan orientativo de la semana

| Tramo | Resultado esperado | Condición de cierre |
| --- | --- | --- |
| Inventario | Universo nacional y territorial identificado | IDs únicos, mandatos separados y fuentes localizadas |
| Contraste | Revisión de documentos y resultados disponibles | Afirmaciones acotadas y referencias que las respalden |
| Corroboración | Control externo, estadísticas y evidencia contraria | Independencia y límites explícitos; discrepancias conservadas |
| Producto | Navegación territorial, filtros y respuestas | No mezclar gobiernos, fechas o competencias |
| Validación | Comprobación de datos y recorridos completos | Sin fallos que cambien conclusiones ni referencias rotas internas |
| Publicación | Entrega revisable y despliegue autorizado | Separar alcance publicado, lagunas y mantenimiento pendiente |

La revisión humana independiente sigue pendiente. Es necesaria para medir la exactitud; los tests y la repetición por el mismo agente no la sustituyen. No se fija una nota de fiabilidad por adelantado.

Estado inicial: 30 compromisos nacionales revisados y publicados; ampliación en curso en `feat/cobertura-mandatos`. Este documento no certifica por sí mismo que las entregas anteriores estén completadas.

## Primera entrega de la ampliación — 10 de octubre

Implementado:

- `/observatorio/mandato/cobertura`: catálogo de las 70 administraciones, buscador, filtros y paginación; acceso desde el balance nacional y su lector documental.
- 203 compromisos nacionales importados de la captura original, comprobando SHA-256, codificación Windows-1252, cabecera completa, registros únicos y conservación literal de las 30 fichas anteriores. El CSV contiene campos multilínea y una columna final vacía; no se divide por saltos de línea ni por punto y coma sin tratar comillas.
- 30 fichas enlazan sus revisiones; las otras 173 se muestran sin veredicto. Solo se envía al navegador una proyección breve, sin los campos completos de iniciativas y referencias del Gobierno.
- Catálogo territorial generado a partir de los códigos del IGN existentes en el proyecto y una selección explícita de las 50 capitales. Asturias corresponde a Oviedo, Pontevedra a Pontevedra; Ceuta y Melilla no se duplican.
- Registro de descubrimiento con fuentes en 13 comunidades y 3 capitales. Las notas distinguen página leída, referencia localizada e incidencias de acceso. No se cuenta ninguna de estas referencias como un compromiso contrastado.
- El lector nacional rechaza preguntas que identifica como territoriales antes de recuperar fichas o devolver la convocatoria electoral estatal. La detección por nombres y contexto es conservadora; no constituye un clasificador geográfico exhaustivo de todas las localidades o expresiones posibles.
- Control de empaquetado ampliado a la nueva ruta. Pruebas negativas para inventarios vacíos, recuentos incompatibles y revisiones sin fuente.

Estado editorial real: **30/203 revisiones nacionales; 0 balances territoriales revisados; revisión humana independiente pendiente**. Esta entrega prepara la cobertura y evita falsas atribuciones; no cierra la revisión sustantiva ni certifica que la sección esté finalizada.

Siguiente trabajo necesario:

1. Completar y conservar los documentos de mandato de las 19 administraciones autonómicas/ciudades autónomas, comprobando los cambios electorales de 2026. Siguen sin referencia específica Cantabria, Castilla y León, Extremadura, Murcia, Ceuta y Melilla.
2. Localizar y extraer programas y seguimiento de las 50 capitales. Los repositorios de cuentas de Barcelona y València no sustituyen a sus programas ni a la lectura de informes concretos.
3. Revisar los 173 compromisos nacionales restantes y cada inventario territorial con fuente original, actuación, ejecución, resultado, plazo, competencia y búsqueda de evidencia contraria. Las magnitudes todavía desconocidas quedan como `null`, no como cero.
4. Incorporar corroboración externa por afirmación, registrar discrepancias y someter las conclusiones a revisión independiente antes de considerar cerrados los balances.
5. Verificar la versión desplegada y revisar los requisitos operativos de `docs/community/LANZAMIENTO.md` para distinguir la apertura de la comunidad del Observatorio ya público.

Reproducción: `npx tsx scripts/import-mandate-inventory.ts`, `npx tsx scripts/build-mandate-coverage.ts`, `npm test -- --maxWorkers=2`, compilación Next y `node scripts/check-observatory-trace.mjs`. Las comprobaciones de navegador están en `e2e/mandato-cobertura.spec.ts` y se ejecutan también en CI.

## Segundo bloque documental — 10 de octubre

La ampliación incorpora ocho revisiones: desperdicio alimentario (20), paridad (22), discapacidad/artículo 49 (154), organización judicial (132), pacto y medidas LGTBI (126), bienestar animal (118), economía social (191) y vigilancia sanitaria (146). Se conservan ocho normas originales del BOE y el acuerdo de 20 de enero de 2026 del CGPJ, con huellas y localizadores.

La revisión distingue los actos legislativos acreditados de sus efectos. En las promesas de aprobar una ley o modificar la Constitución, se reconoce expresamente el acto alcanzado; las lagunas de resultados no se convierten en requisitos nuevos de la promesa original. En las promesas compuestas, una medida no acredita todo el objetivo: el RD laboral LGTBI no es un pacto de Estado; la ley de economía social no certifica la ejecución del PERTE o de la estrategia; crear una agencia no demuestra capacidad operativa.

La segunda lectura cotejó los componentes y las conclusiones con las disposiciones originales, especialmente los calendarios de paridad y desperdicio alimentario. El acuerdo del CGPJ corrobora la constitución legal de los tribunales y documenta el régimen transitorio de oficinas en tres partidos asturianos; no certifica el estado operativo posterior a enero de 2026 ni refuta por sí solo declaraciones gubernamentales posteriores. Se trata de una fuente institucional distinta del balance del Ejecutivo, no de una revisión humana independiente de RegTrack.

Estado preparado en esta rama: **38/203 revisiones nacionales, 82 componentes, 165 pendientes y 0/69 balances territoriales revisados**. Las ocho fichas nuevas no reciben una fecha de origen no verificada ni un historial ficticio de octubre de 2026. Se conservan las treinta revisiones y correcciones anteriores. La revisión independiente, los restantes compromisos y la cobertura territorial siguen pendientes; este bloque tampoco da por finalizada la sección. El estado de publicación debe comprobarse en el despliegue, no inferirse de este documento.
