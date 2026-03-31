import { Routes, Route, Navigate } from 'react-router-dom'
import SelectUseCasePage from './pages/SelectUseCasePage'
import IPIntelligencePage from './pages/IPIntelligencePage'
import EndpointSelectionPage from './pages/EndpointSelectionPage'
import EndpointPlaygroundPage from './pages/EndpointPlaygroundPage'
import VisitorIdPage from './pages/VisitorIdPage'
import MessagingPage from './pages/MessagingPage'
import FullPlatformPage from './pages/FullPlatformPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SelectUseCasePage />} />
      <Route path="/ip-intelligence" element={<IPIntelligencePage />} />
      <Route path="/ip-intelligence/endpoints" element={<EndpointSelectionPage />} />
      <Route path="/ip-intelligence/:type" element={<EndpointPlaygroundPage />} />
      <Route path="/visitor-id" element={<VisitorIdPage />} />
      <Route path="/messaging" element={<MessagingPage />} />
      <Route path="/full-platform" element={<FullPlatformPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
