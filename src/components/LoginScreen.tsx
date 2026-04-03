import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, ChevronDown } from 'lucide-react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
  }
}

export function LoginScreen({ message }: { message?: string | null }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const scriptLoadedRef = useRef(false)

  // Load Turnstile script
  useEffect(() => {
    if (scriptLoadedRef.current || window.turnstile) return
    const existing = document.querySelector('script[src*="turnstile"]')
    if (existing) {
      const check = setInterval(() => {
        if (window.turnstile) { clearInterval(check); scriptLoadedRef.current = true }
      }, 100)
      return () => clearInterval(check)
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.onload = () => { scriptLoadedRef.current = true }
    document.body.appendChild(script)
  }, [])

  // Render invisible Turnstile when email form opens
  useEffect(() => {
    if (!showEmail || !window.turnstile || !turnstileRef.current) return
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
    if (!siteKey) return

    const timeout = setTimeout(() => {
      if (!turnstileRef.current || !window.turnstile) return
      if (widgetIdRef.current) {
        try { window.turnstile.remove(widgetIdRef.current) } catch {}
        widgetIdRef.current = null
      }
      try {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: siteKey,
          size: 'invisible',
          action: 'login',
          callback: (token: string) => setCaptchaToken(token),
          'error-callback': () => setCaptchaToken(null),
          'expired-callback': () => setCaptchaToken(null),
        })
      } catch {}
    }, 100)
    return () => {
      clearTimeout(timeout)
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch {}
        widgetIdRef.current = null
      }
    }
  }, [showEmail])

  const handleGoogle = async () => {
    setLoading(true)
    setError(null)
    try {
      const redirectUrl = window.location.origin + window.location.pathname
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Failed to sign in.')
      setLoading(false)
    }
  }

  const sendMagicLink = async () => {
    if (!email) return
    setLoading(true)
    setError(null)

    const options: Record<string, unknown> = {}
    if (captchaToken) options.captchaToken = captchaToken

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.reset(widgetIdRef.current) } catch {}
      }
      setCaptchaToken(null)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm bg-card border-border">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Check your inbox</h2>
            <p className="text-sm text-muted-foreground mb-6">
              We sent a link to <strong className="text-foreground">{email}</strong>
            </p>
            <p className="text-xs text-muted-foreground">Click the link in the email to continue. You can close this tab.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-card border-border">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <img src="/warm-logo.svg" alt="Warm AI" className="h-10 w-10 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground">Sign in to Warm AI</h2>
            <p className="text-sm text-muted-foreground mt-1">Get set up in under a minute</p>
          </div>

          {(message || error) && (
            <p className="text-sm text-center mb-4 text-amber-500">{error || message}</p>
          )}

          {/* Google — primary */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg border border-gray-300 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading && !showEmail ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-sm">Continue with Google</span>
              </>
            )}
          </button>

          {/* Email — secondary */}
          {!showEmail ? (
            <button
              onClick={() => setShowEmail(true)}
              className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
            >
              Or use email
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && email && sendMagicLink()}
                  autoFocus
                  className="text-sm"
                />
                <Button onClick={sendMagicLink} disabled={loading || !email} size="sm" className="px-4">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send link'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">We'll email you a sign-in link</p>
              <div ref={turnstileRef} />
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to use cases
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
