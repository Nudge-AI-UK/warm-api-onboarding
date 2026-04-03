import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  CheckCircle2,
  Copy,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Check,
  Mail
} from 'lucide-react'

export default function IPIntelligencePage() {
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginSent, setLoginSent] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const hasCreated = useRef(false)

  // Send magic link for re-authentication
  const sendMagicLink = async () => {
    if (!loginEmail) return
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email: loginEmail })
    setLoginLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setLoginSent(true)
    }
  }

  // Create API key once auth is ready
  useEffect(() => {
    if (authLoading) return
    if (!session) {
      setShowLogin(true)
      setLoading(false)
      return
    }
    if (hasCreated.current) return
    hasCreated.current = true

    const createApiKey = async () => {
      try {
        // Refresh session to ensure JWT is valid
        const { data: refreshData } = await supabase.auth.refreshSession()
        if (!refreshData.session) {
          setShowLogin(true)
          setLoading(false)
          return
        }

        console.log('Calling api-key-create with refreshed session')
        const { data, error: fnError } = await supabase.functions.invoke('api-key-create', {
          body: {
            name: 'IP Intelligence Key',
            aggregate_identify: true
          }
        })

        if (fnError) {
          // fnError.context is a Response object in supabase-js v2
          let errorBody: string | null = null
          try {
            if (fnError.context) {
              errorBody = await fnError.context.text()
            }
          } catch {}
          console.error('Edge function error body:', errorBody)
          console.error('Edge function error:', fnError)
          throw new Error(errorBody || fnError.message || 'Edge function error')
        }
        if (!data?.success) throw new Error(data?.error || 'Failed to create API key')

        setApiKey(data.key)

        // Store in localStorage for the playground pages
        localStorage.setItem('warm-ip-api-key', data.key)
        localStorage.setItem('warm-ip-api-key-id', data.id)
      } catch (err: any) {
        console.error('Failed to create API key:', err)
        // If auth error, show login screen instead of generic error
        if (err.message?.includes('JWT') || err.message?.includes('401') || err.message?.includes('auth') || err.message?.includes('token')) {
          hasCreated.current = false
          setShowLogin(true)
        } else {
          setError(err.message || 'Failed to create API key')
        }
      } finally {
        setLoading(false)
      }
    }

    createApiKey()
  }, [authLoading, session])

  const copyToClipboard = async () => {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Creating your API key...</p>
        </div>
      </div>
    )
  }

  if (showLogin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            {loginSent ? (
              <>
                <h2 className="text-xl font-bold text-foreground mb-2">Check your email</h2>
                <p className="text-muted-foreground mb-6">
                  We've sent a sign-in link to <strong>{loginEmail}</strong>. Click the link to continue setting up your API key.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground mb-2">Sign in to continue</h2>
                <p className="text-muted-foreground mb-6">
                  Enter your email to receive a sign-in link. No password needed.
                </p>
                {error && (
                  <p className="text-sm text-red-500 mb-4">{error}</p>
                )}
                <div className="flex gap-2 mb-4">
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMagicLink()}
                  />
                  <Button onClick={sendMagicLink} disabled={loginLoading || !loginEmail}>
                    {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                  </Button>
                </div>
              </>
            )}
            <Button onClick={() => navigate('/')} variant="ghost" className="text-muted-foreground">
              Back to use cases
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => { setError(null); setShowLogin(true) }} variant="outline">
                Try signing in
              </Button>
              <Button onClick={() => navigate('/')} variant="ghost">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/warm-logo.svg" alt="Warm AI" className="h-8 w-8" />
            <span className="font-semibold text-foreground">Warm AI</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Card className="bg-card border-border">
          <CardContent className="p-8">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>

            <h1 className="text-2xl font-bold text-foreground text-center mb-2">
              Your API Key is Ready
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              Copy your API key now. For security, it won't be shown again.
            </p>

            {/* API Key Display */}
            <div className="bg-muted rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Your API Key</span>
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">Shown once only</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-foreground bg-background px-4 py-3 rounded border border-border break-all">
                  {apiKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-8">
              <p className="text-sm text-foreground">
                <strong>2,000 free credits (£20)</strong> have been added to your account.
                Use them to test the IP Intelligence API.
              </p>
            </div>

            {/* Continue Button */}
            <div className="flex justify-center">
              <Button
                onClick={() => navigate('/ip-intelligence/endpoints')}
                className="px-8"
              >
                Continue to API Documentation
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
