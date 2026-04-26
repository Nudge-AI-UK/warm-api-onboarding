import { useAuth } from '@/contexts/AuthContext'
import type { AppError } from '@/lib/supabase/callEdgeFunction'

export function useHandleAppError() {
  const { signOut } = useAuth()

  return function handleAppError(error: AppError, setLocalError?: (msg: string) => void) {
    if (error.kind === 'auth_required') {
      signOut()
        .catch(() => {/* still try to redirect */})
        .finally(() => { window.location.href = '/' })
      return
    }
    if (setLocalError) setLocalError(error.message)
  }
}
