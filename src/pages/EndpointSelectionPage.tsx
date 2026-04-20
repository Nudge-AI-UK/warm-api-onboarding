import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, Layers, ChevronRight, ChevronLeft, ExternalLink } from 'lucide-react'
import { navigateToPlatform } from '@/lib/navigateToPlatform'

const endpoints = [
  {
    id: 'waterfall',
    name: 'ip-to-company',
    title: 'Smart Waterfall Lookup',
    description: 'Checks free local databases first, then fans out to paid providers only when needed',
    details: [
      'Free DB filter: 6.7M IP records, 2.4M VPN IPs, 434K hosting ranges',
      'Multiple paid identification providers called in parallel',
      'VPN, hosting, and ISP traffic detected and filtered automatically',
      'Consensus scoring with confidence levels (confirmed / likely / unconfirmed)',
      'Only charges credits for business matches — junk traffic is free'
    ],
    icon: Zap,
    path: '/ip-intelligence/waterfall',
    credits: '5 credits per business match'
  },
  {
    id: 'aggregate',
    name: 'ip-to-best-fit',
    title: 'Aggregate Lookup',
    description: 'Combines data from multiple providers for best accuracy with individual and decision maker enrichment',
    details: [
      'Includes full Smart Waterfall company identification',
      'Finds individuals and decision makers at the identified company',
      'Supply your website and business description for contextual matching',
      'Best for: Critical lookups where data depth matters'
    ],
    icon: Layers,
    path: '/ip-intelligence/aggregate',
    credits: '8 credits per lookup'
  }
]

export default function EndpointSelectionPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="/warm-logo.svg" alt="Warm AI" className="h-8 w-8" />
                <span className="font-semibold text-foreground">Warm AI</span>
              </a>
              <div className="h-6 w-px bg-border" />
              <span className="text-muted-foreground">IP Intelligence</span>
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

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Choose an Endpoint
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We offer two IP lookup modes. Try them out in the playground to see which works best for your use case.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {endpoints.map((endpoint) => {
            const Icon = endpoint.icon
            return (
              <Card
                key={endpoint.id}
                className="bg-card border-border hover:border-primary transition-colors cursor-pointer"
                onClick={() => navigate(endpoint.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                      {endpoint.credits}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {endpoint.title}
                  </h3>
                  <code className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {endpoint.name}
                  </code>

                  <p className="text-muted-foreground text-sm mt-3 mb-4">
                    {endpoint.description}
                  </p>

                  <ul className="space-y-2 mb-6">
                    {endpoint.details.map((detail, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {detail}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center gap-1 text-primary text-sm font-medium">
                    Try it out
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Back link */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to use cases
          </Button>
        </div>
      </div>
    </div>
  )
}
