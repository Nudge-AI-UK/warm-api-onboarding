import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  CheckCircle2,
  Play,
  Copy,
  Loader2,
  Key,
  Zap,
  Layers,
  ChevronLeft,
  Check,
  AlertCircle
} from 'lucide-react'

const API_BASE = 'https://api.warmai.uk/functions/v1'
const STORAGE_KEY = 'warm-ip-onboarding-state'

interface WizardState {
  currentStep: number
  completedSteps: number[]
  accessKey: string | null
  apiKeyId: string | null
}

const defaultState: WizardState = {
  currentStep: 1,
  completedSteps: [],
  accessKey: null,
  apiKeyId: null
}

const steps = [
  {
    id: 1,
    title: 'Create API Key',
    description: 'Generate your API key to authenticate requests',
    icon: Key
  },
  {
    id: 2,
    title: 'Waterfall Lookup',
    description: 'Test IP lookup - returns first provider match',
    icon: Zap
  },
  {
    id: 3,
    title: 'Aggregate Lookup',
    description: 'Test IP lookup - combines multiple providers',
    icon: Layers
  }
]

function generateSecureKey(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export default function IPIntelligencePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [state, setState] = useState<WizardState>(defaultState)
  const [isInitialized, setIsInitialized] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'node' | 'python'>('curl')

  // Test IP input
  const [testIp, setTestIp] = useState('8.8.8.8')

  // Load state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setState(parsed)
      } catch (e) {
        console.error('Failed to parse saved state:', e)
      }
    }
    setIsInitialized(true)
  }, [])

  // Save state to localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  }, [state, isInitialized])

  const goToStep = (step: number) => {
    if (step <= Math.max(...state.completedSteps, 0) + 1) {
      setState(prev => ({ ...prev, currentStep: step }))
      setResponse(null)
      setError(null)
    }
  }

  const addCompletedStep = (steps: number[], step: number) => {
    if (!steps.includes(step)) {
      return [...steps, step]
    }
    return steps
  }

  const executeStep = async () => {
    setExecuting(true)
    setError(null)
    setResponse(null)

    try {
      let result: any

      switch (state.currentStep) {
        case 1: {
          // Create API Key
          // First get user profile
          const { data: userProfile, error: userErr } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', user?.id)
            .single()

          if (userErr || !userProfile) {
            throw new Error('User profile not found')
          }

          // Generate a secure access key
          const accessKey = `warm_${generateSecureKey(24)}`

          // Create API key
          const { data: apiKey, error: apiErr } = await supabase
            .from('api_keys')
            .insert({
              user_id: userProfile.id,
              name: 'IP Intelligence Key',
              key_prefix: accessKey.slice(0, 12),
              key_hash: await hashKey(accessKey),
              status: 'active',
              credits_balance: 100 // Trial credits
            })
            .select('id')
            .single()

          if (apiErr) throw apiErr

          result = {
            success: true,
            api_key_id: apiKey.id,
            access_key: accessKey,
            credits: 100
          }

          setState(prev => ({
            ...prev,
            accessKey: accessKey,
            apiKeyId: apiKey.id,
            completedSteps: addCompletedStep(prev.completedSteps, 1),
            currentStep: 2
          }))
          break
        }

        case 2: {
          // Waterfall lookup
          if (!state.accessKey) {
            throw new Error('API key not found. Complete step 1 first.')
          }

          const { data, error: fnError } = await supabase.functions.invoke('api-ip-lookup', {
            body: {
              ip_address: testIp,
              mode: 'waterfall'
            },
            headers: {
              'x-access-key': state.accessKey
            }
          })

          if (fnError) throw fnError
          result = data

          setState(prev => ({
            ...prev,
            completedSteps: addCompletedStep(prev.completedSteps, 2),
            currentStep: 3
          }))
          break
        }

        case 3: {
          // Aggregate lookup
          if (!state.accessKey) {
            throw new Error('API key not found. Complete step 1 first.')
          }

          const { data, error: fnError } = await supabase.functions.invoke('api-ip-lookup', {
            body: {
              ip_address: testIp,
              mode: 'aggregate'
            },
            headers: {
              'x-access-key': state.accessKey
            }
          })

          if (fnError) throw fnError
          result = data

          setState(prev => ({
            ...prev,
            completedSteps: addCompletedStep(prev.completedSteps, 3)
          }))
          break
        }
      }

      setResponse(result)
    } catch (err: any) {
      console.error('Step execution error:', err)
      setError(err.message || 'An error occurred')
    } finally {
      setExecuting(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'response' | 'code') => {
    await navigator.clipboard.writeText(text)
    if (type === 'response') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const getCodeExample = () => {
    const accessKey = state.accessKey || 'YOUR_API_KEY'
    const mode = state.currentStep === 2 ? 'waterfall' : 'aggregate'

    switch (codeLanguage) {
      case 'curl':
        return `curl -X POST "${API_BASE}/api-ip-lookup" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${accessKey}" \\
  -d '{
    "ip_address": "${testIp}",
    "mode": "${mode}"
  }'`
      case 'node':
        return `const response = await fetch('${API_BASE}/api-ip-lookup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-access-key': '${accessKey}'
  },
  body: JSON.stringify({
    ip_address: '${testIp}',
    mode: '${mode}'
  })
})

const data = await response.json()`
      case 'python':
        return `import requests

response = requests.post(
    '${API_BASE}/api-ip-lookup',
    headers={
        'Content-Type': 'application/json',
        'x-access-key': '${accessKey}'
    },
    json={
        'ip_address': '${testIp}',
        'mode': '${mode}'
    }
)

data = response.json()`
    }
  }

  const currentStepData = steps.find(s => s.id === state.currentStep)
  const isCompleted = state.completedSteps.includes(3)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-lg font-semibold text-foreground">IP Intelligence Setup</h1>
            </div>
            <div className="text-sm text-muted-foreground">
              {state.completedSteps.length} / 3 completed
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Step Progress Sidebar */}
          <div className="w-64 shrink-0">
            <div className="sticky top-8 space-y-2">
              {steps.map((step) => {
                const isComplete = state.completedSteps.includes(step.id)
                const isCurrent = state.currentStep === step.id
                const isClickable = step.id <= Math.max(...state.completedSteps, 0) + 1
                const Icon = step.icon

                return (
                  <button
                    key={step.id}
                    onClick={() => goToStep(step.id)}
                    disabled={!isClickable}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      isCurrent
                        ? 'bg-primary/10 border border-primary'
                        : isComplete
                        ? 'bg-green-500/10 border border-green-500/20'
                        : isClickable
                        ? 'bg-card border border-border hover:border-primary/50'
                        : 'bg-muted/50 border border-transparent opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isComplete
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {isComplete ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${
                          isCurrent ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {step.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Step {step.id}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {isCompleted ? (
              // Completion screen
              <Card className="bg-card border-border">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">You're all set!</h2>
                  <p className="text-muted-foreground mb-6">
                    Your IP Intelligence API is ready to use. You have 100 trial credits.
                  </p>

                  {state.accessKey && (
                    <div className="bg-muted rounded-lg p-4 mb-6 text-left">
                      <label className="text-xs text-muted-foreground block mb-1">Your API Key</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-mono text-foreground bg-background px-3 py-2 rounded border border-border">
                          {state.accessKey}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(state.accessKey!, 'code')}
                        >
                          {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => window.open('https://docs.warmai.uk/api/ip-lookup', '_blank')}
                    >
                      View Documentation
                    </Button>
                    <Button onClick={() => {
                      localStorage.removeItem(STORAGE_KEY)
                      setState(defaultState)
                    }}>
                      Start Over
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Step content
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  {/* Step Header */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-foreground">
                      {currentStepData?.title}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      {currentStepData?.description}
                    </p>
                  </div>

                  {/* Step 1: Create API Key */}
                  {state.currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm text-foreground">
                          We'll create an API key with <strong>100 free credits</strong> to test the IP Intelligence API.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 2 & 3: IP Lookup */}
                  {(state.currentStep === 2 || state.currentStep === 3) && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground block mb-2">
                          Test IP Address
                        </label>
                        <Input
                          value={testIp}
                          onChange={(e) => setTestIp(e.target.value)}
                          placeholder="Enter an IP address"
                          className="max-w-xs"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Try a corporate IP to see company data
                        </p>
                      </div>

                      {state.currentStep === 2 && (
                        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                          <p className="text-sm text-foreground">
                            <strong>Waterfall mode:</strong> Queries providers in order and returns the first match. Faster and cheaper.
                          </p>
                        </div>
                      )}

                      {state.currentStep === 3 && (
                        <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                          <p className="text-sm text-foreground">
                            <strong>Aggregate mode:</strong> Queries multiple providers and combines results for better accuracy.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Code Example */}
                  {(state.currentStep === 2 || state.currentStep === 3) && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex gap-1">
                          {(['curl', 'node', 'python'] as const).map((lang) => (
                            <button
                              key={lang}
                              onClick={() => setCodeLanguage(lang)}
                              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                codeLanguage === lang
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {lang === 'curl' ? 'cURL' : lang === 'node' ? 'Node.js' : 'Python'}
                            </button>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getCodeExample(), 'code')}
                        >
                          {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <pre className="bg-[#1a1a2e] rounded-lg p-4 overflow-x-auto">
                        <code className="text-sm text-gray-300 font-mono whitespace-pre">
                          {getCodeExample()}
                        </code>
                      </pre>
                    </div>
                  )}

                  {/* Error Display */}
                  {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Response Display */}
                  {response && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-400">Response</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(response, null, 2), 'response')}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <pre className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 overflow-x-auto">
                        <code className="text-sm text-green-300 font-mono whitespace-pre">
                          {JSON.stringify(response, null, 2)}
                        </code>
                      </pre>
                    </div>
                  )}

                  {/* Execute Button */}
                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={executeStep}
                      disabled={executing}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {executing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Run Step
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to hash API key
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
