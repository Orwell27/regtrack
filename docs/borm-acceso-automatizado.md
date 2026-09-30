# BORM: acceso automatizado pendiente

Comprobado el 30 de septiembre de 2026 desde Node, sin cookies ni cambio de identidad. La web del BORM y el recurso del catálogo de datos abiertos redirigen a `validate.perfdrive.com`, el servicio de CAPTCHA. RegTrack debe detenerse en esa redirección y registrar cobertura incompleta. No debe seguir el desafío, intentar resolverlo automáticamente, cambiar de IP ni sustituir el texto por un sumario para simular lectura completa.

## Vía oficial investigada

El [catálogo de la Región de Murcia](https://datosabiertos.regiondemurcia.es/admin/dataset/indices-del-boletin-oficial-de-la-region-de-murcia-ano-actual) publica un índice del ejercicio con sumarios, identificadores, enlaces y distinción entre boletín y suplemento. No contiene el texto íntegro de las disposiciones. La descarga JSON anunciada es `https://transparencia.carm.es/rest-services/services/restFile/BORMIndice.json`.

La consulta de esa descarga devolvió HTTP 302 al proveedor de CAPTCHA. No se siguió la redirección. Por tanto, el hecho de que exista en el catálogo no demuestra que el proceso automático pueda descargarlo. El [aviso de reutilización](https://datosabiertos.regiondemurcia.es/avisolegal) establece condiciones de atribución y conservación de metadatos; no proporciona una solución técnica al bloqueo observado.

## Consulta preparada, sin enviar

Asunto: Acceso automatizado autorizado a índices y textos del BORM

Estamos desarrollando RegTrack, un sistema de vigilancia normativa con referencias a las publicaciones originales y revisión humana antes de publicar sus análisis.

Queremos consultar diariamente los boletines ordinarios y suplementos, recuperar fechas pendientes y leer el texto íntegro de cada disposición nueva. Mantendremos la referencia oficial y deduplicaremos documentos para evitar descargas repetidas.

El índice JSON anunciado en el portal de datos abiertos y los servicios de sumario/texto del BORM redirigen nuestras peticiones automatizadas a un CAPTCHA. Hemos detenido ese acceso.

¿Existe una API, descarga periódica u otro canal autorizado para este uso? En su caso, agradeceríamos documentación, condiciones de acceso, límites de frecuencia y el procedimiento de alta necesario. Necesitamos tanto índices como textos íntegros y cobertura de suplementos.

Gracias.

## Condiciones para dar el acceso por resuelto

- Canal confirmado por el proveedor y configurado mediante el procedimiento indicado.
- Comprobación desde el entorno que ejecutará los escaneos, sin evasión del control de acceso.
- Un día ordinario y un suplemento recuperados con su texto completo, fecha e identidad verificadas.
- Fallos y documentos no recuperados visibles en el informe; ninguna alerta generada a partir de una página de bloqueo.

Hasta entonces Murcia sigue con cobertura incompleta. La PR puede probarse y repararse, pero estas pruebas no justifican anunciar vigilancia autónoma del BORM.
