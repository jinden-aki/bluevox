-- ============================================================
-- BLUEVOX Database Migration v1
-- Run this in Supabase SQL Editor
-- ============================================================

-- Sessions (面談記録)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  talent_name TEXT NOT NULL,
  company TEXT,
  years INTEGER,
  memo TEXT,
  pcm_types JSONB DEFAULT '{}',
  mss JSONB DEFAULT '{}',
  lv TEXT,
  talent_type TEXT,
  kanda_memo TEXT,
  kanda_direct_eval JSONB DEFAULT '{}',
  status TEXT DEFAULT 'new' CHECK (status IN ('new','analyzing','review','ready','d-ng','d-gem','deleted')),
  analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Talents (人材)
CREATE TABLE IF NOT EXISTS talents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  company TEXT,
  status TEXT DEFAULT 'review' CHECK (status IN ('new','analyzing','review','ready','d-ng','d-gem','deleted')),
  analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Matchings (マッチング管理)
CREATE TABLE IF NOT EXISTS matchings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  talent_id UUID REFERENCES talents(id) ON DELETE CASCADE,
  talent_name TEXT,
  client_name TEXT,
  client_company TEXT,
  status TEXT DEFAULT 'introduced' CHECK (status IN ('introduced','interviewing','closed','rejected')),
  revenue INTEGER DEFAULT 0,
  job_match_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Job Match Results (案件検索キャッシュ)
CREATE TABLE IF NOT EXISTS job_match_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  talent_id UUID REFERENCES talents(id) ON DELETE CASCADE,
  talent_name TEXT,
  keywords TEXT,
  results JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Jinden Thoughts (思想DB)
CREATE TABLE IF NOT EXISTS jinden_thoughts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN ('beliefs','judgments','phrases','questions','tone','metaphors','taboos','self_patterns')),
  content TEXT NOT NULL,
  evidence TEXT,
  context TEXT,
  meaning TEXT,
  reason TEXT,
  trigger TEXT,
  countermeasure TEXT,
  sort_order INTEGER DEFAULT 0,
  added_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- App Settings (設定)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  settings JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Enable Row Level Security on all tables
-- ============================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE talents ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE jinden_thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies: authenticated users can only access own data
-- ============================================================

-- Sessions policies
CREATE POLICY "sessions_select_own" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own" ON sessions FOR DELETE USING (auth.uid() = user_id);

-- Talents policies
CREATE POLICY "talents_select_own" ON talents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "talents_insert_own" ON talents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "talents_update_own" ON talents FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "talents_delete_own" ON talents FOR DELETE USING (auth.uid() = user_id);

-- Matchings policies
CREATE POLICY "matchings_select_own" ON matchings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "matchings_insert_own" ON matchings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "matchings_update_own" ON matchings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "matchings_delete_own" ON matchings FOR DELETE USING (auth.uid() = user_id);

-- Job match results policies
CREATE POLICY "jmr_select_own" ON job_match_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "jmr_insert_own" ON job_match_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jmr_update_own" ON job_match_results FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jmr_delete_own" ON job_match_results FOR DELETE USING (auth.uid() = user_id);

-- Jinden thoughts policies
CREATE POLICY "jt_select_own" ON jinden_thoughts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "jt_insert_own" ON jinden_thoughts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jt_update_own" ON jinden_thoughts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jt_delete_own" ON jinden_thoughts FOR DELETE USING (auth.uid() = user_id);

-- App settings policies
CREATE POLICY "settings_select_own" ON app_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settings_insert_own" ON app_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update_own" ON app_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_talents_updated_at BEFORE UPDATE ON talents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_matchings_updated_at BEFORE UPDATE ON matchings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- Supabase Storage bucket for profile images
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('talent-images', 'talent-images', false) ON CONFLICT DO NOTHING;

CREATE POLICY "talent_images_select_own" ON storage.objects FOR SELECT USING (bucket_id = 'talent-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "talent_images_insert_own" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'talent-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "talent_images_delete_own" ON storage.objects FOR DELETE USING (bucket_id = 'talent-images' AND auth.uid()::text = (storage.foldername(name))[1]);
