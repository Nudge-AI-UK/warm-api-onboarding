import { supabase } from '@/integrations/supabase/client'

export type AppErrorKind = 'auth_required' | 'network_failed' | 'function_error' | 'unknown'

export interface AppError {
  kind: AppErrorKind
  message: string  // user-facing
  raw?: unknown    // for console logging only
}

export async function callEdgeFunction<T = any>(
  name: string,
  opts: Parameters<typeof supabase.functions.invoke>[1],
  friendlyName = 'Request',
): Promise<{ data?: T; error?: AppError }> {

  // 1. Ensure session is fresh before calling
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError || !session) {
    return { error: { kind: 'auth_required', message: 'Your session has expired. Sign in again to continue.', raw: refreshError } }
  }

  // 2. Invoke
  try {
    const { data, error: fnError } = await supabase.functions.invoke<T>(name, opts)

    if (fnError) {
      let detail = fnError.message
      try {
        const text = await (fnError as any).context?.text?.()
        if (text) {
          const parsed = JSON.parse(text)
          detail = parsed.error || parsed.message || text
        }
      } catch {}

      const lower = detail.toLowerCase()
      if (
        lower.includes('session has expired') ||
        lower.includes('sign in again') ||
        lower.includes('unauthorized') ||
        (fnError as any).status === 401
      ) {
        return { error: { kind: 'auth_required', message: 'Your session has expired. Sign in again to continue.', raw: fnError } }
      }

      if (detail.includes('Failed to send request') || lower.includes('failed to fetch')) {
        return { error: { kind: 'network_failed', message: `${friendlyName} couldn't reach the server. Check your connection and try again.`, raw: fnError } }
      }

      return { error: { kind: 'function_error', message: detail, raw: fnError } }
    }

    return { data: data ?? undefined }
  } catch (err: any) {
    console.error(`callEdgeFunction(${name}) threw:`, err)
    return { error: { kind: 'unknown', message: 'Something went wrong. Please try again.', raw: err } }
  }
}
