import { supabase } from '@/integrations/supabase/client'

const PLATFORM_URL = 'https://platform.warmai.uk'

/**
 * Navigate to the platform with a magic link token so the session transfers
 * across domains. Falls back to direct redirect if token generation fails.
 */
export async function navigateToPlatform() {
  try {
    // Check session exists before calling edge function
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = PLATFORM_URL
      return
    }

    const { data, error } = await supabase.functions.invoke('generate-onboarding-token')

    if (!error && data?.token_hash) {
      // Platform's AuthContext will pick up token_hash and establish session
      window.location.href = `${PLATFORM_URL}?token_hash=${data.token_hash}`
      return
    }

    console.error('Failed to generate platform token:', error)
  } catch (err) {
    console.error('navigateToPlatform error:', err)
  }

  // Fallback: redirect without token (user will need to log in)
  window.location.href = PLATFORM_URL
}
