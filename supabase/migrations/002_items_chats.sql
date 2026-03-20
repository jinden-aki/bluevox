-- Items: tasks, clips, ideas
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL DEFAULT 'task', -- 'task' | 'clip' | 'idea'
  title TEXT NOT NULL,
  body TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'inbox', -- 'inbox' | 'this_week' | 'today' | 'in_progress' | 'done'
  priority INTEGER DEFAULT 0, -- 0=none 1=low 2=mid 3=high
  due_date DATE,
  due_time TIME,
  image_url TEXT,
  link_url TEXT,
  link_title TEXT,
  link_thumbnail TEXT,
  sort_order INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Per-item AI chat
CREATE TABLE item_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- General free-form chat
CREATE TABLE general_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own items" ON items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own item_chats" ON item_chats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own general_chats" ON general_chats FOR ALL USING (auth.uid() = user_id);
