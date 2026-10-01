# MVP de memoria documental

Primera entrega privada para consultar lo que RegTrack conserva y comprobar su procedencia. No activa Graphiti, nuevas cuentas, modelos, cron ni publicación de alertas.

## Recorrido implementado

`Captura del escáner → versión conservada → análisis vinculado a esa versión → ficha web → historial/relaciones → reporte → respaldo restaurable`.

- `/admin/memoria`: búsqueda por texto y tipo, ficha, original, citas, análisis, historial y relaciones explícitas. Enlace en la navegación de administración. Reutiliza el vault del escáner, no crea otra base documental.
- Cada lectura privada verifica el usuario contra Supabase Auth con `getUser()`, exige su ID exacto en `REGTRACK_MEMORY_READER_IDS` (lista gestionada solo por el servidor) y comprueba `usuarios.auth_id`/rol admin antes de acceder al archivo. Una lista vacía deniega el acceso. No cambia el helper general de otros paneles ni el PR14 de Claude. No basta una cookie, el layout o el perfil admin por sí solo: los permisos heredados de usuarios necesitan revisión. Sin configuración de almacenamiento, montaje o integridad aparece un estado explícito, no «sin novedades».
- El escáner guarda el análisis que ya obtuvo de Claude junto al ID de versión y SHA256 del texto. No añade llamadas de IA. Los análisis anteriores sin esa vinculación permanecen archivados: no se asignan a una captura por semejanza de título. Cada captura muestra solo explicaciones vinculadas a su versión y con citas presentes en su texto.
- La revisión jurídica y la vigencia siguen pendientes. El MVP consulta; no incorpora un botón que certifique obligaciones. Una cita literal no acredita por sí sola que la interpretación sea correcta.
- El historial son **capturas**, no versiones legales certificadas. Un paso de sumario a texto completo también cambia la huella. La comparación conserva ambos textos y explica esta diferencia.
- Las relaciones son las de `relatedTo`, visibles en ambos sentidos y rotuladas como documentales. El listado relacionado muestra sus últimas observaciones; seleccionar una captura antigua no constituye una consulta temporal de todo el grafo. No se infieren empresas, identidad ni causalidad.

## Conexión del archivo privado

Hay dos lectores: disco local (por defecto) y Supabase (`REGTRACK_MEMORY_BACKEND=supabase`). El segundo elimina la necesidad de compartir el disco con Vercel: web y worker consultan el mismo archivo privado en la base de datos existente. **Las siete versiones iniciales están copiadas y recuperadas desde Supabase, con 15 archivos idénticos y reintento sin duplicados.** Falta confirmar, configurar y probar la cuenta privada. Véase [Conexión de memoria compartida](memoria-compartida.md). No copiar el vault a `public`, a Git ni a un bundle web.

## Respaldo comprobable

Detener el escritor y las sincronizaciones antes de respaldar. Los directorios de destino deben ser nuevos:

```powershell
npm run knowledge -- backup --vault .knowledge/vault --file RUTA_NUEVA_RESPALDO
npm run knowledge -- verify-backup --file RUTA_NUEVA_RESPALDO
npm run knowledge -- restore --file RUTA_NUEVA_RESPALDO --to RUTA_NUEVA_RESTAURACION
npm run knowledge -- search --vault RUTA_NUEVA_RESTAURACION --query arrendamientos
```

El respaldo conserva JSON, Markdown y acuses para evitar repetir envíos/consumos. Manifiesto con SHA256 de cada archivo, lectura de integridad de los registros y comprobación de cambios durante la copia. Rechaza enlaces simbólicos, candados, rutas que escapan, corrupción y destinos existentes. El directorio final se publica solo después de comprobarlo; un fallo puede dejar una carpeta `.partial-*` que no debe usarse como respaldo válido. El manifiesto verifica integridad accidental, no autenticidad frente a quien pueda reescribir copia y manifiesto.

**No incluye** credenciales/configuración de integraciones, índices Basic Memory, volúmenes OpenAleph/FalkorDB ni exportación WSL. No es un respaldo de toda la infraestructura. Guardar la copia en otro dispositivo o proveedor sigue pendiente: dos carpetas en el mismo disco no protegen de perder ese disco. No hay tarea automática de copias instalada.

## Demostración local

```powershell
npm run knowledge:demo
$env:REGTRACK_MEMORY_DEMO = '1'
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Abrir `http://127.0.0.1:3100/demo/memoria`. La preparación usa un vault fijo separado en `artifacts/mvp-demo/vault`; si ya existe no lo sobrescribe. Tres capturas de una norma ficticia, análisis con citas, noticia relacionada y reporte. La ruta lee únicamente esa carpeta, nunca el vault privado; está deshabilitada fuera de desarrollo incluso si se define la variable. No introduce una excepción de autenticación en `/admin/memoria`.

Se puede generar un reporte semanal de la demo con `npm run knowledge -- weekly --vault artifacts/mvp-demo/vault --from 2026-09-28 --to 2026-10-04` y verlo en el archivo.

## Validación realizada

- 269 pruebas en 32 archivos, TypeScript y ESLint dirigidos. Se cubren versión equivocada, sumario posterior, cita inventada, consultas de historial, permisos y fallos de lectura; restauración con acuses, corrupción, destino existente y rutas inválidas. Los controles de autorización usan transportes simulados; no se ha usado una sesión de administrador de producción.
- Recuperación real del vault local: **7 versiones y 22 archivos idénticos por SHA256**; búsqueda «arrendamientos» recupera tres documentos en la copia restaurada. Copia en `artifacts/mvp-backup/real-vault` y recuperación en `artifacts/mvp-backup/restored-vault`, ignoradas en Git.
- Navegador real: lista, filtro normativa, búsqueda con/sin resultados, ficha, citas desplegables y original; captura anterior muestra seis meses y no hereda el resumen de nueve meses. Móvil de 390 px sin desbordamiento horizontal; sin errores de consola/overlay observados. Datos de demo ficticios. Reporte semanal generado mediante el CLI real.
- Build de producción correcto. HTTP local con `REGTRACK_MEMORY_DEMO=1`: demo 404 y memoria privada anónima 307 a `/login`, sin contenido documental. Navegación desde el reporte semanal a su norma comprobada en desarrollo.
- El primer build detectó un trazado excesivo de archivos locales. El control `scripts/check-memory-trace.mjs` falló con 211 archivos indebidos en cada una de las dos rutas. Se marcaron las lecturas del vault como entradas de ejecución, se excluyeron carpetas privadas del empaquetado y se comprobó el build corregido: sin ese aviso ni archivos privados en las dos rutas. El control forma parte de `npm run build` y falla también si falta alguna ruta o su trace está vacío. Todo ello antes de subir el cambio.

## Siguiente crecimiento

Activar y comprobar la conexión Supabase preparada; copia independiente completa; validar la sesión real privada; revisión editorial durable vinculada a versiones; cobertura por fuente y pendientes recuperables; un caso documental real completo. Después, extracción con Claude y embeddings por decidir. No confundir estas mejoras pendientes con funcionalidades entregadas.
