-- BLUEVOX V7 Task Enhancements
-- 手動でSupabaseの SQL Editorで実行してください
-- 実行日: 2026-03-22

-- 1. サブタスク用 parent_id カラムを追加
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES items(id) ON DELETE CASCADE;

-- 2. メモ/備考カラムを追加
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. status の 'deleted' 許可
--    既存の check 制約があれば削除して再作成
DO $$
BEGIN
  -- 既存の制約名を確認して削除（存在する場合）
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'items_status_check' AND conrelid = 'items'::regclass
  ) THEN
    ALTER TABLE items DROP CONSTRAINT items_status_check;
  END IF;
END$$;

ALTER TABLE items
  ADD CONSTRAINT items_status_check
  CHECK (status IN ('inbox', 'this_week', 'today', 'in_progress', 'done', 'deleted'));

-- 4. インデックス（parent_id 検索の高速化）
CREATE INDEX IF NOT EXISTS idx_items_parent_id ON items(parent_id);

-- 5. インデックス（deleted タスクの検索）
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
