'use client'
import { useState } from 'react'
import { REGIONES } from '@/lib/regiones'

export function SourcePicker({ selected }: { selected: string[] }) {
  const [values, setValues] = useState(selected)
  const options = [{ nombre: 'España · BOE', fuente: 'BOE' }, ...REGIONES.filter(r => !r.disabled)]
  return <fieldset className="rt-sources">
    <legend>Boletines de origen</legend>
    <p>Elige dónde se publicó la norma. Puedes combinar BOE y boletines autonómicos; esto no determina dónde se aplica.</p>
    <input type="hidden" name="fuente" value={values.join(',')} />
    <div>{options.map(o => <label key={o.fuente}><input type="checkbox" checked={values.includes(o.fuente)} onChange={e => setValues(previous => e.target.checked ? [...previous, o.fuente] : previous.filter(f => f !== o.fuente))} />{o.nombre}</label>)}</div>
  </fieldset>
}
