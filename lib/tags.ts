export interface TagDef {
  label: string;
  color: string;
  bg: string;
}

export const PRESET_TAGS: Record<string, TagDef> = {
  '事業': { label: '事業', color: '#1565C0', bg: '#E3F2FD' },
  'セッション': { label: 'セッション', color: '#2E7D32', bg: '#E8F5E9' },
  'SNS': { label: 'SNS', color: '#6B4FA0', bg: '#F3E5F5' },
  'アイデア': { label: 'アイデア', color: '#E65100', bg: '#FFF3E0' },
  '個人': { label: '個人', color: '#616161', bg: '#F5F5F5' },
  '読む': { label: '読む', color: '#0D9488', bg: '#E0F2F1' },
};

export function getTagStyle(tag: string): TagDef {
  return PRESET_TAGS[tag] || { label: tag, color: '#616161', bg: '#F5F5F5' };
}
