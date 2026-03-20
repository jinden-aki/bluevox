import { supabase } from './supabase';

export async function getTwinContext(userId: string): Promise<string> {
  const { data: thoughts } = await supabase
    .from('jinden_thoughts')
    .select('dimension, content')
    .eq('user_id', userId)
    .order('dimension')
    .order('sort_order');

  if (!thoughts || thoughts.length === 0) return '（デジタルツインDBにデータなし）';

  const grouped: Record<string, string[]> = {};
  thoughts.forEach((t: any) => {
    if (!grouped[t.dimension]) grouped[t.dimension] = [];
    grouped[t.dimension].push(t.content);
  });

  const labels: Record<string, string> = {
    '信念': '信念',
    '判断基準': '判断基準',
    '口癖': '口癖',
    '問い': '問い',
    'トーン': 'トーン',
    '比喩': '比喩',
    '禁句': '禁句',
    '自己パターン認識': '自己パターン',
  };

  return Object.entries(grouped)
    .map(([dim, items]) => `【${labels[dim] || dim}】\n${items.map(i => `- ${i}`).join('\n')}`)
    .join('\n\n');
}
