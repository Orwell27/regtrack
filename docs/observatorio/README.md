# Observatorio territorial — primera versión

Brief aprobado el 7-oct-2026: cualquier perfil (ciudadano, profesional privado/público y propietario), todos los temas, navegación hasta municipio, estética editorial con movimiento suave y selección de fuentes a cargo del equipo.

Ruta pública `/observatorio`. Implementación independiente del pipeline inmobiliario: no modifica sus alertas, permisos ni base de datos. No integra los PR abiertos 8, 9, 10, 11, 14 ni 18. El mapa anterior del PR11 es una cartera inmobiliaria murciana; esta pantalla es un observatorio nacional de información pública.

## Qué funciona

- Mapa SVG con selección por teclado, filtros por comunidad/provincia/municipio, búsqueda de lugar, zoom y vuelta a España. Geometría municipal cargada por provincia. Canarias en recuadro; Baleares, Ceuta y Melilla incluidas.
- Datos oficiales del IGN, descargados el 7-oct-2026: 19 comunidades/ciudades autónomas, 52 provincias y 8.213 objetos que su colección etiqueta `Municipio`. **No presentar este último número como el censo INE de municipios**: la capa incluye unidades/mancomunidades adicionales. Se conserva su nombre y código de origen. Se excluyen las categorías IGN «Territorio» y «territorios no asociados a una autonomía»; no es cartografía de deslinde.
- 25 temas, combinados con territorio, tipo de publicación, canal y periodo. Varios temas por publicación; «Otros asuntos» evita descartar silenciosamente lo desconocido.
- Temas destacados por número de documentos del conjunto filtrado. Es volumen observado, no popularidad de toda la sociedad. «Tus búsquedas» guarda solo identificadores de temas y fecha, hasta 100 entradas / 7 días, en este navegador; se pueden borrar. No se guardan preguntas en la base de datos.
- Sumario completo del BOE (todas las secciones y estructuras de ítems, con retroceso de hasta dos días si no hay edición). Los títulos con una cláusula «por la/el que se…» muestran esa acción conservando el original desplegable. No se sustituye el texto legal por este título abreviado.
- Tablón con fuente, autor cuando consta, fecha original, extracto breve y enlace. Distingue fuente oficial, información periodística y análisis/opinión. Las columnas editoriales de medios se etiquetan como opinión si lo indica el canal o la URL.
- Preguntas documentales: búsqueda de referencias dentro de los filtros seleccionados, sin coste de modelo y con estado explícito cuando falta evidencia.
- Estados de carga, ausencia de resultados, fuente desactualizada, fallo de canal y reintento. Teclado, diálogo modal nativo, diseño móvil y movimiento reducido.

## Fuentes y evidencia

### Selección documental del tablón

Las noticias y análisis pasan un filtro en el servidor antes de alimentar el mapa, los destacados, la búsqueda y las preguntas. Compartir tema, palabras generales o territorio no basta. Cada pieza incluida lleva `relatedDocuments` con el título, URL oficial y motivo de la relación.

Se admite una referencia BOE exacta o una identificación normativa coincidente y única. Los reales decretos distinguen rango, número y año; las leyes ordinarias requieren también día y mes para reducir colisiones entre administraciones. Las coincidencias ambiguas se excluyen. La relación acredita una cita, no la veracidad de una noticia ni la vigencia de la norma. No se infiere que una noticia sobre propuestas describa una obligación vigente.

El índice parte del último sumario BOE disponible. Además, verifica contra los metadatos XML oficiales hasta 12 identificadores BOE citados por los canales, priorizando las publicaciones recientes, con tres peticiones simultáneas y caché de 15 minutos. Así una noticia puede enlazar una norma anterior sin presentarla como una publicación de hoy. Solo se conservan identificadores del contenido extendido RSS; los extractos visibles siguen limitados a 24 palabras. Una referencia inaccesible, una respuesta incorrecta o una cita sin documento identificado no admite la noticia. No se rastrean las páginas completas de los medios.

La cobertura es deliberadamente limitada: los RSS que omiten referencias normativas pueden producir cero noticias incluidas. Se muestra ese estado y se distingue entradas recibidas de incluidas por canal. La primera integración usa documentos públicos del BOE; todavía no se conecta a las alertas privadas ni al resto del archivo interno. Añadir registros almacenados requerirá una selección explícita de contenido publicable, no acceso indiscriminado a la base.

La captura de 570 documentos que sigue corresponde a la ingesta anterior al filtro documental y no representa el número de noticias seleccionadas.

27 canales: BOE; Europa Press general y 18 canales territoriales (Ceuta/Melilla comparten canal y se localizan por mención); El País; El Mundo; Hay Derecho; Real Instituto Elcano; Funcas; RTVE RSS como archivo; Nada es Gratis como archivo. La comprobación real de esta sesión devolvió 570 documentos únicos, 25 canales con entradas recientes y dos archivos antiguos. Es una captura de ese momento, no una garantía de disponibilidad posterior.

Los RSS de RTVE que enlaza su directorio territorial devolvían datos de 2022: se descartaron como fuente regional actual y se localizaron los canales Europa Press mediante el `link rel=alternate` de sus páginas. Nada es Gratis tenía su última publicación el 27-mar-2026. Ambos archivos quedan fuera del filtro reciente. No se ha atribuido a personas un título profesional no comprobado: las firmas se toman del canal y las especialidades se describen a nivel de publicación/institución.

- [API BOE y condiciones](https://www.boe.es/datosabiertos/api/api.php)
- [Colección de unidades administrativas IGN](https://api-features.ign.es/collections/administrativeunit?f=json)
- [Licencia IGN](https://www.ign.es/resources/licencia/Condiciones_licenciaUso_IGN.pdf)
- [Directorio RSS RTVE](https://www.rtve.es/rss/)
- [Europa Press Andalucía, enlace RSS descubierto en la página](https://www.europapress.es/andalucia/)
- [Hay Derecho](https://www.hayderecho.com/feed/), [Elcano](https://www.realinstitutoelcano.org/feed/), [Funcas](https://blog.funcas.es/feed/)

INE, Banco de España, AIReF, EUR-Lex, CENDOJ e InfoSubvenciones se ofrecen como directorio externo, **no como fuentes ya ingeridas**. La selección busca contraste inicial, no exhaustividad ni equilibrio cuantificado. Los originales pueden requerir suscripción. No se copian artículos completos, ni se sortean muros de pago; revisar condiciones de los proveedores antes de explotación comercial a escala.

## Cómo se actualiza y qué no cubre

El navegador solicita `/api/observatorio`; las peticiones a fuentes se cachean 15 minutos. No hay cron nuevo: se actualiza al visitar/consultar, no se promete captura continua. No hay archivo histórico acumulativo. «Archivo disponible» es lo que aún devuelve cada canal. Se deduplican URLs y se unen sus menciones territoriales.

Los temas y lugares se extraen de palabras del título/extracto y del canal territorial. Son etiquetas automáticas que pueden fallar (ambigüedad de topónimos, variantes de nombres, temas que no figuran en el titular). **Mención territorial no es jurisdicción ni aplicabilidad.** El color cuenta documentos; un lugar sin referencias no significa ausencia de novedades. El mapa completo no implica cobertura completa de boletines municipales ni de todos los perfiles.

Los límites cartográficos están simplificados y proyectados para lectura; su precisión no sirve para operaciones catastrales o deslindes. Códigos internos conservan jerarquía IGN. `public/observatorio/geo/provenance.json` registra origen, licencia y fecha. `scripts/build-observatory-geography.mjs` reconstruye el conjunto; las descargas intermedias van a `.artifacts/geo/` y no se publican.

## Redacción con IA: implementada, apagada

`POST /api/observatorio/preguntar` devuelve el modo documental mientras `OBSERVATORY_AI_ENABLED` no sea `true`. Así funciona la entrega por defecto y no consume API de modelos.

Para activar el piloto se requiere autorización de gasto, límite presupuestario configurado en Anthropic, clave existente y `OBSERVATORY_AI_ENABLED=true`. Solo permite **administrador verificado**, valida origen, limita cuerpo/pregunta, reconstruye las referencias en el servidor (no confía en textos aportados por el navegador), una consulta por minuto y proceso, respuesta acotada y sin reintentos del SDK. Ese freno de proceso **no es un límite de gasto distribuido**; no habilitarlo para público general sin cuota duradera y revisión de costes/privacidad.

Modelo configurado: `claude-haiku-4-5-20251001`. La instrucción exige lenguaje sencillo, atribución de opiniones, límites de evidencia y citas. Se comprueba que todas las citas apunten a referencias realmente suministradas. Esa validación es estructural, **no acredita que cada afirmación sea correcta**. La evidencia se limita a titulares y extractos; la respuesta no puede confirmar vigencia, requisitos ni obligaciones personales. Datos enviados al proveedor: pregunta y referencias públicas; no se incluyen correo ni identificador de usuario. No se hicieron llamadas pagadas ni se validó calidad de redacción con el proveedor real en esta sesión.

## Comprobaciones

```powershell
npm test
npx tsc --noEmit
npx eslint app/observatorio app/api/observatorio components/observatorio lib/observatorio
npm run build
# En otro terminal, para los recorridos de esta pantalla:
npx next dev --hostname 127.0.0.1 -p 3127
npx playwright test --config=playwright.observatorio.config.ts
```

Las pruebas de navegador interceptan el boletín con ejemplos identificados como prueba; no son datos del producto. La comprobación adicional en navegador contra canales reales y sus capturas quedan en `.artifacts/observatorio/`. Los tests de IA usan dobles del proveedor sin gasto. Las pruebas de geografía contrastan cada provincia con todas las unidades municipales de su índice.

## Antes de publicar / siguientes ampliaciones

Revisar la pantalla con Alfonso y autorizar el despliegue. Mantener IA apagada hasta aprobación separada de gasto. Completar ingesta autonómica/local y legislación íntegra/versionada para poder explicar consecuencias operativas, no solo titulares. Incorporar archivo duradero, revisión editorial y evaluación de clasificación con ejemplos reales. El observatorio no sustituye aún el pipeline y los pendientes de vigilancia del PR18.
