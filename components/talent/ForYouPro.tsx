'use client';

import { useRef } from 'react';
import type { AnalysisResult } from '@/lib/types';
import { showToast } from '@/components/ui/Toast';
import BalanceWheel from '@/components/talent/BalanceWheel';

interface ForYouProProps {
  analysis: AnalysisResult;
  name: string;
}

function EditableField({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  if (!value) return null;
  return (
    <div className={`mb-4 ${className}`}>
      <div className="text-[10px] font-bold tracking-[0.12em] text-gray-500 uppercase mb-1.5">{label}</div>
      <div
        contentEditable
        suppressContentEditableWarning
        className="text-[13px] text-gray-800 leading-[1.8] whitespace-pre-wrap p-3 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10 transition"
        dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, '<br>') }}
      />
    </div>
  );
}

export default function ForYouPro({ analysis }: ForYouProProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const a = analysis;
  const va = a.verb_analysis;
  const bw = a.balance_wheel;

  const copyAll = async () => {
    if (!sheetRef.current) return;
    try {
      const text = sheetRef.current.innerText;
      await navigator.clipboard.writeText(text);
      showToast('全フィールドをコピーしました', 'success');
    } catch {
      showToast('コピーに失敗しました', 'error');
    }
  };

  return (
    <div>
      {/* Header with copy */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-gray-500">全フィールド編集可能 (contentEditable)</div>
        <button
          onClick={copyAll}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-jinden-blue text-white rounded-lg text-xs font-medium hover:bg-vox transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          ワンクリックコピー
        </button>
      </div>

      <div ref={sheetRef} className="space-y-5">
        {/* Core sentence */}
        <div className="bg-white border border-gray-300 rounded-[10px] p-6 shadow-sm">
          <EditableField label="存在の一文 (Core Sentence)" value={a.core_sentence || ''} />
          <EditableField label="じんでんコメント (Jinden Comment)" value={a.jinden_comment || ''} />
        </div>

        {/* Career highlights */}
        {a.career_highlights && a.career_highlights.length > 0 && (
          <div className="bg-white border border-gray-300 rounded-[10px] p-6 shadow-sm">
            <div className="text-[10px] font-bold tracking-[0.15em] text-jinden-blue uppercase mb-4">経歴ハイライト</div>
            {a.career_highlights.map((c, i) => (
              <div key={i} className="mb-4 pl-4 border-l-2 border-jinden-blue">
                <div className="flex gap-3 mb-1">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="text-[11px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded focus:outline-none focus:border-jinden-blue"
                  >
                    {c.period}
                  </div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="text-[11px] font-semibold text-gray-700 bg-gray-50 px-2 py-0.5 rounded focus:outline-none focus:border-jinden-blue"
                  >
                    {c.role}
                  </div>
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="text-xs text-gray-700 leading-[1.7] p-2 bg-gray-50 rounded focus:outline-none focus:border-jinden-blue"
                >
                  {c.detail}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 5 Axes */}
        {a.five_axes && (
          <div className="bg-white border border-gray-300 rounded-[10px] p-6 shadow-sm">
            <div className="text-[10px] font-bold tracking-[0.15em] text-jinden-blue uppercase mb-4">
              5軸スコア — {a.five_axes.talent_type || ''} Lv{a.five_axes.total_lv || '?'}
            </div>
            <EditableField label="総合判定" value={a.five_axes.judgment || ''} />
            {(a.five_axes.axes || []).map((ax, i) => {
              const pct = ((ax.lv || 0) / 5) * 100;
              const axColors = ['#1565C0', '#2196F3', '#42A5F5', '#2E7D32', '#E65100'];
              return (
                <div key={i} className="mb-3">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-20 text-right text-xs font-semibold text-gray-700">
                      {'①②③④⑤'.charAt(i)} {ax.name}
                    </div>
                    <div className="flex-1 h-6 bg-gray-100 rounded relative overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{ width: `${pct}%`, background: axColors[i % 5] }}
                      />
                    </div>
                    <div className="w-8 text-center font-brand text-lg text-midnight">{ax.lv}</div>
                  </div>
                  <EditableField label={`Lv${ax.lv} 意味`} value={ax.lv_meaning || ''} />
                  <EditableField label="根拠" value={ax.evidence || ''} />
                  <EditableField label="社長へ" value={ax.for_ceo || ''} />
                </div>
              );
            })}
          </div>
        )}

        {/* PCM */}
        {a.pcm && a.pcm.types && a.pcm.types.length > 0 && (
          <div className="bg-white border border-gray-300 rounded-[10px] p-6 shadow-sm">
            <div className="text-[10px] font-bold tracking-[0.15em] text-jinden-blue uppercase mb-4">PCM分析</div>
            <div className="flex gap-2 mb-4">
              {a.pcm.types.map((t, i) => (
                <span
                  key={i}
                  className="pcm-pill"
                  style={{
                    borderColor: i === 0 ? 'var(--jinden)' : 'var(--gray-300)',
                    color: i === 0 ? 'var(--jinden)' : 'var(--gray-700)',
                    background: i === 0 ? 'var(--mist)' : 'var(--gray-100)',
                  }}
                >
                  {t.rank || i + 1}st: {t.name}
                </span>
              ))}
            </div>
            {a.pcm.types.map((t, i) => (
              <div key={i} className="mb-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs font-semibold text-gray-800 mb-1">
                  第{t.rank || i + 1}タイプ: {t.name} {t.name_en && <span className="text-gray-400 font-normal">({t.name_en})</span>}
                </div>
                <EditableField label="行動パターン" value={t.behavior || ''} />
                <EditableField label="心理的欲求" value={t.need || ''} />
                <EditableField label="ディストレス" value={t.distress || ''} />
                <EditableField label="CEO Tip" value={t.ceo_tip || ''} />
              </div>
            ))}
            {a.pcm.activation && a.pcm.activation.length > 0 && (
              <EditableField label="発動条件" value={a.pcm.activation.join('\n')} />
            )}
            {a.pcm.deactivation && a.pcm.deactivation.length > 0 && (
              <EditableField label="消火条件" value={a.pcm.deactivation.join('\n')} />
            )}
          </div>
        )}

        {/* Balance Wheel */}
        {bw && bw.axes && bw.axes.length > 0 && (
          <div className="bg-white border border-gray-300 rounded-[10px] p-6 shadow-sm">
            <div className="text-[10px] font-bold tracking-[0.15em] text-jinden-blue uppercase mb-4">バランスホイール</div>
            <div className="max-w-[320px] mx-auto">
              <BalanceWheel
                axes={bw.axes.map(ax => ({
                  name: ax.name,
                  importance: ax.importance,
                  satisfaction: ax.satisfaction,
                  gap_meaning: ax.gap_meaning,
                }))}
              />
            </div>
            <EditableField label="副業動機の本質" value={bw.motivation_essence || ''} />
          </div>
        )}

        {/* Inner voice */}
        {a.inner_voice && (
          <div className="bg-white border border-gray-300 rounded-[10px] p-6 shadow-sm">
            <div className="text-[10px] font-bold tracking-[0.15em] text-jinden-blue uppercase mb-4">本人の声</div>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['信念', a.inner_voice.belief],
                ['夢', a.inner_voice.dream],
                ['不満', a.inner_voice.pain],
                ['挑戦', a.inner_voice.challenge],
              ] as const).map(([label, v]) => (
                <div key={label}>
                  <EditableField label={`${label} — 声`} value={v?.voice || ''} />
                  <EditableField label={`${label} — 解説`} value={v?.jinden_note || ''} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weakness full */}
        {a.weakness_full && (
          <div className="bg-white border border-gray-300 rounded-[10px] p-6 shadow-sm">
            <div className="text-[10px] font-bold tracking-[0.15em] text-[#C62828] uppercase mb-4">弱み完全開示</div>
            <EditableField label="本質" value={a.weakness_full.essence || ''} />
            <EditableField label="弱み動詞" value={a.weakness_full.verb || ''} />
            {a.weakness_full.symptoms && a.weakness_full.symptoms.length > 0 && (
              <EditableField label="症状" value={a.weakness_full.symptoms.join('\n')} />
            )}
            <EditableField label="社長への活用提案" value={a.weakness_full.ceo_proposal || ''} />
          </div>
        )}

        {/* Verb analysis */}
        {va && (
          <div className="bg-white border border-gray-300 rounded-[10px] p-6 shadow-sm">
            <div className="text-[10px] font-bold tracking-[0.15em] text-jinden-blue uppercase mb-4">JINDEN METHOD 動詞分析</div>
            {va.self_function && (
              <div className="bg-midnight text-white p-4 rounded-lg mb-4 text-center">
                <div className="text-[9px] tracking-[0.2em] opacity-60 mb-1">SELF FUNCTION</div>
                <div className="text-base font-semibold">「{va.self_function}」</div>
                {va.self_function_roots && (
                  <div className="text-[11px] opacity-50 mt-1">原動詞：{va.self_function_roots}</div>
                )}
              </div>
            )}
            {va.strength_verbs && va.strength_verbs.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] font-semibold text-[#2E7D32] mb-2">強み動詞</div>
                <div className="flex flex-wrap gap-1.5">
                  {va.strength_verbs.map((sv, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-1 bg-[#E8F5E9] border border-[#2E7D32] rounded-full text-gray-900">
                      <span className="font-bold text-[#2E7D32]">{sv.id}</span> {sv.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {va.weakness_verbs && va.weakness_verbs.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] font-semibold text-[#C62828] mb-2">弱み動詞</div>
                <div className="flex flex-wrap gap-1.5">
                  {va.weakness_verbs.map((wv, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-1 bg-[#FFEBEE] border border-[#C62828] rounded-full text-gray-900">
                      <span className="font-bold text-[#C62828]">{wv.id}</span> {wv.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <EditableField label="探究テーマ" value={va.inquiry_theme || ''} />
          </div>
        )}

        {/* Recommendation */}
        {a.recommendation && (
          <div className="bg-white border border-gray-300 rounded-[10px] p-6 shadow-sm">
            <div className="text-[10px] font-bold tracking-[0.15em] text-jinden-blue uppercase mb-3">推薦文</div>
            <div
              contentEditable
              suppressContentEditableWarning
              className="text-[13px] text-gray-800 leading-[1.8] whitespace-pre-wrap p-4 bg-mist rounded-lg border-l-[3px] border-jinden-blue focus:outline-none focus:ring-2 focus:ring-jinden-blue/10 transition"
            >
              {a.recommendation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
