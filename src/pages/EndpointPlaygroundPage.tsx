import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Play,
  Copy,
  Loader2,
  ChevronLeft,
  Check,
  AlertCircle,
  Zap,
  Layers,
  ExternalLink
} from 'lucide-react'
import { navigateToPlatform } from '@/lib/navigateToPlatform'

const API_BASE = 'https://api.warmai.uk/functions/v1'

const endpointConfig = {
  waterfall: {
    name: 'ip-to-company',
    title: 'Smart Waterfall Lookup',
    description: 'Checks free local databases (6.7M+ IPs, VPN/hosting detection) first, then fans out to paid providers (RB2B, Albacross, ipapi.is, ipinfo.io). Only charges credits for business matches.',
    icon: Zap,
    credits: '5 credits per business match',
    endpoint: 'ip-to-company',
    color: 'blue'
  },
  aggregate: {
    name: 'ip-to-best-fit',
    title: 'Aggregate Lookup',
    description: 'Full Smart Waterfall company identification plus individual and decision maker enrichment.',
    icon: Layers,
    credits: '8 credits per lookup',
    endpoint: 'ip-to-best-fit',
    color: 'purple'
  }
}

type EndpointType = 'waterfall' | 'aggregate'

export default function EndpointPlaygroundPage() {
  const navigate = useNavigate()
  const { type } = useParams<{ type: string }>()
  const endpointType = (type as EndpointType) || 'waterfall'
  const config = endpointConfig[endpointType]
  const Icon = config.icon

  const [apiKeyId, setApiKeyId] = useState<string | null>(null)
  const [testIp, setTestIp] = useState('104.28.55.201')
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedResponse, setCopiedResponse] = useState(false)
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'node' | 'python'>('curl')

  // Aggregate optional parameters
  const [includeWebsite, setIncludeWebsite] = useState(false)
  const [includeDescription, setIncludeDescription] = useState(false)
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    // Load API key from sessionStorage (set during key creation)
    const storedKey = sessionStorage.getItem('warm-ip-api-key')
    if (storedKey) {
      setApiKeyId(storedKey)
    }
  }, [])

  const executeRequest = async () => {
    if (!apiKeyId) {
      setError('API key not found. Please create one first.')
      return
    }

    setExecuting(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch(`${API_BASE}/${config.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': apiKeyId
        },
        body: JSON.stringify(
          endpointType === 'waterfall'
            ? { ip: testIp }
            : {
                ip_address: testIp,
                ...(includeWebsite && website.trim() ? { website: website.trim() } : {}),
                ...(includeDescription && description.trim() ? { description: description.trim() } : {})
              }
        )
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`)
      }

      setResponse(data)
    } catch (err: any) {
      console.error('Request error:', err)
      setError(err.message || 'Request failed')
    } finally {
      setExecuting(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'code' | 'response') => {
    await navigator.clipboard.writeText(text)
    if (type === 'code') {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } else {
      setCopiedResponse(true)
      setTimeout(() => setCopiedResponse(false), 2000)
    }
  }

  const getCodeExample = () => {
    const keyId = apiKeyId || 'YOUR_API_KEY_ID'

    if (endpointType === 'aggregate') {
      const websiteLine = includeWebsite && website.trim() ? `,\n    "website": "${website.trim()}"` : ''
      const descriptionLine = includeDescription && description.trim() ? `,\n    "description": "${description.trim()}"` : ''
      const websiteNode = includeWebsite && website.trim() ? `,\n    website: '${website.trim()}'` : ''
      const descriptionNode = includeDescription && description.trim() ? `,\n    description: '${description.trim()}'` : ''
      const websitePython = includeWebsite && website.trim() ? `,\n        'website': '${website.trim()}'` : ''
      const descriptionPython = includeDescription && description.trim() ? `,\n        'description': '${description.trim()}'` : ''

      switch (codeLanguage) {
        case 'curl':
          return `curl -X POST "${API_BASE}/ip-to-best-fit" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${keyId}" \\
  -d '{
    "ip_address": "${testIp}"${websiteLine}${descriptionLine}
  }'`
        case 'node':
          return `const response = await fetch('${API_BASE}/ip-to-best-fit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-access-key': '${keyId}'
  },
  body: JSON.stringify({
    ip_address: '${testIp}'${websiteNode}${descriptionNode}
  })
})

const data = await response.json()
console.log(data)`
        case 'python':
          return `import requests

response = requests.post(
    '${API_BASE}/ip-to-best-fit',
    headers={
        'Content-Type': 'application/json',
        'x-access-key': '${keyId}'
    },
    json={
        'ip_address': '${testIp}'${websitePython}${descriptionPython}
    }
)

data = response.json()
print(data)`
      }
    } else {
      // Waterfall (ip-company)
      switch (codeLanguage) {
        case 'curl':
          return `curl -X POST "${API_BASE}/ip-to-company" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${keyId}" \\
  -d '{
    "ip": "${testIp}"
  }'`
        case 'node':
          return `const response = await fetch('${API_BASE}/ip-to-company', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-access-key': '${keyId}'
  },
  body: JSON.stringify({
    ip: '${testIp}'
  })
})

const data = await response.json()
console.log(data)
// { ip, identified, domain, company_name, confidence, confidence_level,
//   traffic_type, reason, matches[], cached }`
        case 'python':
          return `import requests

response = requests.post(
    '${API_BASE}/ip-to-company',
    headers={
        'Content-Type': 'application/json',
        'x-access-key': '${keyId}'
    },
    json={
        'ip': '${testIp}'
    }
)

data = response.json()
# { ip, identified, domain, company_name, confidence, confidence_level,
#   traffic_type, reason, matches[], cached }
print(data)`
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="/warm-logo.svg" alt="Warm AI" className="h-8 w-8" />
                <span className="font-semibold text-foreground">Warm AI</span>
              </a>
              <div className="h-6 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/ip-intelligence/endpoints')}
                className="text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Endpoints
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToPlatform()}
            >
              Go to Platform
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Endpoint Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            config.color === 'purple' ? 'bg-purple-500/10' : 'bg-blue-500/10'
          }`}>
            <Icon className={`h-7 w-7 ${
              config.color === 'purple' ? 'text-purple-500' : 'text-blue-500'
            }`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
            <code className="text-sm text-primary bg-primary/10 px-2 py-0.5 rounded">
              {config.name}
            </code>
            <p className="text-muted-foreground mt-2 max-w-xl">
              {config.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Panel */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Request</h2>

              {/* Test IP Input */}
              <div className="mb-6">
                <label className="text-sm font-medium text-foreground block mb-2">
                  IP Address
                </label>
                <Input
                  value={testIp}
                  onChange={(e) => setTestIp(e.target.value)}
                  placeholder="Enter an IP address"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pre-filled with a known business IP — hit Try It to see results
                </p>
              </div>

              {/* Optional Parameters (Aggregate only) */}
              {endpointType === 'aggregate' && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Optional Parameters</h3>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeWebsite}
                        onChange={(e) => setIncludeWebsite(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <code className="text-primary text-sm">website</code>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your website domain for contextual matching and enrichment.
                        </p>
                      </div>
                    </label>

                    {includeWebsite && (
                      <div className="pl-7">
                        <Input
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="example.com"
                        />
                      </div>
                    )}

                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeDescription}
                        onChange={(e) => setIncludeDescription(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <code className="text-primary text-sm">description</code>
                        <p className="text-xs text-muted-foreground mt-1">
                          A description of your business or use case for better result targeting.
                        </p>
                      </div>
                    </label>

                    {includeDescription && (
                      <div className="pl-7">
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="We sell B2B SaaS for marketing teams..."
                          rows={3}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Code Example */}
              <div className="mb-4">
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
                    {copiedCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="bg-[#1a1a2e] rounded-lg p-4 overflow-x-auto">
                  <code className="text-sm text-gray-300 font-mono whitespace-pre">
                    {getCodeExample()}
                  </code>
                </pre>
              </div>

              {/* Execute Button */}
              <Button
                onClick={executeRequest}
                disabled={executing}
                className="w-full"
              >
                {executing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Try It
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Response Panel */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Response</h2>
                {response && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(response, null, 2), 'response')}
                  >
                    {copiedResponse ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Error</p>
                    <p className="text-sm text-red-400/80">{error}</p>
                  </div>
                </div>
              )}

              {response && (
                <pre className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 overflow-x-auto max-h-[500px]">
                  <code className="text-sm text-black font-mono whitespace-pre">
                    {JSON.stringify(response, null, 2)}
                  </code>
                </pre>
              )}

              {!response && !error && (
                <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground text-sm">
                    Click "Try It" to see the response
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Credits Info */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Cost:</strong> {config.credits}
          </p>
        </div>
      </div>
    </div>
  )
}
