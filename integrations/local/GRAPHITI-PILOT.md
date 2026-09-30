# Caso reservado para activar extracción de Graphiti

Estado: preparado, no ejecutado. La conexión MCP y lectura del grupo vacío ya funcionan. El 30-sep se inspeccionaron la configuración y factories de la imagen fijada: admite extracción OpenAI, Azure OpenAI, Anthropic, Gemini y Groq; embeddings OpenAI, Azure, Gemini y Voyage. Anthropic por sí solo no cubre los embeddings de ese servidor. La compatibilidad del código no demuestra que las cuentas o modelos estén disponibles.

No se localizaron credenciales de esos proveedores en `.env`/`.env.local` de este checkout. Esto no afirma que falten en otros equipos o en GitHub. Alfonso aclaró que quiere **integrarlo con la API de Claude más adelante** y canceló la preparación de una cuenta nueva de OpenAI. No pedir claves por chat ni copiar las de producción sin acordar su uso.

## Activación aplazada por Alfonso

No se ha creado cuenta, generado una clave, añadido tarjeta ni comprado saldo. Se cerró la pestaña de alta abierta durante la preparación. No hay autorización para ejecutar extracción o embeddings ahora.

Para retomarlo: seleccionar un modelo de Claude para extracción y, por separado, un proveedor/modelo de embeddings compatible con esta imagen. La factory instalada no admite Anthropic como proveedor de embeddings. Esto no obliga a usar OpenAI: también aparecen Azure, Gemini y Voyage. Elegir dimensiones y presupuesto al retomar, y verificar entonces precios, acceso y compatibilidad reales. No hay una decisión tomada para embeddings.

## Ensayo concreto

Fuente: [graphiti-pilot.json](../examples/graphiti-pilot.json), rotulada como ficticia. Importarla en un vault separado y un grupo exclusivo `regtrack-pilot-20260930`; nunca en el corpus de normas o en el grupo operativo. Un documento, sin comunidades, sin lotes automáticos. El UUID estable del adaptador permite comprobar el reintento.

Resultados a revisar frente al original:

1. Reconoce las dos empresas y el inmueble como entidades distintas.
2. Atribuye la adquisición a Faro Ejemplo SL y la venta a Costa Ejemplo SL, sin invertir los papeles.
3. Distingue adquisición (15 de abril), anuncio (20 de abril), publicación (29 de septiembre) y observación (30 de septiembre). No presenta la fecha de observación como fecha de compra.
4. Mantiene procedencia, contenido ficticio y UUID del episodio. No inventa precio, causalidad regulatoria, obligación ni vigencia jurídica.
5. El episodio termina procesado y se inspeccionan los hechos; `queued` no basta. La misma importación no crea otro episodio. Los mismos IDs/hechos se recuperan tras reiniciar sin reimportar.

Una extracción correcta de este caso no valida precisión general, identidad de empresas reales ni autonomía jurídica.

## Antes de ejecutarlo

Cuando Alfonso pida retomarlo, confirmar acceso a los modelos elegidos y acordar el consumo del ensayo. Configurar credenciales fuera de Git y un perfil separado: el perfil actual carece deliberadamente de salida a Internet y usa una clave inválida. No basta cambiar la clave del perfil de solo lectura. Mantener este caso aislado también en la base de datos, no solo en el vault.

Preparar el comando final y sus límites para que Alfonso pueda aprobar un ensayo concreto. Registrar llamadas/uso devueltos por proveedor; no prometer un tope monetario duro si el mecanismo no lo impone. No se ha solicitado ni autorizado nuevo consumo en esta continuación.
