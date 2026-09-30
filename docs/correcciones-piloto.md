# Correcciones tras el primer ensayo documental

Fecha: 30 de septiembre de 2026. Cambios en PR18, pendiente de integración. No se han ejecutado nuevas llamadas de pago, migraciones ni escrituras en producción.

## Comportamiento

- Un título aislado, texto vacío o contenido identificado como sumario produce `needs_review` antes de consumir IA. Una respuesta explícita de insuficiencia tampoco se convierte en irrelevancia ni en una alerta por su puntuación.
- Actualmente solo BOE/BORM tienen recuperación de texto completo. Los otros conectores siguen detectando publicaciones, pero sus índices y RSS quedan pendientes de texto/revisión. Esto reduce alertas automáticas hasta completar su recuperación documental.
- El prompt exige conservar condiciones y excepciones y aportar citas literales/localizadores para acciones, resumen, impacto y derogación/modificación. El código comprueba presencia literal, estructura y tipos; las acciones guardadas se construyen únicamente desde las acciones citadas.
- La publicación procede exclusivamente del metadato oficial; sin él queda `null`. La entrada en vigor y los efectos se separan. Una fecha absoluta debe aparecer en una cita acotada con una única fecha distinta; las reglas relativas se conservan sin calcular fechas.
- Los plazos conservan cantidad, unidad, inicio y destinatarios. No se transforma seis meses de adaptación en veinte días de entrada en vigor ni en 180 días. Números como cadenas, cantidades sin respaldo y colas de numerales compuestos se rechazan.
- El rango procede del metadato o encabezado. Un decreto autonómico conserva `rango: Decreto` y `tipo_norma: null`; no se fuerza al enum `Real Decreto`.

## Compatibilidad y trazabilidad

No cambia el esquema Supabase. `plazo_adaptacion` sigue siendo un entero heredado: solo se rellena si hay un único plazo expresado literalmente en días. Meses, años, días hábiles o varios plazos quedan `null`; sus unidades, destinatarios, inicio y citas se conservan en `impacto`. Las acciones citadas se guardan en `accion_recomendada`. No se corrigen retroactivamente alertas existentes.

El informe JSON conserva el análisis estructurado para candidatos guardados o con puntuación baja, y distingue `needs_review` de fallos técnicos y descartes. El piloto registra la razón de revisión y huella del nuevo validador. No se añade una cola durable: los pendientes dependen de informes de ejecución (artefactos de Actions conservados 30 días) y de futuras recuperaciones. La ventana de tres días y los RSS recientes no garantizan recuperarlos después; resolver esta limitación sigue pendiente.

## Verificación y límites

Las siete regresiones iniciales se comprobaron primero en rojo con el comportamiento anterior. Se añadieron pruebas de persistencia simulada, bloqueo de sumarios antes de IA, fechas literales/relativas, efectos separados, unidades y casos adversarios de numerales. Estos últimos también fallaron antes de corregir el validador. No son una nueva evaluación de comprensión jurídica.

Una cita existente no demuestra que implique la conclusión ni que el localizador sea correcto. El código tampoco determina por sí solo ámbito, excepciones, vigencia actual o coherencia semántica de toda la prosa. Se conserva la revisión editorial. La extracción conservadora puede dejar pendientes formatos legítimos no reconocidos; no se aproxima su significado para aceptar una alerta. El límite de salida del modelo sigue siendo 4096 tokens: una respuesta truncada queda como análisis inválido.

El primer ensayo y su revisión provisional permanecen intactos en `eval/pilot/results/2026-09-30-baseline/`: 16/27 comprobaciones revisadas como correctas por Codex, ocho referencias pendientes de aprobación humana. No se ha medido la mejora tras estas correcciones. Repetir el piloto necesita autorización del coste; después debe evaluarse una muestra distinta. BORM sigue bloqueado y la correlación noticia–norma no queda validada por este trabajo.
