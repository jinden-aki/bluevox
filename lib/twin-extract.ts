import { callClaude } from './claude';
import { supabase } from './supabase';
import { TWIN_EXTRACT_PROMPT } from './prompts/twin-extract';

const VALID_DIMENSIONS = [
  'beliefs', 'judgments', 'phrases', 'questions',
  'tone', 'metaphors', 'taboos', 'self_patterns',
];

export async function extractTwinData(
  memo: string,
  sessionId: string,
  talentName: string,
  apiKey: string,
  userId: string
) {
  try {
    const result = await callClaude({
      task: 'analysis',
      systemPrompt: TWIN_EXTRACT_PROMPT,
      userContent: `面談メモ：\n${memo}\n\n面談対象者：${talentName}`,
      apiKey,
      maxTokens: 2000,
    });

    const text = result.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { extracted: 0 };

    const data = JSON.parse(jsonMatch[0]);
    const extractions = data.extractions || [];

    if (extractions.length === 0) return { extracted: 0 };

    // Fetch existing items for dedup
    const { data: existing } = await supabase
      .from('jinden_thoughts')
      .select('content')
      .eq('user_id', userId);

    const existingTexts = new Set(
      (existing || []).map((e: any) => {
        try {
          const parsed = JSON.parse(e.content);
          return parsed.text || '';
        } catch {
          return '';
        }
      }).filter(Boolean)
    );

    // Filter: valid dimension, not duplicate, confidence >= 0.6
    const newItems = extractions.filter(
      (e: any) =>
        VALID_DIMENSIONS.includes(e.dimension) &&
        !existingTexts.has(e.content) &&
        e.confidence >= 0.6
    );

    if (newItems.length === 0) return { extracted: 0 };

    // Get max sort_order
    const { data: maxRow } = await supabase
      .from('jinden_thoughts')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const baseOrder = (maxRow?.[0]?.sort_order ?? 0) + 1;

    const inserts = newItems.map((item: any, idx: number) => ({
      user_id: userId,
      dimension: item.dimension,
      content: JSON.stringify({
        text: item.content,
        evidence: item.source_quote || '',
      }),
      sort_order: baseOrder + idx,
      source: 'session_auto',
      source_session_id: sessionId,
      source_talent_name: talentName,
      confidence: item.confidence,
      auto_extracted: true,
    }));

    const { error } = await supabase.from('jinden_thoughts').insert(inserts);
    if (error) console.error('[BLUEVOX Twin] insert error:', error);

    return { extracted: newItems.length };
  } catch (err) {
    console.error('[BLUEVOX Twin] extraction failed:', err);
    return { extracted: 0, error: err };
  }
}
