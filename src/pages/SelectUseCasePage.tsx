import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Search, MessageSquare, Eye, Rocket, ChevronRight } from 'lucide-react'

const useCases = [
  {
    id: 'ip-intelligence',
    title: 'IP Intelligence',
    description: 'Look up company data from any IP address',
    details: 'Perfect for enriching your own visitor data or building IP-based tools',
    icon: Search,
    steps: 3,
    path: '/ip-intelligence',
    available: true
  },
  {
    id: 'messaging',
    title: 'Messaging Only',
    description: 'AI-powered LinkedIn outreach via API',
    details: 'Generate personalized messages and send via connected LinkedIn accounts',
    icon: MessageSquare,
    steps: 5,
    path: '/messaging',
    available: false
  },
  {
    id: 'visitor-id',
    title: 'Visitor Identification',
    description: 'Track and identify website visitors',
    details: 'Add tracking script, create ICPs, and identify companies visiting your site',
    icon: Eye,
    steps: 6,
    path: '/visitor-id',
    available: false
  },
  {
    id: 'full-platform',
    title: 'Full Platform',
    description: 'Everything combined',
    details: 'Complete setup: tracking, ICPs, products, messaging, and outreach',
    icon: Rocket,
    steps: 11,
    path: '/full-platform',
    available: false
  }
]

export default function SelectUseCasePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <span className="text-xl font-bold text-primary-foreground">W</span>
            </div>
            <span className="text-xl font-bold text-foreground">Warm AI</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mt-6">What do you want to build?</h1>
          <p className="text-muted-foreground mt-2">
            Choose your use case and we'll guide you through the setup
          </p>
        </div>
      </div>

      {/* Use Case Cards */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {useCases.map((useCase) => {
            const Icon = useCase.icon
            return (
              <Card
                key={useCase.id}
                className={`bg-card border-border transition-all cursor-pointer ${
                  useCase.available
                    ? 'hover:border-primary hover:shadow-lg'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                onClick={() => useCase.available && navigate(useCase.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    {!useCase.available && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {useCase.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    {useCase.description}
                  </p>
                  <p className="text-muted-foreground text-xs mb-4">
                    {useCase.details}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {useCase.steps} steps
                    </span>
                    {useCase.available && (
                      <div className="flex items-center gap-1 text-primary text-sm font-medium">
                        Get Started
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Trial Info */}
        <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-foreground">
            <span className="font-medium">Free to start:</span>{' '}
            All use cases include trial credits. No credit card required.
          </p>
        </div>
      </div>
    </div>
  )
}
