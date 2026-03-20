-- 統合インボックス: ストック/ひらめき用フィールド追加
-- 既存の type カラム ('task', 'clip', 'idea') をそのまま活用
-- clip = ストック, idea = ひらめき

ALTER TABLE items ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS memo TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS twin_candidate BOOLEAN DEFAULT false;

-- item_type は使わない（既存の type で十分）が、指示書のSQLとの互換用
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'task';
