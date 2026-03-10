import { Routes, Route, Navigate } from 'react-router-dom'
import SelectUseCasePage from './pages/SelectUseCasePage'
import IPIntelligencePage from './pages/IPIntelligencePage'
import EndpointSelectionPage from './pages/EndpointSelectionPage'
import EndpointPlaygroundPage from './pages/EndpointPlaygroundPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SelectUseCasePage />} />
      <Route path="/ip-intelligence" element={<IPIntelligencePage />} />
      <Route path="/ip-intelligence/endpoints" element={<EndpointSelectionPage />} />
      <Route path="/ip-intelligence/:type" element={<EndpointPlaygroundPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
