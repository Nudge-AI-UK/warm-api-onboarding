import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoginScreen } from '@/components/LoginScreen'
import SelectUseCasePage from './pages/SelectUseCasePage'
import SetupPage from './pages/SetupPage'
import IPIntelligencePage from './pages/IPIntelligencePage'
import EndpointSelectionPage from './pages/EndpointSelectionPage'
import EndpointPlaygroundPage from './pages/EndpointPlaygroundPage'
import VisitorIdPage from './pages/VisitorIdPage'
import MessagingPage from './pages/MessagingPage'
import FullPlatformPage from './pages/FullPlatformPage'
import { Loader2, LogOut, LayoutDashboard } from 'lucide-react'

function UserBadge() {
  const { user, signOut } = useAuth()
  if (!user) return null

  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || ''
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture
  const initial = (name[0] || user.email?.[0] || '?').toUpperCase()

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex items-center gap-2 bg-card border border-border rounded-full pl-1.5 pr-3 py-1 shadow-sm">
        {avatar ? (
          <img src={avatar} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
            {initial}
          </div>
        )}
        <span className="text-xs text-muted-foreground max-w-[140px] truncate">{user.email}</span>
        <a
          href="https://platform.warmai.uk"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Open Dashboard"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={signOut}
          className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, authError } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session) {
    return <LoginScreen message={authError} />
  }

  return (
    <>
      <UserBadge />
      {children}
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/" element={<SelectUseCasePage />} />
      <Route path="/ip-intelligence" element={<AuthGate><IPIntelligencePage /></AuthGate>} />
      <Route path="/ip-intelligence/endpoints" element={<AuthGate><EndpointSelectionPage /></AuthGate>} />
      <Route path="/ip-intelligence/:type" element={<AuthGate><EndpointPlaygroundPage /></AuthGate>} />
      <Route path="/visitor-id" element={<AuthGate><VisitorIdPage /></AuthGate>} />
      <Route path="/messaging" element={<AuthGate><MessagingPage /></AuthGate>} />
      <Route path="/full-platform" element={<AuthGate><FullPlatformPage /></AuthGate>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
