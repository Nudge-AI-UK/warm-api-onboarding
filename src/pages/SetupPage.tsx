import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { CheckCircle2, AlertCircle, Globe, Shield, BarChart3 } from 'lucide-react'

type ProgressStep = 'confirm' | 'validating' | 'creating' | 'signing-in' | 'redirecting' | 'done'

export default function SetupPage() {
  const [searchParams] = useSearchParams()
  const [progressStep, setProgressStep] = useState<ProgressStep>('confirm')
  const [error, setError] = useState<string | null>(null)
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null)
  const [showEmailInput, setShowEmailInput] = useState(!searchParams.get('email') || searchParams.get('email')!.trim() === '')
  const [emailInput, setEmailInput] = useState('')

  const email = searchParams.get('email')

  useEffect(() => {
    if (!confirmedEmail) return

    async function setupAccount() {
      try {
        setProgressStep('validating')
        await new Promise(resolve => setTimeout(resolve, 400))

        setProgressStep('creating')
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const response = await fetch(`${supabaseUrl}/functions/v1/prospect-setup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: confirmedEmail }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to create your account. Please contact support.')
          return
        }

        // Step 2: Sign in with the returned token
        setProgressStep('signing-in')
        await new Promise(resolve => setTimeout(resolve, 400))

        if (data.token_hash) {
          const { error: authError } = await supabase.auth.verifyOtp({
            token_hash: data.token_hash,
            type: 'magiclink'
          })

          if (authError) {
            setError('Failed to sign you in. Please try clicking the link in your email again.')
            return
          }
        }

        // Step 3: Redirect to visitor ID setup
        setProgressStep('redirecting')
        await new Promise(resolve => setTimeout(resolve, 800))

        setProgressStep('done')
        window.location.href = '/visitor-id'

      } catch (err) {
        console.error('Setup error:', err)
        setError('Something went wrong. Please try again or contact support.')
      }
    }

    setupAccount()
  }, [confirmedEmail])

  function handleContinueWithEmail() {
    if (!email) return
    setConfirmedEmail(email.trim())
  }

  function handleContinueWithNewEmail() {
    if (!isValidEmail) return
    setConfirmedEmail(emailInput.trim())
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)

  const steps = [
    { id: 'validating', label: 'Verifying your link' },
    { id: 'creating', label: 'Creating your account' },
    { id: 'signing-in', label: 'Signing you in' },
    { id: 'redirecting', label: 'Opening setup wizard' },
  ]

  const stepOrder: ProgressStep[] = ['validating', 'creating', 'signing-in', 'redirecting']
  const currentIndex = stepOrder.indexOf(progressStep)

  if (progressStep === 'confirm') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img
              src="https://muagykdazutcjpapkcer.supabase.co/storage/v1/object/public/Assets/Warm-Logo.png"
              alt="Warm AI"
              className="h-10 w-10"
            />
            <span className="text-xl font-semibold text-foreground">Warm AI</span>
          </div>

          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold text-foreground mb-2">Welcome to Warm AI</h1>
              {email && !showEmailInput && (
                <p className="text-sm text-muted-foreground">
                  You'll be setting up an account for{' '}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              )}
            </div>

            {showEmailInput ? (
              <div className="space-y-3">
                <div>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter your email address"
                    autoFocus
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  {emailInput && !isValidEmail && (
                    <p className="text-xs text-red-500 mt-1.5">Please enter a valid email address</p>
                  )}
                </div>
                <button
                  onClick={handleContinueWithNewEmail}
                  disabled={!isValidEmail}
                  className="w-full h-10 rounded-md bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleContinueWithEmail}
                  className="w-full h-10 rounded-md bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
                >
                  Continue
                </button>
                <div className="text-center">
                  <button
                    onClick={() => setShowEmailInput(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img
              src="https://muagykdazutcjpapkcer.supabase.co/storage/v1/object/public/Assets/Warm-Logo.png"
              alt="Warm AI"
              className="h-10 w-10"
            />
            <span className="text-xl font-semibold text-foreground">Warm AI</span>
          </div>

          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm text-center">
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <h1 className="text-lg font-semibold text-foreground mb-2">Setup Failed</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
            <a
              href="mailto:support@warmai.uk"
              className="inline-block mt-6 text-sm text-primary hover:underline"
            >
              Contact support
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img
            src="https://muagykdazutcjpapkcer.supabase.co/storage/v1/object/public/Assets/Warm-Logo.png"
            alt="Warm AI"
            className="h-10 w-10"
          />
          <span className="text-xl font-semibold text-foreground">Warm AI</span>
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-foreground mb-2">Setting up your account</h1>
            <p className="text-sm text-muted-foreground">
              {confirmedEmail && <>for <span className="font-medium text-foreground">{confirmedEmail}</span></>}
            </p>
          </div>

          {/* Progress steps */}
          <div className="space-y-3 mb-8">
            {steps.map((step, index) => {
              const isComplete = currentIndex > index || progressStep === 'done'
              const isActive = currentIndex === index && progressStep !== 'done'

              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isComplete
                      ? 'bg-green-500/10'
                      : isActive
                        ? 'bg-orange-500/10'
                        : 'bg-muted'
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : isActive ? (
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  <span className={`text-sm transition-colors duration-300 ${
                    isComplete
                      ? 'text-muted-foreground'
                      : isActive
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground/50'
                  }`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* What's coming next */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <Globe className="h-5 w-5 text-orange-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Track your website visitors</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <Shield className="h-5 w-5 text-orange-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Identify companies and people</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <BarChart3 className="h-5 w-5 text-orange-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Get detailed reports</p>
          </div>
        </div>
      </div>
    </div>
  )
}
