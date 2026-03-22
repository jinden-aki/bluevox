-- ============================================================
-- BLUEVOX Migration v5: Talent Segment（4属性セグメント）
-- Supabase SQL Editorで手動実行
-- ============================================================

-- 1. sessions テーブルに segment カラム追加
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'ca'
  CHECK (segment IN ('ca', 'top_company', 'mid_company', 'student'));

-- 2. talents テーブルに segment カラム追加
ALTER TABLE talents
  ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'ca'
  CHECK (segment IN ('ca', 'top_company', 'mid_company', 'student'));

-- 3. 既存データを全て 'ca' に更新（既存6名）
UPDATE sessions SET segment = 'ca' WHERE segment IS NULL;
UPDATE talents SET segment = 'ca' WHERE segment IS NULL;

-- 4. インデックス（セグメント別クエリ高速化）
CREATE INDEX IF NOT EXISTS idx_talents_segment ON talents(segment);
CREATE INDEX IF NOT EXISTS idx_sessions_segment ON sessions(segment);
