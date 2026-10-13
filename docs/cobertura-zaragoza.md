# Zaragoza municipal: inventario y contraste documental

Corte: 11/10/2026. Municipio `m-50297`, separado de Aragón `r-02`. Cobertura parcial, sin revisión humana independiente.

## Universo y extracción

Programa electoral original de Natalia Chueca, descargado de su web: 51 páginas, SHA-256 `7179edb45c59ead0aadfa0c124d5da20c51c21cdbcb91386352183082c36037d`. La ficha municipal y el acta de 17/06/2023 (p. 9) documentan la alcaldía: 15 votos de 31 y proclamación como cabeza de la lista más votada, no mayoría absoluta.

Se conservan 37 unidades: capítulos 1–9 y 28 juntas. No equivalen a 37 promesas únicas. Las páginas 2–5 y el preámbulo del capítulo 10 se guardan en dos bloques de contexto porque combinan balance previo, valoración partidista y aspiraciones generales. No se eliminan las introducciones dentro de capítulos ni los remanentes y convenios 2021–2024 de juntas rurales. Portada y contraportada quedan fuera del conteo; esta última contiene la marca electoral como imagen.

El orden interno del PDF sitúa numerosos títulos después de su contenido. `scripts/import-zaragoza-programme.py --extract` reproduce texto y coordenadas mediante PDFium; el importador ordena por posición visual, mantiene los índices y offsets originales, verifica huellas y exige los 38 encabezados esperados. El encabezado 10 es contexto, no registro adicional. Todas las líneas no vacías de las páginas 2–50, salvo cabeceras y pies repetidos, aparecen exactamente una vez en registros o contextos. Las repeticiones impresas se conservan, incluida la de prevención de incendios del pabellón sociocultural. La extracción sigue provisional hasta cotejo íntegro independiente y desagregación de medidas.

## Tres fichas, catorce componentes

- **Deporte (capítulo 3):** el programa aspira a la capitalidad en 2026; ACES asigna Zaragoza a 2027 y Nápoles a 2026. Es corroboración externa del título, no de instalaciones ni actividad. La web de La Nueva Romareda conserva previsiones de 2025 y una entrega objetivo el 31/08/2027: se trata como planificación, no avance certificado. No se afirma celebración del Mundial ni renuncia de Zaragoza a ser sede.
- **Huerva (parte del capítulo 6):** 50 % y 62 % comunicados en mayo y julio corresponden a la segunda fase; biodiversidad financiada casi al 100 % es otro alcance. La incidencia 26611 acredita afecciones operativas y contiene fechas distintas entre encabezado y observaciones. No se inventa un plazo contractual a partir de ese registro. Recepción, liquidación y efecto ambiental pendientes. Las tres fuentes municipales no se cuentan como contrastes independientes.
- **Vivienda (parte del capítulo 7):** acuerdo nº 3 de marzo de 2023 anterior al mandato, con 486 viviendas en once parcelas, frente a nueve promociones en el programa. Presupuesto estimado 56.319.961,78 €, ayuda estimada 15.577.890 €; ficha web 15.577.913 €; memoria 2026 ayuda definitiva descrita de 14.933.387 € y cobro previsto 3.882.681 €. Se mantienen las discrepancias sin sumar cifras ni sustituir versiones. Las 39 viviendas del acuerdo nº 41 son otro expediente. Plazo inicial de obra 30/06/2026 ya pasado; justificación 31/12/2026 aún futura. Sin cierre ni modificaciones verificadas, no se convierte ausencia de prueba en incumplimiento material demostrado. Pontoneros, ALZA y resto del capítulo pendientes.

## Evidencia y límites

Trece originales con metadatos, tamaños y SHA-256 en `data/mandate/evidence/territorial/zaragoza/`, registrados en `sources.json`. Los acuerdos son evidencia primaria interadministrativa, no auditorías independientes de entregas. Las firmas impresas no se validaron electrónicamente. La fecha exacta de publicación del programa, presupuesto y páginas sin fecha se deja nula.

La capa de texto del presupuesto devuelve caracteres ilegibles en la memoria (la portada no devuelve texto): se conserva la extracción y se añade OCR de Windows es-ES con huella separada. Página 13 física, equivalente a página 6 de la memoria, cotejada visualmente. Las cifras citadas proceden de esa página, no de una interpretación del OCR de tablas. El acuerdo nº 41 inicialmente localizado no era el de 486 viviendas: se capturó también el nº 3 y se separaron ambos. El pliego del Huerva encontrado por buscador respondió 404; no se utiliza como evidencia ni se registró una captura fallida.

Las fichas enlazan páginas físicas del PDF. La proyección pública omite texto bruto, geometría, fragmentos y rutas de archivo. Pruebas del importador verifican reproducción, atribución por junta, conservación completa de líneas, duplicados intencionados y rechazo de alteraciones. Pruebas funcionales vigilan las distinciones entre designación, anuncio, presupuesto y resultado.

Pendientes: cotejo humano, desagregar cada medida y duplicidades entre capítulos y juntas, revisar las 34 unidades sin ficha y las partes aún pendientes de las tres fichas existentes, y obtener comprobaciones externas de resultados. No hay cierre editorial del municipio.
