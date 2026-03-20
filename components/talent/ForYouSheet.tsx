'use client';

import { useRef, useCallback } from 'react';
import type { AnalysisResult, ProfileData } from '@/lib/types';
import ExistenceStructureMap from './ExistenceStructureMap';
import PCMHexagon from './PCMHexagon';

interface ForYouSheetProps {
  analysis: AnalysisResult;
  name: string;
  profileData?: ProfileData | null;
  onExport?: () => void;
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

function trunc(s: string | undefined | null, max: number): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '...' : s;
}

/** Section header */
function Sec({ en, ja, accent = '#1565C0' }: { en: string; ja: string; accent?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: accent }}>
        {en}
      </div>
      <h3 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 20, fontWeight: 600, color: '#0A1628', letterSpacing: '0.02em', marginTop: 2 }}>
        {ja}
      </h3>
      <div style={{ marginTop: 6, height: 2, width: 40, borderRadius: 2, background: accent }} />
    </div>
  );
}

/* ====================================================================== */

export default function ForYouSheet({ analysis, name, profileData, onExport }: ForYouSheetProps) {
  const a = analysis;
  const forYou = a.for_you_extras;
  const pcm = a.pcm;
  const iv = a.inner_voice;
  const fqa = a.five_qa;
  const sfd = a.strength_full_disclosure;
  const sheetRef = useRef<HTMLDivElement>(null);

  const va = a.verb_analysis;

  /* ---- PDF Export ---- */
  const handlePdfSave = useCallback(() => {
    if (!sheetRef.current) return;
    const htmlContent = sheetRef.current.innerHTML;
    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>BLUEVOX For You — ${name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Noto+Sans+JP:wght@300;400;500;700&family=Noto+Serif+JP:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans JP', sans-serif; -webkit-font-smoothing: antialiased; background: #fff; color: #1a1a1a; }
  .font-brand { font-family: 'Cormorant Garamond', serif; }
  .font-serif { font-family: 'Noto Serif JP', serif; }
  .page-break { page-break-after: always; break-after: page; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break { page-break-after: always; }
    .no-print { display: none !important; }
  }
  @page { margin: 12mm 10mm; size: A4; }
</style>
</head>
<body>
<div style="max-width:800px;margin:0 auto;">
${htmlContent}
</div>
<script>
  setTimeout(function(){ window.print(); }, 600);
<\/script>
</body>
</html>`);
    win.document.close();
  }, [name]);

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  /* ====================================================================== */
  return (
    <div>
      <div ref={sheetRef} style={{ background: '#FAFAF8', maxWidth: 800, margin: '0 auto' }}>

        {/* ================================================================
            PAGE 1: この人間を一目で掴む
        ================================================================ */}
        <div className="page-break">

          {/* ---- Hero banner ---- */}
          <div
            style={{
              padding: '32px 40px 24px',
              borderRadius: '10px 10px 0 0',
              background: '#FAFAF8',
              borderBottom: '1px solid #E5E7EB',
            }}
          >
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, letterSpacing: 3, opacity: 0.4, marginBottom: 12, color: '#0A1628' }}>
              BLUEVOX — FOR YOU
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 12 }}>
              {/* Photo */}
              <div style={{ flexShrink: 0 }}>
                {profileData?.profile_photo ? (
                  <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(21,101,192,0.2)' }}>
                    <img src={profileData.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{
                    width: 90, height: 90, borderRadius: '50%', background: 'rgba(21,101,192,0.05)',
                    border: '3px solid rgba(21,101,192,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, color: 'rgba(21,101,192,0.4)' }}>
                      {name?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 36, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.2, marginBottom: 8, color: '#0A1628' }}>
                  {name}
                </div>
                {a.five_axes?.talent_type && (
                  <span style={{
                    display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '3px 12px',
                    borderRadius: 16, border: '1px solid rgba(21,101,192,0.25)', background: 'rgba(21,101,192,0.06)',
                    color: '#1565C0',
                  }}>
                    {a.five_axes.talent_type}タイプ
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ---- Profile bar ---- */}
          {profileData && (
            <div style={{ padding: '8px 40px', background: '#F7F8FA', display: 'flex', flexWrap: 'wrap', gap: '4px 24px', fontSize: 11, color: '#64748b' }}>
              {profileData.department && <span>{profileData.department}</span>}
              {profileData.position && <span>{profileData.position}</span>}
              {profileData.age && <span>{profileData.age}</span>}
              {profileData.residence && <span>{profileData.residence}</span>}
              {profileData.side_job_hours && <span>副業{profileData.side_job_hours}</span>}
              {profileData.side_job_remote && <span>リモート: {profileData.side_job_remote}</span>}
              {profileData.education && <span>{profileData.education}</span>}
              {profileData.mbti && <span>MBTI: {profileData.mbti}</span>}
            </div>
          )}

          {/* ---- Section 01: CORE IDENTITY ---- */}
          {a.core_sentence && (
            <div style={{ padding: '24px 40px 16px' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 64, fontFamily: "'Cormorant Garamond', serif", color: '#E5E7EB', lineHeight: 1, userSelect: 'none' }}>01</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1565C0', marginTop: -16 }}>
                  CORE IDENTITY
                </div>
                <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 20, fontWeight: 600, color: '#0A1628', letterSpacing: '0.02em', marginTop: 4 }}>
                  存在の一文 — この人間を30秒で掴む
                </div>
              </div>

              {/* Core sentence — gradient block (most prominent element) */}
              <div style={{
                background: 'linear-gradient(135deg, #0A1628, #1565C0)',
                color: '#fff',
                fontFamily: "'Noto Serif JP', serif",
                fontSize: 22,
                fontWeight: 700,
                padding: '28px 36px',
                borderRadius: 8,
                letterSpacing: '0.5px',
                lineHeight: 1.6,
                marginBottom: 16,
              }}>
                「{nl(a.core_sentence)}」
              </div>

              {/* Jinden comment — direct display, no label */}
              {a.jinden_comment && (
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.9, marginBottom: 12 }}>
                  {nl(a.jinden_comment)}
                </div>
              )}

              {/* Raw voice intro quote */}
              {a.raw_voice_intro && (
                <div style={{ paddingLeft: 12, borderLeft: '3px solid rgba(21,101,192,0.3)', marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 13, color: '#64748b', fontStyle: 'italic', lineHeight: 1.7 }}>
                    「{nl(a.raw_voice_intro)}」
                  </div>
                </div>
              )}

              {/* Detected root verbs as tags */}
              {a.verb_analysis?.detected_root_verbs && a.verb_analysis.detected_root_verbs.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {a.verb_analysis.detected_root_verbs.map((rv, i) => {
                    const dot = rv.strength === 'high' ? '\u25CF' : rv.strength === 'medium' || rv.strength === 'mid' ? '\u25CB' : '\u25B3';
                    return (
                      <span
                        key={i}
                        style={{
                          fontSize: 11, padding: '2px 10px', borderRadius: 12,
                          background: 'rgba(21,101,192,0.06)', border: '1px solid rgba(21,101,192,0.2)',
                          color: '#1565C0', fontWeight: 500,
                        }}
                      >
                        {dot} {rv.id} {rv.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ---- Existence Structure Map ---- */}
          <div style={{ padding: '24px 40px 16px' }}>
            <Sec en="Existence Structure" ja="存在の構造マップ" accent="#0A1628" />
          </div>
          <div style={{ padding: '0 40px 24px' }}>
            <ExistenceStructureMap analysis={a} talentType={a.five_axes?.talent_type} />
          </div>

          {/* ---- Career Timeline ---- */}
          {a.career_highlights && a.career_highlights.length > 0 && (
            <div style={{ padding: '24px 40px 16px' }}>
              <Sec en="Career Timeline" ja="経歴タイムライン — 何をしたかではなく「どう動いたか」" />
              <div style={{ borderLeft: '2px solid rgba(21,101,192,0.3)', paddingLeft: 20 }}>
                {a.career_highlights.map((item, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#1565C0', letterSpacing: '0.05em' }}>{item.period}</span>
                      <span style={{ fontSize: 10, color: '#9CA3AF' }}>&mdash;</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{item.role}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.7 }}>{nl(item.detail)}</div>
                    {item.quote && (
                      <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginTop: 6, paddingLeft: 12, borderLeft: '2px solid #E5E7EB' }}>
                        「{nl(item.quote)}」
                      </div>
                    )}
                    {item.warning && (
                      <div style={{ fontSize: 11, marginTop: 4, padding: '4px 8px', borderRadius: 4, color: '#E65100', background: 'rgba(230,81,0,0.06)' }}>
                        Warning: {item.warning}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- Strength × Weakness — この人間の使い方 ---- */}
          {(va?.self_function || va?.strength_verbs?.length || va?.weakness_verbs?.length) && (
            <div style={{ padding: '24px 40px 16px' }}>
              <Sec en="Strength &amp; Weakness" ja="強み × 弱み — この人間の使い方" />

              {/* Self function band */}
              {va?.self_function && (
                <div style={{
                  background: '#0A1628', color: '#fff', padding: '16px 20px', borderRadius: 8,
                  marginBottom: 16, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.2em', opacity: 0.5, marginBottom: 4 }}>SELF FUNCTION</div>
                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Noto Serif JP', serif" }}>「{va.self_function}」</div>
                  {va.self_function_roots && (
                    <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>原動詞：{va.self_function_roots}</div>
                  )}
                </div>
              )}

              {/* 2-column: strength / weakness */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Strength verbs (green) */}
                {va?.strength_verbs && va.strength_verbs.length > 0 && (
                  <div style={{ padding: 16, borderRadius: 8, borderLeft: '4px solid #2E7D32', background: 'rgba(46,125,50,0.04)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#2E7D32', marginBottom: 12 }}>
                      強み動詞
                    </div>
                    {va.strength_verbs.map((sv, i) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 12, fontWeight: 700, background: '#E8F5E9', border: '1px solid #2E7D32', color: '#2E7D32' }}>
                            {sv.id}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>{sv.name}</span>
                        </div>
                        {sv.root_combination && (
                          <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>根源結合：{sv.root_combination}</div>
                        )}
                        {sv.want_to && (
                          <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.6 }}>{sv.want_to}</div>
                        )}
                        {sv.evidence && (
                          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>{nl(sv.evidence)}</div>
                        )}
                        {sv.transferable_positions && sv.transferable_positions.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                            {sv.transferable_positions.map((pos, pi) => (
                              <span key={pi} style={{ fontSize: 10, padding: '2px 8px', background: '#F3F4F6', borderRadius: 4, color: '#4B5563' }}>
                                {pos}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Weakness verbs (red) */}
                {va?.weakness_verbs && va.weakness_verbs.length > 0 && (
                  <div style={{ padding: 16, borderRadius: 8, borderLeft: '4px solid #C62828', background: 'rgba(198,40,40,0.04)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#C62828', marginBottom: 12 }}>
                      弱み動詞
                    </div>
                    {va.weakness_verbs.map((wv, i) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 12, fontWeight: 700, background: '#FFEBEE', border: '1px solid #C62828', color: '#C62828' }}>
                            {wv.id}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>{wv.name}</span>
                        </div>
                        {wv.shadow_combination && (
                          <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>影の構造：{wv.shadow_combination}</div>
                        )}
                        {wv.belief_matrix && (
                          <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>信念マトリクス：{wv.belief_matrix}</div>
                        )}
                        {wv.prescription && (
                          <div style={{ fontSize: 12, marginTop: 4, paddingLeft: 8, borderLeft: '2px solid #E5E7EB', color: '#4B5563', lineHeight: 1.6 }}>
                            影との向き合い方：{wv.prescription}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detected root verbs */}
              {va?.detected_root_verbs && va.detected_root_verbs.length > 0 && (
                <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#9CA3AF', marginBottom: 10 }}>
                    AI検出 — JINDEN METHOD動詞辞書マッチング
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {va.detected_root_verbs.map((rv, i) => (
                      <span key={i} style={{
                        fontSize: 11, padding: '4px 10px', background: '#F9FAFB', border: '1px solid #E5E7EB',
                        borderRadius: 12, color: '#374151', fontWeight: 500,
                      }}>
                        {rv.id} {rv.name} <span style={{ color: '#9CA3AF', fontSize: 10 }}>({rv.strength})</span>
                      </span>
                    ))}
                  </div>
                  {va.inquiry_theme && (
                    <div style={{ fontSize: 12, color: '#1565C0', fontStyle: 'italic', padding: '8px 10px', borderRadius: 6, background: 'rgba(21,101,192,0.04)' }}>
                      探究テーマ：{va.inquiry_theme}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================================================================
            PAGE 2: PCMパーソナリティ + 強み完全開示
        ================================================================ */}
        <div className="page-break">

          {/* ---- PCM Hexagon ---- */}
          {pcm && pcm.types && pcm.types.length > 0 && (
            <div style={{ padding: '24px 40px 16px' }}>
              <Sec en="Personality Type" ja="あなたのパーソナリティ" />
              {/* PCM intro explanation is included inside PCMHexagon component */}
              <PCMHexagon
                types={pcm.types}
                activation={pcm.activation}
                deactivation={pcm.deactivation}
              />
            </div>
          )}

          {/* ---- Strength Full Disclosure ---- */}
          <div style={{ padding: '24px 40px 16px' }}>
            <Sec en="Strength Full Disclosure" ja="あなたの強み — 完全開示" accent="#2D8C3C" />
          </div>

          <div style={{ padding: '0 40px 24px' }}>
            {(sfd && sfd.length > 0 ? sfd : []).slice(0, 3).map((s, i) => (
              <div key={i} style={{ background: '#fff', borderLeft: '4px solid #2D8C3C', marginBottom: 16, padding: '16px 20px' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', marginBottom: 8, fontFamily: "'Noto Sans JP', sans-serif" }}>
                  {s.verb_name}
                </div>
                {s.deep_description && (
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.9, marginBottom: 10 }}>
                    {nl(s.deep_description)}
                  </div>
                )}
                {s.person_quote && (
                  <div style={{ paddingLeft: 12, borderLeft: '3px solid rgba(21,101,192,0.3)', marginBottom: 10 }}>
                    <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 12, color: '#64748b', fontStyle: 'italic', lineHeight: 1.7 }}>
                      「{nl(s.person_quote)}」
                    </div>
                  </div>
                )}

                {/* Explosive scenes */}
                {s.explosive_scenes && s.explosive_scenes.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#2D8C3C', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                      爆発的に力を発揮する場面
                    </div>
                    {s.explosive_scenes.slice(0, 3).map((sc, si) => (
                      <div key={si} style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: 6, marginBottom: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>{sc.title}</div>
                        <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.7 }}>{nl(sc.story)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transferable tags */}
                {s.transferable_tags && s.transferable_tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {s.transferable_tags.slice(0, 6).map((tag, ti) => (
                      <span key={ti} style={{ fontSize: 10, padding: '2px 10px', borderRadius: 12, background: '#1565C0', color: '#fff', fontWeight: 500 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Five perspective note */}
                {s.five_perspective_note && (
                  <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', lineHeight: 1.6 }}>
                    {nl(s.five_perspective_note)}
                  </div>
                )}
              </div>
            ))}

            {/* Fallback: old strength data */}
            {(!sfd || sfd.length === 0) && forYou?.strength_detail_for_person?.map((s, i) => (
              <div key={i} style={{ background: '#fff', borderLeft: '4px solid #2D8C3C', marginBottom: 12, padding: '14px 18px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628', marginBottom: 4 }}>
                  {s.definition_for_person}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                  {trunc(s.related_episodes, 200)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================
            PAGE 3: 弱み完全開示 + 輝く仕事/消耗する仕事
        ================================================================ */}
        <div className="page-break">

          {/* ---- Weakness Full Disclosure ---- */}
          <div style={{ padding: '24px 40px 8px' }}>
            <Sec en="Growth &amp; Self-Awareness" ja="あなたの影 — 強みの裏側を知る" accent="#C83232" />
            <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: -8, marginBottom: 16 }}>
              これは弱さではない。あなたの強みが持つ影だ
            </div>
          </div>

          <div style={{ padding: '0 40px 16px', background: '#fef2f2', margin: '0 0 0 0' }}>
            <div style={{ padding: '16px 0' }}>
              {(forYou?.weakness_for_person || []).slice(0, 3).map((w, i) => (
                <div key={i} style={{ background: '#fff', borderLeft: '4px solid #C83232', marginBottom: 16, padding: '16px 20px' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#C83232', marginBottom: 8, fontFamily: "'Noto Sans JP', sans-serif" }}>
                    {w.description_for_person}
                  </div>

                  {/* Struggling scenes */}
                  {w.struggling_scenes && w.struggling_scenes.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#C83232', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                        この影が牙を剥く場面
                      </div>
                      {w.struggling_scenes.slice(0, 3).map((sc, si) => (
                        <div key={si} style={{ background: '#fef2f2', padding: '10px 14px', borderRadius: 6, marginBottom: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>{sc.title}</div>
                          <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.7 }}>{nl(sc.story)}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Coping (向き合い方) - replaces 処方箋 */}
                  {w.prescription && (
                    <div style={{ display: 'inline-block', fontSize: 11, padding: '4px 12px', borderRadius: 16, background: '#FFF3E0', color: '#E65100', fontWeight: 500 }}>
                      影との向き合い方: {trunc(w.prescription, 60)}
                    </div>
                  )}
                  {!w.prescription && w.growth_hint && (
                    <div style={{ display: 'inline-block', fontSize: 11, padding: '4px 12px', borderRadius: 16, background: '#FFF3E0', color: '#E65100', fontWeight: 500 }}>
                      影との向き合い方: {trunc(w.growth_hint, 60)}
                    </div>
                  )}

                  {/* Jinden message for this weakness */}
                  {w.jinden_message && (
                    <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 10, lineHeight: 1.7 }}>
                      {nl(w.jinden_message)}
                    </div>
                  )}
                </div>
              ))}

              <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'right', marginTop: 8 }}>
                弱みまで開示するのがBLUEVOX。ここに書いてあることが信頼の根拠です
              </div>
            </div>
          </div>

          {/* ---- Thriving vs Struggling ---- */}
          {((a.thriving_scenes?.length) || (a.struggling_scenes?.length)) ? (
            <div style={{ padding: '24px 40px 16px' }}>
              <Sec en="Scenes" ja="あなたが輝く場面、苦しくなる場面" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Left: thriving */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#2D8C3C', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    火が燃える場面
                  </div>
                  {(a.thriving_scenes || []).slice(0, 3).map((sc, i) => (
                    <div key={i} style={{ background: '#fff', borderLeft: '3px solid #2D8C3C', padding: '10px 14px', borderRadius: 6, marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>{sc.title}</div>
                      <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.7, marginBottom: 6 }}>{nl(sc.story)}</div>
                      {sc.tags?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {sc.tags.slice(0, 3).map((tag, ti) => (
                            <span key={ti} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: '#E8F5E9', color: '#2D8C3C' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Right: struggling */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#C83232', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    火が消える場面
                  </div>
                  {(a.struggling_scenes || []).slice(0, 3).map((sc, i) => (
                    <div key={i} style={{ background: '#fff', borderLeft: '3px solid #C83232', padding: '10px 14px', borderRadius: 6, marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>{sc.title}</div>
                      <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.7 }}>{nl(sc.story)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Fallback: verb jobs */}
          {(!a.thriving_scenes?.length && !a.struggling_scenes?.length) && (forYou?.suitable_verb_jobs?.length || forYou?.unsuitable_verb_jobs?.length) ? (
            <div style={{ padding: '24px 40px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {forYou?.suitable_verb_jobs && forYou.suitable_verb_jobs.length > 0 && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#2D8C3C', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                      向いている仕事
                    </div>
                    {forYou.suitable_verb_jobs.slice(0, 5).map((job, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#1a1a1a', lineHeight: 1.5, marginBottom: 4, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ color: '#2D8C3C', fontWeight: 700 }}>&#10003;</span>
                        {trunc(job, 40)}
                      </div>
                    ))}
                  </div>
                )}
                {forYou?.unsuitable_verb_jobs && forYou.unsuitable_verb_jobs.length > 0 && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#C83232', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                      向いていない仕事
                    </div>
                    {forYou.unsuitable_verb_jobs.slice(0, 5).map((job, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#1a1a1a', lineHeight: 1.5, marginBottom: 4, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ color: '#C83232', fontWeight: 700 }}>!</span>
                        {trunc(job, 40)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* ================================================================
            PAGE 4: あなたの声 + 5つの問い + フッター
        ================================================================ */}
        <div>

          {/* ---- Inner Voice (2x2 grid) ---- */}
          {iv && (iv.belief?.voice || iv.dream?.voice || iv.pain?.voice || iv.challenge?.voice) && (
            <div style={{ padding: '24px 40px 16px' }}>
              <Sec en="Inner Voice" ja="あなた自身の声" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {([
                  { label: '信念', v: iv.belief, bg: '#EBF5FB', accent: '#1565C0' },
                  { label: '夢', v: iv.dream, bg: '#E8F8F5', accent: '#2D8C3C' },
                  { label: '不満', v: iv.pain, bg: '#FDEDEC', accent: '#C83232' },
                  { label: '挑戦', v: iv.challenge, bg: '#FEF5E7', accent: '#E65100' },
                ] as const).map(({ label, v, bg, accent }) => {
                  if (!v?.voice) return null;
                  return (
                    <div key={label} style={{ padding: 14, borderRadius: 8, background: bg }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: accent, textTransform: 'uppercase' as const, marginBottom: 6 }}>
                        {label}
                      </div>
                      <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 16, fontWeight: 700, color: '#0A1628', lineHeight: 1.7, marginBottom: 8 }}>
                        「{trunc(v.voice, 60)}」
                      </div>
                      {v.jinden_note && (
                        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, fontFamily: "'Noto Sans JP', sans-serif" }}>
                          {trunc(v.jinden_note, 80)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- Five Q&A ---- */}
          {fqa && fqa.length > 0 && (
            <div style={{ padding: '24px 40px 16px' }}>
              <Sec en="Five Q&amp;A" ja="あなたを深掘りする5つの問い" />

              <div>
                {fqa.slice(0, 5).map((qa, i) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: i < 4 ? '1px solid #E5E7EB' : 'none' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1565C0', marginBottom: 4 }}>
                      Q{i + 1}. {qa.question}
                    </div>
                    <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.7 }}>
                      {trunc(qa.answer, 150)}
                    </div>
                    {qa.lens && (
                      <div style={{ display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#F1F5F9', color: '#64748b', marginTop: 4 }}>
                        {qa.lens}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- Footer ---- */}
          <div style={{ padding: '24px 40px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, letterSpacing: '0.06em', color: '#94a3b8' }}>
                BLUE<span style={{ color: 'rgba(21,101,192,0.4)' }}>VOX</span>
              </span>
              <span style={{ fontSize: 9, color: '#94a3b8' }}>For You</span>
            </div>
            <div style={{ fontSize: 9, color: '#94a3b8' }}>
              {today} 作成
            </div>
            <div style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
              弱みまで開示するのがBLUEVOX
            </div>
          </div>
        </div>
      </div>

      {/* ---- Action Buttons (not printed) ---- */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 0' }}>
        <button
          onClick={handlePdfSave}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: '#0A1628', color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          PDFで保存
        </button>
        {onExport && (
          <button
            onClick={onExport}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            エクスポート
          </button>
        )}
      </div>
    </div>
  );
}
