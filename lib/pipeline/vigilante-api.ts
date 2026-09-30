// lib/pipeline/vigilante-api.ts
// Cuenta los errores de la API de Claude en una ejecución y decide cuándo parar.
// Un error de la API no dice nada del documento (sin saldo, clave inválida, caída...):
// no debe tratarse como «no relevante» ni dejar que la ejecución termine en verde.
import { APIError, AuthenticationError, PermissionDeniedError } from '@anthropic-ai/sdk'

export const MAX_ERRORES_API_SEGUIDOS = 3

export class VigilanteApi {
  private seguidos = 0
  total = 0
  abortado = false
  ultimo: APIError | null = null

  exito() {
    this.seguidos = 0
  }

  /** Registra el error y devuelve true si hay que abortar la ejecución */
  error(err: APIError): boolean {
    this.total++
    this.seguidos++
    this.ultimo = err
    // Clave o permisos: no va a mejorar en el siguiente documento.
    // Cualquier otro (sin saldo, 5xx o 429 tras los reintentos del SDK): abortar si se repite.
    this.abortado =
      err instanceof AuthenticationError ||
      err instanceof PermissionDeniedError ||
      this.seguidos >= MAX_ERRORES_API_SEGUIDOS
    return this.abortado
  }

  describirUltimo(): string {
    if (!this.ultimo) return ''
    return `${this.ultimo.status ?? 'sin conexión'}: ${this.ultimo.message}`
  }
}
