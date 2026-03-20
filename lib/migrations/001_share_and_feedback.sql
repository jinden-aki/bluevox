-- ============================================================
-- BLUEVOX: Share Links & Feedback Migration
-- ============================================================
-- Run this SQL in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 共有リンク管理
CREATE TABLE share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  talent_id UUID REFERENCES talents(id),
  token TEXT UNIQUE NOT NULL,
  talent_name TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- フィードバック
CREATE TABLE feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_link_id UUID REFERENCES share_links(id),
  talent_id UUID REFERENCES talents(id),
  talent_name TEXT,
  feedback_type TEXT NOT NULL, -- 'text' | 'voice' | 'file'
  section_key TEXT, -- どのセクションへのフィードバックか（null=全体）
  content TEXT, -- テキスト内容 or 音声のテキスト化結果
  file_url TEXT, -- ファイルURL（Supabase Storage）
  file_name TEXT,
  file_type TEXT,
  status TEXT DEFAULT 'new', -- 'new' | 'read' | 'applied'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- share_linksはログインユーザーのみ管理可能
CREATE POLICY "Users can manage own share links" ON share_links
  FOR ALL USING (auth.uid() = user_id);

-- feedbacksは誰でもINSERT可能（トークン認証はアプリ側で実装）
CREATE POLICY "Anyone can insert feedback" ON feedbacks
  FOR INSERT WITH CHECK (true);

-- 管理者のみSELECT
CREATE POLICY "Only authenticated users can read feedback" ON feedbacks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 管理者のみUPDATE
CREATE POLICY "Only authenticated users can update feedback" ON feedbacks
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- share_linksの匿名読み取り（トークン検証用）
CREATE POLICY "Anyone can read active share links by token" ON share_links
  FOR SELECT USING (is_active = true);

-- ============================================================
-- Supabase Storage Setup (Manual Steps)
-- ============================================================
-- 1. Supabase管理画面 → Storage → 「New bucket」
-- 2. バケット名: feedbacks
-- 3. Public bucket: OFF（プライベート）
-- 4. File size limit: 5MB
-- 5. Allowed MIME types:
--    - image/jpeg
--    - image/png
--    - application/pdf
--    - application/vnd.openxmlformats-officedocument.wordprocessingml.document
-- ============================================================

-- Storage RLS policies (run after creating the bucket)
-- Allow anyone to upload to feedbacks bucket
CREATE POLICY "Anyone can upload feedback files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'feedbacks');

-- Allow authenticated users to read feedback files
CREATE POLICY "Authenticated users can read feedback files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'feedbacks' AND auth.uid() IS NOT NULL);

-- Allow anyone to read feedback files with the URL (for portal display)
CREATE POLICY "Anyone can read feedback files by path"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'feedbacks');
