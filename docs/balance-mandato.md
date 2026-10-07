# Piloto público de balance de mandato

Ruta: `/observatorio/mandato`. Entrada desde la cabecera y el bloque electoral de `/observatorio`.

## Qué contiene

- Convocatoria del 29 de noviembre de 2026, con XML del BOE conservado. Cuenta días naturales en Europe/Madrid, incluidos los cambios de horario; al pasar la fecha no inventa resultados electorales.
- Selección editorial de 30 compromisos del inventario Cumpliendo, de 203 filas disponibles. Ocho tienen contraste documental acotado: tres actuaciones documentadas y cinco contrastes parciales; 22 pendientes. Ninguna de esas categorías equivale automáticamente a cumplimiento íntegro.
- Quince indicadores del INE y Eurostat, 179 observaciones. Periodos, unidades, referencia, revisión, estado provisional/avance, alcance geográfico y cautelas visibles. Las series anuales usan una referencia 2023 mixta; no se aparenta una medición exacta el día de la investidura.
- Vistas, filtros, búsqueda, gráficos con huecos y tablas, enlaces a originales y a fichas relacionadas. Los enlaces por tema son contexto documental, no una correlación calculada ni una prueba de causalidad.
- Tres interpretaciones preparadas por IA con fecha y fichas utilizadas. Se guardan editorialmente con esta revisión; no se generan al abrir la página. No son una auditoría humana independiente.
- Consulta documental pública con citas, control de ausencia de evidencia y recuperación de los límites de cada indicador. No consulta datos privados ni decide qué votar.

El periodo político del piloto parte de noviembre de 2023. No mezcla la trayectoria desde 2018 y no calcula una nota de honestidad ni un porcentaje global a partir de la muestra.

## Fuentes y proyección

`data/mandate/commitments.json`, `indicators.json` y `election.json` son snapshots públicos versionados. La página y las APIs leen una proyección explícita en `lib/mandate/data.ts`, validada antes de servir. Los originales públicos están en `data/mandate/evidence/`; la regla `-text` de `.gitattributes` conserva los bytes y las huellas en Windows/Linux. Ningún lector web recorre `.artifacts`, la memoria privada ni el archivo de Supabase.

La evaluación y los campos del Gobierno se conservan separados del contraste editorial. El CSV no aporta una nota individual de cumplimiento; la UI dice «Información del Gobierno». El texto literal es el del inventario, no una transcripción certificada de todos los programas y discursos. Los plazos de componentes conservan su alcance y documento. La fecha del documento de origen no equivale a primera formulación histórica.

El pacto de coalición conserva solo un extracto editorial con localizadores, no una copia del PDF: su huella identifica ese extracto. El resto de las huellas se refiere a las capturas originales documentadas. Cada fuente puede tener condiciones de reutilización distintas.

Detalles y comprobaciones de datos: [compromisos](mandate-commitments.md), [indicadores](mandate-indicators.md).

## Consulta e IA

- `GET /api/observatorio/mandato`: snapshot público validado.
- `POST /api/observatorio/mandato/preguntar`: `{ question, topic?, mode?: "documental" | "ia" }`. Cuerpo limitado a 4096 bytes y pregunta a 500 caracteres. Las fuentes se reconstruyen en servidor; no se aceptan las aportadas por el cliente.
- Modo documental por defecto, sin proveedor ni coste de generación. Las coincidencias literales pesan más que la expansión temática; deuda recupera sus propias series antes que otros indicadores económicos.
- Para IA en directo se exige solicitud explícita, `MANDATE_AI_ENABLED=true` y `OBSERVATORY_AI_ENABLED=true`, origen autorizado, sesión de administrador, clave configurada y el freno de una petición por minuto/usuario/proceso. No se activa ninguno de esos interruptores en esta entrega.
- El freno en memoria **no es una cuota distribuida ni un límite de gasto**. Antes de activar, hace falta autorización de presupuesto, límite en proveedor y control persistente si se amplía el acceso. El modo público muestra comentarios guardados y fuentes aunque la IA en directo esté apagada.
- La IA reutiliza la integración existente; el extracto propio de cada fuente y el contexto editorial se envían separados. No puede usar una fuente como si acreditara toda una interpretación compuesta. Se validan estructura e identificadores de citas; esto no prueba la corrección semántica de cada frase.
- Si no hay evidencia suficiente, no se llama al modelo. Si falla la generación, se conserva la respuesta documental. La suite usa dobles de prueba; no se invoca un modelo de pago al verificar.

## Actualizar con revisión

```powershell
# Verificar y regenerar los indicadores a partir de las capturas ya conservadas:
npx tsx scripts/import-mandate-indicators.ts
# Capturar una nueva entrega (manual; después revisar diffs, periodos y pruebas):
npx tsx scripts/import-mandate-indicators.ts --refresh
# Revalidar la convocatoria contra el XML oficial:
node scripts/import-mandate-election.mjs
```

Los compromisos requieren nueva revisión editorial; no se trasladan estados a un semestre nuevo automáticamente. El importador de indicadores es atómico por archivo, no como conjunto de todos los archivos; sus detalles de recuperación están documentados. No hay cron ni garantía de actualización continua. Los comentarios guardados se revisan junto con las fichas que citan.

## Validar el recorrido

```powershell
npm test -- --maxWorkers=2
npm run build -- --webpack
node scripts/check-observatory-trace.mjs
# Con el servidor compilado iniciado en 3128:
$env:OBSERVATORIO_TEST_URL='http://127.0.0.1:3128'
npx playwright test --config=playwright.observatorio.config.ts
```

Webpack se utiliza en el checkout local porque `node_modules` es una junction al checkout principal. CI instala dependencias propias y usa la compilación habitual. El guardián exige cobertura de las tres nuevas rutas de mandato, además de los lectores documentales anteriores, e inspecciona todas las trazas del servidor para evitar empaquetar archivos privados.

## Límites del alcance

Preparado para revisión local y de preview. Sin merge, producción, migración de base de datos, generación IA pagada ni contactos externos. Falta completar los 22 contrastes, registrar ejecución y entregas, ampliar territorios y periodos, e incorporar evaluaciones de impacto. Una bajada del paro, una norma publicada o una relación temática no rellenan esos huecos por sí solas.
