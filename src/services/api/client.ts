export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse' | 'empty'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly endpoint?: string

  constructor(
    message: string,
    kind: ApiErrorKind = 'network',
    options: { status?: number; endpoint?: string } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = options.status
    this.endpoint = options.endpoint
  }

  get retryable(): boolean {
    return this.kind !== 'empty'
  }

  /** Human friendly message shown in the UI error states. */
  get userMessage(): string {
    switch (this.kind) {
      case 'timeout':
        return 'The request took too long to respond.'
      case 'http':
        return this.status ? `The service replied with status ${this.status}.` : 'The service rejected the request.'
      case 'parse':
        return 'The service returned data that could not be understood.'
      case 'empty':
        return this.message
      default:
        return 'The network request failed.'
    }
  }
}

export interface FetchOptions {
  timeoutMs?: number
  signal?: AbortSignal
  headers?: Record<string, string>
  method?: 'GET' | 'POST'
  body?: BodyInit
}

/**
 * `fetch` wrapper with a hard timeout and normalised errors so every screen can
 * present a consistent, honest failure state.
 */
export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeoutMs = 15000, signal, headers, method = 'GET', body } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onExternalAbort = () => controller.abort()
  signal?.addEventListener('abort', onExternalAbort)

  let response: Response
  try {
    response = await fetch(url, {
      method,
      body,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...headers },
    })
  } catch (error) {
    if (signal?.aborted) {
      throw new ApiError('Request cancelled', 'network', { endpoint: url })
    }
    if (controller.signal.aborted) {
      throw new ApiError('Request timed out', 'timeout', { endpoint: url })
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      'network',
      { endpoint: url },
    )
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onExternalAbort)
  }

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, 'http', {
      status: response.status,
      endpoint: url,
    })
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError('Response was not valid JSON', 'parse', { endpoint: url })
  }
}
