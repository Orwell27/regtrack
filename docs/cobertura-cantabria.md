# Cantabria: inventario y contraste documental

## Alcance y procedencia

Programa electoral del PP de Cantabria para 2023–2027, presentado el 5 de mayo de 2023: 202 páginas, 1.228 medidas numeradas, 20 capítulos. SHA-256 del original: `073b575dd6bf951e0fe06b6791357139810923da2091b2ed683e8b819f368432`.

Se conservan 137 bloques de contexto, incluida la presentación, índice, introducciones y principios educativos que tienen numeración propia. Las sublistas permanecen con su medida; las reiteraciones conservan su número. No son 1.228 acciones atómicas, ni un inventario de todos los compromisos posteriores. Se registra por separado la noticia del acuerdo de investidura PP–PRC de 16/06/2023: el programa electoral no se sustituye por ese acuerdo ni por pactos presupuestarios.

## Revisiones incorporadas

- **r-06-29, tarifa de emprendizaje, cinco componentes.** Se contrasta el compromiso y sus tres subapartados con el Decreto 43/2024, el trámite de solicitud, la contestación gubernamental 11L/5300-1398 y la resolución parlamentaria 6 R del debate de la región. La ayuda exige cuotas previamente abonadas y el segundo año ordinario depende de las condiciones estatales; no acredita sin más una exención de dos años por edades. Las cifras de 1.124 beneficiarios de inicio de actividad y 834 de mantenimiento pertenecen a otras líneas. La respuesta gubernamental publicada en marzo de 2025 no podía valorar aún la ejecución de Cuota Cero. La resolución publicada en julio pide reorientar fondos no utilizados, sin aportar una liquidación auditada. Faltan concesiones, pagos, aplicación a todos los supuestos y resultados posteriores.
- **r-06-1198, transporte joven, cinco componentes.** El programa promete 20 euros al mes, viajes ilimitados y cobertura urbana e interurbana para menores de 30. El Decreto 48/2026 regula descuentos por viaje para menores de 31 en líneas autonómicas. Las condiciones TITC describen una tarjeta monedero, no una tarifa plana. El título ilimitado de TORREBUS (15,75 euros trimestrales) tiene alcance municipal. Soporte interoperable no equivale a tarifa integrada. Falta contrastar el conjunto de redes, validaciones y compensaciones, así como cambios posteriores.

Doce referencias (diez originales y dos notas editoriales de lectura) y cuatro familias de origen: PP, Gobierno autonómico, Parlamento y Ayuntamiento de Torrelavega. Una contestación del Gobierno no cambia de autor por alojarse en el Parlamento. La resolución parlamentaria es control político, no una auditoría contable. El documento municipal acredita condiciones de su propia red, no resultados regionales.

GitHub bloqueó la primera subida al detectar una credencial de mapas en el HTML público del portal de transporte. No se autorizó la excepción. Las dos capturas web de transporte se sustituyeron por notas de lectura, con metadatos y huellas propios; los PDF oficiales permanecen como originales. El commit rechazado no llegó al remoto y se corrigió antes de publicar.

## Extracción y reproducción

`scripts/extract-cantabria-programme.py` requiere pypdf y usa el tamaño tipográfico del marcador (8,5) para distinguir las 1.228 medidas de epígrafes y principios numerados. Conserva el orden del contenido PDF y compara todos los caracteres del cuerpo con la extracción PDFium completa. Solo excluye cabeceras y pies conocidos; equipara U+0002 al guion. La comparación pasa en todas las páginas 7–201. Las 202 páginas originales se conservan en la extracción completa.

`scripts/import-cantabria-programme.py` necesita solo la biblioteca estándar. Verifica las huellas de PDF y dos extracciones, la secuencia 1–1228 y los veinte capítulos. Conserva el texto bruto; la presentación une guiones de fin de línea, inserta saltos por coordenadas y restituye dos espacios visuales entre fragmentos. No separa cambios de fuente dentro de una misma palabra. La medida 979 se mantiene separada de 978, aunque PDFium une ambos números tras un guion terminal. Revisión visual de las páginas 11, 12, 168 y 199.

`scripts/register-cantabria-sources.py` verifica los originales y las extracciones auxiliares. El Decreto 48/2026 se recuperó mediante la consulta oficial BOC por CVE `2026-5303`, disponible también por GET. Se conserva el método y formulario de la captura; esos detalles no cruzan a la proyección pública. Una copia externa localizada sirvió para encontrar el CVE, pero no se registró como original: sus bytes diferían de los entregados por BOC.

Se incorporan pruebas de conservación de caracteres, secuencia, continuaciones, encabezados, alteración de fuentes, autoría y límites de las conclusiones, además de recorridos de búsqueda y móvil.

## Estado

Dos revisiones parciales, diez componentes y 1.226 medidas sin revisión sustantiva. Revisión humana independiente: cero. El conjunto sigue en el borrador de PR 22; no se presenta como cobertura final de las 70 administraciones. Tras esta incorporación quedan 54 administraciones sin inventario (9 comunidades y 45 capitales), además de las revisiones y conciliaciones pendientes de los inventarios existentes.
