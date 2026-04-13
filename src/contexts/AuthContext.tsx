import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  authError: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    // Safety timeout — if auth takes longer than 8s (lock timeout is 5s + buffer),
    // force loading to false. This handles the Chrome Web Locks API issue where
    // Supabase's auth token lock can become orphaned and hang getSession().
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('AuthProvider: auth init timed out after 8s, forcing loading=false')
        setLoading(false)
      }
    }, 8000)

    // Listen for auth changes FIRST — this catches OAuth callbacks,
    // magic link verifications, and session refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      setAuthError(null)
      setLoading(false)
    })

    // Then check for magic link token OR existing session
    const initAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const tokenHash = params.get('token_hash')

        if (tokenHash) {
          // Clean URL immediately to prevent token leaking via referrer/history
          window.history.replaceState({}, '', window.location.pathname)

          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink'
          })

          if (!error && data.session) {
            // onAuthStateChange will fire and update state
            return
          }

          console.error('Failed to verify onboarding token:', error)
          if (mounted) {
            setAuthError('Your sign-in link has expired. Please sign in again.')
            setLoading(false)
          }
          return
        }

        // Check for OAuth hash in URL — Supabase handles this automatically
        // via onAuthStateChange when there's a #access_token in the URL.
        // If there's a hash fragment, wait for onAuthStateChange to fire.
        if (window.location.hash && window.location.hash.includes('access_token')) {
          // onAuthStateChange will handle it — don't set loading false yet
          return
        }

        // No token, no hash — check for existing session
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (session) {
          setSession(session)
          setUser(session.user)
        }
      } catch (err) {
        console.error('AuthProvider: initAuth failed:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    return () => {
      mounted = false
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, authError, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
