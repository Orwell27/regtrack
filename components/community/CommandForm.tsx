'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export function CommandForm({
  action,
  children,
  label = 'Guardar',
  success = 'Guardado.',
  navigate = false,
  reset = false,
  className = '',
}: {
  action: string
  children?: React.ReactNode
  label?: string
  success?: string
  navigate?: boolean
  reset?: boolean
  className?: string
}) {
  const router = useRouter()
  const requestId = useRef<string | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    setPending(true)
    setMessage('')
    setError('')
    requestId.current ??= crypto.randomUUID()
    const data: Record<string, unknown> = {
      ...Object.fromEntries(new FormData(form)),
      action,
      request_id: requestId.current,
    }
    for (const key of ['consent', 'enabled', 'hidden'])
      if (form.elements.namedItem(key))
        data[key] = data[key] === 'on' || data[key] === 'true'
    for (const key of ['revision', 'weekly_hours'])
      if (key in data) data[key] = Number(data[key])
    try {
      const response = await fetch('/api/comunidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok)
        throw new Error(
          result.error || 'No se ha podido guardar. Inténtalo de nuevo.',
        )
      requestId.current = null
      setMessage(success)
      if (reset) form.reset()
      if (navigate && result.id)
        router.push(`/comunidad/preguntas/${result.id}`)
      router.refresh()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se ha podido guardar. Inténtalo de nuevo.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      onSubmit={submit}
      className={`rc-form ${className}`}
      aria-busy={pending}
    >
      <fieldset disabled={pending}>
        {children}
        <button type="submit" className="rc-button">
          {pending ? 'Guardando…' : label}
        </button>
      </fieldset>
      {error ? (
        <p role="alert" className="rc-error">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="rc-success">
          {message}
        </p>
      ) : null}
    </form>
  )
}
