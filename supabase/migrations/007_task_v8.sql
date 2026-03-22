-- Task Manager V8 Migration
-- 実行: Supabase Dashboard > SQL Editor で実行

-- V8 新規カラム
ALTER TABLE items ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES items(id) ON DELETE CASCADE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'task';

-- ボール管理カラム
ALTER TABLE items ADD COLUMN IF NOT EXISTS ball_holder TEXT DEFAULT 'self';
ALTER TABLE items ADD COLUMN IF NOT EXISTS ball_holder_name TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS ball_passed_at TIMESTAMPTZ;
ALTER TABLE items ADD COLUMN IF NOT EXISTS ball_remind_days INTEGER DEFAULT 3;

-- 今日のフォーカスカラム
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_today_focus BOOLEAN DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS focus_selected_date DATE;

-- status 制約更新（deletedを追加）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'items_status_check' AND conrelid = 'items'::regclass
  ) THEN
    ALTER TABLE items DROP CONSTRAINT items_status_check;
  END IF;
END$$;

ALTER TABLE items ADD CONSTRAINT items_status_check
  CHECK (status IN ('inbox', 'this_week', 'today', 'in_progress', 'done', 'deleted'));

-- インデックス
CREATE INDEX IF NOT EXISTS idx_items_parent_id ON items(parent_id);
CREATE INDEX IF NOT EXISTS idx_items_ball_holder ON items(ball_holder);
CREATE INDEX IF NOT EXISTS idx_items_is_today_focus ON items(is_today_focus);
CREATE INDEX IF NOT EXISTS idx_items_focus_selected_date ON items(focus_selected_date);

-- 週次振り返りテーブル
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  done_summary TEXT,
  learned TEXT,
  next_hypothesis TEXT,
  ai_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wr_select_own" ON weekly_reviews
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wr_insert_own" ON weekly_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wr_update_own" ON weekly_reviews
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
