'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Item } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { getTagStyle, PRESET_TAGS } from '@/lib/tags';

interface StockDetailSheetProps {
  item: Item;
  onClose: () => void;
  onUpdate: (item: Item) => void;
  onDelete: (id: string) => void;
  onConvertToTask: (item: Item) => void;
}

export default function StockDetailSheet({ item, onClose, onUpdate, onDelete, onConvertToTask }: StockDetailSheetProps) {
  const [title, setTitle] = useState(item.title);
  const [url, setUrl] = useState(item.url || item.link_url || '');
  const [source, setSource] = useState(item.source || '');
  const [memo, setMemo] = useState(item.memo || '');
  const [tags, setTags] = useState<string[]>(item.tags);
  const [project, setProject] = useState(item.project || '');
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTitle(item.title);
    setUrl(item.url || item.link_url || '');
    setSource(item.source || '');
    setMemo(item.memo || '');
    setTags(item.tags);
    setProject(item.project || '');
  }, [item]);

  const saveField = useCallback(async (updates: Record<string, any>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .select()
        .single();
      if (data) {
        onUpdate(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 1000);
      }
    }, 300);
  }, [item.id, onUpdate]);

  const saveFieldImmediate = useCallback(async (updates: Record<string, any>) => {
    const { data } = await supabase
      .from('items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .select()
      .single();
    if (data) {
      onUpdate(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 1000);
    }
  }, [item.id, onUpdate]);

  const toggleTag = (tag: string) => {
    const newTags = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    setTags(newTags);
    saveFieldImmediate({ tags: newTags });
  };

  const handleDelete = async () => {
    if (confirm('このストックを削除しますか？')) {
      onDelete(item.id);
      onClose();
    }
  };

  const getDomain = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return urlStr;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[199]" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[480px] bg-white z-[200] rounded-t-2xl md:rounded-none shadow-xl flex flex-col overflow-hidden sheet-up md:animate-slideIn" style={{ maxHeight: '85vh' }}>
        {/* Grab bar (mobile) */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800 transition min-h-[44px] flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            閉じる
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">📌 ストック</span>
            {saved && <span className="text-xs text-gray-400">保存済み ✓</span>}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title !== item.title) saveField({ title }); }}
            className="text-lg font-bold text-gray-900 outline-none w-full bg-transparent mt-4 mb-2"
            style={{ fontSize: 18 }}
            placeholder="タイトル"
          />

          {/* URL */}
          <Section label="URL">
            <div className="flex items-center gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => {
                  const newUrl = url.trim() || null;
                  if (newUrl !== (item.url || item.link_url || null)) {
                    saveField({ url: newUrl, link_url: newUrl });
                  }
                }}
                placeholder="https://..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-jinden-blue"
                style={{ fontSize: 16 }}
              />
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-jinden-blue hover:underline flex-shrink-0 min-h-[44px] flex items-center"
                >
                  開く
                </a>
              )}
            </div>
            {url && (
              <div className="text-[11px] text-gray-400 mt-1">
                🔗 {getDomain(url)}
              </div>
            )}
          </Section>

          {/* Source */}
          <Section label="情報源">
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              onBlur={() => { if (source !== (item.source || '')) saveField({ source: source || null }); }}
              placeholder="X、note、記事、書籍、人名..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-jinden-blue"
              style={{ fontSize: 16 }}
            />
          </Section>

          {/* Memo */}
          <Section label="なぜストックした？">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              onBlur={() => { if (memo !== (item.memo || '')) saveField({ memo: memo || null }); }}
              placeholder="何に使えそうか..."
              className="w-full text-sm border border-gray-200 rounded-lg p-3 outline-none focus:border-jinden-blue resize-none min-h-[80px]"
              style={{ fontSize: 16 }}
            />
          </Section>

          {/* Tags */}
          <Section label="タグ">
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map(tag => {
                const style = getTagStyle(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="text-[11px] px-2 py-0.5 rounded-full font-medium hover:opacity-70 transition"
                    style={{ color: style.color, backgroundColor: style.bg }}
                  >
                    #{tag} ×
                  </button>
                );
              })}
              <button
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="text-[11px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded border border-dashed border-gray-300 transition"
              >
                + タグ
              </button>
            </div>
            {showTagPicker && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.keys(PRESET_TAGS).filter(t => !tags.includes(t)).map(tag => {
                  const style = PRESET_TAGS[tag];
                  return (
                    <button
                      key={tag}
                      onClick={() => { toggleTag(tag); setShowTagPicker(false); }}
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium hover:opacity-70 transition"
                      style={{ color: style.color, backgroundColor: style.bg }}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Project */}
          <Section label="プロジェクト">
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              onBlur={() => { if (project !== (item.project || '')) saveField({ project: project || null }); }}
              placeholder="プロジェクト名"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-jinden-blue"
              style={{ fontSize: 16 }}
            />
          </Section>

          {/* Link preview (if image exists) */}
          {(item.link_thumbnail || item.image_url) && (
            <Section label="プレビュー">
              <img
                src={item.link_thumbnail || item.image_url || ''}
                alt=""
                className="rounded-lg max-h-[200px] object-cover"
              />
            </Section>
          )}

          {/* Actions */}
          <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
            <button
              onClick={() => onConvertToTask(item)}
              className="flex items-center gap-2 text-sm text-jinden-blue hover:underline min-h-[44px]"
            >
              🔥 タスクにする
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition min-h-[44px]"
            >
              🗑️ 削除する
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-medium text-gray-500 mb-2">{label}</div>
      {children}
    </div>
  );
}
