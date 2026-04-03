import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoginScreen } from '@/components/LoginScreen'
import SelectUseCasePage from './pages/SelectUseCasePage'
import IPIntelligencePage from './pages/IPIntelligencePage'
import EndpointSelectionPage from './pages/EndpointSelectionPage'
import EndpointPlaygroundPage from './pages/EndpointPlaygroundPage'
import VisitorIdPage from './pages/VisitorIdPage'
import MessagingPage from './pages/MessagingPage'
import FullPlatformPage from './pages/FullPlatformPage'
import { Loader2 } from 'lucide-react'

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

  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
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
