# Comunidad de Madrid: cobertura documental y límites

Corte: 11/10/2026. Mandato 2023–2027; nombramiento publicado el 23/06/2023 (RD 542/2023). Inventario autonómico `r-13`, separado del Ayuntamiento `m-28079`.

## Inventario conservado

Programa original del PP de Madrid: PDF de 72 dobles páginas, 459 apartados numerados en 14 retos y 75 bloques de contexto. El enlace al documento completo está en la web del autor. La selección abreviada de 100 medidas y el balance del mandato anterior no sustituyen al programa completo.

La extracción digital respeta el orden izquierda/derecha y conserva fragmentos por línea. Los enlaces usan páginas del PDF: por ejemplo, PDF 27 contiene las impresas 52–53. Las continuaciones 16→17, 34→35, 40→41 y 56→57 permanecen unidas. La cifra «3.000.» dentro del apartado 6.12 no abre una medida falsa. Se verifican huellas de original, extracción y geometría, secuencias y asignación única de todas las líneas extraídas a apartado o contexto.

Se han cotejado visualmente las páginas de las cuatro fichas, no las 72 páginas completas. La extracción permanece provisional. Los subapartados, reiteraciones temáticas, horizontes superiores al mandato e investidura siguen pendientes de conciliación; 459 apartados no equivalen a 459 promesas atómicas revisadas.

## Contraste incorporado

Cuatro fichas, quince componentes, 455 apartados sin revisión sustantiva y cero revisiones humanas independientes.

- **5.2, partos múltiples:** acuerdo de diciembre de 2023, crédito de 2024 y procedimiento actualizado en 2026. Se documentan 1.800 euros por hijo, renta estrictamente inferior a 30.000 euros por persona, residencia y solicitud en 60 días. Crédito y norma no acreditan pagos ni cobertura universal.
- **5.10, transporte familiar:** promesa de 50 % general y gratuidad especial frente a descuentos publicados de 20 % y 50 %. Tarifas base de 2026 separadas de bonificaciones temporales y por edad. Objetivo pendiente en el ejercicio examinado; plazo del mandato aún abierto.
- **6.2, dependencia:** se distinguen oferta, prestación efectiva, plaza desde el PIA y coste privado. SISAAD a cierre de 2024/2025 y lista residencial de agosto de 2026 no tienen idénticas poblaciones ni hitos. No se suman ni se usan como prueba automática de falta de oferta; tampoco se sustituye dependencia por valoración de discapacidad.
- **10.17, Solución Joven:** se mantienen cantidad, precio, edad, dormitorios y duración originales. Obras comunicadas en Loeches no equivalen a entrega; las viviendas del Plan Vive general no se imputan a esta promesa. Pendientes pliegos, contratos, certificaciones y rentas efectivas.

## Fuentes y límites

Once referencias: ocho originales y tres notas editoriales (procedimiento de ayuda, lista residencial y noticia de obras). La consulta web permitió leer estas tres páginas, pero su descarga directa devolvió 404; la huella identifica la paráfrasis, no una copia íntegra. BOCM y CRTM comparten origen autonómico. La publicación estatal de datos SISAAD no independiza los datos regionales de entrada. No hay auditoría externa de los resultados incorporada a estas fichas.

La revisión visual detectó diez componentes territoriales cuya única prueba era un programa, pero llevaban la etiqueta «Actuación documentada». Se precisan como «Compromiso documentado · ejecución no acreditada por esta prueba»: tres en Madrid y siete en Bilbao, Canarias, Ceuta, Melilla y Murcia. El validador impide volver a presentar una actuación basada exclusivamente en el programa; la nueva etiqueta exige citarlo. No cambia conclusiones ni convierte fichas en cumplimiento.

Reproducción: `python scripts/import-madrid-region-programme.py`. La regeneración geométrica con `scripts/extract-madrid-region-programme.py` requiere pdfplumber; la importación y las pruebas usan la biblioteca estándar. Los archivos de evidencia quedan en el servidor y la proyección pública omite texto bruto, coordenadas y rutas locales.

Con esta incorporación hay 20 administraciones con cobertura parcial, incluida España. Siguen sin inventario cinco comunidades (Andalucía, Castilla y León, Castilla-La Mancha, Comunitat Valenciana y Extremadura) y 45 capitales. Ninguna de las 70 administraciones tiene cobertura cerrada. La ampliación continúa en el PR22; no se afirma publicación en producción ni finalización del alcance.

## Verificación local

431 pruebas Vitest en 63 archivos con dos trabajadores; 79 pruebas Python; ESLint; compilación webpack y TypeScript; guardián de 51 trazas, 124 dependencias y ocho rutas; 53 recorridos de navegador correctos. Capturas móviles inspeccionadas antes y después de corregir la etiqueta. La primera pasada dio 52/53 porque una prueba antigua todavía esperaba 404 para Madrid autonómico: ahora usa un identificador inexistente y la pasada completa es correcta. Una mutación temporal en memoria confirma que, sin la protección nueva, el validador acepta incorrectamente una actuación cuyo único respaldo es el programa; el código real la rechaza por esa razón.
