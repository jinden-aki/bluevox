import { supabase } from '@/lib/supabase';

/**
 * Get the Claude API key for the current authenticated user
 * from the app_settings table (api_key_encrypted column).
 */
export async function getApiKey(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('app_settings')
    .select('api_key_encrypted')
    .eq('user_id', user.id)
    .single();

  return data?.api_key_encrypted || null;
}
