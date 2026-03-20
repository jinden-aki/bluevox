'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PRESET_TAGS } from '@/lib/tags';

interface QuickInputProps {
  onSubmit: (title: string, tags: string[]) => void;
  onOpenBulk: () => void;
  onImagePaste: (file: File) => void;
}

export default function QuickInput({ onSubmit, onOpenBulk, onImagePaste }: QuickInputProps) {
  const [text, setText] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Extract inline #tags
    const inlineTags: string[] = [];
    const cleaned = trimmed.replace(/#(\S+)/g, (_, tag) => {
      inlineTags.push(tag);
      return '';
    }).trim();

    const allTags = Array.from(new Set([...selectedTags, ...inlineTags]));
    onSubmit(cleaned || trimmed, allTags);
    setText('');
    setSelectedTags([]);
  }, [text, selectedTags, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Check for # trigger
    const lastHash = val.lastIndexOf('#');
    if (lastHash >= 0 && (lastHash === 0 || val[lastHash - 1] === ' ')) {
      const after = val.substring(lastHash + 1);
      if (!after.includes(' ')) {
        setTagFilter(after);
        setShowTags(true);
        return;
      }
    }
    setShowTags(false);
  };

  const selectTag = (tag: string) => {
    // Replace the #partial with the full tag
    const lastHash = text.lastIndexOf('#');
    const before = text.substring(0, lastHash);
    setText(before + `#${tag} `);
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setShowTags(false);
    inputRef.current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) onImagePaste(file);
        return;
      }
    }
  };

  // Close tag dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) {
        setShowTags(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredTags = Object.keys(PRESET_TAGS).filter(t =>
    t.toLowerCase().includes(tagFilter.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-end gap-2 px-3 py-2.5 md:px-4 md:py-3">
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="思いついたことを投げ込む... #タグで分類"
          rows={1}
          className="flex-1 resize-none text-sm leading-relaxed outline-none placeholder:text-gray-400 min-h-[24px] max-h-[120px]"
          style={{ fieldSizing: 'content' } as any}
        />

        {/* Selected tags display */}
        {selectedTags.length > 0 && (
          <div className="hidden md:flex gap-1 items-center flex-shrink-0">
            {selectedTags.map(tag => {
              const preset = PRESET_TAGS[tag];
              return (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    color: preset?.color || '#616161',
                    backgroundColor: preset?.bg || '#F5F5F5',
                  }}
                >
                  #{tag}
                </span>
              );
            })}
          </div>
        )}

        {/* File attach */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImagePaste(f);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="text-gray-400 hover:text-gray-600 transition p-1 flex-shrink-0"
          title="画像を添付"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
        </button>

        {/* Tag button */}
        <button
          onClick={() => { setShowTags(!showTags); setTagFilter(''); }}
          className="text-gray-400 hover:text-gray-600 transition p-1 flex-shrink-0"
          title="タグを選択"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
        </button>

        {/* Bulk input */}
        <button
          onClick={onOpenBulk}
          className="text-gray-400 hover:text-gray-600 transition p-1 flex-shrink-0 hidden md:block"
          title="一括入力"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
        </button>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="bg-jinden-blue text-white rounded-lg p-1.5 disabled:opacity-30 hover:bg-vox transition flex-shrink-0"
          title="追加"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
          </svg>
        </button>
      </div>

      {/* Tag dropdown */}
      {showTags && (
        <div ref={tagMenuRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-50 py-1 max-h-[200px] overflow-y-auto">
          {filteredTags.map(tag => {
            const preset = PRESET_TAGS[tag];
            return (
              <button
                key={tag}
                onClick={() => selectTag(tag)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: preset.color }}
                />
                #{tag}
              </button>
            );
          })}
          {tagFilter && !filteredTags.includes(tagFilter) && (
            <button
              onClick={() => selectTag(tagFilter)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-500"
            >
              + 「{tagFilter}」を新規作成
            </button>
          )}
        </div>
      )}
    </div>
  );
}
