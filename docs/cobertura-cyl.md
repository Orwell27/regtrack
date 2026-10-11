# Castilla y León: mandato de junio de 2026 y primeros contrastes

Revisión documental de 11/10/2026. **220 apartados principales, tres fichas con 13 componentes y 217 apartados sin contraste específico. Cero revisiones humanas independientes.** Cobertura parcial, sin cierre del balance.

## Documento e inventario

Acuerdo PP–VOX firmado el 03/06/2026, copia de 62 páginas alojada por elDiario.es. El Real Decreto 476/2026, publicado el 11/06, identifica la investidura de 09/06 y permite separar este mandato del anterior. Falta una copia publicada por los firmantes; el medio que aloja el documento no cuenta como corroborador.

Se conservan PDF, extracción incrustada, OCR nuevo de Windows y líneas ordenadas por coordenadas, con huellas. La capa incrustada omite el comienzo de 10.1: el OCR nuevo lo recupera. Las imágenes confirman 11.8 y 13.5, cuyo primer dígito omitían ambas extracciones. Se corrige exclusivamente el identificador, conservando el texto bruto. El importador exige las 62 páginas y todos los apartados de cada uno de los 19 ejes; cada línea de cuerpo reconocida tiene un único destino. Conserva 25 bloques de portada, índice, bases, epígrafes, reparto y firma. La geometría evita colocar un epígrafe antes de continuaciones que aún pertenecen al capítulo anterior.

Los 220 apartados principales conservan submedidas, condiciones y plazos. No se equiparan a las 324 medidas anunciadas: queda pendiente conciliar la unidad de recuento, los compromisos en prosa y posteriores, las reiteraciones y la transcripción íntegra con revisión independiente. Las afirmaciones políticas del documento se atribuyen a sus autores.

## Fichas y límites

| Apartado | Contraste | Límite |
| --- | --- | --- |
| 6.2 · Buscyl | Orden de 2025, sede de tarjeta general y relación oficial de rutas consultadas en octubre de 2026. | Promesa de mantener un servicio anterior, no creación nueva. El listado no prueba billetes sin cobros ni ausencia de incidencias. El antecedente de FACUA es de 2025 y solo se obtuvo la parte pública, no el escrito completo ni su resolución. |
| 13.17 · Primera matrícula | Bases de julio, modificación de septiembre y convocatoria de 12,62 millones para 2026–2027. | Ayuda sobre precio académico abonado, no exención automática. Requisitos, concurrencia competitiva, crédito y servicios complementarios excluidos. La modificación permite acreditar pagos según calendario universitario. Faltan concesiones y transferencias; no se afirma cobertura universal lograda. |
| 15.3 · Aval de vivienda | Norma original de 2023, extensión a 2026 y declaración del Gobierno en el debate parlamentario de 11/09. | Se anuncia elevar 17,5 % a 20 %. Las 2.000 hipotecas comunicadas desde 2023 no prueban operaciones nuevas con el 20 %. Primer presupuesto del acuerdo: 2027. No se declara vencido ese plazo ni se certifica el régimen vigente completo con normas históricas. |

Doce fuentes: once originales y un extracto editorial de FACUA. La huella del extracto identifica la nota, no la página ni la reclamación original. BOE registra la investidura; BOCyL, sede y relaciones son documentos autonómicos. La declaración gubernamental alojada en las Cortes mantiene familia del Gobierno: el acta acredita lo dicho, no su ejecución. Ninguna fuente equivale a revisión humana independiente de RegTrack.

La sede de las Cortes devolvió errores de certificado/403 con los clientes usados; se obtuvo el Diario de Sesiones PDF por su repositorio público SIRDOC, sin desactivar TLS. Las referencias de prensa sobre incidencias de octubre no pudieron leerse completas y no se incluyen como pruebas revisadas. La página de FACUA pide suscripción para el resto: no se intentó acceder a esa parte.

## Reproducción y validación

`scripts/extract-cyl-programme.py` clasifica el OCR conservado; `scripts/import-cyl-programme.py` produce el inventario, y `scripts/register-cyl-sources.py` registra fuentes, fechas y familias. Las pruebas del importador verifican reproducción, conservación de todas las líneas y submedidas, continuidad de páginas y números, cambios de huella y correcciones localizadas. Las pruebas de aplicación comprueban cobertura 220/3/217/0, privacidad de la proyección, atribución de fuentes y límites de las conclusiones. Los recorridos de navegador verifican acceso desde cobertura, búsqueda, filtros y lectura móvil. Ejecución local: 443 pruebas Vitest en 66 archivos, 92 pruebas Python de importación, ESLint, compilación webpack y TypeScript correctos. El guardián de empaquetado verifica 51 trazas, 130 dependencias y ocho rutas. Los dos recorridos nuevos pasan sobre la compilación de producción; capturas de introducción y pago fraccionado inspeccionadas a 390 × 844, sin desbordamiento. El primer intento de Vitest en el entorno aislado no llegó a ejecutar pruebas por EPERM al renombrar su caché; la batería completa fuera del aislamiento pasó sin modificar pruebas ni límites. CI remota y vista previa se registran en el PR tras subir el commit.

Pendientes: 217 apartados, transcripción íntegra, copia de los autores, conciliación del universo, resultados, corroboración actual e independiente y publicación. La incorporación de esta comunidad deja 23 administraciones parciales y 105 fichas; siguen sin inventario Comunitat Valenciana, Extremadura y 45 capitales. No se declara finalizado ni publicado el alcance de 70 administraciones.
