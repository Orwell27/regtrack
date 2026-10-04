'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
export function CreateAccount() {
  const [pending, setPending] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState('')
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    const fields = new FormData(e.currentTarget)
    setPending(true)
    setError('')
    try {
      const client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { error } = await client.auth.signUp({
        email: String(fields.get('email')).trim(),
        password: String(fields.get('password')),
        options: {
          emailRedirectTo: `${window.location.origin}/api/comunidad/auth`,
        },
      })
      if (error) throw error
      setDone(true)
    } catch {
      setError(
        'No se ha podido crear la cuenta. Revisa los datos o inténtalo más tarde. Si ya tienes cuenta, accede con ella.',
      )
    } finally {
      setPending(false)
    }
  }
  if (done)
    return (
      <div className="rc-success" role="status">
        <h2>Revisa tu correo</h2>
        <p>
          Si la dirección puede registrarse, recibirás las instrucciones para
          confirmar tu cuenta. Si ya tenías cuenta en RegTrack, puedes acceder
          con ella. La admisión al piloto se revisa por separado.
        </p>
        <Link href="/login?next=/comunidad">Acceder a RegTrack →</Link>
      </div>
    )
  return (
    <form className="rc-form" onSubmit={submit} aria-busy={pending}>
      <fieldset disabled={pending}>
        <label>
          El correo de tu solicitud
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
        <label>
          Contraseña (al menos 12 caracteres)
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <button className="rc-button">
          {pending ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </fieldset>
      {error ? (
        <p className="rc-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
