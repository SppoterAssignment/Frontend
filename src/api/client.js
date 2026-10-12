// Empty in dev (Vite proxies /api to Django); the backend URL in production.
const API_BASE = import.meta.env.VITE_API_URL ?? ''
const TIMEOUT_MS = 60_000

/** An error the UI can show as-is. `fieldErrors` maps form field -> [messages]. */
export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {} } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function postJson(path, body, signal) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Abort if the caller cancels OR the request runs too long.
      signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err // cancelled on purpose; caller ignores it
    if (err.name === 'TimeoutError') {
      throw new ApiError('The server took too long to respond. Please try again.')
    }
    throw new ApiError("Can't reach the server. Check your connection and try again.")
  }

  // Error pages (e.g. a proxy's HTML 502) aren't JSON, so don't let parsing throw.
  const data = await response.json().catch(() => null)
  if (response.ok) return data

  if (response.status === 429) {
    throw new ApiError(
      data?.detail ?? 'Too many requests. Please wait a minute and try again.',
      { status: 429 },
    )
  }
  const fieldErrors = data?.errors ?? {}
  const message =
    fieldErrors.non_field_errors?.[0] ??
    (response.status >= 500
      ? 'Something went wrong on our side. Please try again shortly.'
      : 'Please fix the highlighted fields.')
  throw new ApiError(message, { status: response.status, fieldErrors })
}

export function fetchPlan(params, signal) {
  return postJson('/api/plan', params, signal)
}
