-- ============================================================
-- BLUEVOX Migration v6: Company Diagnosis（企業診断）
-- Supabase SQL Editorで手動実行
-- ============================================================

-- 1. companies テーブル（企業診断のメイン）
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本情報（フォーム入力）
  company_name TEXT NOT NULL,
  website_url TEXT,

  -- ヒアリングメモ（自由テキスト）
  meeting_memo TEXT,
  meeting_date DATE DEFAULT CURRENT_DATE,

  -- じんでんの3行メモ
  jinden_memo_issue TEXT,         -- ① 本質的な課題
  jinden_memo_fit_type TEXT,      -- ② 合う人材のタイプ
  jinden_memo_caution TEXT,       -- ③ 紹介時の注意点

  -- キーパーソン情報（JSONB配列）
  key_persons JSONB DEFAULT '[]',
  -- 構造: [{ name, role, is_decision_maker, is_interviewed, pcm1, pcm2, pcm3, memo }]

  -- AI分析結果
  analysis JSONB,
  web_research JSONB,            -- HP調査結果のキャッシュ

  -- 追加情報（再分析用）
  additional_files JSONB DEFAULT '[]',  -- [{ name, type, content_summary, added_at }]
  additional_memos JSONB DEFAULT '[]',  -- [{ memo, added_at }]

  -- メタデータ
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'analyzing', 'review', 'complete')),
  analysis_version INTEGER DEFAULT 0,   -- 再分析のたびにインクリメント
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_select_own" ON companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "companies_insert_own" ON companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "companies_update_own" ON companies FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "companies_delete_own" ON companies FOR DELETE USING (auth.uid() = user_id);

-- 3. Updated_at trigger
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 4. インデックス
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
