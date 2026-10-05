export default function Rules() {
  return (
    <article className="rc-reading">
      <p className="rc-eyebrow">NUESTRA FORMA DE PARTICIPAR</p>
      <h1>
        Una buena comunidad
        <br />
        se cuida entre todos.
      </h1>
      <p className="rc-lead">
        Aquí caben las dudas básicas, las experiencias distintas y las
        correcciones hechas con respeto.
      </p>
      {[
        [
          'Ayuda con respeto',
          'Discutimos ideas y actuaciones concretas. Tratamos con respeto a propietarios, inquilinos, vecinos y profesionales.',
        ],
        [
          'Comparte con contexto',
          'Indica territorio y fecha cuando importen. Lo que funcionó en tu caso puede necesitar matices en otro.',
        ],
        [
          'Distingue experiencia y fuente',
          'Explica si compartes algo vivido, una fuente consultada o un criterio profesional. Declara tu vinculación si mencionas un servicio del que obtienes ingresos.',
        ],
        [
          'Cuida los datos de los demás',
          'No publiques direcciones completas, contratos sin anonimizar ni datos o conversaciones privadas de terceros.',
        ],
        [
          'Vuelve a contar el resultado',
          'Cuando puedas, explica qué decidiste y qué ocurrió. Agradecer, corregir y cerrar un caso también es aportar.',
        ],
        [
          'Deja espacio a quien prefiere leer',
          'Puedes aprender sin escribir. No medimos tu valor por el número de mensajes.',
        ],
      ].map(([title, body], i) => (
        <section key={title}>
          <span className="rc-eyebrow">0{i + 1}</span>
          <h2>{title}</h2>
          <p>{body}</p>
        </section>
      ))}
      <section>
        <h2>La norma, la explicación y la experiencia</h2>
        <p>
          La publicación oficial es la fuente de referencia. La explicación de
          RegTrack ayuda a leerla; una experiencia o aportación profesional
          conserva su propio contexto y no determina por sí sola cómo se aplica
          a otra persona.
        </p>
        <p>
          Indica comunidad autónoma y municipio cuando importen. Una respuesta
          marcada como útil no equivale a una validación jurídica. Si cambia la
          alerta vinculada o aparece en RegTrack una publicación relacionada,
          las guías vuelven a necesitar revisión. No detectamos cambios que
          todavía no se hayan incorporado a RegTrack.
        </p>
      </section>
      <section>
        <h2>Cómo cuidamos las conversaciones</h2>
        <p>
          Puedes avisar desde una conversación o respuesta. El equipo revisa los
          avisos, pide aclaraciones y puede ocultar contenido o retirar acceso.
          Las decisiones de moderación quedan registradas con su motivo. Las
          promociones necesitan un espacio expresamente habilitado.
        </p>
        <p>
          Los casos de otros propietarios ayudan a orientarse. Una aportación
          marcada como útil no acredita que sea correcta para todas las
          situaciones.
        </p>
      </section>
    </article>
  )
}
