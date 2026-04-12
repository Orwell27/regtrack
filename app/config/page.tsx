import { createNextServerClient } from '@/lib/supabase'

export default async function ConfigPage() {
  const db = createNextServerClient()
  const [{ data: keywords }, { data: entidades }] = await Promise.all([
    db.from('keywords').select('*').order('apariciones', { ascending: false }),
    db.from('entidades').select('*').order('relevancia', { ascending: false }),
  ])

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-10">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <section>
        <h2 className="text-lg font-semibold mb-3">Keywords inmobiliarias</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Keyword</th>
                <th className="text-left p-3">Peso</th>
                <th className="text-left p-3">Apariciones</th>
              </tr>
            </thead>
            <tbody>
              {keywords?.map(k => (
                <tr key={k.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{k.keyword}</td>
                  <td className="p-3">{k.peso}</td>
                  <td className="p-3">{k.apariciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Entidades normativas</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Relevancia</th>
              </tr>
            </thead>
            <tbody>
              {entidades?.map(e => (
                <tr key={e.id} className="border-t">
                  <td className="p-3 font-medium">{e.nombre}</td>
                  <td className="p-3 text-gray-500">{e.tipo}</td>
                  <td className="p-3">{e.relevancia}/10</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
