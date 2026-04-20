import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, MessageSquare, Eye, Rocket, ChevronRight, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const scopes = [
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
    steps: 11,
    path: '/messaging',
    available: true
  },
  {
    id: 'visitor-id',
    title: 'Visitor Identification',
    description: 'Track and identify website visitors',
    details: 'Add tracking script, create ICPs, and identify companies visiting your site',
    icon: Eye,
    steps: 11,
    path: '/visitor-id',
    available: true
  },
  {
    id: 'full-platform',
    title: 'Full Platform',
    description: 'Everything combined',
    details: 'Complete setup: tracking, ICPs, products, messaging, and outreach',
    icon: Rocket,
    steps: 13,
    path: '/full-platform',
    available: true
  }
]

export default function SelectUseCasePage() {
  const navigate = useNavigate()
  const { user, signOut, loading } = useAuth()

  // Redirect to login if not authenticated
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Sign in required</h2>
            <p className="text-muted-foreground mb-6">Please sign in to continue setting up your API.</p>
            <p className="text-xs text-muted-foreground">
              Go to <a href="https://platform.warmai.uk" className="text-primary hover:underline">platform.warmai.uk</a> to sign in.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <img
                src="/warm-logo.svg"
                alt="Warm AI"
                className="h-10 w-10"
              />
              <span className="text-xl font-bold text-foreground">Warm AI</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => { await signOut(); window.location.href = 'https://platform.warmai.uk' }}
                className="text-muted-foreground"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Wrong account?
              </Button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mt-6">What do you want to build?</h1>
          <p className="text-muted-foreground mt-2">
            Choose a scope and we'll guide you through the setup
          </p>
        </div>
      </div>

      {/* Scope Cards */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scopes.map((scope) => {
            const Icon = scope.icon
            return (
              <Card
                key={scope.id}
                className={`bg-card border-border transition-all cursor-pointer ${
                  scope.available
                    ? 'hover:border-primary hover:shadow-lg'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                onClick={() => scope.available && navigate(scope.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    {!scope.available && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {scope.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    {scope.description}
                  </p>
                  <p className="text-muted-foreground text-xs mb-4">
                    {scope.details}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {scope.steps} steps
                    </span>
                    {scope.available && (
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
            All scopes include trial credits. No credit card required.
          </p>
        </div>
      </div>
    </div>
  )
}
