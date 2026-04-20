import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  CheckCircle2,
  Circle,
  Play,
  Copy,
  Loader2,
  Key,
  User,
  Users,
  Package,
  CheckSquare,
  List,
  Target,
  Globe,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Sparkles,
  Info,
  X,
  Webhook,
  Plus,
  Lock,
  Maximize2,
  Code,
  ExternalLink
} from 'lucide-react'

// Public API Base URL
const API_BASE = 'https://api.warmai.uk/functions/v1'

// Field limits for validation (matching warm-unified)
const FIELD_LIMITS = {
  title: { type: 'text' as const, limit: 100 },
  summary: { type: 'textarea' as const, limit: 300 },
  content: { type: 'textarea' as const, limit: 5000 },
  pain_points: { type: 'array' as const, limit: 8 },
  key_features: { type: 'array' as const, limit: 8 },
  target_titles: { type: 'array' as const, limit: 8 },
  target_industries: { type: 'array' as const, limit: 8 },
}

// ICP field limits (increased to accommodate AI-generated content)
const ICP_FIELD_LIMITS = {
  icp_name: { type: 'text' as const, limit: 100 },
  description: { type: 'textarea' as const, limit: 1500 },
  company_characteristics: { type: 'textarea' as const, limit: 1000 },
  company_size_range: { type: 'text' as const, limit: 200 },
  geographic_focus: { type: 'text' as const, limit: 500 },
  budget_range: { type: 'text' as const, limit: 500 },
  decision_making_process: { type: 'textarea' as const, limit: 1000 },
  sales_cycle_length: { type: 'text' as const, limit: 500 },
  // Array fields
  job_titles: { type: 'array' as const, limit: 10 },
  pain_points: { type: 'array' as const, limit: 10 },
  value_drivers: { type: 'array' as const, limit: 10 },
  industry_focus: { type: 'array' as const, limit: 10 },
  objections_and_concerns: { type: 'array' as const, limit: 10 },
  success_metrics: { type: 'array' as const, limit: 10 },
  preferred_communication_channels: { type: 'array' as const, limit: 8 },
  technology_stack: { type: 'array' as const, limit: 10 },
  competitive_alternatives: { type: 'array' as const, limit: 5 },
}

// Generated entry data from Step 4
interface GeneratedEntry {
  id: number
  title: string
  summary: string
  content: string
  knowledge_type: string
  workflow_status: string
}

// Editable form data for Step 5
interface EntryEditForm {
  title: string
  summary: string
  problem_text: string
  pain_points: string[]
  solution_text: string
  key_features: string[]
  target_buyer_text: string
  target_titles: string[]
  target_industries: string[]
}

// Editable form data for Step 8 (Approve ICP)
interface IcpEditForm {
  icp_name: string
  description: string
  job_titles: string[]
  pain_points: string[]
  value_drivers: string[]
  industry_focus: string[]
  company_characteristics: string
  company_size_range: string
  geographic_focus: string
  budget_range: string
  decision_making_process: string
  objections_and_concerns: string[]
  success_metrics: string[]
  sales_cycle_length: string
  preferred_communication_channels: string[]
  technology_stack: string[]
  competitive_alternatives: string[]
}

interface WizardState {
  currentStep: number
  completedSteps: number[]
  language: 'curl' | 'node' | 'python'
  apiKeyId: string | null
  accessKey: string | null
  connectToken: string | null
  userId: string | null
  productId: string | null
  generatedEntry: GeneratedEntry | null
  icpId: string | null
  websiteId: string | null
  trackingId: string | null
}

interface StepConfig {
  id: number
  title: string
  icon: React.ElementType
  description: string
  why: string
  method: 'POST' | 'GET' | 'FORM'
  endpoint: string
  outputField?: string
}

const STEPS: StepConfig[] = [
  {
    id: 1,
    title: 'Create API Key',
    icon: Key,
    description: 'Creates a new API key for authentication. This key will be used to authenticate all subsequent API calls.',
    why: 'All Warm AI API calls require an access key for authentication and to track usage against your account.',
    method: 'FORM', // Special case - uses form UI, not code
    endpoint: '/api-key-create',
    outputField: 'access_key'
  },
  {
    id: 2,
    title: 'Connect Users',
    icon: User,
    description: 'Use the Connect URL to link user accounts to your API key. Users authorize their LinkedIn account through this flow.',
    why: 'This establishes user connections with LinkedIn authorization, enabling personalized outreach on their behalf.',
    method: 'FORM', // Special case - shows Connect URL, not API code
    endpoint: '/connect',
    outputField: 'user_id'
  },
  {
    id: 3,
    title: 'List Users',
    icon: Users,
    description: 'Retrieves all users connected to your API key.',
    why: 'Use this to see who has connected their LinkedIn account to your integration.',
    method: 'GET',
    endpoint: '/user-list'
  },
  {
    id: 4,
    title: 'Add Product',
    icon: Package,
    description: 'Adds a product or service to your knowledge base by providing a URL. AI researches and generates content (~1 minute).',
    why: 'Your knowledge base forms the foundation of personalized outreach - the AI uses this information to craft relevant messages.',
    method: 'POST',
    endpoint: '/api-knowledge-action',
    outputField: 'entry_id'
  },
  {
    id: 5,
    title: 'Approve Entry',
    icon: CheckSquare,
    description: 'Review, edit, and approve the AI-generated content. Make any necessary changes before activating.',
    why: 'Approval ensures the AI uses accurate, verified information in your outreach messages.',
    method: 'POST',
    endpoint: '/api-knowledge-action'
  },
  {
    id: 6,
    title: 'List Products',
    icon: List,
    description: 'Retrieves all products in your knowledge base.',
    why: 'View your approved products and their status at any time.',
    method: 'POST',
    endpoint: '/api-knowledge-action'
  },
  {
    id: 7,
    title: 'Create ICP',
    icon: Target,
    description: 'Creates an Ideal Customer Profile linked to your product. AI generates targeting criteria (~1 minute).',
    why: 'ICPs help the AI understand who your ideal customers are, improving message relevance and conversion.',
    method: 'POST',
    endpoint: '/api-icp-action',
    outputField: 'icp_id'
  },
  {
    id: 8,
    title: 'Approve ICP',
    icon: CheckSquare,
    description: 'Review, edit, and approve the AI-generated ICP. Make any necessary changes before activating.',
    why: 'Approval ensures the AI uses accurate targeting criteria for your outreach campaigns.',
    method: 'POST',
    endpoint: '/api-icp-action'
  },
  {
    id: 9,
    title: 'List ICPs',
    icon: List,
    description: 'Retrieves all your Ideal Customer Profiles.',
    why: 'Manage and review your targeting criteria for different customer segments.',
    method: 'POST',
    endpoint: '/api-icp-action'
  },
  {
    id: 10,
    title: 'Create Website',
    icon: Globe,
    description: 'Registers a website for visitor identification. Returns a tracking script ID to embed on your site.',
    why: 'Website tracking identifies anonymous visitors, enabling personalized outreach to warm leads.',
    method: 'POST',
    endpoint: '/api-website-action',
    outputField: 'website_id'
  },
  {
    id: 11,
    title: 'List Websites',
    icon: List,
    description: 'Retrieves all registered websites and their tracking configurations.',
    why: 'Manage your tracked domains and view their configuration.',
    method: 'POST',
    endpoint: '/api-website-action'
  }
]

const STORAGE_KEY = 'warm-ai-wizard-state'

const defaultState: WizardState = {
  currentStep: 1,
  completedSteps: [],
  language: 'curl',
  apiKeyId: null,
  accessKey: null,
  connectToken: null,
  userId: null,
  productId: null,
  generatedEntry: null,
  icpId: null,
  websiteId: null,
  trackingId: null
}

// Parse markdown content into structured form data
function parseMarkdownToForm(content: string): Partial<EntryEditForm> {
  const result: Partial<EntryEditForm> = {
    problem_text: '',
    pain_points: [],
    solution_text: '',
    key_features: [],
    target_buyer_text: '',
    target_titles: [],
    target_industries: [],
  }

  if (!content) return result

  // Helper to clean text
  const cleanText = (text: string): string => {
    return text
      .replace(/^#+\s*/gm, '')
      .replace(/\*\*[^*]+\*\*:?/g, '')
      .replace(/^\s*[-•*]\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Helper to extract list items
  const extractListItems = (text: string): string[] => {
    if (text.includes('•') || text.includes('·')) {
      return text
        .split(/[•·]/)
        .map(item => item.replace(/^[-*]\s*/, '').replace(/\*\*/g, '').trim())
        .filter(item => item.length > 0 && !item.startsWith('#'))
    }
    return text
      .split(/\n/)
      .map(line => line.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim())
      .filter(line => line.length > 0 && !line.startsWith('#'))
  }

  // Helper to extract text before first subsection
  const extractTextBeforeList = (text: string): string => {
    const patterns = [/###/, /\*\*[^*]+\*\*:/, /^[-•*]\s/m]
    let firstIndex = text.length

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match.index !== undefined && match.index < firstIndex) {
        firstIndex = match.index
      }
    }

    return cleanText(text.slice(0, firstIndex))
  }

  // Split content by ## headers
  const sections = content.split(/(?=##\s+[^#])/)

  for (const section of sections) {
    const headerMatch = section.match(/^##\s+(.+?)[\n\r]/)
    if (!headerMatch) continue

    const header = headerMatch[1].toLowerCase().trim()
    const sectionContent = section.slice(headerMatch[0].length).trim()

    // Problem Solved section
    if (header.includes('problem')) {
      const painPointsMatch = sectionContent.match(/(###\s*Pain\s*Points:?\s*|\*\*Pain\s*Points:?\*\*\s*)/i)
      if (painPointsMatch && painPointsMatch.index !== undefined) {
        result.problem_text = extractTextBeforeList(sectionContent.slice(0, painPointsMatch.index))
        result.pain_points = extractListItems(sectionContent.slice(painPointsMatch.index + painPointsMatch[0].length))
      } else {
        const listMatch = sectionContent.match(/^[-•*]\s/m)
        if (listMatch && listMatch.index !== undefined) {
          result.problem_text = extractTextBeforeList(sectionContent.slice(0, listMatch.index))
          result.pain_points = extractListItems(sectionContent.slice(listMatch.index))
        } else {
          result.problem_text = cleanText(sectionContent)
        }
      }
    }

    // Solution section
    if (header.includes('solution') && !header.includes('problem')) {
      const keyFeaturesMatch = sectionContent.match(/(###\s*(Key\s*)?Features:?\s*|\*\*(Key\s*)?Features:?\*\*\s*)/i)
      if (keyFeaturesMatch && keyFeaturesMatch.index !== undefined) {
        result.solution_text = extractTextBeforeList(sectionContent.slice(0, keyFeaturesMatch.index))
        result.key_features = extractListItems(sectionContent.slice(keyFeaturesMatch.index + keyFeaturesMatch[0].length))
      } else {
        const listMatch = sectionContent.match(/^[-•*]\s/m)
        if (listMatch && listMatch.index !== undefined) {
          result.solution_text = extractTextBeforeList(sectionContent.slice(0, listMatch.index))
          result.key_features = extractListItems(sectionContent.slice(listMatch.index))
        } else {
          result.solution_text = cleanText(sectionContent)
        }
      }
    }

    // Target Buyer section
    if (header.includes('target') || header.includes('buyer') || header.includes('audience')) {
      const titlesMatch = sectionContent.match(/(###\s*(Ideal\s*)?Titles:?\s*|\*\*(Ideal\s*)?(Job\s*)?Titles:?\*\*\s*)/i)
      const industriesMatch = sectionContent.match(/(###\s*(Target\s*)?Industries:?\s*|\*\*(Target\s*)?Industries:?\*\*\s*)/i)

      let buyerTextEndIndex = sectionContent.length
      if (titlesMatch?.index !== undefined) buyerTextEndIndex = Math.min(buyerTextEndIndex, titlesMatch.index)
      if (industriesMatch?.index !== undefined) buyerTextEndIndex = Math.min(buyerTextEndIndex, industriesMatch.index)

      result.target_buyer_text = extractTextBeforeList(sectionContent.slice(0, buyerTextEndIndex))

      if (titlesMatch && titlesMatch.index !== undefined) {
        const startIdx = titlesMatch.index + titlesMatch[0].length
        let endIdx = sectionContent.length
        if (industriesMatch?.index !== undefined && industriesMatch.index > titlesMatch.index) {
          endIdx = industriesMatch.index
        }
        result.target_titles = extractListItems(sectionContent.slice(startIdx, endIdx))
      }

      if (industriesMatch && industriesMatch.index !== undefined) {
        const startIdx = industriesMatch.index + industriesMatch[0].length
        result.target_industries = extractListItems(sectionContent.slice(startIdx))
      }
    }

    // Key Features as standalone section
    if (header.includes('key features') || header.includes('features')) {
      if (result.key_features?.length === 0) {
        result.key_features = extractListItems(sectionContent)
      }
    }
  }

  return result
}

// Reconstruct markdown from form data
function formToMarkdown(form: Partial<EntryEditForm>): string {
  const sections: string[] = []

  if (form.problem_text || (form.pain_points && form.pain_points.length > 0)) {
    let section = '## Problem Solved\n'
    if (form.problem_text) section += form.problem_text + '\n\n'
    if (form.pain_points && form.pain_points.length > 0) {
      section += '### Pain Points:\n'
      section += form.pain_points.map(p => `- ${p}`).join('\n')
    }
    sections.push(section)
  }

  if (form.solution_text || (form.key_features && form.key_features.length > 0)) {
    let section = '## Solution\n'
    if (form.solution_text) section += form.solution_text + '\n\n'
    if (form.key_features && form.key_features.length > 0) {
      section += '### Key Features:\n'
      section += form.key_features.map(f => `- ${f}`).join('\n')
    }
    sections.push(section)
  }

  if (form.target_buyer_text || (form.target_titles && form.target_titles.length > 0) || (form.target_industries && form.target_industries.length > 0)) {
    let section = '## Target Buyer\n'
    if (form.target_buyer_text) section += form.target_buyer_text + '\n\n'
    if (form.target_titles && form.target_titles.length > 0) {
      section += '### Ideal Titles:\n'
      section += form.target_titles.map(t => `- ${t}`).join('\n') + '\n\n'
    }
    if (form.target_industries && form.target_industries.length > 0) {
      section += '### Industries:\n'
      section += form.target_industries.map(i => `- ${i}`).join('\n')
    }
    sections.push(section)
  }

  return sections.join('\n\n')
}

function generateWebhookSecret(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export default function VisitorIdPage() {
  const { user } = useAuth()
  const [state, setState] = useState<WizardState>(defaultState)
  const [isInitialized, setIsInitialized] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [stepResponses, setStepResponses] = useState<Record<number, any>>({})
  const [expandedResponse, setExpandedResponse] = useState<any>(null)
  const [copiedResponse, setCopiedResponse] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [showCongrats, setShowCongrats] = useState(false)
  const [showIntegrationHelp, setShowIntegrationHelp] = useState(false)
  const [integrationMethod, setIntegrationMethod] = useState<'direct' | 'gtm'>('direct')
  const [copiedTrackingId, setCopiedTrackingId] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Existing API keys (fetched on mount)
  const [existingKeys, setExistingKeys] = useState<any[]>([])
  const [loadingExistingKeys, setLoadingExistingKeys] = useState(true)
  const [showCreateNew, setShowCreateNew] = useState(false)

  // Step 1: API Key Form State (matching the modal)
  const [keyName, setKeyName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [allowAppAccess, setAllowAppAccess] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>([])
  const [newOrigin, setNewOrigin] = useState('')
  const [originError, setOriginError] = useState<string | null>(null)

  // Step 2: Connect URL optional parameters
  const [includeEmail, setIncludeEmail] = useState(true) // Enabled by default
  const [includeSuccessUrl, setIncludeSuccessUrl] = useState(false)
  const [includeFailureUrl, setIncludeFailureUrl] = useState(false)
  const [successUrl, setSuccessUrl] = useState('')
  const [failureUrl, setFailureUrl] = useState('')

  // Step 4: Knowledge type selection
  const [knowledgeType, setKnowledgeType] = useState<'product' | 'service'>('product')

  // Step 6: List Products optional filter
  const [includeUserIdFilter, setIncludeUserIdFilter] = useState(false)

  // Step 9: List ICPs optional filter
  const [includeIcpUserIdFilter, setIncludeIcpUserIdFilter] = useState(false)

  // Step 10: Create Website options
  const [websiteName, setWebsiteName] = useState('')
  const [linkIcpToWebsite, setLinkIcpToWebsite] = useState(true) // Enabled by default if ICP exists

  // Step 5: Entry edit form
  const emptyForm: EntryEditForm = {
    title: '',
    summary: '',
    problem_text: '',
    pain_points: [],
    solution_text: '',
    key_features: [],
    target_buyer_text: '',
    target_titles: [],
    target_industries: [],
  }
  const [entryEditForm, setEntryEditForm] = useState<EntryEditForm>(emptyForm)
  const [originalEntryForm, setOriginalEntryForm] = useState<EntryEditForm>(emptyForm)
  const [newPainPoint, setNewPainPoint] = useState('')
  const [newKeyFeature, setNewKeyFeature] = useState('')
  const [newTargetTitle, setNewTargetTitle] = useState('')
  const [newTargetIndustry, setNewTargetIndustry] = useState('')

  // Step 8: ICP edit form
  const emptyIcpForm: IcpEditForm = {
    icp_name: '',
    description: '',
    job_titles: [],
    pain_points: [],
    value_drivers: [],
    industry_focus: [],
    company_characteristics: '',
    company_size_range: '',
    geographic_focus: '',
    budget_range: '',
    decision_making_process: '',
    objections_and_concerns: [],
    success_metrics: [],
    sales_cycle_length: '',
    preferred_communication_channels: [],
    technology_stack: [],
    competitive_alternatives: [],
  }
  const [icpEditForm, setIcpEditForm] = useState<IcpEditForm>(emptyIcpForm)
  const [originalIcpForm, setOriginalIcpForm] = useState<IcpEditForm>(emptyIcpForm)
  const [newIcpJobTitle, setNewIcpJobTitle] = useState('')
  const [newIcpPainPoint, setNewIcpPainPoint] = useState('')
  const [newIcpValueDriver, setNewIcpValueDriver] = useState('')
  const [newIcpIndustry, setNewIcpIndustry] = useState('')
    const [fetchingIcp, setFetchingIcp] = useState(false)
  const [fetchIcpError, setFetchIcpError] = useState<string | null>(null)

  // Other step inputs
  const [productUrl, setProductUrl] = useState('https://example.com/product')
  const [icpTitle, setIcpTitle] = useState('')
  const [icpDescription, setIcpDescription] = useState('')
  const [icpJobTitles, setIcpJobTitles] = useState('')
  const [icpPainPoints, setIcpPainPoints] = useState('')
  const [icpValueDrivers, setIcpValueDrivers] = useState('')
  const [icpIndustryFocus, setIcpIndustryFocus] = useState('')
  const [icpCompanyCharacteristics, setIcpCompanyCharacteristics] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('https://mysite.com')

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setState({ ...defaultState, ...parsed })
      } catch (e) {
        console.error('Failed to parse wizard state:', e)
      }
    }
    // Mark as initialized after loading (even if nothing was saved)
    setIsInitialized(true)
  }, [])

  // Save state to localStorage on change (only after initial load)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  }, [state, isInitialized])

  // Check for existing API keys on mount
  useEffect(() => {
    const fetchExistingKeys = async () => {
      if (!user) {
        setLoadingExistingKeys(false)
        return
      }

      try {
        // Look up users table ID from auth user ID
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (!profile) {
          setLoadingExistingKeys(false)
          return
        }

        const { data, error } = await supabase
          .from('api_keys')
          .select('id, name, org_name, key_prefix, connect_token, status, created_at')
          .eq('user_id', profile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          setExistingKeys(data)
        }
      } catch (e) {
        console.log('Failed to fetch existing keys:', e)
      }
      setLoadingExistingKeys(false)
    }

    if (isInitialized) {
      fetchExistingKeys()
    }
  }, [isInitialized, user])

  // Check for existing users when access key exists but step 2 not completed
  useEffect(() => {
    const checkExistingUsers = async () => {
      if (!isInitialized || !state.accessKey || state.completedSteps.includes(2)) {
        return
      }

      try {
        const { data, error } = await supabase.functions.invoke('user-list', {
          headers: { 'x-access-key': state.accessKey || '' }
        })

        if (!error && data?.data?.length > 0) {
          // Users exist - auto-complete step 2 and store first user ID
          const completedSteps = new Set(state.completedSteps)
          completedSteps.add(2)

          setState(prev => ({
            ...prev,
            userId: data.data[0]?.id || prev.userId,
            completedSteps: Array.from(completedSteps)
          }))
        }
      } catch (e) {
        // Silently fail - user can still proceed manually
        console.log('Auto-check for users failed:', e)
      }
    }

    checkExistingUsers()
  }, [isInitialized, state.accessKey])

  const currentStepConfig = STEPS.find(s => s.id === state.currentStep)!

  // Helper to add step to completedSteps without duplicates
  const addCompletedStep = (steps: number[], step: number): number[] => {
    return steps.includes(step) ? steps : [...steps, step]
  }

  // Origin validation
  function validateOrigin(origin: string): boolean {
    let cleanOrigin = origin.toLowerCase().trim()
    cleanOrigin = cleanOrigin.replace(/^https?:\/\//, '')
    cleanOrigin = cleanOrigin.replace(/\/.*$/, '')

    if (
      cleanOrigin === 'localhost' ||
      cleanOrigin.startsWith('localhost:') ||
      cleanOrigin === '127.0.0.1' ||
      cleanOrigin.startsWith('127.0.0.1:')
    ) {
      setOriginError('Localhost is not allowed')
      return false
    }

    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/
    if (!domainRegex.test(cleanOrigin.split(':')[0])) {
      setOriginError('Invalid domain format')
      return false
    }

    return true
  }

  function addOrigin() {
    if (allowedOrigins.length >= 5) {
      setOriginError('Maximum 5 origins allowed')
      return
    }

    let cleanOrigin = newOrigin.toLowerCase().trim()
    cleanOrigin = cleanOrigin.replace(/^https?:\/\//, '')
    cleanOrigin = cleanOrigin.replace(/\/.*$/, '')

    if (!cleanOrigin) return

    if (!validateOrigin(cleanOrigin)) return

    if (allowedOrigins.includes(cleanOrigin)) {
      setOriginError('Origin already added')
      return
    }

    setAllowedOrigins([...allowedOrigins, cleanOrigin])
    setNewOrigin('')
    setOriginError(null)
  }

  function removeOrigin(origin: string) {
    setAllowedOrigins(allowedOrigins.filter(o => o !== origin))
  }

  const generateCodeExample = (step: StepConfig): { curl: string; node: string; python: string } => {
    const accessKey = state.accessKey || 'YOUR_ACCESS_KEY'
    const userId = state.userId || 'YOUR_USER_ID'
    const productId = state.productId || 'PRODUCT_ID'

    switch (step.id) {
      case 1:
        // Step 1 doesn't show code - it's a form
        return { curl: '', node: '', python: '' }

      case 2:
        // Step 2 doesn't show code - it uses the Connect URL flow
        return { curl: '', node: '', python: '' }

      case 3:
        return {
          curl: `curl -X GET "${API_BASE}/user-list" \\
  -H "x-access-key: ${accessKey}"`,
          node: `const response = await fetch("${API_BASE}/user-list", {
  headers: { "x-access-key": "${accessKey}" }
});
const data = await response.json();
console.log(data.data); // Array of connected users`,
          python: `import requests

response = requests.get(
    "${API_BASE}/user-list",
    headers={"x-access-key": "${accessKey}"}
)
data = response.json()
print(data["data"])  # Array of connected users`
        }

      case 4:
        return {
          curl: `curl -X POST "${API_BASE}/api-knowledge-action" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${accessKey}" \\
  -H "x-idempotency-key: $(uuidgen)" \\
  -H "x-user-id: ${userId}" \\
  -d '{
    "action": "add_entry",
    "knowledge_type": "${knowledgeType}",
    "data": { "product_url": "${productUrl}" }
  }'`,
          node: `const response = await fetch("${API_BASE}/api-knowledge-action", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-access-key": "${accessKey}",
    "x-idempotency-key": crypto.randomUUID(),
    "x-user-id": "${userId}"
  },
  body: JSON.stringify({
    action: "add_entry",
    knowledge_type: "${knowledgeType}",
    data: { product_url: "${productUrl}" }
  })
});
const data = await response.json();
console.log(data.data?.entry_id);`,
          python: `import requests
import uuid

response = requests.post(
    "${API_BASE}/api-knowledge-action",
    headers={
        "Content-Type": "application/json",
        "x-access-key": "${accessKey}",
        "x-idempotency-key": str(uuid.uuid4()),
        "x-user-id": "${userId}"
    },
    json={
        "action": "add_entry",
        "knowledge_type": "${knowledgeType}",
        "data": {"product_url": "${productUrl}"}
    }
)
data = response.json()
print(data)`
        }

      case 5:
        return {
          curl: `curl -X POST "${API_BASE}/api-knowledge-action" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${accessKey}" \\
  -H "x-idempotency-key: $(uuidgen)" \\
  -H "x-user-id: ${userId}" \\
  -d '{
    "action": "approve_entry",
    "data": {
      "entry_id": "${productId}",
      "title": "Updated Title",
      "summary": "Updated summary",
      "content": "## Updated Content..."
    }
  }'`,
          node: `const response = await fetch("${API_BASE}/api-knowledge-action", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-access-key": "${accessKey}",
    "x-idempotency-key": crypto.randomUUID(),
    "x-user-id": "${userId}"
  },
  body: JSON.stringify({
    action: "approve_entry",
    data: {
      entry_id: "${productId}",
      title: "Updated Title",     // optional
      summary: "Updated summary", // optional
      content: "## Content..."    // optional
    }
  })
});
console.log("Entry approved!");`,
          python: `import requests
import uuid

response = requests.post(
    "${API_BASE}/api-knowledge-action",
    headers={
        "Content-Type": "application/json",
        "x-access-key": "${accessKey}",
        "x-idempotency-key": str(uuid.uuid4()),
        "x-user-id": "${userId}"
    },
    json={
        "action": "approve_entry",
        "data": {
            "entry_id": "${productId}",
            "title": "Updated Title",     # optional
            "summary": "Updated summary", # optional
            "content": "## Content..."    # optional
        }
    }
)
print("Entry approved!")`
        }

      case 6: {
        const listBody = includeUserIdFilter && userId
          ? `{"action": "list_entries", "user_id": "${userId}"}`
          : `{"action": "list_entries"}`
        const listBodyNode = includeUserIdFilter && userId
          ? `{ action: "list_entries", user_id: "${userId}" }`
          : `{ action: "list_entries" }`
        const listBodyPython = includeUserIdFilter && userId
          ? `{"action": "list_entries", "user_id": "${userId}"}`
          : `{"action": "list_entries"}`
        return {
          curl: `curl -X POST "${API_BASE}/api-knowledge-action" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${accessKey}" \\
  -d '${listBody}'`,
          node: `const response = await fetch("${API_BASE}/api-knowledge-action", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-access-key": "${accessKey}"
  },
  body: JSON.stringify(${listBodyNode})
});
const data = await response.json();
console.log(data.data); // Array of products`,
          python: `import requests

response = requests.post(
    "${API_BASE}/api-knowledge-action",
    headers={
        "Content-Type": "application/json",
        "x-access-key": "${accessKey}"
    },
    json=${listBodyPython}
)
data = response.json()
print(data["data"])  # Array of products`
        }
      }

      case 7: {
        const productId = state.productId || 'PRODUCT_ID'
        // Use actual values or FILL_WITH_AI placeholder
        const name = icpTitle.trim() || '[FILL_WITH_AI]'
        const desc = icpDescription.trim() || '[FILL_WITH_AI]'

        // Helper to format array fields
        const formatArray = (val: string) => {
          if (!val.trim()) return '["[FILL_WITH_AI]"]'
          const items = val.split(',').map(s => `"${s.trim()}"`).join(', ')
          return `[${items}]`
        }

        const jobTitles = formatArray(icpJobTitles)
        const painPoints = formatArray(icpPainPoints)
        const valueDrivers = formatArray(icpValueDrivers)
        const industryFocus = formatArray(icpIndustryFocus)
        const companyChars = icpCompanyCharacteristics.trim() || '[FILL_WITH_AI]'

        return {
          curl: `curl -X POST "${API_BASE}/api-icp-action" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${accessKey}" \\
  -H "x-idempotency-key: $(uuidgen)" \\
  -H "x-user-id: ${userId}" \\
  -d '{
    "action": "create_icp",
    "product_id": "${productId}",
    "name": "${name}",
    "description": "${desc}",
    "job_titles": ${jobTitles},
    "pain_points": ${painPoints},
    "value_drivers": ${valueDrivers},
    "industry_focus": ${industryFocus},
    "company_characteristics": "${companyChars}"
  }'`,
          node: `const response = await fetch("${API_BASE}/api-icp-action", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-access-key": "${accessKey}",
    "x-idempotency-key": crypto.randomUUID(),
    "x-user-id": "${userId}"
  },
  body: JSON.stringify({
    action: "create_icp",
    product_id: "${productId}",
    name: "${name}",
    description: "${desc}",
    job_titles: ${jobTitles},
    pain_points: ${painPoints},
    value_drivers: ${valueDrivers},
    industry_focus: ${industryFocus},
    company_characteristics: "${companyChars}"
  })
});
const data = await response.json();
console.log(data.data.icp_id);`,
          python: `import requests
import uuid

response = requests.post(
    "${API_BASE}/api-icp-action",
    headers={
        "Content-Type": "application/json",
        "x-access-key": "${accessKey}",
        "x-idempotency-key": str(uuid.uuid4()),
        "x-user-id": "${userId}"
    },
    json={
        "action": "create_icp",
        "product_id": "${productId}",
        "name": "${name}",
        "description": "${desc}",
        "job_titles": ${jobTitles},
        "pain_points": ${painPoints},
        "value_drivers": ${valueDrivers},
        "industry_focus": ${industryFocus},
        "company_characteristics": "${companyChars}"
    }
)
data = response.json()
print(data["data"]["icp_id"])`
        }
      }

      case 8:
        // Step 8 uses generateStep8Code() - this is a fallback
        return generateStep8Code()

      case 9: {
        const listIcpBody = includeIcpUserIdFilter && userId
          ? `{"action":"list_icps","user_id":"${userId}"}`
          : `{"action":"list_icps"}`
        const listIcpBodyNode = includeIcpUserIdFilter && userId
          ? `{ action: "list_icps", user_id: "${userId}" }`
          : `{ action: "list_icps" }`
        const listIcpBodyPython = includeIcpUserIdFilter && userId
          ? `{"action": "list_icps", "user_id": "${userId}"}`
          : `{"action": "list_icps"}`
        return {
          curl: `curl -X POST "${API_BASE}/api-icp-action" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${accessKey}" \\
  -H "x-idempotency-key: $(uuidgen)" \\
  -H "x-user-id: ${userId}" \\
  -d '${listIcpBody}'`,
          node: `const response = await fetch("${API_BASE}/api-icp-action", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-access-key": "${accessKey}",
    "x-idempotency-key": crypto.randomUUID(),
    "x-user-id": "${userId}"
  },
  body: JSON.stringify(${listIcpBodyNode})
});
const icps = await response.json();
console.log(icps);`,
          python: `import requests
import uuid

response = requests.post(
    "${API_BASE}/api-icp-action",
    headers={
        "Content-Type": "application/json",
        "x-access-key": "${accessKey}",
        "x-idempotency-key": str(uuid.uuid4()),
        "x-user-id": "${userId}"
    },
    json=${listIcpBodyPython}
)
icps = response.json()
print(icps)`
        }
      }

      case 10: {
        const websiteDomain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
        const hasCustomName = websiteName.trim().length > 0
        const nameLine = hasCustomName ? `,\n    "name": "${websiteName.trim()}"` : ''
        const nameNode = hasCustomName ? `,\n    name: "${websiteName.trim()}"` : ''
        const namePython = hasCustomName ? `,\n        "name": "${websiteName.trim()}"` : ''
        const icpIdsLine = linkIcpToWebsite && state.icpId ? `,\n    "icp_ids": [${state.icpId}]` : ''
        const icpIdsNode = linkIcpToWebsite && state.icpId ? `,\n    icp_ids: [${state.icpId}]` : ''
        const icpIdsPython = linkIcpToWebsite && state.icpId ? `,\n        "icp_ids": [${state.icpId}]` : ''
        return {
          curl: `curl -X POST "${API_BASE}/api-website-action" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${accessKey}" \\
  -H "x-idempotency-key: $(uuidgen)" \\
  -H "x-user-id: ${state.userId || 'YOUR_USER_ID'}" \\
  -d '{
    "action": "create_website",
    "domain": "${websiteDomain}"${nameLine}${icpIdsLine}
  }'`,
          node: `const response = await fetch("${API_BASE}/api-website-action", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-access-key": "${accessKey}",
    "x-idempotency-key": crypto.randomUUID(),
    "x-user-id": "${state.userId || 'YOUR_USER_ID'}"
  },
  body: JSON.stringify({
    action: "create_website",
    domain: "${websiteDomain}"${nameNode}${icpIdsNode}
  })
});
const data = await response.json();
console.log(data.website.id, data.website.tracking_id);`,
          python: `import requests
import uuid

response = requests.post(
    "${API_BASE}/api-website-action",
    headers={
        "Content-Type": "application/json",
        "x-access-key": "${accessKey}",
        "x-idempotency-key": str(uuid.uuid4()),
        "x-user-id": "${state.userId || 'YOUR_USER_ID'}"
    },
    json={
        "action": "create_website",
        "domain": "${websiteDomain}"${namePython}${icpIdsPython}
    }
)
data = response.json()
print(data["website"]["id"], data["website"]["tracking_id"])`
        }
      }

      case 11: {
        return {
          curl: `curl -X POST "${API_BASE}/api-website-action" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${accessKey}" \\
  -H "x-idempotency-key: $(uuidgen)" \\
  -H "x-user-id: ${state.userId || 'YOUR_USER_ID'}" \\
  -d '{ "action": "list_websites" }'`,
          node: `const response = await fetch("${API_BASE}/api-website-action", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-access-key": "${accessKey}",
    "x-idempotency-key": crypto.randomUUID(),
    "x-user-id": "${state.userId || 'YOUR_USER_ID'}"
  },
  body: JSON.stringify({ action: "list_websites" })
});
const websites = await response.json();
console.log(websites);`,
          python: `import requests
import uuid

response = requests.post(
    "${API_BASE}/api-website-action",
    headers={
        "Content-Type": "application/json",
        "x-access-key": "${accessKey}",
        "x-idempotency-key": str(uuid.uuid4()),
        "x-user-id": "${state.userId || 'YOUR_USER_ID'}"
    },
    json={"action": "list_websites"}
)
websites = response.json()
print(websites)`
        }
      }

      default:
        return { curl: '', node: '', python: '' }
    }
  }

  const executeStep = async () => {
    setExecuting(true)
    setError(null)
    setResponse(null)

    try {
      let result: any

      switch (state.currentStep) {
        case 1: {
          // Create API Key using Supabase function with all options
          const { data, error: fnError } = await supabase.functions.invoke('api-key-create', {
            body: {
              name: keyName.trim() || 'My API Key',
              org_name: orgName.trim() || null,
              webhook_url: webhookUrl.trim() || null,
              webhook_secret: webhookSecret.trim() || null,
              allowed_origins: allowedOrigins.length > 0 ? allowedOrigins : null,
              allow_app_access: allowAppAccess
            }
          })
          if (fnError) throw fnError
          result = data
          setState(prev => ({
            ...prev,
            apiKeyId: data.id,
            accessKey: data.key,
            connectToken: data.connect_token,
            completedSteps: addCompletedStep(prev.completedSteps, 1)
          }))
          break
        }

        case 2: {
          // Connect Users step - just mark as complete
          // The actual user connection happens through the Connect URL
          result = { success: true, message: 'Connect URL step completed' }
          setState(prev => ({
            ...prev,
            completedSteps: addCompletedStep(prev.completedSteps, 2)
          }))
          break
        }

        case 3: {
          // List users - uses x-access-key header
          const { data, error: fnError } = await supabase.functions.invoke('user-list', {
            headers: state.accessKey ? { 'x-access-key': state.accessKey } : undefined
          })
          if (fnError) throw fnError
          result = data

          // Check if users were found (response format: { success, data, total })
          const users = data?.data || []
          if (users.length === 0) {
            throw new Error('No users found. Complete the Connect URL flow first to add a user.')
          }

          // Store first user's ID and mark both step 2 and 3 as complete
          const completedSteps = new Set(state.completedSteps)
          completedSteps.add(2) // Auto-complete step 2 since users exist
          completedSteps.add(3)

          setState(prev => ({
            ...prev,
            userId: users[0]?.id || null,
            completedSteps: Array.from(completedSteps)
          }))
          break
        }

        case 4: {
          // Create product/service - uses api-knowledge-action with add_entry
          const { data, error: fnError } = await supabase.functions.invoke('api-knowledge-action', {
            body: {
              action: 'add_entry',
              knowledge_type: knowledgeType,
              data: { product_url: productUrl }
            },
            headers: {
              'x-access-key': state.accessKey || '',
              'x-idempotency-key': crypto.randomUUID(),
              'x-user-id': state.userId || ''
            }
          })
          if (fnError) throw fnError
          if (!data.success) throw new Error(data.error || 'Failed to create product')
          result = data
          // Entry ID can be in different places depending on response format
          const entry = data.entry || data.data?.database_entry
          const entryId = entry?.id || data.entry_id || data.data?.entry_id
          console.log('Step 4 entry_id extracted:', entryId, 'from response:', data)

          // Store the generated entry for editing in Step 5
          const generatedEntry: GeneratedEntry | null = entry ? {
            id: entry.id,
            title: entry.title || '',
            summary: entry.summary || '',
            content: entry.content || '',
            knowledge_type: entry.knowledge_type || knowledgeType,
            workflow_status: entry.workflow_status || 'draft',
          } : null

          // Pre-populate the edit form for Step 5
          if (generatedEntry) {
            const parsedContent = parseMarkdownToForm(generatedEntry.content)
            const formData = {
              title: generatedEntry.title?.replace(/["\\]/g, '').trim() || '',
              summary: generatedEntry.summary?.replace(/["\\]/g, '').trim() || '',
              problem_text: parsedContent.problem_text || '',
              pain_points: parsedContent.pain_points || [],
              solution_text: parsedContent.solution_text || '',
              key_features: parsedContent.key_features || [],
              target_buyer_text: parsedContent.target_buyer_text || '',
              target_titles: parsedContent.target_titles || [],
              target_industries: parsedContent.target_industries || [],
            }
            setEntryEditForm(formData)
            setOriginalEntryForm(formData) // Set original so change detection works
          }

          setState(prev => ({
            ...prev,
            productId: entryId,
            generatedEntry,
            completedSteps: addCompletedStep(prev.completedSteps, 4)
          }))
          break
        }

        case 5: {
          // Approve product - uses api-knowledge-action with approve_entry
          // Include any edits made to the content
          const reconstructedContent = formToMarkdown(entryEditForm)

          const { data, error: fnError } = await supabase.functions.invoke('api-knowledge-action', {
            body: {
              action: 'approve_entry',
              data: {
                entry_id: state.productId,
                title: entryEditForm.title || undefined,
                summary: entryEditForm.summary || undefined,
                content: reconstructedContent || undefined,
              }
            },
            headers: {
              'x-access-key': state.accessKey || '',
              'x-idempotency-key': crypto.randomUUID(),
              'x-user-id': state.userId || ''
            }
          })
          if (fnError) throw fnError
          if (!data.success && data.error) throw new Error(data.error)
          result = data
          setState(prev => ({
            ...prev,
            completedSteps: addCompletedStep(prev.completedSteps, 5)
          }))
          break
        }

        case 6: {
          // List products - uses api-knowledge-action with list_entries (no idempotency needed)
          const listBody: Record<string, any> = { action: 'list_entries' }
          if (includeUserIdFilter && state.userId) {
            listBody.user_id = state.userId
          }
          const { data, error: fnError } = await supabase.functions.invoke('api-knowledge-action', {
            body: listBody,
            headers: { 'x-access-key': state.accessKey || '' }
          })
          if (fnError) throw fnError
          if (!data.success) throw new Error(data.error || 'Failed to list products')
          result = data
          setState(prev => ({
            ...prev,
            completedSteps: addCompletedStep(prev.completedSteps, 6)
          }))
          break
        }

        case 7: {
          // Create ICP - requires product_id from Step 4
          if (!state.productId) {
            throw new Error('Product ID required. Complete Step 4 first.')
          }

          // Build body with optional fields
          const icpBody: Record<string, unknown> = {
            action: 'create_icp',
            product_id: state.productId,
            name: icpTitle || undefined,
            description: icpDescription || undefined
          }

          // Add optional array fields if provided
          if (icpJobTitles.trim()) {
            icpBody.job_titles = icpJobTitles.split(',').map(s => s.trim())
          }
          if (icpPainPoints.trim()) {
            icpBody.pain_points = icpPainPoints.split(',').map(s => s.trim())
          }
          if (icpValueDrivers.trim()) {
            icpBody.value_drivers = icpValueDrivers.split(',').map(s => s.trim())
          }
          if (icpIndustryFocus.trim()) {
            icpBody.industry_focus = icpIndustryFocus.split(',').map(s => s.trim())
          }
          if (icpCompanyCharacteristics.trim()) {
            icpBody.company_characteristics = icpCompanyCharacteristics.trim()
          }

          const { data, error: fnError } = await supabase.functions.invoke('api-icp-action', {
            body: icpBody,
            headers: {
              'x-access-key': state.accessKey || '',
              'x-idempotency-key': crypto.randomUUID(),
              'x-user-id': state.userId || ''
            }
          })
          if (fnError) throw fnError
          if (!data.success) throw new Error(data.error || 'Failed to create ICP')
          result = data
          setState(prev => ({
            ...prev,
            icpId: data.data?.icp_id || data.icp_id,
            completedSteps: addCompletedStep(prev.completedSteps, 7)
          }))
          break
        }

        case 8: {
          // Approve ICP - similar to approve_entry
          if (!state.icpId) {
            throw new Error('ICP ID required. Complete Step 7 first.')
          }

          // Build updates object with only changed fields
          const icpUpdates: Record<string, any> = {}
          if (icpEditForm.icp_name !== originalIcpForm.icp_name) icpUpdates.icp_name = icpEditForm.icp_name
          if (icpEditForm.description !== originalIcpForm.description) icpUpdates.description = icpEditForm.description
          if (JSON.stringify(icpEditForm.job_titles) !== JSON.stringify(originalIcpForm.job_titles)) icpUpdates.job_titles = icpEditForm.job_titles
          if (JSON.stringify(icpEditForm.pain_points) !== JSON.stringify(originalIcpForm.pain_points)) icpUpdates.pain_points = icpEditForm.pain_points
          if (JSON.stringify(icpEditForm.value_drivers) !== JSON.stringify(originalIcpForm.value_drivers)) icpUpdates.value_drivers = icpEditForm.value_drivers
          if (JSON.stringify(icpEditForm.industry_focus) !== JSON.stringify(originalIcpForm.industry_focus)) icpUpdates.industry_focus = icpEditForm.industry_focus
          if (icpEditForm.company_characteristics !== originalIcpForm.company_characteristics) icpUpdates.company_characteristics = icpEditForm.company_characteristics
          if (icpEditForm.company_size_range !== originalIcpForm.company_size_range) icpUpdates.company_size_range = icpEditForm.company_size_range
          if (icpEditForm.geographic_focus !== originalIcpForm.geographic_focus) icpUpdates.geographic_focus = icpEditForm.geographic_focus
          if (icpEditForm.budget_range !== originalIcpForm.budget_range) icpUpdates.budget_range = icpEditForm.budget_range
          if (icpEditForm.decision_making_process !== originalIcpForm.decision_making_process) icpUpdates.decision_making_process = icpEditForm.decision_making_process
          if (JSON.stringify(icpEditForm.objections_and_concerns) !== JSON.stringify(originalIcpForm.objections_and_concerns)) icpUpdates.objections_and_concerns = icpEditForm.objections_and_concerns
          if (JSON.stringify(icpEditForm.success_metrics) !== JSON.stringify(originalIcpForm.success_metrics)) icpUpdates.success_metrics = icpEditForm.success_metrics
          if (icpEditForm.sales_cycle_length !== originalIcpForm.sales_cycle_length) icpUpdates.sales_cycle_length = icpEditForm.sales_cycle_length
          if (JSON.stringify(icpEditForm.preferred_communication_channels) !== JSON.stringify(originalIcpForm.preferred_communication_channels)) icpUpdates.preferred_communication_channels = icpEditForm.preferred_communication_channels
          if (JSON.stringify(icpEditForm.technology_stack) !== JSON.stringify(originalIcpForm.technology_stack)) icpUpdates.technology_stack = icpEditForm.technology_stack
          if (JSON.stringify(icpEditForm.competitive_alternatives) !== JSON.stringify(originalIcpForm.competitive_alternatives)) icpUpdates.competitive_alternatives = icpEditForm.competitive_alternatives

          const approveBody: Record<string, any> = {
            action: 'approve_icp',
            icp_id: state.icpId,
          }
          if (Object.keys(icpUpdates).length > 0) {
            approveBody.updates = icpUpdates
          }

          const { data, error: fnError } = await supabase.functions.invoke('api-icp-action', {
            body: approveBody,
            headers: {
              'x-access-key': state.accessKey || '',
              'x-idempotency-key': crypto.randomUUID(),
              'x-user-id': state.userId || ''
            }
          })
          if (fnError) throw fnError
          if (!data.success && data.error) throw new Error(data.error)
          result = data
          setState(prev => ({
            ...prev,
            completedSteps: addCompletedStep(prev.completedSteps, 8)
          }))
          break
        }

        case 9: {
          // List ICPs via api-icp-action
          if (!state.accessKey || !state.userId) {
            throw new Error('API key and user ID required. Complete Steps 1-2 first.')
          }

          const listIcpBody: Record<string, any> = { action: 'list_icps' }
          if (includeIcpUserIdFilter && state.userId) {
            listIcpBody.user_id = state.userId
          }

          const { data, error: fnError } = await supabase.functions.invoke('api-icp-action', {
            body: listIcpBody,
            headers: {
              'x-access-key': state.accessKey || '',
              'x-idempotency-key': crypto.randomUUID(),
              'x-user-id': state.userId || ''
            }
          })

          if (fnError) throw fnError
          if (!data.success) throw new Error(data.error || 'Failed to list ICPs')

          result = data
          setState(prev => ({
            ...prev,
            completedSteps: addCompletedStep(prev.completedSteps, 9)
          }))
          break
        }

        case 10: {
          // Create website
          const websiteDomain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
          const websiteBody: any = {
            action: 'create_website',
            domain: websiteDomain,
            name: websiteName.trim() || websiteDomain
          }
          // Link ICP if enabled and ICP exists
          if (linkIcpToWebsite && state.icpId) {
            websiteBody.icp_ids = [parseInt(state.icpId)]
          }
          const { data, error: fnError } = await supabase.functions.invoke('api-website-action', {
            body: websiteBody,
            headers: {
              'x-access-key': state.accessKey || '',
              'x-idempotency-key': crypto.randomUUID(),
              'x-user-id': state.userId || ''
            }
          })
          if (fnError) throw fnError
          if (!data.success) throw new Error(data.error || 'Failed to create website')
          result = data
          setState(prev => ({
            ...prev,
            websiteId: data.website?.id || data.website_id || data.data?.id,
            trackingId: data.website?.tracking_id || data.tracking_id || data.data?.tracking_script_id,
            completedSteps: addCompletedStep(prev.completedSteps, 10)
          }))
          break
        }

        case 11: {
          // List websites
          const { data, error: fnError } = await supabase.functions.invoke('api-website-action', {
            body: { action: 'list_websites' },
            headers: {
              'x-access-key': state.accessKey || '',
              'x-idempotency-key': crypto.randomUUID(),
              'x-user-id': state.userId || ''
            }
          })
          if (fnError) throw fnError
          if (!data.success) throw new Error(data.error || 'Failed to list websites')
          result = data
          setState(prev => ({
            ...prev,
            completedSteps: addCompletedStep(prev.completedSteps, 11)
          }))
          break
        }
      }

      setResponse(result)
      // Store response for this step so it can be shown when returning
      setStepResponses(prev => ({ ...prev, [state.currentStep]: result }))
    } catch (err: any) {
      console.error('Step execution error:', err)
      setError(err.message || 'An error occurred')
    } finally {
      setExecuting(false)
    }
  }

  const goToNextStep = () => {
    if (state.currentStep < 11) {
      const nextStep = state.currentStep + 1
      setState(prev => ({ ...prev, currentStep: nextStep }))
      // Load stored response for next step, or clear if none
      setResponse(stepResponses[nextStep] || null)
      setError(null)
    }
  }

  const goToStep = (stepId: number) => {
    const maxAllowedStep = Math.max(...state.completedSteps, 0) + 1
    // Step 3 is accessible if step 1 is complete (step 2 is a pass-through)
    const canAccess = stepId <= maxAllowedStep ||
      (stepId === 3 && state.completedSteps.includes(1))
    if (canAccess) {
      setState(prev => ({ ...prev, currentStep: stepId }))
      // Load stored response for this step, or clear if none
      setResponse(stepResponses[stepId] || null)
      setError(null)
    }
  }

  const copyCode = async () => {
    let code: string
    if (state.currentStep === 5) {
      // Use dynamic Step 5 code generation
      const accessKey = state.accessKey || 'YOUR_ACCESS_KEY'
      const userId = state.userId || 'YOUR_USER_ID'
      const productId = state.productId || 'ENTRY_ID'
      const hasTitle = entryEditForm.title.trim().length > 0
      const hasSummary = entryEditForm.summary.trim().length > 0
      const hasContent = entryEditForm.problem_text || entryEditForm.pain_points.length > 0 ||
        entryEditForm.solution_text || entryEditForm.key_features.length > 0 ||
        entryEditForm.target_buyer_text || entryEditForm.target_titles.length > 0 ||
        entryEditForm.target_industries.length > 0
      const reconstructedContent = formToMarkdown(entryEditForm)
      const dataObj: Record<string, any> = { entry_id: productId }
      if (hasTitle) dataObj.title = entryEditForm.title
      if (hasSummary) dataObj.summary = entryEditForm.summary
      if (hasContent && reconstructedContent) dataObj.content = reconstructedContent
      const dataJson = JSON.stringify(dataObj, null, 2)

      if (state.language === 'curl') {
        code = `curl -X POST "${API_BASE}/api-knowledge-action" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${accessKey}" \\
  -H "x-idempotency-key: $(uuidgen)" \\
  -H "x-user-id: ${userId}" \\
  -d '{
    "action": "approve_entry",
    "data": ${dataJson.split('\n').map((line, i) => i === 0 ? line : '    ' + line).join('\n')}
  }'`
      } else if (state.language === 'node') {
        code = `const response = await fetch("${API_BASE}/api-knowledge-action", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-access-key": "${accessKey}",
    "x-idempotency-key": crypto.randomUUID(),
    "x-user-id": "${userId}"
  },
  body: JSON.stringify({
    action: "approve_entry",
    data: ${dataJson}
  })
});`
      } else {
        code = `import requests
import uuid

response = requests.post(
    "${API_BASE}/api-knowledge-action",
    headers={
        "Content-Type": "application/json",
        "x-access-key": "${accessKey}",
        "x-idempotency-key": str(uuid.uuid4()),
        "x-user-id": "${userId}"
    },
    json={
        "action": "approve_entry",
        "data": ${dataJson}
    }
)`
      }
    } else {
      code = generateCodeExample(currentStepConfig)[state.language]
    }
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const resetWizard = () => {
    setState(defaultState)
    localStorage.removeItem(STORAGE_KEY)
    setResponse(null)
    setError(null)
    // Reset form state
    setKeyName('')
    setOrgName('')
    setAllowAppAccess(false)
    setShowAdvancedSettings(false)
    setWebhookUrl('')
    setWebhookSecret('')
    setAllowedOrigins([])
    // Reset Step 5 form state
    setEntryEditForm({
      title: '',
      summary: '',
      problem_text: '',
      pain_points: [],
      solution_text: '',
      key_features: [],
      target_buyer_text: '',
      target_titles: [],
      target_industries: [],
    })
    setNewPainPoint('')
    setNewKeyFeature('')
    setNewTargetTitle('')
    setNewTargetIndustry('')
  }

  const allCompleted = state.completedSteps.length === 11

  // Render Step 1: Full API Key Creation Form
  const renderStep1Form = () => {
    // If completed, show the result
    if (state.completedSteps.includes(1) && state.accessKey) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground">API Key Created!</h3>
            <p className="text-muted-foreground mt-2">
              Save your secret key now. You won't be able to see it again.
            </p>
          </div>

          {/* API Key */}
          <div
            onClick={() => copyToClipboard(state.accessKey!, 'api-key')}
            className="bg-background rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors border border-border"
          >
            <p className="text-xs text-muted-foreground mb-2">API Key (click to copy)</p>
            <code className="text-sm text-foreground break-all font-mono">{state.accessKey}</code>
            {copiedKey === 'api-key' && (
              <span className="ml-2 text-green-400 text-xs">Copied!</span>
            )}
          </div>

          {/* Connect URL */}
          {state.connectToken && (
            <div className="bg-background/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-2">User Connect URL</p>
              <code
                onClick={() => copyToClipboard(`https://connect.warmai.uk/${state.connectToken}?email={user_email}`, 'connect-url')}
                className="text-xs text-foreground break-all font-mono cursor-pointer hover:text-primary"
              >
                https://connect.warmai.uk/{state.connectToken}?email=&#123;user_email&#125;
              </code>
              {copiedKey === 'connect-url' && (
                <span className="ml-2 text-green-400 text-xs">Copied!</span>
              )}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center font-medium">What would you like to do?</p>
            <Button
              onClick={goToNextStep}
              className="w-full bg-primary text-primary-foreground"
            >
              Full Setup
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              onClick={() => {
                setState(prev => ({
                  ...prev,
                  completedSteps: Array.from(new Set([...prev.completedSteps, 2, 3, 4, 5, 6, 7, 8, 9])),
                  currentStep: 10
                }))
                setResponse(null)
                setError(null)
              }}
              variant="outline"
              className="w-full border-border"
            >
              <Globe className="h-4 w-4 mr-2" />
              Skip to Website Tracking
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Choose "Full Setup" to configure messaging, products, and ICPs. Choose "Skip to Website Tracking" if you only need visitor identification.
            </p>
          </div>
        </div>
      )
    }

    // Show existing keys if any (and not choosing to create new)
    if (!loadingExistingKeys && existingKeys.length > 0 && !showCreateNew) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground">You already have API keys</h3>
            <p className="text-muted-foreground mt-2">
              Select an existing key to continue, or create a new one.
            </p>
          </div>

          <div className="space-y-2">
            {existingKeys.map((key) => (
              <button
                key={key.id}
                onClick={() => {
                  setState(prev => ({
                    ...prev,
                    apiKeyId: key.id,
                    connectToken: key.connect_token,
                    completedSteps: addCompletedStep(prev.completedSteps, 1)
                  }))
                }}
                className="w-full text-left bg-background hover:bg-accent rounded-lg p-4 border border-border transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{key.name || 'Unnamed Key'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {key.org_name && <span>{key.org_name} · </span>}
                      {key.key_prefix}••••
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setShowCreateNew(true)}
              className="w-full border-border"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Key
            </Button>
          </div>
        </div>
      )
    }

    // Show the creation form
    return (
      <div className="space-y-6">
        {/* Back to existing keys */}
        {existingKeys.length > 0 && showCreateNew && (
          <button
            onClick={() => setShowCreateNew(false)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
            Back to existing keys
          </button>
        )}

        {/* Basic Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">Key Name</label>
            <Input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g., Production API"
              className="mt-1 bg-background border-border text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Organisation Name (optional)</label>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g., Acme Corp"
              className="mt-1 bg-background border-border text-foreground"
            />
          </div>
        </div>

        {/* Allow App Access */}
        <div className="pt-4 border-t border-border">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowAppAccess}
              onChange={(e) => setAllowAppAccess(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">Allow app access</span>
                <div className="relative group">
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-xs text-popover-foreground rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg border border-border">
                    Usage charges will be billed to your API key's credit balance
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Users can also access the Warm AI dashboard</p>
            </div>
          </label>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="w-full flex items-center justify-between py-2 text-left hover:text-foreground transition-colors"
          >
            <div>
              <span className="text-sm font-medium text-foreground">Advanced Settings</span>
              <p className="text-xs text-muted-foreground mt-0.5">Webhooks and allowed origins</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Advanced Settings Content */}
        {showAdvancedSettings && (
          <div className="space-y-6 pt-2">
            {/* Webhooks */}
            <div className="bg-background/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Webhook className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Webhooks</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Receive notifications for visitor identifications and outreach events
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Webhook URL</label>
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    className="mt-1 bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Webhook Secret</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="Auto-generate or enter"
                      className="flex-1 bg-background border-border text-foreground font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setWebhookSecret(generateWebhookSecret())}
                      className="bg-background border-border text-foreground hover:bg-accent"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Allowed Origins */}
            <div className="bg-background/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Allowed Origins</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                For browser-based requests (max 5). Leave empty to allow all origins.
              </p>

              {allowedOrigins.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {allowedOrigins.map((origin) => (
                    <div
                      key={origin}
                      className="flex items-center gap-2 bg-background rounded-lg px-3 py-1.5 border border-border"
                    >
                      <code className="text-sm text-foreground font-mono">{origin}</code>
                      <button
                        type="button"
                        onClick={() => removeOrigin(origin)}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newOrigin}
                  onChange={(e) => {
                    setNewOrigin(e.target.value)
                    setOriginError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addOrigin()
                    }
                  }}
                  placeholder="example.com"
                  className="flex-1 bg-background border-border text-foreground font-mono text-sm"
                  disabled={allowedOrigins.length >= 5}
                />
                <Button
                  type="button"
                  onClick={addOrigin}
                  variant="outline"
                  className="bg-background border-border text-foreground hover:bg-accent"
                  disabled={allowedOrigins.length >= 5}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {originError && (
                <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {originError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Create Button */}
        <Button
          onClick={executeStep}
          disabled={executing || !keyName.trim()}
          className="w-full bg-primary text-primary-foreground"
        >
          {executing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Key'
          )}
        </Button>
      </div>
    )
  }

  // Render Step 2: Connect Users Form
  const renderStep2Form = () => {
    // If completed, show success
    if (state.completedSteps.includes(2)) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Step Completed!</h3>
            <p className="text-muted-foreground mt-2">
              User connected. You can use this URL to connect additional users.
            </p>
          </div>

          {/* Connect URL for additional users */}
          {state.connectToken && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Your Connect URL (with email parameter):</p>
              <code className="block bg-background rounded p-3 text-sm break-all text-foreground">
                {`https://connect.warmai.uk/${state.connectToken}?email={USER_EMAIL}`}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Replace <code className="text-primary">{'{USER_EMAIL}'}</code> with your user's email address.
              </p>
            </div>
          )}

          <Button
            onClick={goToNextStep}
            className="w-full bg-primary text-primary-foreground"
          >
            Continue to Step 3
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )
    }

    // Check if Step 1 is complete
    if (!state.connectToken) {
      return (
        <div className="space-y-6">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Step 1 Required</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Complete Step 1 first to generate your Connect URL.
            </p>
          </div>
          <Button
            onClick={() => goToStep(1)}
            variant="outline"
            className="w-full border-border"
          >
            Go to Step 1
          </Button>
        </div>
      )
    }

    // Build dynamic connect URL based on enabled parameters
    const buildConnectUrl = () => {
      const params = new URLSearchParams()
      if (includeEmail && user?.email) {
        params.set('email', user.email)
      }
      if (includeSuccessUrl && successUrl.trim()) {
        params.set('success_url', successUrl.trim())
      }
      if (includeFailureUrl && failureUrl.trim()) {
        params.set('failure_url', failureUrl.trim())
      }
      const queryString = params.toString()
      return `https://connect.warmai.uk/${state.connectToken}${queryString ? '?' + queryString : ''}`
    }

    const dynamicConnectUrl = buildConnectUrl()

    return (
      <div className="space-y-6">
        {/* Explainer Section */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">How It Works</h3>
              <p className="text-sm text-muted-foreground">
                The Connect URL provides a seamless way for users to authorize their LinkedIn account with your integration.
                When a user visits this URL, they'll be guided through the LinkedIn authorization flow.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">The Flow</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>User clicks your Connect URL {includeEmail && '(with their email pre-filled)'}</li>
                <li>They're redirected to LinkedIn to authorize access</li>
                <li>After authorization, they're redirected {includeSuccessUrl && successUrl ? 'to your success URL' : 'to a generic Warm AI page'}</li>
                <li>A webhook notification is sent to your configured endpoint</li>
              </ol>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">URL Parameters</h3>
              <div className="space-y-3">
                {/* Email checkbox */}
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeEmail}
                    onChange={(e) => setIncludeEmail(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-primary text-sm">email</code>
                      <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Recommended</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enables passwordless login - user skips the Warm AI login screen entirely for a seamless experience.
                    </p>
                  </div>
                </label>

                {/* Success URL checkbox */}
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeSuccessUrl}
                    onChange={(e) => setIncludeSuccessUrl(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <code className="text-primary text-sm">success_url</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Redirect to your own page after successful connection (e.g., your dashboard or thank you page).
                    </p>
                  </div>
                </label>

                {/* Failure URL checkbox */}
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeFailureUrl}
                    onChange={(e) => setIncludeFailureUrl(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <code className="text-primary text-sm">failure_url</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Redirect to your custom error page if the user denies access or an error occurs.
                    </p>
                  </div>
                </label>
              </div>

              {/* Note about generic pages */}
              {(!includeSuccessUrl || !includeFailureUrl) && (
                <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    <Info className="h-3 w-3 inline mr-1" />
                    Without custom redirect URLs, users will see generic, unbranded Warm AI pages after connecting.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Input fields for URLs when enabled */}
            {includeSuccessUrl && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Success URL</label>
                <Input
                  value={successUrl}
                  onChange={(e) => setSuccessUrl(e.target.value)}
                  placeholder="https://yourapp.com/connected"
                  className="bg-background border-border text-foreground"
                />
              </div>
            )}

            {includeFailureUrl && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Failure URL</label>
                <Input
                  value={failureUrl}
                  onChange={(e) => setFailureUrl(e.target.value)}
                  placeholder="https://yourapp.com/connection-failed"
                  className="bg-background border-border text-foreground"
                />
              </div>
            )}

            {/* Dynamic Connect URL Display */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Your Connect URL
                {(includeEmail || includeSuccessUrl || includeFailureUrl) && (
                  <span className="text-xs text-muted-foreground ml-2">(with selected parameters)</span>
                )}
              </label>
              <div
                onClick={() => copyToClipboard(dynamicConnectUrl, 'connect-url-dynamic')}
                className="bg-background rounded-lg p-4 border border-border cursor-pointer hover:bg-accent/10 transition-colors"
              >
                <code className="text-sm text-foreground break-all font-mono">
                  {dynamicConnectUrl}
                </code>
                {copiedKey === 'connect-url-dynamic' && (
                  <span className="ml-2 text-green-400 text-xs">Copied!</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Click to copy. {includeEmail && 'Replace the email with your user\'s email address.'}
              </p>
            </div>

            {/* Test the URL */}
            <div className="pt-4 space-y-3">
              <Button
                onClick={() => window.open(dynamicConnectUrl, '_blank')}
                className="w-full bg-primary text-primary-foreground"
              >
                <Globe className="h-4 w-4 mr-2" />
                Test Connect URL in New Tab
              </Button>

              <Button
                onClick={goToNextStep}
                variant="outline"
                className="w-full border-border"
              >
                Continue to Step 3: List Users
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                After connecting a user, step 3 will verify and list them.
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>
    )
  }

  // Helper for character count color
  const getCountColor = (current: number, max: number) => {
    const percentage = (current / max) * 100
    if (percentage >= 100) return 'text-red-400'  // At or over limit
    if (percentage >= 80) return 'text-yellow-400'  // Warning - near limit
    return 'text-muted-foreground'
  }

  // Helper to add item to array field
  const handleArrayAdd = (field: keyof EntryEditForm, value: string, clearFn: () => void) => {
    if (!value.trim()) return
    const currentArray = (entryEditForm[field] as string[]) || []
    const fieldLimit = FIELD_LIMITS[field as keyof typeof FIELD_LIMITS]

    if (fieldLimit && fieldLimit.type === 'array' && currentArray.length >= fieldLimit.limit) {
      return
    }

    if (currentArray.includes(value.trim())) return

    setEntryEditForm(prev => ({ ...prev, [field]: [...currentArray, value.trim()] }))
    clearFn()
  }

  // Helper to remove item from array field
  const handleArrayRemove = (field: keyof EntryEditForm, index: number) => {
    const currentArray = (entryEditForm[field] as string[]) || []
    setEntryEditForm(prev => ({ ...prev, [field]: currentArray.filter((_, i) => i !== index) }))
  }

  // Helper to update item in array field
  const handleArrayUpdate = (field: keyof EntryEditForm, index: number, value: string) => {
    const currentArray = [...((entryEditForm[field] as string[]) || [])]
    currentArray[index] = value
    setEntryEditForm(prev => ({ ...prev, [field]: currentArray }))
  }

  // State for Step 5 full code view toggle
  const [showFullCode, setShowFullCode] = useState(false)
  const [fetchingEntry, setFetchingEntry] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch entry from database when on Step 5 and productId exists but form is empty
  useEffect(() => {
    const fetchEntry = async () => {
      // Only fetch when on Step 5, have productId, and form is empty
      if (state.currentStep !== 5 || !state.productId) return
      if (entryEditForm.title.trim()) return // Already have data

      setFetchingEntry(true)
      setFetchError(null)
      try {
        console.log('Fetching entry directly from DB for ID:', state.productId)

        // Query Supabase directly - no edge function needed
        const { data: entry, error } = await supabase
          .from('knowledge_base')
          .select('id, title, content, summary, workflow_status')
          .eq('id', state.productId)
          .single()

        console.log('Direct DB response:', entry, 'error:', error)

        if (error) throw error

        if (entry) {
          const parsedContent = parseMarkdownToForm(entry.content || '')
          const fetchedForm = {
            title: entry.title?.replace(/["\\]/g, '').trim() || '',
            summary: entry.summary?.replace(/["\\]/g, '').trim() || '',
            problem_text: parsedContent.problem_text || '',
            pain_points: parsedContent.pain_points || [],
            solution_text: parsedContent.solution_text || '',
            key_features: parsedContent.key_features || [],
            target_buyer_text: parsedContent.target_buyer_text || '',
            target_titles: parsedContent.target_titles || [],
            target_industries: parsedContent.target_industries || [],
          }
          setEntryEditForm(fetchedForm)
          setOriginalEntryForm(fetchedForm)
        } else {
          setFetchError(`Entry ${state.productId} not found`)
        }
      } catch (err: any) {
        console.error('Failed to fetch entry:', err)
        setFetchError(err.message || 'Failed to fetch entry')
      } finally {
        setFetchingEntry(false)
      }
    }

    fetchEntry()
  }, [state.currentStep, state.productId])

  // Fetch ICP from database when on Step 8 and icpId exists but form is empty
  useEffect(() => {
    const fetchIcp = async () => {
      // Only fetch when on Step 8, have icpId, and form is empty
      if (state.currentStep !== 8 || !state.icpId) return
      if (icpEditForm.icp_name.trim()) return // Already have data

      setFetchingIcp(true)
      setFetchIcpError(null)
      try {
        console.log('Fetching ICP directly from DB for ID:', state.icpId)

        // Query Supabase directly
        const { data: icp, error } = await supabase
          .from('icps')
          .select('*')
          .eq('id', state.icpId)
          .single()

        console.log('Direct DB ICP response:', icp, 'error:', error)

        if (error) throw error

        if (icp) {
          const fetchedIcpForm: IcpEditForm = {
            icp_name: icp.icp_name || '',
            description: icp.description || '',
            job_titles: icp.job_titles || [],
            pain_points: icp.pain_points || [],
            value_drivers: icp.value_drivers || [],
            industry_focus: icp.industry_focus || [],
            company_characteristics: icp.company_characteristics || '',
            company_size_range: icp.company_size_range || '',
            geographic_focus: typeof icp.geographic_focus === 'string' ? icp.geographic_focus : (icp.geographic_focus?.join(', ') || ''),
            budget_range: icp.budget_range || '',
            decision_making_process: icp.decision_making_process || '',
            objections_and_concerns: icp.objections_and_concerns || [],
            success_metrics: icp.success_metrics || [],
            sales_cycle_length: icp.sales_cycle_length || '',
            preferred_communication_channels: icp.preferred_communication_channels || [],
            technology_stack: icp.technology_stack || [],
            competitive_alternatives: icp.competitive_alternatives || [],
          }
          setIcpEditForm(fetchedIcpForm)
          setOriginalIcpForm(fetchedIcpForm)
        } else {
          setFetchIcpError(`ICP ${state.icpId} not found`)
        }
      } catch (err: any) {
        console.error('Failed to fetch ICP:', err)
        setFetchIcpError(err.message || 'Failed to fetch ICP')
      } finally {
        setFetchingIcp(false)
      }
    }

    fetchIcp()
  }, [state.currentStep, state.icpId])

  // Fetch website tracking ID from database when websiteId exists but trackingId is missing
  useEffect(() => {
    const fetchWebsite = async () => {
      // Only fetch if we have websiteId but no trackingId
      if (!state.websiteId || state.trackingId) return

      try {
        console.log('Fetching website from DB for ID:', state.websiteId)

        const { data: website, error } = await supabase
          .from('websites')
          .select('tracking_script_id')
          .eq('id', state.websiteId)
          .single()

        if (error) throw error

        if (website?.tracking_script_id) {
          setState(prev => ({
            ...prev,
            trackingId: website.tracking_script_id
          }))
        }
      } catch (err: any) {
        console.error('Failed to fetch website:', err)
      }
    }

    fetchWebsite()
  }, [state.websiteId, state.trackingId])

  // Check if form has any real content (not placeholders)
  // Check if any fields have been CHANGED from original values
  const hasAnyChanges =
    entryEditForm.title !== originalEntryForm.title ||
    entryEditForm.summary !== originalEntryForm.summary ||
    entryEditForm.problem_text !== originalEntryForm.problem_text ||
    JSON.stringify(entryEditForm.pain_points) !== JSON.stringify(originalEntryForm.pain_points) ||
    entryEditForm.solution_text !== originalEntryForm.solution_text ||
    JSON.stringify(entryEditForm.key_features) !== JSON.stringify(originalEntryForm.key_features) ||
    entryEditForm.target_buyer_text !== originalEntryForm.target_buyer_text ||
    JSON.stringify(entryEditForm.target_titles) !== JSON.stringify(originalEntryForm.target_titles) ||
    JSON.stringify(entryEditForm.target_industries) !== JSON.stringify(originalEntryForm.target_industries)

  // When showing full code without any changes, we're showing placeholders
  const showingPlaceholders = showFullCode && !hasAnyChanges

  // Generate dynamic code for Step 5 based on form edits
  const generateStep5Code = () => {
    const accessKey = state.accessKey || 'YOUR_ACCESS_KEY'
    const userId = state.userId || 'YOUR_USER_ID'
    const productId = state.productId || 'ENTRY_ID'

    // Check which specific fields changed
    const titleChanged = entryEditForm.title !== originalEntryForm.title
    const summaryChanged = entryEditForm.summary !== originalEntryForm.summary
    const contentFieldsChanged =
      entryEditForm.problem_text !== originalEntryForm.problem_text ||
      JSON.stringify(entryEditForm.pain_points) !== JSON.stringify(originalEntryForm.pain_points) ||
      entryEditForm.solution_text !== originalEntryForm.solution_text ||
      JSON.stringify(entryEditForm.key_features) !== JSON.stringify(originalEntryForm.key_features) ||
      entryEditForm.target_buyer_text !== originalEntryForm.target_buyer_text ||
      JSON.stringify(entryEditForm.target_titles) !== JSON.stringify(originalEntryForm.target_titles) ||
      JSON.stringify(entryEditForm.target_industries) !== JSON.stringify(originalEntryForm.target_industries)

    const reconstructedContent = formToMarkdown(entryEditForm)

    // Build the data object - show placeholders when full code is toggled but no changes made
    let dataObj: Record<string, any>

    if (showFullCode && !hasAnyChanges) {
      // Show full structure with placeholders
      dataObj = {
        entry_id: productId,
        title: '[YOUR_TITLE]',
        summary: '[YOUR_SUMMARY]',
        content: `## Problem Solved
[PROBLEM_DESCRIPTION]

### Pain Points:
- [PAIN_POINT_1]
- [PAIN_POINT_2]

## Solution
[SOLUTION_DESCRIPTION]

### Key Features:
- [FEATURE_1]
- [FEATURE_2]

## Target Buyer
[BUYER_DESCRIPTION]

### Ideal Titles:
- [JOB_TITLE_1]
- [JOB_TITLE_2]

### Industries:
- [INDUSTRY_1]
- [INDUSTRY_2]`
      }
    } else {
      // Build from actual changed values only
      dataObj = { entry_id: productId }
      if (titleChanged) dataObj.title = entryEditForm.title
      if (summaryChanged) dataObj.summary = entryEditForm.summary
      if (contentFieldsChanged && reconstructedContent) dataObj.content = reconstructedContent
    }

    const dataJson = JSON.stringify(dataObj, null, 2)
    const dataJsonCompact = JSON.stringify(dataObj)

    // For curl, show only changed fields
    const curlData = showFullCode
      ? dataJson.split('\n').map((line, i) => i === 0 ? line : '    ' + line).join('\n')
      : dataJsonCompact

    return {
      curl: `curl -X POST "${API_BASE}/api-knowledge-action" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${accessKey}" \\
  -H "x-idempotency-key: $(uuidgen)" \\
  -H "x-user-id: ${userId}" \\
  -d '{
    "action": "approve_entry",
    "data": ${curlData}
  }'`,
      node: `const response = await fetch("${API_BASE}/api-knowledge-action", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-access-key": "${accessKey}",
    "x-idempotency-key": crypto.randomUUID(),
    "x-user-id": "${userId}"
  },
  body: JSON.stringify({
    action: "approve_entry",
    data: ${showFullCode ? dataJson : dataJsonCompact}
  })
});`,
      python: `import requests
import uuid

response = requests.post(
    "${API_BASE}/api-knowledge-action",
    headers={
        "Content-Type": "application/json",
        "x-access-key": "${accessKey}",
        "x-idempotency-key": str(uuid.uuid4()),
        "x-user-id": "${userId}"
    },
    json={
        "action": "approve_entry",
        "data": ${showFullCode ? dataJson : dataJsonCompact}
    }
)`
    }
  }

  // Check if ICP form has any changes from original
  const hasIcpChanges =
    icpEditForm.icp_name !== originalIcpForm.icp_name ||
    icpEditForm.description !== originalIcpForm.description ||
    JSON.stringify(icpEditForm.job_titles) !== JSON.stringify(originalIcpForm.job_titles) ||
    JSON.stringify(icpEditForm.pain_points) !== JSON.stringify(originalIcpForm.pain_points) ||
    JSON.stringify(icpEditForm.value_drivers) !== JSON.stringify(originalIcpForm.value_drivers) ||
    JSON.stringify(icpEditForm.industry_focus) !== JSON.stringify(originalIcpForm.industry_focus) ||
    icpEditForm.company_characteristics !== originalIcpForm.company_characteristics ||
    icpEditForm.company_size_range !== originalIcpForm.company_size_range ||
    icpEditForm.geographic_focus !== originalIcpForm.geographic_focus ||
    icpEditForm.budget_range !== originalIcpForm.budget_range ||
    icpEditForm.decision_making_process !== originalIcpForm.decision_making_process ||
    JSON.stringify(icpEditForm.objections_and_concerns) !== JSON.stringify(originalIcpForm.objections_and_concerns) ||
    JSON.stringify(icpEditForm.success_metrics) !== JSON.stringify(originalIcpForm.success_metrics) ||
    icpEditForm.sales_cycle_length !== originalIcpForm.sales_cycle_length ||
    JSON.stringify(icpEditForm.preferred_communication_channels) !== JSON.stringify(originalIcpForm.preferred_communication_channels) ||
    JSON.stringify(icpEditForm.technology_stack) !== JSON.stringify(originalIcpForm.technology_stack) ||
    JSON.stringify(icpEditForm.competitive_alternatives) !== JSON.stringify(originalIcpForm.competitive_alternatives)

  // State for Step 8 full code view toggle
  const [showFullIcpCode, setShowFullIcpCode] = useState(false)

  // Generate dynamic code for Step 8 (Approve ICP) based on form edits
  const generateStep8Code = () => {
    const accessKey = state.accessKey || 'YOUR_ACCESS_KEY'
    const userId = state.userId || 'YOUR_USER_ID'
    const icpId = state.icpId || 'ICP_ID'

    // Build updates object with only changed fields (or placeholders if showFullIcpCode with no changes)
    let updates: Record<string, any> = {}

    if (showFullIcpCode && !hasIcpChanges) {
      // Show full structure with placeholders (easier to read/understand the structure)
      updates = {
        icp_name: '[ICP_NAME]',
        description: '[ICP_DESCRIPTION]',
        job_titles: ['[JOB_TITLE_1]', '[JOB_TITLE_2]'],
        pain_points: ['[PAIN_POINT_1]', '[PAIN_POINT_2]'],
        value_drivers: ['[VALUE_DRIVER_1]', '[VALUE_DRIVER_2]'],
        industry_focus: ['[INDUSTRY_1]', '[INDUSTRY_2]'],
        company_characteristics: '[COMPANY_CHARACTERISTICS]',
        company_size_range: '[COMPANY_SIZE_RANGE]',
        geographic_focus: '[GEOGRAPHIC_FOCUS]',
        budget_range: '[BUDGET_RANGE]',
        decision_making_process: '[DECISION_MAKING_PROCESS]',
        objections_and_concerns: ['[OBJECTION_1]', '[OBJECTION_2]'],
        success_metrics: ['[METRIC_1]', '[METRIC_2]'],
        sales_cycle_length: '[SALES_CYCLE_LENGTH]',
        preferred_communication_channels: ['[CHANNEL_1]', '[CHANNEL_2]'],
        technology_stack: ['[TECH_1]', '[TECH_2]'],
        competitive_alternatives: ['[COMPETITOR_1]', '[COMPETITOR_2]'],
      }
    } else if (showFullIcpCode) {
      // Show all fields with actual values when changes exist
      updates = {
        icp_name: icpEditForm.icp_name,
        description: icpEditForm.description,
        job_titles: icpEditForm.job_titles,
        pain_points: icpEditForm.pain_points,
        value_drivers: icpEditForm.value_drivers,
        industry_focus: icpEditForm.industry_focus,
        company_characteristics: icpEditForm.company_characteristics,
        company_size_range: icpEditForm.company_size_range,
        geographic_focus: icpEditForm.geographic_focus,
        budget_range: icpEditForm.budget_range,
        decision_making_process: icpEditForm.decision_making_process,
        objections_and_concerns: icpEditForm.objections_and_concerns,
        success_metrics: icpEditForm.success_metrics,
        sales_cycle_length: icpEditForm.sales_cycle_length,
        preferred_communication_channels: icpEditForm.preferred_communication_channels,
        technology_stack: icpEditForm.technology_stack,
        competitive_alternatives: icpEditForm.competitive_alternatives,
      }
    } else {
      // Only include changed fields
      if (icpEditForm.icp_name !== originalIcpForm.icp_name) updates.icp_name = icpEditForm.icp_name
      if (icpEditForm.description !== originalIcpForm.description) updates.description = icpEditForm.description
      if (JSON.stringify(icpEditForm.job_titles) !== JSON.stringify(originalIcpForm.job_titles)) updates.job_titles = icpEditForm.job_titles
      if (JSON.stringify(icpEditForm.pain_points) !== JSON.stringify(originalIcpForm.pain_points)) updates.pain_points = icpEditForm.pain_points
      if (JSON.stringify(icpEditForm.value_drivers) !== JSON.stringify(originalIcpForm.value_drivers)) updates.value_drivers = icpEditForm.value_drivers
      if (JSON.stringify(icpEditForm.industry_focus) !== JSON.stringify(originalIcpForm.industry_focus)) updates.industry_focus = icpEditForm.industry_focus
      if (icpEditForm.company_characteristics !== originalIcpForm.company_characteristics) updates.company_characteristics = icpEditForm.company_characteristics
      if (icpEditForm.company_size_range !== originalIcpForm.company_size_range) updates.company_size_range = icpEditForm.company_size_range
      if (icpEditForm.geographic_focus !== originalIcpForm.geographic_focus) updates.geographic_focus = icpEditForm.geographic_focus
      if (icpEditForm.budget_range !== originalIcpForm.budget_range) updates.budget_range = icpEditForm.budget_range
      if (icpEditForm.decision_making_process !== originalIcpForm.decision_making_process) updates.decision_making_process = icpEditForm.decision_making_process
      if (JSON.stringify(icpEditForm.objections_and_concerns) !== JSON.stringify(originalIcpForm.objections_and_concerns)) updates.objections_and_concerns = icpEditForm.objections_and_concerns
      if (JSON.stringify(icpEditForm.success_metrics) !== JSON.stringify(originalIcpForm.success_metrics)) updates.success_metrics = icpEditForm.success_metrics
      if (icpEditForm.sales_cycle_length !== originalIcpForm.sales_cycle_length) updates.sales_cycle_length = icpEditForm.sales_cycle_length
      if (JSON.stringify(icpEditForm.preferred_communication_channels) !== JSON.stringify(originalIcpForm.preferred_communication_channels)) updates.preferred_communication_channels = icpEditForm.preferred_communication_channels
      if (JSON.stringify(icpEditForm.technology_stack) !== JSON.stringify(originalIcpForm.technology_stack)) updates.technology_stack = icpEditForm.technology_stack
      if (JSON.stringify(icpEditForm.competitive_alternatives) !== JSON.stringify(originalIcpForm.competitive_alternatives)) updates.competitive_alternatives = icpEditForm.competitive_alternatives
    }

    const bodyObj: Record<string, any> = {
      action: 'approve_icp',
      icp_id: icpId,
    }

    if (Object.keys(updates).length > 0) {
      bodyObj.updates = updates
    }

    const bodyJson = JSON.stringify(bodyObj, null, 2)
    const bodyJsonCompact = JSON.stringify(bodyObj)

    return {
      curl: `curl -X POST "${API_BASE}/api-icp-action" \\
  -H "Content-Type: application/json" \\
  -H "x-access-key: ${accessKey}" \\
  -H "x-idempotency-key: $(uuidgen)" \\
  -H "x-user-id: ${userId}" \\
  -d '${hasIcpChanges || showFullIcpCode ? bodyJson : bodyJsonCompact}'`,
      node: `const response = await fetch("${API_BASE}/api-icp-action", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-access-key": "${accessKey}",
    "x-idempotency-key": crypto.randomUUID(),
    "x-user-id": "${userId}"
  },
  body: JSON.stringify(${hasIcpChanges || showFullIcpCode ? bodyJson : bodyJsonCompact})
});`,
      python: `import requests
import uuid

response = requests.post(
    "${API_BASE}/api-icp-action",
    headers={
        "Content-Type": "application/json",
        "x-access-key": "${accessKey}",
        "x-idempotency-key": str(uuid.uuid4()),
        "x-user-id": "${userId}"
    },
    json=${hasIcpChanges || showFullIcpCode ? bodyJson : bodyJsonCompact}
)`
    }
  }

  // Helper to add/remove ICP array items
  const handleIcpArrayAdd = (field: keyof IcpEditForm, value: string, clearFn: () => void) => {
    if (!value.trim()) return
    const currentArray = (icpEditForm[field] as string[]) || []
    if (currentArray.includes(value.trim())) return
    setIcpEditForm(prev => ({ ...prev, [field]: [...currentArray, value.trim()] }))
    clearFn()
  }

  const handleIcpArrayRemove = (field: keyof IcpEditForm, index: number) => {
    const currentArray = (icpEditForm[field] as string[]) || []
    setIcpEditForm(prev => ({ ...prev, [field]: currentArray.filter((_, i) => i !== index) }))
  }

  // Helper to update item in ICP array field
  const handleIcpArrayUpdate = (field: keyof IcpEditForm, index: number, value: string) => {
    const currentArray = [...((icpEditForm[field] as string[]) || [])]
    currentArray[index] = value
    setIcpEditForm(prev => ({ ...prev, [field]: currentArray }))
  }

  // Render Step 5: Approve Entry with editable sections (2-column layout)
  const renderStep5Form = () => {
    const step = currentStepConfig
    const step5Code = generateStep5Code()
    const isCompleted = state.completedSteps.includes(5)
    const storedResponse = stepResponses[5]

    // If completed, show locked view with request and response
    if (isCompleted) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-lg p-3">
            <Lock className="h-4 w-4" />
            <span>Step completed - Entry has been approved</span>
          </div>

          {/* Code display */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Request</span>
            </div>
            <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto opacity-75">
              <code className="text-foreground whitespace-pre-wrap break-all">
                {step5Code[state.language]}
              </code>
            </pre>
          </div>

          {/* Response display */}
          {storedResponse && (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Response</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(storedResponse, null, 2)); setCopiedResponse(true); setTimeout(() => setCopiedResponse(false), 2000) }}
                  className="p-1 text-muted-foreground hover:text-foreground hover:scale-110 transition-all"
                >
                  {copiedResponse ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="relative mt-2">
                <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto max-h-60 overflow-y-auto">
                  <code className="text-blue-400 whitespace-pre-wrap break-all">
                    {JSON.stringify(storedResponse, null, 2)}
                  </code>
                </pre>
                <button
                  onClick={() => setExpandedResponse(storedResponse)}
                  className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-foreground hover:scale-125 transition-all"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <Button
            onClick={goToNextStep}
            className="w-full bg-primary text-primary-foreground"
          >
            Continue to Step 6
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )
    }

    // Check if Step 4 is complete
    if (!state.productId) {
      return (
        <div className="space-y-6">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Step 4 Required</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Complete Step 4 first to add a knowledge base entry.
            </p>
          </div>
          <Button
            onClick={() => goToStep(4)}
            variant="outline"
            className="w-full border-border"
          >
            Go to Step 4
          </Button>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Form Fields */}
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">What This Does</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
            <Info className="h-3 w-3" />
            <span>Edit fields below to see the API request update on the right.</span>
          </div>

          {/* Loading/Error state for entry fetch */}
          {fetchingEntry && (
            <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 rounded-lg p-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Loading entry data...</span>
            </div>
          )}
          {fetchError && (
            <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-100 rounded-lg p-2">
              <AlertCircle className="h-3 w-3" />
              <span>{fetchError}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-foreground">Title</label>
              <span className={`text-xs ${getCountColor(entryEditForm.title.length, FIELD_LIMITS.title.limit)}`}>
                {entryEditForm.title.length}/{FIELD_LIMITS.title.limit}
              </span>
            </div>
            <Input
              value={entryEditForm.title}
              onChange={(e) => {
                if (e.target.value.length <= FIELD_LIMITS.title.limit) {
                  setEntryEditForm(prev => ({ ...prev, title: e.target.value }))
                }
              }}
              placeholder="Product/Service title"
              className="bg-background border-border text-foreground"
            />
          </div>

          {/* Summary */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-foreground">Summary</label>
              <span className={`text-xs ${getCountColor(entryEditForm.summary.length, FIELD_LIMITS.summary.limit)}`}>
                {entryEditForm.summary.length}/{FIELD_LIMITS.summary.limit}
              </span>
            </div>
            <textarea
              value={entryEditForm.summary}
              onChange={(e) => {
                if (e.target.value.length <= FIELD_LIMITS.summary.limit) {
                  setEntryEditForm(prev => ({ ...prev, summary: e.target.value }))
                }
              }}
              placeholder="Brief summary..."
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Problem Solved */}
          <div className="bg-muted/20 rounded-lg p-3 border border-border">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <AlertCircle className="h-3 w-3 text-primary" />
              Problem Solved
            </h4>
            <textarea
              value={entryEditForm.problem_text}
              onChange={(e) => setEntryEditForm(prev => ({ ...prev, problem_text: e.target.value }))}
              placeholder="Describe the problem..."
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent mb-2"
            />
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Pain Points</label>
              <span className={`text-xs ${getCountColor(entryEditForm.pain_points.length, FIELD_LIMITS.pain_points.limit)}`}>
                {entryEditForm.pain_points.length}/{FIELD_LIMITS.pain_points.limit}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {entryEditForm.pain_points.map((item, idx) => (
                <div key={idx} className="inline-flex items-center gap-1 bg-background border border-border rounded text-xs text-foreground">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleArrayUpdate('pain_points', idx, e.target.value)}
                    className="bg-transparent border-none px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-0 min-w-[60px]"
                    style={{ width: `${Math.max(60, item.length * 7)}px` }}
                  />
                  <button onClick={() => handleArrayRemove('pain_points', idx)} className="text-muted-foreground hover:text-red-400 pr-1">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {entryEditForm.pain_points.length < FIELD_LIMITS.pain_points.limit && (
              <div className="flex gap-1.5">
                <Input
                  value={newPainPoint}
                  onChange={(e) => setNewPainPoint(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleArrayAdd('pain_points', newPainPoint, () => setNewPainPoint('')) }}}
                  placeholder="Add pain point..."
                  className="flex-1 bg-background border-border text-foreground text-xs h-8"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => handleArrayAdd('pain_points', newPainPoint, () => setNewPainPoint(''))} className="border-border h-8 w-8 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Solution */}
          <div className="bg-muted/20 rounded-lg p-3 border border-border">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="h-3 w-3 text-primary" />
              Solution
            </h4>
            <textarea
              value={entryEditForm.solution_text}
              onChange={(e) => setEntryEditForm(prev => ({ ...prev, solution_text: e.target.value }))}
              placeholder="Describe how it solves the problem..."
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent mb-2"
            />
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Key Features</label>
              <span className={`text-xs ${getCountColor(entryEditForm.key_features.length, FIELD_LIMITS.key_features.limit)}`}>
                {entryEditForm.key_features.length}/{FIELD_LIMITS.key_features.limit}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {entryEditForm.key_features.map((item, idx) => (
                <div key={idx} className="inline-flex items-center gap-1 bg-background border border-border rounded text-xs text-foreground">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleArrayUpdate('key_features', idx, e.target.value)}
                    className="bg-transparent border-none px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-0 min-w-[60px]"
                    style={{ width: `${Math.max(60, item.length * 7)}px` }}
                  />
                  <button onClick={() => handleArrayRemove('key_features', idx)} className="text-muted-foreground hover:text-red-400 pr-1">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {entryEditForm.key_features.length < FIELD_LIMITS.key_features.limit && (
              <div className="flex gap-1.5">
                <Input
                  value={newKeyFeature}
                  onChange={(e) => setNewKeyFeature(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleArrayAdd('key_features', newKeyFeature, () => setNewKeyFeature('')) }}}
                  placeholder="Add key feature..."
                  className="flex-1 bg-background border-border text-foreground text-xs h-8"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => handleArrayAdd('key_features', newKeyFeature, () => setNewKeyFeature(''))} className="border-border h-8 w-8 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Target Buyer */}
          <div className="bg-muted/20 rounded-lg p-3 border border-border">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <Target className="h-3 w-3 text-primary" />
              Target Buyer
            </h4>
            <textarea
              value={entryEditForm.target_buyer_text}
              onChange={(e) => setEntryEditForm(prev => ({ ...prev, target_buyer_text: e.target.value }))}
              placeholder="Describe your ideal buyer..."
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent mb-2"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Job Titles</label>
                  <span className={`text-xs ${getCountColor(entryEditForm.target_titles.length, FIELD_LIMITS.target_titles.limit)}`}>
                    {entryEditForm.target_titles.length}/{FIELD_LIMITS.target_titles.limit}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {entryEditForm.target_titles.map((item, idx) => (
                    <div key={idx} className="inline-flex items-center gap-1 bg-background border border-border rounded text-xs text-foreground">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleArrayUpdate('target_titles', idx, e.target.value)}
                        className="bg-transparent border-none px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-0 min-w-[40px]"
                        style={{ width: `${Math.max(40, item.length * 7)}px` }}
                      />
                      <button onClick={() => handleArrayRemove('target_titles', idx)} className="text-muted-foreground hover:text-red-400 pr-1">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {entryEditForm.target_titles.length < FIELD_LIMITS.target_titles.limit && (
                  <div className="flex gap-1">
                    <Input
                      value={newTargetTitle}
                      onChange={(e) => setNewTargetTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleArrayAdd('target_titles', newTargetTitle, () => setNewTargetTitle('')) }}}
                      placeholder="Add title..."
                      className="flex-1 bg-background border-border text-foreground text-xs h-7"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => handleArrayAdd('target_titles', newTargetTitle, () => setNewTargetTitle(''))} className="border-border h-7 w-7 p-0">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Industries</label>
                  <span className={`text-xs ${getCountColor(entryEditForm.target_industries.length, FIELD_LIMITS.target_industries.limit)}`}>
                    {entryEditForm.target_industries.length}/{FIELD_LIMITS.target_industries.limit}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {entryEditForm.target_industries.map((item, idx) => (
                    <div key={idx} className="inline-flex items-center gap-1 bg-background border border-border rounded text-xs text-foreground">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleArrayUpdate('target_industries', idx, e.target.value)}
                        className="bg-transparent border-none px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-0 min-w-[40px]"
                        style={{ width: `${Math.max(40, item.length * 7)}px` }}
                      />
                      <button onClick={() => handleArrayRemove('target_industries', idx)} className="text-muted-foreground hover:text-red-400 pr-1">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {entryEditForm.target_industries.length < FIELD_LIMITS.target_industries.limit && (
                  <div className="flex gap-1">
                    <Input
                      value={newTargetIndustry}
                      onChange={(e) => setNewTargetIndustry(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleArrayAdd('target_industries', newTargetIndustry, () => setNewTargetIndustry('')) }}}
                      placeholder="Add industry..."
                      className="flex-1 bg-background border-border text-foreground text-xs h-7"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => handleArrayAdd('target_industries', newTargetIndustry, () => setNewTargetIndustry(''))} className="border-border h-7 w-7 p-0">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Code + Execute */}
        <div className="space-y-4">
          {/* Language Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex bg-background rounded-lg p-1">
              {(['curl', 'node', 'python'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setState(prev => ({ ...prev, language: lang }))}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    state.language === lang
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lang === 'curl' ? 'cURL' : lang === 'node' ? 'Node.js' : 'Python'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer" title={showingPlaceholders ? 'Showing template with [placeholders] - edit fields to see real values' : 'Show full request body'}>
                <input
                  type="checkbox"
                  checked={showFullCode}
                  onChange={(e) => setShowFullCode(e.target.checked)}
                  className="w-3 h-3 rounded border-border bg-background text-primary focus:ring-primary"
                />
                {showingPlaceholders ? 'Template' : 'Full content'}
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyCode}
                className="text-muted-foreground"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Placeholder Warning */}
          {showingPlaceholders && (
            <div className="bg-yellow-400 rounded-lg px-3 py-2 text-xs text-black font-medium flex items-center gap-2">
              <AlertCircle className="h-3 w-3" />
              Showing template with [placeholders]. Edit fields on the left to see real values.
            </div>
          )}

          {/* Code Block */}
          <div className={`bg-background rounded-lg p-4 overflow-x-auto border max-h-[350px] overflow-y-auto ${showingPlaceholders ? 'border-yellow-500/30' : 'border-border'}`}>
            <pre className="text-sm text-foreground font-mono whitespace-pre-wrap">
              {step5Code[state.language]}
            </pre>
          </div>

          {/* Execute Button */}
          <Button
            onClick={executeStep}
            disabled={executing || !state.accessKey || showingPlaceholders || fetchingEntry}
            className="w-full bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-500"
          >
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : fetchingEntry ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading entry...
              </>
            ) : showingPlaceholders ? (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Edit fields to enable
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Approve Entry
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Success</span>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(response, null, 2)); setCopiedResponse(true); setTimeout(() => setCopiedResponse(false), 2000) }}
                  className="p-1 text-muted-foreground hover:text-foreground hover:scale-110 transition-all"
                >
                  {copiedResponse ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <pre className="text-xs text-foreground font-mono whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
              <button
                onClick={() => setExpandedResponse(response)}
                className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-foreground hover:scale-125 transition-all"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Next Step Button */}
          {state.completedSteps.includes(5) && (
            <Button
              variant="outline"
              onClick={goToNextStep}
              className="w-full border-border"
            >
              Continue to Step 6
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Render standard API step
  const renderApiStep = () => {
    const step = currentStepConfig
    const storedResponse = stepResponses[state.currentStep]

    // Check if current step should show locked view when completed
    const lockedSteps: Record<number, { message: string; nextStep: number }> = {
      4: { message: 'Product has been added', nextStep: 5 },
      6: { message: 'Products have been listed', nextStep: 7 },
      7: { message: 'ICP has been created', nextStep: 8 },
      9: { message: 'ICPs have been listed', nextStep: 10 },
      10: { message: 'Website has been created', nextStep: 11 },
      11: { message: 'Websites have been listed', nextStep: 0 },
    }

    const lockedConfig = lockedSteps[state.currentStep]
    const isLockedStep = lockedConfig && state.completedSteps.includes(state.currentStep)

    // If this is a completed "create" step, show locked view
    if (isLockedStep) {
      const code = generateCodeExample(step)[state.language]
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-lg p-3">
            <Lock className="h-4 w-4" />
            <span>Step completed - {lockedConfig.message}</span>
          </div>

          {/* Code display */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Request</span>
              <button
                onClick={() => { navigator.clipboard.writeText(code); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000) }}
                className="p-1 text-muted-foreground hover:text-foreground hover:scale-110 transition-all"
              >
                {copiedCode ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto opacity-75">
              <code className="text-foreground whitespace-pre-wrap break-all">
                {code}
              </code>
            </pre>
          </div>

          {/* Response display */}
          {storedResponse && (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Response</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(storedResponse, null, 2)); setCopiedResponse(true); setTimeout(() => setCopiedResponse(false), 2000) }}
                  className="p-1 text-muted-foreground hover:text-foreground hover:scale-110 transition-all"
                >
                  {copiedResponse ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="relative mt-2">
                <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto max-h-60 overflow-y-auto">
                  <code className="text-blue-400 whitespace-pre-wrap break-all">
                    {JSON.stringify(storedResponse, null, 2)}
                  </code>
                </pre>
                <button
                  onClick={() => setExpandedResponse(storedResponse)}
                  className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-foreground hover:scale-125 transition-all"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Install Tracking Script button for step 10 locked view */}
          {state.currentStep === 10 && (
            <Button
              onClick={() => setShowIntegrationHelp(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Code className="h-4 w-4 mr-2" />
              Install Tracking Script
            </Button>
          )}

          {lockedConfig.nextStep === 0 ? (
            <Button
              onClick={() => setShowCongrats(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Setup
            </Button>
          ) : (
            <Button
              onClick={goToNextStep}
              className="w-full bg-primary text-primary-foreground"
            >
              Continue to Step {lockedConfig.nextStep}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 gap-6">
        {/* Left: What / Why */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">What This Does</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Why It Matters</h3>
            <p className="text-sm text-muted-foreground">{step.why}</p>
          </div>

          {/* Step-specific inputs */}
          {state.currentStep === 4 && (
            <div className="space-y-4">
              {/* Knowledge Type Selector */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Knowledge Type</label>
                <div className="flex bg-background rounded-lg p-1 border border-border">
                  <button
                    type="button"
                    onClick={() => setKnowledgeType('product')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      knowledgeType === 'product'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Package className="h-4 w-4 inline mr-2" />
                    Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setKnowledgeType('service')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      knowledgeType === 'service'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Target className="h-4 w-4 inline mr-2" />
                    Service
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {knowledgeType === 'product'
                    ? 'A tangible or digital product you sell'
                    : 'A service offering you provide to clients'}
                </p>
              </div>

              {/* URL Input */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  {knowledgeType === 'product' ? 'Product' : 'Service'} URL
                </label>
                <Input
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder={knowledgeType === 'product' ? 'https://example.com/product' : 'https://example.com/services'}
                  className="bg-background border-border"
                />
              </div>
            </div>
          )}
          {state.currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Optional Filters</h4>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeUserIdFilter}
                    onChange={(e) => setIncludeUserIdFilter(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <code className="text-primary text-sm">user_id</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Filter products to only those created by a specific user connected to your API key.
                    </p>
                    {includeUserIdFilter && state.userId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Using: <code className="text-primary">{state.userId}</code>
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}
          {state.currentStep === 7 && (
            <div className="space-y-4">
              {/* Product Link - Required */}
              <div className="bg-muted/30 rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Linked Product</span>
                  <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Required</span>
                </div>
                {state.productId ? (
                  <p className="text-xs text-muted-foreground">
                    Entry ID: <code className="text-primary">{state.productId}</code>
                  </p>
                ) : (
                  <p className="text-xs text-red-400">
                    Complete Step 4 first to add a product
                  </p>
                )}
              </div>

              <div className="bg-muted/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-foreground">
                  All fields are optional. The AI will generate your complete ICP based on your linked product.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Provide as much or as little context as you'd like — leave fields blank and the AI will fill them in.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">ICP Name</label>
                  <Input
                    value={icpTitle}
                    onChange={(e) => setIcpTitle(e.target.value)}
                    placeholder="e.g. SaaS Founders"
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">ICP Description</label>
                  <Input
                    value={icpDescription}
                    onChange={(e) => setIcpDescription(e.target.value)}
                    placeholder="e.g. Founders of B2B SaaS companies..."
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Job Titles</label>
                  <Input
                    value={icpJobTitles}
                    onChange={(e) => setIcpJobTitles(e.target.value)}
                    placeholder="e.g. CTO, VP Engineering, Head of Product"
                    className="bg-background border-border text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Pain Points</label>
                  <Input
                    value={icpPainPoints}
                    onChange={(e) => setIcpPainPoints(e.target.value)}
                    placeholder="e.g. Scaling challenges, tech debt, hiring"
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Value Drivers</label>
                  <Input
                    value={icpValueDrivers}
                    onChange={(e) => setIcpValueDrivers(e.target.value)}
                    placeholder="e.g. Efficiency, cost savings, growth"
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Industry Focus</label>
                  <Input
                    value={icpIndustryFocus}
                    onChange={(e) => setIcpIndustryFocus(e.target.value)}
                    placeholder="e.g. SaaS, FinTech, HealthTech"
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Company Characteristics</label>
                  <Input
                    value={icpCompanyCharacteristics}
                    onChange={(e) => setIcpCompanyCharacteristics(e.target.value)}
                    placeholder="e.g. 10-50 employees, Series A, remote-first"
                    className="bg-background border-border text-sm"
                  />
                </div>
              </div>
            </div>
          )}
          {state.currentStep === 9 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Optional Filters</h4>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeIcpUserIdFilter}
                    onChange={(e) => setIncludeIcpUserIdFilter(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <code className="text-primary text-sm">user_id</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Filter ICPs to only those created by a specific user connected to your API key.
                    </p>
                    {includeIcpUserIdFilter && state.userId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Using: <code className="text-primary">{state.userId}</code>
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}
          {state.currentStep === 10 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Website URL <span className="text-red-400">*</span>
                </label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://mysite.com"
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Domain will be normalized (e.g., https://www.example.com → example.com)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Website Name (Optional)</label>
                <Input
                  value={websiteName}
                  onChange={(e) => setWebsiteName(e.target.value)}
                  placeholder="My Website"
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Display name for this website. Defaults to domain if not provided.
                </p>
              </div>

              {state.icpId && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Link ICP (Optional)</h4>
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                    <input
                      type="checkbox"
                      checked={linkIcpToWebsite}
                      onChange={(e) => setLinkIcpToWebsite(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                    />
                    <div className="flex-1">
                      <span className="text-sm">Link ICP #{state.icpId} to this website</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Connect your ICP to this website for visitor scoring
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Required values warning */}
          {!state.accessKey && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                Complete Step 1 first to get your API key
              </div>
            </div>
          )}
        </div>

        {/* Right: Code + Execute */}
        <div className="space-y-4">
          {/* Language Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex bg-background rounded-lg p-1">
              {(['curl', 'node', 'python'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setState(prev => ({ ...prev, language: lang }))}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    state.language === lang
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lang === 'curl' ? 'cURL' : lang === 'node' ? 'Node.js' : 'Python'}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyCode}
              className="text-muted-foreground"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Code Block */}
          <div className="bg-background rounded-lg p-4 overflow-x-auto border border-border">
            <pre className="text-sm text-foreground font-mono whitespace-pre-wrap">
              {generateCodeExample(step)[state.language]}
            </pre>
          </div>

          {/* Execute Button */}
          {(() => {
            const isLockableStep = [4, 6, 7, 9, 10, 11].includes(state.currentStep)
            const hasResponse = !!response
            const isDisabled = executing || !state.accessKey || (isLockableStep && hasResponse)

            return (
              <Button
                onClick={executeStep}
                disabled={isDisabled}
                className={`w-full ${hasResponse && isLockableStep ? 'bg-green-600 hover:bg-green-600' : 'bg-primary'} text-primary-foreground`}
              >
                {executing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : hasResponse && isLockableStep ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Completed
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run This Step
                  </>
                )}
              </Button>
            )
          })()}

          {/* Processing time note for AI-heavy steps */}
          {executing && (state.currentStep === 4 || state.currentStep === 7) && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {state.currentStep === 4
                    ? 'AI is researching and generating content. This typically takes ~1 minute...'
                    : 'AI is generating ICP criteria. This typically takes ~1 minute...'}
                </span>
              </div>
            </div>
          )}

          {/* Response/Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {response && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Success</span>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(response, null, 2)); setCopiedResponse(true); setTimeout(() => setCopiedResponse(false), 2000) }}
                  className="p-1 text-muted-foreground hover:text-foreground hover:scale-110 transition-all"
                >
                  {copiedResponse ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <pre className="text-xs text-foreground font-mono whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
              <button
                onClick={() => setExpandedResponse(response)}
                className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-foreground hover:scale-125 transition-all"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Integration Help Button - Step 10 only */}
          {state.currentStep === 10 && response && (
            <Button
              onClick={() => setShowIntegrationHelp(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Code className="h-4 w-4 mr-2" />
              Install Tracking Script
            </Button>
          )}

          {/* Next Step Button */}
          {state.completedSteps.includes(state.currentStep) && state.currentStep < 11 && (
            <Button
              variant="outline"
              onClick={goToNextStep}
              className="w-full border-border"
            >
              Continue to Step {state.currentStep + 1}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Render Step 8: Approve ICP with editable sections (2-column layout)
  const renderStep8Form = () => {
    const step = currentStepConfig
    const step8Code = generateStep8Code()
    const isCompleted = state.completedSteps.includes(8)
    const storedResponse = stepResponses[8]

    // If completed, show locked view
    if (isCompleted) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-lg p-3">
            <Lock className="h-4 w-4" />
            <span>Step completed - ICP has been approved</span>
          </div>

          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Request</span>
            <pre className="mt-2 bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto opacity-75">
              <code className="text-foreground whitespace-pre-wrap break-all">
                {step8Code[state.language]}
              </code>
            </pre>
          </div>

          {storedResponse && (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Response</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(storedResponse, null, 2)); setCopiedResponse(true); setTimeout(() => setCopiedResponse(false), 2000) }}
                  className="p-1 text-muted-foreground hover:text-foreground hover:scale-110 transition-all"
                >
                  {copiedResponse ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="relative mt-2">
                <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto max-h-60 overflow-y-auto">
                  <code className="text-blue-400 whitespace-pre-wrap break-all">
                    {JSON.stringify(storedResponse, null, 2)}
                  </code>
                </pre>
                <button
                  onClick={() => setExpandedResponse(storedResponse)}
                  className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-foreground hover:scale-125 transition-all"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <Button onClick={goToNextStep} className="w-full bg-primary text-primary-foreground">
            Continue to Step 9
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )
    }

    // Loading state
    if (fetchingIcp) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading ICP data...</span>
        </div>
      )
    }

    // Error state
    if (fetchIcpError) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Error loading ICP</span>
          </div>
          <p className="text-sm text-red-400">{fetchIcpError}</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Editable ICP Form */}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">What This Does</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Why It Matters</h3>
            <p className="text-sm text-muted-foreground">{step.why}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
            <Info className="h-3 w-3" />
            <span>Edit fields below to see the API request update on the right.</span>
          </div>

          {/* ICP Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">ICP Name</label>
              <span className={`text-xs ${getCountColor(icpEditForm.icp_name.length, ICP_FIELD_LIMITS.icp_name.limit)}`}>
                {icpEditForm.icp_name.length}/{ICP_FIELD_LIMITS.icp_name.limit}
              </span>
            </div>
            <Input
              value={icpEditForm.icp_name}
              onChange={(e) => {
                if (e.target.value.length <= ICP_FIELD_LIMITS.icp_name.limit) {
                  setIcpEditForm(prev => ({ ...prev, icp_name: e.target.value }))
                }
              }}
              className="bg-background border-border text-foreground text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">Description</label>
              <span className={`text-xs ${getCountColor(icpEditForm.description.length, ICP_FIELD_LIMITS.description.limit)}`}>
                {icpEditForm.description.length}/{ICP_FIELD_LIMITS.description.limit}
              </span>
            </div>
            <textarea
              value={icpEditForm.description}
              onChange={(e) => {
                if (e.target.value.length <= ICP_FIELD_LIMITS.description.limit) {
                  setIcpEditForm(prev => ({ ...prev, description: e.target.value }))
                }
              }}
              rows={4}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none"
            />
          </div>

          {/* Job Titles */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">Job Titles</label>
              <span className={`text-xs ${getCountColor(icpEditForm.job_titles.length, ICP_FIELD_LIMITS.job_titles.limit)}`}>
                {icpEditForm.job_titles.length}/{ICP_FIELD_LIMITS.job_titles.limit} items
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {icpEditForm.job_titles.map((item, idx) => (
                <div key={idx} className="inline-flex items-center gap-1 bg-background border border-border rounded text-xs">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleIcpArrayUpdate('job_titles', idx, e.target.value)}
                    className="bg-transparent border-none px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-0 min-w-[60px]"
                    style={{ width: `${Math.max(60, item.length * 7)}px` }}
                  />
                  <button onClick={() => handleIcpArrayRemove('job_titles', idx)} className="text-muted-foreground hover:text-red-400 pr-1">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
            {icpEditForm.job_titles.length < ICP_FIELD_LIMITS.job_titles.limit && (
              <div className="flex gap-1">
                <Input
                  value={newIcpJobTitle}
                  onChange={(e) => setNewIcpJobTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleIcpArrayAdd('job_titles', newIcpJobTitle, () => setNewIcpJobTitle('')) }}}
                  placeholder="Add job title..."
                  className="flex-1 bg-background border-border text-xs h-7"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => handleIcpArrayAdd('job_titles', newIcpJobTitle, () => setNewIcpJobTitle(''))} className="h-7 w-7 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Pain Points */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">Pain Points</label>
              <span className={`text-xs ${getCountColor(icpEditForm.pain_points.length, ICP_FIELD_LIMITS.pain_points.limit)}`}>
                {icpEditForm.pain_points.length}/{ICP_FIELD_LIMITS.pain_points.limit} items
              </span>
            </div>
            <div className="space-y-1 mb-2">
              {icpEditForm.pain_points.map((item, idx) => (
                <div key={idx} className="flex items-start gap-1 text-xs bg-background border border-border rounded p-1.5">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleIcpArrayUpdate('pain_points', idx, e.target.value)}
                    className="flex-1 bg-transparent border-none text-xs text-foreground focus:outline-none focus:ring-0"
                  />
                  <button onClick={() => handleIcpArrayRemove('pain_points', idx)} className="text-muted-foreground hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {icpEditForm.pain_points.length < ICP_FIELD_LIMITS.pain_points.limit && (
              <div className="flex gap-1">
                <Input
                  value={newIcpPainPoint}
                  onChange={(e) => setNewIcpPainPoint(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleIcpArrayAdd('pain_points', newIcpPainPoint, () => setNewIcpPainPoint('')) }}}
                  placeholder="Add pain point..."
                  className="flex-1 bg-background border-border text-xs h-7"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => handleIcpArrayAdd('pain_points', newIcpPainPoint, () => setNewIcpPainPoint(''))} className="h-7 w-7 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Value Drivers */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">Value Drivers</label>
              <span className={`text-xs ${getCountColor(icpEditForm.value_drivers.length, ICP_FIELD_LIMITS.value_drivers.limit)}`}>
                {icpEditForm.value_drivers.length}/{ICP_FIELD_LIMITS.value_drivers.limit} items
              </span>
            </div>
            <div className="space-y-1 mb-2">
              {icpEditForm.value_drivers.map((item, idx) => (
                <div key={idx} className="flex items-start gap-1 text-xs bg-background border border-border rounded p-1.5">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleIcpArrayUpdate('value_drivers', idx, e.target.value)}
                    className="flex-1 bg-transparent border-none text-xs text-foreground focus:outline-none focus:ring-0"
                  />
                  <button onClick={() => handleIcpArrayRemove('value_drivers', idx)} className="text-muted-foreground hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {icpEditForm.value_drivers.length < ICP_FIELD_LIMITS.value_drivers.limit && (
              <div className="flex gap-1">
                <Input
                  value={newIcpValueDriver}
                  onChange={(e) => setNewIcpValueDriver(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleIcpArrayAdd('value_drivers', newIcpValueDriver, () => setNewIcpValueDriver('')) }}}
                  placeholder="Add value driver..."
                  className="flex-1 bg-background border-border text-xs h-7"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => handleIcpArrayAdd('value_drivers', newIcpValueDriver, () => setNewIcpValueDriver(''))} className="h-7 w-7 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Industry Focus */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">Industry Focus</label>
              <span className={`text-xs ${getCountColor(icpEditForm.industry_focus.length, ICP_FIELD_LIMITS.industry_focus.limit)}`}>
                {icpEditForm.industry_focus.length}/{ICP_FIELD_LIMITS.industry_focus.limit} items
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {icpEditForm.industry_focus.map((item, idx) => (
                <div key={idx} className="inline-flex items-center gap-1 bg-background border border-border rounded text-xs">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleIcpArrayUpdate('industry_focus', idx, e.target.value)}
                    className="bg-transparent border-none px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-0 min-w-[60px]"
                    style={{ width: `${Math.max(60, item.length * 7)}px` }}
                  />
                  <button onClick={() => handleIcpArrayRemove('industry_focus', idx)} className="text-muted-foreground hover:text-red-400 pr-1">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
            {icpEditForm.industry_focus.length < ICP_FIELD_LIMITS.industry_focus.limit && (
              <div className="flex gap-1">
                <Input
                  value={newIcpIndustry}
                  onChange={(e) => setNewIcpIndustry(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleIcpArrayAdd('industry_focus', newIcpIndustry, () => setNewIcpIndustry('')) }}}
                  placeholder="Add industry..."
                  className="flex-1 bg-background border-border text-xs h-7"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => handleIcpArrayAdd('industry_focus', newIcpIndustry, () => setNewIcpIndustry(''))} className="h-7 w-7 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Company Characteristics */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">Company Characteristics</label>
              <span className={`text-xs ${getCountColor(icpEditForm.company_characteristics.length, ICP_FIELD_LIMITS.company_characteristics.limit)}`}>
                {icpEditForm.company_characteristics.length}/{ICP_FIELD_LIMITS.company_characteristics.limit}
              </span>
            </div>
            <textarea
              value={icpEditForm.company_characteristics}
              onChange={(e) => {
                if (e.target.value.length <= ICP_FIELD_LIMITS.company_characteristics.limit) {
                  setIcpEditForm(prev => ({ ...prev, company_characteristics: e.target.value }))
                }
              }}
              rows={2}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground resize-none"
            />
          </div>

          {/* Company Size Range */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">Company Size Range</label>
              <span className={`text-xs ${getCountColor(icpEditForm.company_size_range.length, ICP_FIELD_LIMITS.company_size_range.limit)}`}>
                {icpEditForm.company_size_range.length}/{ICP_FIELD_LIMITS.company_size_range.limit}
              </span>
            </div>
            <Input
              value={icpEditForm.company_size_range}
              onChange={(e) => {
                if (e.target.value.length <= ICP_FIELD_LIMITS.company_size_range.limit) {
                  setIcpEditForm(prev => ({ ...prev, company_size_range: e.target.value }))
                }
              }}
              className="bg-background border-border text-xs"
            />
          </div>

          {/* Geographic Focus */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">Geographic Focus</label>
              <span className={`text-xs ${getCountColor(icpEditForm.geographic_focus.length, ICP_FIELD_LIMITS.geographic_focus.limit)}`}>
                {icpEditForm.geographic_focus.length}/{ICP_FIELD_LIMITS.geographic_focus.limit}
              </span>
            </div>
            <Input
              value={icpEditForm.geographic_focus}
              onChange={(e) => {
                if (e.target.value.length <= ICP_FIELD_LIMITS.geographic_focus.limit) {
                  setIcpEditForm(prev => ({ ...prev, geographic_focus: e.target.value }))
                }
              }}
              className="bg-background border-border text-xs"
            />
          </div>

          {/* Budget Range */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">Budget Range</label>
              <span className={`text-xs ${getCountColor(icpEditForm.budget_range.length, ICP_FIELD_LIMITS.budget_range.limit)}`}>
                {icpEditForm.budget_range.length}/{ICP_FIELD_LIMITS.budget_range.limit}
              </span>
            </div>
            <Input
              value={icpEditForm.budget_range}
              onChange={(e) => {
                if (e.target.value.length <= ICP_FIELD_LIMITS.budget_range.limit) {
                  setIcpEditForm(prev => ({ ...prev, budget_range: e.target.value }))
                }
              }}
              className="bg-background border-border text-xs"
            />
          </div>

          {/* Decision Making Process */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">Decision Making Process</label>
              <span className={`text-xs ${getCountColor(icpEditForm.decision_making_process.length, ICP_FIELD_LIMITS.decision_making_process.limit)}`}>
                {icpEditForm.decision_making_process.length}/{ICP_FIELD_LIMITS.decision_making_process.limit}
              </span>
            </div>
            <textarea
              value={icpEditForm.decision_making_process}
              onChange={(e) => {
                if (e.target.value.length <= ICP_FIELD_LIMITS.decision_making_process.limit) {
                  setIcpEditForm(prev => ({ ...prev, decision_making_process: e.target.value }))
                }
              }}
              rows={2}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground resize-none"
            />
          </div>

          {/* Sales Cycle Length */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">Sales Cycle Length</label>
              <span className={`text-xs ${getCountColor(icpEditForm.sales_cycle_length.length, ICP_FIELD_LIMITS.sales_cycle_length.limit)}`}>
                {icpEditForm.sales_cycle_length.length}/{ICP_FIELD_LIMITS.sales_cycle_length.limit}
              </span>
            </div>
            <Input
              value={icpEditForm.sales_cycle_length}
              onChange={(e) => {
                if (e.target.value.length <= ICP_FIELD_LIMITS.sales_cycle_length.limit) {
                  setIcpEditForm(prev => ({ ...prev, sales_cycle_length: e.target.value }))
                }
              }}
              className="bg-background border-border text-xs"
            />
          </div>
        </div>

        {/* Right: Code + Execute */}
        <div className="space-y-4">
          {/* Language Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex bg-background rounded-lg p-1">
              {(['curl', 'node', 'python'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setState(prev => ({ ...prev, language: lang }))}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    state.language === lang
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lang === 'curl' ? 'cURL' : lang === 'node' ? 'Node.js' : 'Python'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer" title="Show all fields in the request body">
                <input
                  type="checkbox"
                  checked={showFullIcpCode}
                  onChange={(e) => setShowFullIcpCode(e.target.checked)}
                  className="w-3 h-3 rounded border-border bg-background text-primary focus:ring-primary"
                />
                Full content
              </label>
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(step8Code[state.language]); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="text-muted-foreground">
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Change indicator */}
          {hasIcpChanges ? (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
              <p className="text-xs text-gray-900">
                Only edited fields are sent in the request. Unchanged fields are not required.
              </p>
            </div>
          ) : showFullIcpCode ? (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
              <p className="text-xs text-blue-400">
                Showing placeholder template - edit fields on the left to see actual values
              </p>
            </div>
          ) : (
            <div className="bg-muted/30 border border-border rounded-lg p-2">
              <p className="text-xs text-muted-foreground">
                No changes made. Approving will activate the ICP as-is.
              </p>
            </div>
          )}

          {/* Code Block */}
          <div className="bg-background rounded-lg p-4 overflow-x-auto border border-border max-h-[40vh] overflow-y-auto">
            <pre className="text-xs text-foreground font-mono whitespace-pre-wrap">
              {step8Code[state.language]}
            </pre>
          </div>

          {/* Execute Button */}
          <Button
            onClick={executeStep}
            disabled={executing || !state.accessKey || !state.icpId}
            className="w-full bg-primary text-primary-foreground"
          >
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Approving ICP...
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Approve ICP
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">ICP Approved!</span>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(response, null, 2)); setCopiedResponse(true); setTimeout(() => setCopiedResponse(false), 2000) }}
                  className="p-1 text-muted-foreground hover:text-foreground hover:scale-110 transition-all"
                >
                  {copiedResponse ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <pre className="text-xs text-foreground font-mono whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
              <button
                onClick={() => setExpandedResponse(response)}
                className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-foreground hover:scale-125 transition-all"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1">
        <div className="border-b border-border bg-card">
          <div className="px-8 py-4">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src="/warm-logo.svg" alt="Warm AI" className="h-8 w-8" />
              <span className="font-semibold text-foreground">Warm AI</span>
            </a>
          </div>
        </div>
        <div className="p-8">
          {/* Progress bar */}
          <div className="bg-card rounded-lg p-4 border border-border mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {state.completedSteps.length} of 11 steps completed
              </span>
              <div className="flex items-center gap-3">
                {allCompleted && (
                  <span className="flex items-center gap-1.5 text-sm text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                    <Sparkles className="h-4 w-4" />
                    Complete!
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetWizard}
                  className="border-border"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(state.completedSteps.length / 11) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex gap-6">
            {/* Progress Sidebar */}
            <div className="w-64 shrink-0">
              <Card className="bg-card border-border sticky top-6">
                <CardContent className="p-4">
                  <div className="space-y-1">
                    {STEPS.map((step) => {
                      const isCompleted = state.completedSteps.includes(step.id)
                      const isCurrent = state.currentStep === step.id
                      // Step 3 is accessible if step 1 is complete (step 2 is a pass-through)
                      const maxStep = Math.max(...state.completedSteps, 0)
                      const isAccessible = step.id <= maxStep + 1 ||
                        (step.id === 3 && state.completedSteps.includes(1))
                      // Add dividers after steps 1, 3, 6, 9
                      const showDivider = [1, 3, 6, 9].includes(step.id)

                      return (
                        <div key={step.id}>
                          <button
                            onClick={() => goToStep(step.id)}
                            disabled={!isAccessible}
                            className={`
                              w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all
                              ${isCurrent ? 'bg-primary/20 text-primary' : ''}
                              ${isCompleted && !isCurrent ? 'text-green-400' : ''}
                              ${!isCompleted && !isCurrent ? 'text-muted-foreground' : ''}
                              ${isAccessible ? 'hover:bg-accent/10 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                            `}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                            ) : (
                              <Circle className={`h-5 w-5 shrink-0 ${isCurrent ? 'text-primary' : ''}`} />
                            )}
                            <span className="text-sm font-medium truncate">{step.title}</span>
                          </button>
                          {showDivider && <div className="my-2 border-t border-border/50" />}
                        </div>
                      )
                    })}
                  </div>

                  {/* Collected Values */}
                  {(state.accessKey || state.userId || state.productId || state.icpId || state.websiteId) && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Collected Values</h4>
                      <div className="space-y-2 text-xs">
                        {state.accessKey && (
                          <div className="bg-background rounded p-2">
                            <span className="text-muted-foreground">Access Key:</span>
                            <code className="ml-2 text-primary">{state.accessKey.slice(0, 12)}...</code>
                          </div>
                        )}
                        {state.userId && (
                          <div className="bg-background rounded p-2">
                            <span className="text-muted-foreground">User ID:</span>
                            <code className="ml-2 text-primary">{state.userId.slice(0, 8)}...</code>
                          </div>
                        )}
                        {state.productId && (
                          <div className="bg-background rounded p-2">
                            <span className="text-muted-foreground">Entry ID:</span>
                            <code className="ml-2 text-primary">{String(state.productId)}</code>
                          </div>
                        )}
                        {state.icpId && (
                          <div className="bg-background rounded p-2">
                            <span className="text-muted-foreground">ICP ID:</span>
                            <code className="ml-2 text-primary">{String(state.icpId)}</code>
                          </div>
                        )}
                        {state.websiteId && (
                          <div className="bg-background rounded p-2">
                            <span className="text-muted-foreground">Website ID:</span>
                            <code className="ml-2 text-primary">{state.websiteId.slice(0, 8)}...</code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {showCongrats ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="h-10 w-10 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Congratulations!</h2>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      You've completed all the steps to integrate with Warm AI. You now have an API key,
                      a product in your knowledge base, an ICP defined, and website tracking set up.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                      <Button variant="outline" onClick={resetWizard}>
                        Start Over
                      </Button>
                      <Button
                        className="bg-primary text-primary-foreground"
                        onClick={() => window.open('https://platform.warmai.uk', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Dashboard
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open('https://docs.warmai.uk/messaging-api/request-builder', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Documentation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    {/* Step Header */}
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
                      <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                        <currentStepConfig.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded mb-1 inline-block">
                          Step {state.currentStep} of 11
                        </span>
                        <h2 className="text-xl font-bold text-foreground">{currentStepConfig.title}</h2>
                      </div>
                    </div>

                    {/* Step Content */}
                    {state.currentStep === 1
                      ? renderStep1Form()
                      : state.currentStep === 2
                        ? renderStep2Form()
                        : state.currentStep === 5
                          ? renderStep5Form()
                          : state.currentStep === 8
                            ? renderStep8Form()
                            : renderApiStep()}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Expanded Response Modal */}
      {expandedResponse && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
          onClick={() => setExpandedResponse(null)}
        >
          <div
            className="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Response</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(expandedResponse, null, 2)); setCopiedResponse(true); setTimeout(() => setCopiedResponse(false), 2000) }}
                  className="p-1 text-muted-foreground hover:text-foreground hover:scale-110 transition-all"
                >
                  {copiedResponse ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setExpandedResponse(null)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:scale-110 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <pre className="text-sm text-foreground font-mono whitespace-pre-wrap">
                {JSON.stringify(expandedResponse, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Integration Help Modal */}
      {showIntegrationHelp && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
          onClick={() => setShowIntegrationHelp(false)}
        >
          <div
            className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2 text-primary">
                <Code className="h-5 w-5" />
                <span className="font-semibold">Install Tracking Script</span>
              </div>
              <button
                onClick={() => setShowIntegrationHelp(false)}
                className="p-1 text-muted-foreground hover:text-foreground hover:scale-110 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1 space-y-4">
              {/* Method Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIntegrationMethod('direct')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    integrationMethod === 'direct'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Direct Script
                </button>
                <button
                  onClick={() => setIntegrationMethod('gtm')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    integrationMethod === 'gtm'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Google Tag Manager
                </button>
              </div>

              {integrationMethod === 'direct' ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Add this script to your website's <code className="bg-muted px-1 rounded">&lt;head&gt;</code> tag:
                  </p>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                    <p className="text-amber-700 dark:text-amber-300">
                      <strong>Using WordPress or a site builder?</strong> Rich-text editors, WP Rocket, Rocket Loader, and consent managers can silently break tracking.{' '}
                      <a
                        href="https://docs.warmai.uk/identification-api/websites#troubleshooting-install-issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:no-underline font-medium"
                      >
                        See troubleshooting guide →
                      </a>
                    </p>
                  </div>
                  <div className="relative">
                    <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
                      <code className="text-foreground">
{`<script src="https://cdn.warmai.uk/warm.js" data-id="${state.trackingId || response?.website?.tracking_id || 'YOUR_TRACKING_ID'}" async></script>`}
                      </code>
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`<script src="https://cdn.warmai.uk/warm.js" data-id="${state.trackingId || response?.website?.tracking_id || 'YOUR_TRACKING_ID'}" async></script>`)
                        setCopiedTrackingId(true)
                        setTimeout(() => setCopiedTrackingId(false), 2000)
                      }}
                      className="absolute top-2 right-2 p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-all"
                    >
                      {copiedTrackingId ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-400">
                      <strong>Recommended if using GTM.</strong> Using the official template avoids malware flags that can block Google Ads.
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong className="text-foreground">Step 1:</strong> In GTM, go to Templates → Search Gallery → search "Warm AI"</p>
                    <p><strong className="text-foreground">Step 2:</strong> Add the template, then create a new Tag using it</p>
                    <p><strong className="text-foreground">Step 3:</strong> Enter your Tracking ID:</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-4 py-2 rounded-lg text-foreground font-mono text-sm">
                      {state.trackingId || response?.website?.tracking_id || 'YOUR_TRACKING_ID'}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(state.trackingId || response?.website?.tracking_id || '')
                        setCopiedTrackingId(true)
                        setTimeout(() => setCopiedTrackingId(false), 2000)
                      }}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      {copiedTrackingId ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <a
                      href="https://tagmanager.google.com/gallery/#/?filter=Warm%20AI"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Search GTM Template Gallery
                    </a>
                  </div>

                  {/* Manual GitHub Install */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong className="text-foreground">Template not in gallery?</strong> Add manually via GitHub:
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>1. Download <code className="bg-muted px-1 rounded">template.tpl</code> from GitHub</p>
                      <p>2. In GTM, go to Templates → New → Import</p>
                      <p>3. Upload the .tpl file and save</p>
                      <p>4. Create a new Tag using the imported template</p>
                    </div>
                    <a
                      href="https://github.com/Nudge-AI-UK/warmai-gtm-template"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline mt-3"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Download from GitHub
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border">
              <Button
                onClick={() => setShowIntegrationHelp(false)}
                className="w-full"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
