import { supabase } from '@/lib/supabase';

/* ---------- Types ---------- */

export interface ShareLink {
  id: string;
  user_id: string;
  talent_id: string;
  token: string;
  talent_name: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  share_link_id: string;
  talent_id: string;
  talent_name: string;
  feedback_type: 'text' | 'voice' | 'file' | 'profile_update';
  section_key: string | null;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  status: 'new' | 'read' | 'applied';
  created_at: string;
}

/* ---------- Token Generation ---------- */

export function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/* ---------- Share Link CRUD ---------- */

export async function createShareLink(params: {
  talentId: string;
  talentName: string;
  expiresInDays: number | null; // null = no expiry
}): Promise<ShareLink | null> {
  const token = generateToken();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const expiresAt = params.expiresInDays
    ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from('share_links')
    .insert({
      user_id: user.id,
      talent_id: params.talentId,
      token,
      talent_name: params.talentName,
      is_active: true,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create share link:', error);
    return null;
  }

  return data as ShareLink;
}

export async function getShareLinksForTalent(talentId: string): Promise<ShareLink[]> {
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('talent_id', talentId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as ShareLink[];
}

export async function deactivateShareLink(linkId: string): Promise<boolean> {
  const { error } = await supabase
    .from('share_links')
    .update({ is_active: false })
    .eq('id', linkId);

  return !error;
}

/* ---------- Token Verification (public, no auth required) ---------- */

export async function verifyToken(token: string): Promise<{
  valid: boolean;
  shareLink?: ShareLink;
}> {
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single();

  if (error || !data) return { valid: false };

  const link = data as ShareLink;

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { valid: false };
  }

  return { valid: true, shareLink: link };
}

/* ---------- Feedback CRUD ---------- */

export async function submitFeedback(params: {
  shareLinkId: string;
  talentId: string;
  talentName: string;
  feedbackType: 'text' | 'voice' | 'file' | 'profile_update';
  sectionKey?: string | null;
  content?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}): Promise<boolean> {
  const { error } = await supabase
    .from('feedbacks')
    .insert({
      share_link_id: params.shareLinkId,
      talent_id: params.talentId,
      talent_name: params.talentName,
      feedback_type: params.feedbackType,
      section_key: params.sectionKey || null,
      content: params.content || null,
      file_url: params.fileUrl || null,
      file_name: params.fileName || null,
      file_type: params.fileType || null,
      status: 'new',
    });

  if (error) console.error('Failed to submit feedback:', error);
  return !error;
}

export async function getFeedbacksForShareLink(shareLinkId: string): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from('feedbacks')
    .select('*')
    .eq('share_link_id', shareLinkId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as Feedback[];
}

export async function getFeedbacksForTalent(talentId: string): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from('feedbacks')
    .select('*')
    .eq('talent_id', talentId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as Feedback[];
}

export async function getUnreadFeedbackCount(talentId: string): Promise<number> {
  const { count, error } = await supabase
    .from('feedbacks')
    .select('*', { count: 'exact', head: true })
    .eq('talent_id', talentId)
    .eq('status', 'new');

  if (error) return 0;
  return count || 0;
}

export async function getUnreadFeedbackCounts(talentIds: string[]): Promise<Record<string, number>> {
  if (talentIds.length === 0) return {};

  const { data, error } = await supabase
    .from('feedbacks')
    .select('talent_id')
    .in('talent_id', talentIds)
    .eq('status', 'new');

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  data.forEach((fb: { talent_id: string }) => {
    counts[fb.talent_id] = (counts[fb.talent_id] || 0) + 1;
  });
  return counts;
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: 'new' | 'read' | 'applied'
): Promise<boolean> {
  const { error } = await supabase
    .from('feedbacks')
    .update({ status })
    .eq('id', feedbackId);

  return !error;
}

/* ---------- File Upload ---------- */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadFeedbackFile(
  file: File,
  talentId: string
): Promise<{ url: string; path: string } | null> {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${talentId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  // Try Supabase Storage first
  const { error } = await supabase.storage
    .from('feedbacks')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (!error) {
    const { data: urlData } = supabase.storage
      .from('feedbacks')
      .getPublicUrl(path);
    return { url: urlData.publicUrl, path };
  }

  // Fallback: encode as Base64 data URI
  console.warn('Storage upload failed, falling back to Base64:', error);
  try {
    const base64 = await fileToBase64(file);
    return { url: base64, path: `base64:${file.name}` };
  } catch (b64Error) {
    console.error('Base64 fallback also failed:', b64Error);
    return null;
  }
}
