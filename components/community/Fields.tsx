import {
  CATEGORIES,
  OWNER_KINDS,
  REGIONS,
  type Topic,
  type Reply,
} from '@/lib/community/model'
export function Hidden({
  name,
  value,
}: {
  name: string
  value: string | number | boolean
}) {
  return <input type="hidden" name={name} value={String(value)} />
}
export function RegionField({
  value = 'Prefiero no indicarlo',
}: {
  value?: string
}) {
  return (
    <label>
      Territorio
      <select name="region" defaultValue={value} required>
        {REGIONS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
    </label>
  )
}
export function ApplicationFields() {
  return (
    <>
      <div className="rc-fields">
        <label>
          Nombre o alias
          <input
            name="alias"
            autoComplete="nickname"
            minLength={2}
            maxLength={60}
            required
          />
        </label>
        <label>
          Correo electrónico
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
      </div>
      <div className="rc-fields">
        <RegionField />
        <label>
          Tu situación
          <select name="owner_kind" required>
            {OWNER_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        ¿Qué te gustaría resolver? <span className="rc-muted">Opcional</span>
        <textarea name="need" rows={3} maxLength={1000} />
      </label>
      <label className="rc-honeypot" aria-hidden="true">
        Sitio web
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="rc-checkbox">
        <input type="checkbox" name="consent" required />
        <span>
          Quiero recibir información sobre mi solicitud y el piloto. He leído la{' '}
          <a href="/comunidad/privacidad">información de privacidad</a>.
        </span>
      </label>
    </>
  )
}
export function TopicFields({ topic }: { topic?: Topic }) {
  return (
    <>
      <label>
        ¿Qué necesitas decidir?
        <input
          name="title"
          defaultValue={topic?.title}
          minLength={8}
          maxLength={160}
          required
          placeholder="Una pregunta concreta ayuda a encontrar una respuesta"
        />
      </label>
      <div className="rc-fields">
        <label>
          Tema
          <select name="category" defaultValue={topic?.category ?? 'cuidar'}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <RegionField value={topic?.region} />
      </div>
      <label>
        Situación y qué has intentado
        <textarea
          name="body"
          rows={7}
          defaultValue={topic?.body}
          minLength={20}
          maxLength={6000}
          required
        />
      </label>
      <p className="rc-muted">
        Incluye fecha y contexto cuando importen. Evita direcciones completas y
        datos de otras personas.
      </p>
    </>
  )
}
export function ReplyFields({ reply }: { reply?: Reply }) {
  return (
    <>
      <label>
        Tu aportación
        <textarea
          name="body"
          rows={4}
          minLength={5}
          maxLength={4000}
          defaultValue={reply?.body}
          required
        />
      </label>
      <label>
        Hablas desde
        <select name="kind" defaultValue={reply?.kind ?? 'experiencia'}>
          <option value="experiencia">Mi experiencia</option>
          <option value="fuente">Una fuente consultada</option>
          <option value="profesional">Mi actividad profesional</option>
        </select>
      </label>
      <div className="rc-fields">
        <label>
          Enlace a la fuente
          <input
            name="source_url"
            type="url"
            maxLength={1000}
            defaultValue={reply?.source_url}
            placeholder="Necesario si citas una fuente"
          />
        </label>
        <label>
          Vinculación profesional
          <input
            name="affiliation"
            maxLength={160}
            defaultValue={reply?.affiliation}
            placeholder="Necesaria si respondes como profesional"
          />
        </label>
      </div>
    </>
  )
}
