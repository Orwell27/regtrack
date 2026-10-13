# Ávila: inventario y contraste documental

Corte: 11/10/2026. Ámbito: municipio m-05019, mandato iniciado el 17/06/2023. Estado parcial: 163 apartados, tres fichas con doce componentes, 160 apartados sin revisión sustantiva y cero revisiones humanas independientes. Once originales y cinco familias editoriales. No se calcula cumplimiento total ni se evalúa la honestidad personal.

## Original e importación

Programa municipal de Por Ávila, portada de mayo de 2023, 51 páginas y 10.043.208 bytes. SHA-256: `50d0ba3ac4cf04eaa7e6d0d67f714fd0d648adf68c860da3888b320f6e7dba8b`. El día de publicación no está verificado.

Se conservan el original, texto PDFium y extracción por coordenadas. El primero omite viñetas gráficas y repite texto superpuesto, por ejemplo en las páginas 9 y 48. `scripts/extract-avila-programme.py`, con pdfplumber 0.11.9, reproduce la segunda extracción: elimina caracteres duplicados coincidentes, recorta el cuerpo y reconoce los círculos vectoriales. La composición completa se inspeccionó como imagen, incluidos portada, índice y separadores. No es un cotejo humano independiente.

El índice del documento sitúa turismo en la página 30 y economía en la 37; sus separadores están realmente en 31 y 38. Las páginas 30 y 37 contienen participación ciudadana e industria/comercio y se incluyen en el inventario. Se agrupan las sublistas de sensores y congresos con su apartado principal. Las seis candidaturas de barrios en la página 21 no se cuentan como promesas. Se incluyen compromisos sin viñeta, además de los listados.

`scripts/import-avila-programme.ts` valida huellas y estructura antes de generar los 163 resúmenes. Los códigos Pxx-yy son referencias editoriales, no números oficiales. Quince bloques de contexto separan antecedentes, principios y síntesis gráfica de compromisos evaluables. El texto bruto y sus coordenadas no se entregan al cliente. Los apartados pueden contener varias medidas, repeticiones o reivindicaciones; no son un denominador de promesas únicas. Falta conciliar la síntesis de la página 7, el discurso de investidura —incluida la relación de puestos de trabajo— y otros compromisos. `originalInventoryComplete` sigue siendo falso.

## Gobierno y límites del registro

Acta municipal 08/23, cinco páginas. La página 3 registra 11/7/4/3 votos y proclama a Jesús Manuel Sánchez Cabrera al no existir mayoría absoluta y encabezar la lista con más votos populares. La página 4 describe un gobierno en minoría y el programa como hoja de ruta. No se presenta como un pacto de mayoría.

El acta contiene incoherencias de plantilla: referencia electoral al 26 de mayo frente al 28 en el discurso, asistentes 24/25 y dos lugares concatenados. El metadato de título dice 7/99. Se preserva el documento y se advierten esas discordancias; no se alteran sus bytes. La página actual de corporación recoge sustituciones hasta junio de 2026. Aún falta certificar continuidad hasta el corte y validar firmas/CSV.

## Fichas

- **Cuesta Antigua, P11-01.** Apertura el 14/09/2023 comunicada por el Ayuntamiento y corroborada en una crónica de SER. Se documenta la instalación de cinco escaleras y una rampa, no la totalidad de las conexiones entre barrios. El boletín de contratos incluye MEN 547/2026 el 21/09/2026; la memoria enlazada describe mantenimiento, asistencia permanente y 18.149,88 euros con IVA para siete meses, del 01/10/2026 al 30/04/2027. No es prueba de adjudicación, pago ni servicio ejecutado. Disponibilidad y accesibilidad integral pendientes.
- **Orgánica, P18-01.** La nota municipal del 02/04/2025 comunica implantación y campaña escolar; la ficha del componente 12 prevé 18.000 cubos domésticos y 2.000 comerciales. Son recipientes previstos, no hogares cubiertos ni toneladas recicladas. Presupuesto de campaña y vehículo no se suman sin conciliar. Sin inventario operativo, pesajes, impropios y certificados de tratamiento, resultado pendiente. Ambas páginas pertenecen al Ayuntamiento, sin corroboración externa.
- **Radioterapia, P51-01.** Petición a otras administraciones. El dosier autonómico del 21/07/2022 ya anuncia obras de adecuación del búnker. Europa Press informa del primer tratamiento el 20/11/2023 con declaraciones directas de responsables sanitarios. Cerca de 400 pacientes anuales es previsión, no actividad medida. Ni apertura ni coincidencia temporal acreditan causalidad o ejecución municipal. Faltan gestiones municipales y registros asistenciales posteriores.

Las familias se agrupan por procedencia: Por Ávila, Ayuntamiento de Ávila (incluido Bandomóvil), Junta de Castilla y León, PRISA y Europa Press. Crónicas de actos pueden corroborar un hito y reproducir a la vez declaraciones oficiales; no se presentan como auditorías de impacto. La fecha dinámica de la cabecera web no sustituye la fecha de publicación.

## Validación

Pruebas del importador y del balance comprueban páginas, párrafos y viñetas perdidos/añadidos, huellas, duplicados, páginas omitidas por el índice, separación de previsión/ejecución y privacidad de la extracción. El recorrido móvil comprueba llegada desde cobertura, fichas, filtro de los 160 pendientes, búsqueda de Vicolozano, enlace a página 37 y ausencia de desbordamiento. Resultados efectivamente ejecutados y despliegue constan en el PR y la Bitácora compartida.
