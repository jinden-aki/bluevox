'use client';

import { useRef } from 'react';
import type { AnalysisResult, ProfileData } from '@/lib/types';
import { showToast } from '@/components/ui/Toast';
import ExistenceStructureMap from './ExistenceStructureMap';

interface ForCEOBlueprintProps {
  analysis: AnalysisResult;
  name: string;
  profileData?: ProfileData | null;
}

/* ---------- helpers ---------- */

function nl(s: string | undefined | null): React.ReactNode {
  if (!s) return null;
  return s.split('\n').map((line, i, arr) => (
    <span key={i}>
      {line}
      {i < arr.length - 1 && <br />}
    </span>
  ));
}

function SectionHeader({ num, label, title }: { num: string; label: string; title: string }) {
  return (
    <div className="mb-4">
      <div className="text-[64px] font-brand text-gray-100 leading-none select-none">{num}</div>
      <div className="text-[9px] font-bold tracking-[0.2em] text-jinden-blue uppercase -mt-4">{label}</div>
      <div className="text-sm font-semibold text-midnight mt-1 mb-4">{title}</div>
    </div>
  );
}

function CeoQuestion({ text }: { text: string }) {
  return (
    <div className="mt-4 p-3 rounded-lg text-right" style={{ background: 'rgba(21,101,192,0.04)' }}>
      <span className="font-serif text-[13px] italic text-jinden-blue">{text}</span>
    </div>
  );
}

/* ---------- axis bar colours ---------- */
const axColors = ['#1565C0', '#2196F3', '#42A5F5', '#2E7D32', '#E65100'];

/* ====================================================================== */

export default function ForCEOBlueprint({ analysis, name, profileData }: ForCEOBlueprintProps) {
  const docRef = useRef<HTMLDivElement>(null);
  const a = analysis;
  const va = a.verb_analysis;
  const bw = a.balance_wheel;
  const fa = a.five_axes;
  const pcm = a.pcm;
  const sfd = a.strength_full_disclosure;

  /* --- clipboard (HTML + plain fallback) --- */
  const copyHTML = async () => {
    if (!docRef.current) return;
    try {
      const html = docRef.current.innerHTML;
      const text = docRef.current.innerText;
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
      showToast('ブループリントHTMLをコピーしました', 'success');
    } catch {
      try {
        await navigator.clipboard.writeText(docRef.current.innerText);
        showToast('テキストとしてコピーしました', 'success');
      } catch {
        showToast('コピーに失敗しました', 'error');
      }
    }
  };

  /* --- print --- */
  const handlePrint = () => {
    window.print();
  };

  /* ====================================================================== */
  return (
    <div>
      {/* ── Action bar ── */}
      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <button
          onClick={copyHTML}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-jinden-blue text-white rounded-lg text-xs font-medium hover:bg-vox transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          HTMLコピー
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-midnight text-white rounded-lg text-xs font-medium hover:bg-deep transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          印刷
        </button>
      </div>

      {/* ── Blueprint document ── */}
      <div ref={docRef} className="bg-paper rounded-[12px] border border-gray-200 p-8 md:p-10 print:p-0 print:border-0 print:rounded-none">

        {/* ── Hero / Name banner ── */}
        <div className="mb-10 pb-6 border-b border-gray-200">
          <div className="text-[9px] font-bold tracking-[0.25em] text-jinden-blue uppercase mb-1">
            BLUEVOX &mdash; For CEO Blueprint
          </div>
          <div className="font-brand text-[36px] font-light tracking-wider text-midnight leading-tight">
            {name}
          </div>
          {fa?.talent_type && (
            <div className="text-xs text-gray-500 mt-1">
              {fa.talent_type}タイプ &middot; Lv{fa.total_lv ?? '?'}
            </div>
          )}
        </div>

        {/* ================================================================
            SECTION 00 — Profile Card
        ================================================================ */}
        {profileData && (
          <div className="mb-10 p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-start gap-5">
              {/* Photo */}
              <div className="flex-shrink-0">
                {profileData.profile_photo ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                    <img src={profileData.profile_photo} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-jinden-blue/20 to-jinden-blue/5 border-2 border-gray-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-jinden-blue/40">{name?.charAt(0) || '?'}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-2">
                  {profileData.age && (
                    <div><span className="text-[9px] font-bold text-gray-400 tracking-wide">年齢</span><div className="text-xs text-gray-800">{profileData.age}</div></div>
                  )}
                  {profileData.birthplace && (
                    <div><span className="text-[9px] font-bold text-gray-400 tracking-wide">出身</span><div className="text-xs text-gray-800">{profileData.birthplace}</div></div>
                  )}
                  {profileData.residence && (
                    <div><span className="text-[9px] font-bold text-gray-400 tracking-wide">居住</span><div className="text-xs text-gray-800">{profileData.residence}</div></div>
                  )}
                  {profileData.department && (
                    <div><span className="text-[9px] font-bold text-gray-400 tracking-wide">部署</span><div className="text-xs text-gray-800">{profileData.department}</div></div>
                  )}
                  {profileData.position && (
                    <div><span className="text-[9px] font-bold text-gray-400 tracking-wide">役職</span><div className="text-xs text-gray-800">{profileData.position}</div></div>
                  )}
                  {profileData.education && (
                    <div><span className="text-[9px] font-bold text-gray-400 tracking-wide">学歴</span><div className="text-xs text-gray-800">{profileData.education}</div></div>
                  )}
                  {profileData.side_job_hours && (
                    <div><span className="text-[9px] font-bold text-gray-400 tracking-wide">副業可能時間</span><div className="text-xs text-gray-800">{profileData.side_job_hours}</div></div>
                  )}
                  {profileData.side_job_remote && (
                    <div><span className="text-[9px] font-bold text-gray-400 tracking-wide">リモート</span><div className="text-xs text-gray-800">{profileData.side_job_remote}</div></div>
                  )}
                  {profileData.side_job_start && (
                    <div><span className="text-[9px] font-bold text-gray-400 tracking-wide">開始時期</span><div className="text-xs text-gray-800">{profileData.side_job_start}</div></div>
                  )}
                  {profileData.hobbies && (
                    <div><span className="text-[9px] font-bold text-gray-400 tracking-wide">趣味</span><div className="text-xs text-gray-800">{profileData.hobbies}</div></div>
                  )}
                  {profileData.mbti && (
                    <div><span className="text-[9px] font-bold text-gray-400 tracking-wide">MBTI</span><div className="text-xs text-gray-800">{profileData.mbti}</div></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            SECTION 01 — Core Identity
        ================================================================ */}
        {a.core_sentence && (
          <div className="mb-10">
            <SectionHeader num="01" label="Core Identity" title="存在の一文 — この人間を30秒で掴む" />

            {/* Core sentence band */}
            <div className="bg-midnight rounded-lg p-5 mb-3">
              <div className="font-serif text-base text-white leading-relaxed text-center">
                「{nl(a.core_sentence)}」
              </div>
            </div>

            {/* Jinden comment */}
            {a.jinden_comment && (
              <div className="text-[13px] text-gray-700 leading-[1.8] mb-3">{nl(a.jinden_comment)}</div>
            )}

            {/* Raw voice intro */}
            {a.raw_voice_intro && (
              <div className="pl-4 border-l-[3px] border-sky/50 mb-3">
                <div className="font-serif text-[13px] text-gray-500 italic leading-[1.7]">
                  「{nl(a.raw_voice_intro)}」
                </div>
              </div>
            )}

            {/* Detected root verbs as pills */}
            {va?.detected_root_verbs && va.detected_root_verbs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {va.detected_root_verbs.map((rv, i) => {
                  const dot = rv.strength === 'high' ? '\u25CF' : rv.strength === 'medium' || rv.strength === 'mid' ? '\u25CB' : '\u25B3';
                  return (
                    <span
                      key={i}
                      className="text-[11px] px-2.5 py-1 rounded-full font-medium border"
                      style={{ background: 'rgba(21,101,192,0.04)', borderColor: '#1565C0', color: '#1565C0' }}
                    >
                      {dot} {rv.id} {rv.name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            SECTION 01.5 — Existence Structure Map
        ================================================================ */}
        {a.core_sentence && (
          <div className="mb-10">
            <SectionHeader num="" label="Existence Structure" title="存在の構造マップ — この人間の全体像" />
            <ExistenceStructureMap analysis={a} talentType={fa?.talent_type} />
          </div>
        )}

        {/* ================================================================
            SECTION 02 — Career Timeline
        ================================================================ */}
        {a.career_highlights && a.career_highlights.length > 0 && (
          <div className="mb-10">
            <SectionHeader num="02" label="Career Timeline" title="経歴タイムライン — 何をしたかではなく「どう動いたか」" />

            <div className="space-y-4 border-l-2 border-jinden-blue/30 pl-5">
              {a.career_highlights.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-jinden-blue tracking-wide">{item.period}</span>
                    <span className="text-[10px] text-gray-400">&mdash;</span>
                    <span className="text-[11px] font-semibold text-gray-700">{item.role}</span>
                  </div>
                  <div className="text-xs text-gray-600 leading-[1.7]">{nl(item.detail)}</div>
                  {item.quote && (
                    <div className="font-serif text-[11px] text-gray-400 italic mt-1.5 pl-3 border-l-2 border-gray-200">
                      「{nl(item.quote)}」
                    </div>
                  )}
                  {item.warning && (
                    <div className="text-[11px] mt-1 px-2 py-1 rounded" style={{ color: '#E65100', background: 'rgba(230,81,0,0.06)' }}>
                      Warning: {item.warning}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <CeoQuestion text="この経歴の中で、御社の課題に直結する経験はどれですか？" />
          </div>
        )}

        {/* ================================================================
            SECTION 03 — Vision / Why Now
        ================================================================ */}
        {bw?.why_now && (
          <div className="mb-10">
            <SectionHeader num="03" label="Vision" title="ビジョン &times; なぜ今なのか" />

            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
              <div className="text-[9px] font-bold tracking-[0.15em] text-jinden-blue uppercase mb-2">
                WHY NOW &mdash; なぜ今なのか
              </div>
              <div className="text-[13px] text-gray-700 leading-[1.8]">{nl(bw.why_now)}</div>
            </div>

            <CeoQuestion text="このタイミングを逃すと、次はいつ出会えますか？" />
          </div>
        )}

        {/* ================================================================
            SECTION 04 — Strength & Weakness
        ================================================================ */}
        {(va?.self_function || va?.strength_verbs?.length || va?.weakness_verbs?.length) && (
          <div className="mb-10">
            <SectionHeader num="04" label="Strength &amp; Weakness" title="強み &times; 弱み — この人間の使い方" />

            {/* Self function band */}
            {va?.self_function && (
              <div className="bg-midnight text-white p-4 rounded-lg mb-4 text-center">
                <div className="text-[9px] tracking-[0.2em] opacity-50 mb-1">SELF FUNCTION</div>
                <div className="text-base font-semibold">「{va.self_function}」</div>
                {va.self_function_roots && (
                  <div className="text-[11px] opacity-40 mt-1">原動詞：{va.self_function_roots}</div>
                )}
              </div>
            )}

            {/* 2-column: strength / weakness */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Strength verbs (green) */}
              {va?.strength_verbs && va.strength_verbs.length > 0 && (
                <div className="p-4 rounded-lg border-l-4" style={{ borderColor: '#2E7D32', background: 'rgba(46,125,50,0.04)' }}>
                  <div className="text-[9px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: '#2E7D32' }}>
                    強み動詞
                  </div>
                  <div className="space-y-3">
                    {va.strength_verbs.map((sv, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border"
                            style={{ background: '#E8F5E9', borderColor: '#2E7D32', color: '#2E7D32' }}
                          >
                            {sv.id}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">{sv.name}</span>
                        </div>
                        {sv.root_combination && (
                          <div className="text-[10px] text-gray-400 mb-0.5">根源結合：{sv.root_combination}</div>
                        )}
                        {sv.want_to && (
                          <div className="text-xs text-gray-600 leading-[1.6]">{sv.want_to}</div>
                        )}
                        {sv.evidence && (
                          <div className="text-[11px] text-gray-500 mt-1 leading-[1.5]">{nl(sv.evidence)}</div>
                        )}
                        {sv.transferable_positions && sv.transferable_positions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {sv.transferable_positions.map((pos, pi) => (
                              <span key={pi} className="text-[10px] px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                {pos}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* MSS axes badges */}
                        {sv.mss_axes && sv.mss_axes.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {sv.mss_axes.map((ax, ai) => (
                              <span key={ai} className="text-[9px] px-1.5 py-0.5 rounded bg-jinden-blue/10 text-jinden-blue font-semibold">
                                {ax}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weakness verbs (red) */}
              {va?.weakness_verbs && va.weakness_verbs.length > 0 && (
                <div className="p-4 rounded-lg border-l-4" style={{ borderColor: '#C62828', background: 'rgba(198,40,40,0.04)' }}>
                  <div className="text-[9px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: '#C62828' }}>
                    弱み動詞
                  </div>
                  <div className="space-y-3">
                    {va.weakness_verbs.map((wv, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border"
                            style={{ background: '#FFEBEE', borderColor: '#C62828', color: '#C62828' }}
                          >
                            {wv.id}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">{wv.name}</span>
                        </div>
                        {wv.shadow_combination && (
                          <div className="text-[10px] text-gray-400 mb-0.5">影の構造：{wv.shadow_combination}</div>
                        )}
                        {wv.belief_matrix && (
                          <div className="text-[11px] text-gray-500 leading-[1.5]">信念マトリクス：{wv.belief_matrix}</div>
                        )}
                        {wv.prescription && (
                          <div className="text-xs mt-1 pl-2 border-l-2 border-gray-300 text-gray-600 leading-[1.6]">
                            影との向き合い方：{wv.prescription}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI detected verb analysis */}
            {va?.detected_root_verbs && va.detected_root_verbs.length > 0 && (
              <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="text-[10px] font-bold tracking-[0.15em] text-gray-400 mb-3">
                  AI検出 — JINDEN METHOD動詞辞書マッチング
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {va.detected_root_verbs.map((rv, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-700 font-medium">
                      {rv.id} {rv.name} <span className="text-gray-400 text-[10px]">({rv.strength})</span>
                    </span>
                  ))}
                </div>
                {va.inquiry_theme && (
                  <div className="text-xs text-jinden-blue italic p-2.5 rounded" style={{ background: 'rgba(21,101,192,0.04)' }}>
                    探究テーマ：{va.inquiry_theme}
                  </div>
                )}
              </div>
            )}

            <CeoQuestion text="この強みは、あなたの会社のどの課題を解けますか？" />
          </div>
        )}

        {/* ================================================================
            SECTION 05 — PCM Analysis
        ================================================================ */}
        {pcm && pcm.types && pcm.types.length > 0 && (
          <div className="mb-10">
            <SectionHeader num="05" label="PCM Analysis" title="PCM 6タイプ分析 — 発火と消火の構造" />

            {/* PCM intro explanation */}
            <div className="text-[13px] text-gray-500 leading-[1.7] mb-4 p-3 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              PCM（プロセスコミュニケーションモデル）は、6つの性格タイプの組み合わせで行動パターンと心理的欲求を構造化します。第1タイプが最も強く日常に現れます。
            </div>

            {/* PCM type pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {pcm.types.map((t, i) => (
                <span
                  key={i}
                  className="text-xs px-3 py-1.5 rounded-full border font-medium"
                  style={{
                    borderColor: i === 0 ? '#1565C0' : '#D1D5DB',
                    color: i === 0 ? '#1565C0' : '#374151',
                    background: i === 0 ? 'rgba(21,101,192,0.06)' : '#F9FAFB',
                  }}
                >
                  {t.rank || i + 1}位: {t.name}
                  {t.name_en && <span className="text-gray-400 ml-1">({t.name_en})</span>}
                </span>
              ))}
            </div>

            {/* PCM type detail cards */}
            <div className="space-y-3 mb-4">
              {pcm.types.map((t, i) => {
                const borderColor = i === 0 ? '#1565C0' : i === 1 ? '#90CAF9' : '#B0BEC5';
                return (
                <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '0.5px solid #E5E7EB', borderLeft: `3px solid ${borderColor}` }}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-bold text-midnight">{t.name}</span>
                        {t.name_en && <span className="text-[12px] text-gray-400 italic" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.name_en}</span>}
                      </div>
                      {t.strength != null && (
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, si) => (
                            <div
                              key={si}
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: si < (Number(t.strength) || 0) ? '#1565C0' : '#E5E7EB' }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {t.behavior && (
                      <div className="text-[13px] text-gray-600 leading-[1.7] mb-3">{nl(t.behavior)}</div>
                    )}
                    {t.quote && (
                      <div className="pl-3 mb-3" style={{ borderLeft: '2px solid #1565C0' }}>
                        <div className="font-serif text-[13px] text-gray-500 italic leading-[1.7]">
                          「{nl(t.quote)}」
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5 mb-3">
                      {t.need && (
                        <div className="text-[12px] text-gray-500">
                          <span className="font-semibold" style={{ color: '#1565C0' }}>心が求めるもの：</span>{t.need}
                        </div>
                      )}
                      {t.distress && (
                        <div className="text-[12px] text-gray-500">
                          <span className="font-semibold" style={{ color: '#C83232' }}>ストレス時：</span>{t.distress}
                        </div>
                      )}
                    </div>
                    {t.ceo_tip && (
                      <div className="text-[12px] p-2.5 rounded-md leading-[1.6]" style={{ background: '#FEF5E7', color: '#92400E' }}>
                        {nl(t.ceo_tip)}
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>

            {/* Activation / Deactivation grid */}
            {(pcm.activation?.length || pcm.deactivation?.length) ? (
              <div>
              <div className="text-[13px] text-gray-500 italic mb-3 mt-1">
                このPCMタイプから導かれる、力を発揮できる環境と消耗する環境：
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ON (green) */}
                <div className="p-4 rounded-lg border" style={{ borderColor: '#2E7D32', background: 'rgba(46,125,50,0.03)' }}>
                  <div className="text-[9px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: '#2E7D32' }}>
                    発動条件 ON
                  </div>
                  {(pcm.activation || []).map((c, i) => (
                    <div key={i} className="text-xs text-gray-600 py-1 pl-3 border-l-2" style={{ borderColor: '#2E7D32' }}>
                      {c.replace(/^[✓✔]\s*/, '')}
                    </div>
                  ))}
                </div>
                {/* OFF (red) */}
                <div className="p-4 rounded-lg border" style={{ borderColor: '#C62828', background: 'rgba(198,40,40,0.03)' }}>
                  <div className="text-[9px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: '#C62828' }}>
                    消火条件 OFF
                  </div>
                  {(pcm.deactivation || []).map((c, i) => (
                    <div key={i} className="text-xs text-gray-600 py-1 pl-3 border-l-2" style={{ borderColor: '#C62828' }}>
                      {c.replace(/^[⚠]\s*/, '')}
                    </div>
                  ))}
                </div>
              </div>
              </div>
            ) : null}

            <CeoQuestion text="この人の発動条件は、あなたの組織にありますか？" />
          </div>
        )}

        {/* ================================================================
            SECTION 06 — Five Axes / MSS
        ================================================================ */}
        {fa && (
          <div className="mb-10">
            <SectionHeader num="06" label="Five Axes" title="JINDEN 5軸強度判定 — MSS評価" />

            {/* Judgment card */}
            <div className="flex items-center gap-5 p-5 bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
              <div
                className="w-16 h-16 rounded-full bg-jinden-blue flex items-center justify-center font-brand text-3xl text-white flex-shrink-0"
              >
                {fa.total_lv ?? '?'}
              </div>
              <div>
                <div className="text-lg font-semibold text-midnight">{fa.talent_type || '—'}タイプ</div>
                {fa.judgment && <div className="text-xs text-gray-500 mt-0.5">{fa.judgment}</div>}
              </div>
            </div>

            {/* MSS 3-column */}
            {(fa.mss?.mind || fa.mss?.stance || fa.mss?.skill) && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {(['MIND', 'STANCE', 'SKILL'] as const).map((label) => {
                  const key = label.toLowerCase() as 'mind' | 'stance' | 'skill';
                  const val = fa.mss?.[key];
                  return (
                    <div key={label} className="text-center p-3 bg-white rounded-lg border border-gray-200">
                      <div className="text-[9px] font-bold tracking-[0.15em] text-jinden-blue">{label}</div>
                      <div className="font-brand text-3xl text-midnight mt-1">{val || '—'}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottleneck / Strongest */}
            {(fa.bottleneck || fa.strongest) && (
              <div className="flex flex-wrap gap-4 mb-4 text-xs">
                {fa.strongest && (
                  <div style={{ color: '#2E7D32' }}>
                    <span className="font-semibold">最強軸：</span>{fa.strongest}
                  </div>
                )}
                {fa.bottleneck && (
                  <div style={{ color: '#E65100' }}>
                    <span className="font-semibold">ボトルネック：</span>{fa.bottleneck}
                  </div>
                )}
              </div>
            )}

            {/* Axis cards with bar chart */}
            <div className="space-y-3">
              {(fa.axes || []).map((ax, i) => {
                const pct = ((ax.lv || 0) / 5) * 100;
                const color = axColors[i % 5];
                /* Find matching strength verbs for this axis */
                const matchingVerbs = (va?.strength_verbs || []).filter(sv =>
                  sv.mss_axes?.some(m => ax.name.includes(m) || m.includes(ax.name))
                );
                return (
                  <div key={i} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-brand text-lg text-white flex-shrink-0"
                        style={{ background: color }}
                      >
                        {ax.lv || 0}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-midnight">
                          {'①②③④⑤'.charAt(i)} {ax.name}
                        </div>
                        {ax.layer && <div className="text-[10px] text-gray-400">{ax.layer}</div>}
                      </div>
                    </div>
                    {/* Bar */}
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    {ax.lv_meaning && (
                      <div className="text-xs font-medium text-jinden-blue mb-1">
                        Lv{ax.lv} &rarr; {ax.lv_meaning}
                      </div>
                    )}
                    {ax.evidence && (
                      <div className="text-xs text-gray-500 leading-[1.7] mb-1">{nl(ax.evidence)}</div>
                    )}
                    {ax.for_ceo && (
                      <div className="text-xs text-gray-600 mt-2 p-2.5 rounded border-l-2 border-jinden-blue/40" style={{ background: 'rgba(21,101,192,0.04)' }}>
                        <span className="font-semibold">社長へ：</span>{ax.for_ceo}
                      </div>
                    )}
                    {/* Verb badges matching this axis */}
                    {matchingVerbs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {matchingVerbs.map((sv, vi) => (
                          <span
                            key={vi}
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                            style={{ background: '#E8F5E9', borderColor: '#2E7D32', color: '#2E7D32' }}
                          >
                            {sv.id} {sv.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <CeoQuestion text="5軸のうち、御社が最も必要としているのはどの軸ですか？" />
          </div>
        )}

        {/* ================================================================
            SECTION 07 — Strength Full Disclosure (replaces Balance Wheel)
        ================================================================ */}
        {sfd && sfd.length > 0 && (
          <div className="mb-10">
            <SectionHeader num="07" label="Strength Full Disclosure" title="強み完全開示 — この人の武器を深く知る" />

            <div className="space-y-4">
              {sfd.map((s, i) => (
                <div key={i} className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    {s.verb_id && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border" style={{ background: '#E8F5E9', borderColor: '#2E7D32', color: '#2E7D32' }}>
                        {s.verb_id}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-gray-800">{s.verb_name}</span>
                  </div>

                  {s.deep_description && (
                    <div className="text-xs text-gray-600 leading-[1.7] mb-3">{nl(s.deep_description)}</div>
                  )}

                  {s.person_quote && (
                    <div className="font-serif text-[11px] text-gray-400 italic pl-3 border-l-2 border-gray-200 mb-3">
                      「{nl(s.person_quote)}」
                    </div>
                  )}

                  {/* Explosive scenes */}
                  {s.explosive_scenes && s.explosive_scenes.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[9px] font-bold tracking-[0.12em] uppercase mb-2" style={{ color: '#2E7D32' }}>
                        爆発的に力を発揮する場面
                      </div>
                      {s.explosive_scenes.map((sc, si) => (
                        <div key={si} className="py-2 pl-3 border-l-2 mb-1.5" style={{ borderColor: '#2E7D32' }}>
                          <div className="text-[11px] font-semibold text-gray-700">{sc.title}</div>
                          <div className="text-[11px] text-gray-500 leading-[1.6]">{nl(sc.story)}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  {s.transferable_tags && s.transferable_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {s.transferable_tags.map((tag, ti) => (
                        <span key={ti} className="text-[10px] px-2 py-0.5 bg-gray-100 rounded text-gray-600">{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Five perspective */}
                  {s.five_perspective_note && (
                    <div className="text-[11px] text-gray-500 leading-[1.5] p-2.5 rounded" style={{ background: 'rgba(21,101,192,0.04)' }}>
                      {nl(s.five_perspective_note)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <CeoQuestion text="この人の武器は、御社のどの課題にマッチしますか？" />
          </div>
        )}

        {/* ================================================================
            SECTION 08 — Inner Voice
        ================================================================ */}
        {a.inner_voice && (a.inner_voice.belief?.voice || a.inner_voice.dream?.voice || a.inner_voice.pain?.voice || a.inner_voice.challenge?.voice) && (
          <div className="mb-10">
            <SectionHeader num="08" label="Inner Voice" title="本人の声 — 生の発言と構造化解説" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {([
                ['belief', '信念', a.inner_voice.belief, '#1565C0'],
                ['dream', '夢', a.inner_voice.dream, '#2E7D32'],
                ['pain', '不満', a.inner_voice.pain, '#E65100'],
                ['challenge', '挑戦', a.inner_voice.challenge, '#2196F3'],
              ] as const).map(([key, label, v, color]) => {
                if (!v?.voice && !v?.jinden_note) return null;
                return (
                  <div
                    key={key}
                    className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    <div className="text-[9px] font-bold tracking-[0.12em] uppercase mb-2" style={{ color }}>
                      {label}
                    </div>
                    {v.voice && (
                      <div className="font-serif text-xs text-gray-700 leading-[1.7] italic">
                        「{nl(v.voice)}」
                      </div>
                    )}
                    {v.jinden_note && (
                      <div className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
                        {nl(v.jinden_note)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <CeoQuestion text="この人の信念は、御社の理念と共鳴しますか？" />
          </div>
        )}

        {/* ================================================================
            SECTION 09 — Weakness Full Disclosure
        ================================================================ */}
        {a.weakness_full && (a.weakness_full.essence || a.weakness_full.symptoms?.length || a.weakness_full.verb) && (
          <div className="mb-10">
            <SectionHeader num="09" label="Weakness Full Disclosure" title="弱み完全開示" />

            <div className="p-5 rounded-lg border-2" style={{ borderColor: '#C62828', background: 'rgba(198,40,40,0.03)' }}>
              {/* Essence */}
              {a.weakness_full.essence && (
                <div className="text-base font-bold mb-3" style={{ color: '#C62828' }}>
                  {a.weakness_full.essence}
                </div>
              )}

              {/* Verb */}
              {a.weakness_full.verb && (
                <div className="text-[13px] text-gray-700 leading-[1.7] mb-3">
                  弱み動詞：{nl(a.weakness_full.verb)}
                </div>
              )}

              {/* Symptoms */}
              {a.weakness_full.symptoms && a.weakness_full.symptoms.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-gray-500 tracking-wide mb-1">症状リスト</div>
                  {a.weakness_full.symptoms.map((sy, i) =>
                    sy ? (
                      <div key={i} className="text-xs text-gray-600 py-1 pl-3 border-l-2" style={{ borderColor: '#C62828' }}>
                        {sy}
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {/* CEO proposal */}
              {a.weakness_full.ceo_proposal && (
                <div className="text-[13px] text-gray-700 leading-[1.8] p-3 bg-white rounded border border-gray-200 mb-3">
                  <span className="font-semibold">社長への活用提案：</span>{nl(a.weakness_full.ceo_proposal)}
                </div>
              )}

              {/* Weakness verbs from dictionary */}
              {va?.weakness_verbs && va.weakness_verbs.length > 0 && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                  <div className="text-[10px] font-bold tracking-[0.15em] text-gray-400 mb-2">
                    JINDEN METHOD辞書 — 弱み動詞マッチング
                  </div>
                  {va.weakness_verbs.map((wv, i) => (
                    <div key={i} className="py-2 border-b border-gray-100 last:border-0">
                      <div className="text-xs">
                        <span className="font-bold" style={{ color: '#C62828' }}>{wv.id}</span>{' '}
                        <span className="text-gray-700">{wv.name}</span>
                      </div>
                      {wv.shadow_combination && (
                        <div className="text-[10px] text-gray-400">影の構造：{wv.shadow_combination}</div>
                      )}
                      {wv.belief_matrix && (
                        <div className="text-[10px]" style={{ color: '#E65100' }}>信念マトリクス：{wv.belief_matrix}</div>
                      )}
                      {wv.prescription && (
                        <div className="text-xs text-gray-600 mt-1 pl-2 border-l-2 border-jinden-blue/30">
                          <span className="font-semibold">影との向き合い方：</span>{wv.prescription}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-[10px] text-gray-400 mt-3 text-right italic">
                ※弱みまで開示するのがBLUEVOX。ここに書いてあることが信頼の根拠です
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            SECTION 10 — Five Q&A
        ================================================================ */}
        {a.five_qa && a.five_qa.length > 0 && (
          <div className="mb-10">
            <SectionHeader num="10" label="Five Q&amp;A" title="5者分析 — この人間の内部構造" />

            <div className="space-y-3">
              {a.five_qa.map((qa, i) => (
                <div key={i} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-[13px] font-semibold text-jinden-blue mb-2">
                    Q{i + 1}：{qa.question}
                  </div>
                  <div className="text-xs text-gray-600 leading-[1.8]">{nl(qa.answer)}</div>
                  {qa.lens && (
                    <div className="text-[10px] text-gray-400 mt-2 italic">{qa.lens}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================
            SECTION 11 — Recommendation
        ================================================================ */}
        {a.recommendation && (
          <div className="mb-10">
            <SectionHeader num="11" label="Recommendation" title="じんでん→社長への推薦文" />

            <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="text-[9px] font-bold tracking-[0.2em] text-jinden-blue/60 mb-3">
                PERSONAL RECOMMENDATION BY JINDEN METHOD
              </div>
              <div className="font-serif text-[14px] text-gray-800 leading-[1.8] whitespace-pre-wrap">
                {a.recommendation}
              </div>
            </div>

            <CeoQuestion text="この人の次の「山」を、あなたの会社で作れますか？" />
          </div>
        )}

        {/* ================================================================
            SECTION 12 — Export Actions
        ================================================================ */}
        <div className="mb-6 print:hidden">
          <SectionHeader num="12" label="Export" title="エクスポート" />

          <div className="flex flex-wrap gap-3">
            <button
              onClick={copyHTML}
              className="inline-flex items-center gap-2 px-5 py-3 bg-jinden-blue text-white rounded-lg text-sm font-medium hover:bg-vox transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              HTMLコピー
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-3 bg-midnight text-white rounded-lg text-sm font-medium hover:bg-deep transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              印刷
            </button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="pt-6 mt-6 border-t border-gray-200 text-center">
          <div className="font-brand text-lg tracking-wider text-gray-200">
            BLUE<span className="text-jinden-blue/20">VOX</span>
          </div>
          <div className="text-[9px] text-gray-300 mt-1 tracking-[0.15em]">
            CONFIDENTIAL &mdash; JINDEN METHOD BLUEPRINT FOR CEO
          </div>
        </div>
      </div>
    </div>
  );
}
