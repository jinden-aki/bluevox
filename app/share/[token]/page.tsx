'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { verifyToken, getFeedbacksForShareLink } from '@/lib/share';
import type { ShareLink, Feedback } from '@/lib/share';
import type { AnalysisResult, ProfileData } from '@/lib/types';
import FeedbackForm from '@/components/share/FeedbackForm';
import InlineFeedback from '@/components/share/InlineFeedback';
import ProfileEditModal from '@/components/share/ProfileEditModal';

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

/* ---------- Status badge ---------- */

function FeedbackStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    new: { bg: '#FFF3E0', text: '#E65100', label: '新規', icon: '🟡' },
    read: { bg: '#E3F2FD', text: '#1565C0', label: '確認済み', icon: '🔵' },
    applied: { bg: '#E8F5E9', text: '#2E7D32', label: '反映済み', icon: '🟢' },
  };
  const c = config[status] || config.new;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
      <span className="text-[8px]">{c.icon}</span>
      {c.label}
    </span>
  );
}

/* ====================================================================== */

export default function SharePortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  /* pcmTab removed — now using quadrant grid */
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const loadFeedbacks = useCallback(async () => {
    if (!shareLink) return;
    const fbs = await getFeedbacksForShareLink(shareLink.id);
    setFeedbacks(fbs);
  }, [shareLink]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const result = await verifyToken(token);
      if (!result.valid || !result.shareLink) {
        setError('このリンクは無効か、有効期限が切れています。');
        setLoading(false);
        return;
      }

      setShareLink(result.shareLink);

      // Fetch talent data
      const { data: talentData } = await supabase
        .from('talents')
        .select('analysis, session_id')
        .eq('id', result.shareLink.talent_id)
        .single();

      if (talentData?.analysis) {
        setAnalysis(talentData.analysis as AnalysisResult);
      }

      // Fetch session profile data
      if (talentData?.session_id) {
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('profile_data')
          .eq('id', talentData.session_id)
          .single();
        if (sessionData?.profile_data) {
          setProfileData(sessionData.profile_data as ProfileData);
        }
      }

      // Fetch existing feedbacks
      const fbs = await getFeedbacksForShareLink(result.shareLink.id);
      setFeedbacks(fbs);

      setLoading(false);
    };

    init();
  }, [token]);

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <div className="text-center">
          <div
            className="w-10 h-10 border-[3px] mx-auto mb-4 rounded-full"
            style={{ borderColor: '#E0E0E0', borderTopColor: '#1565C0', animation: 'spin .6s linear infinite' }}
          />
          <p className="text-lg tracking-widest text-gray-300" style={{ fontFamily: "'Cormorant Garamond', serif" }}>BLUEVOX</p>
        </div>
      </div>
    );
  }

  /* ---- Error ---- */
  if (error || !shareLink) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <div className="text-center max-w-sm px-6">
          <div className="text-2xl tracking-[0.15em] text-gray-300 mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>BLUEVOX</div>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-800 mb-2">リンクが無効です</h1>
          <p className="text-[14px] text-gray-500 leading-relaxed">
            {error || 'このリンクは無効か、有効期限が切れています。じんでんにお問い合わせください。'}
          </p>
        </div>
      </div>
    );
  }

  const name = shareLink.talent_name || '';
  const a = analysis;
  const forYou = a?.for_you_extras;
  const pcm = a?.pcm;
  const iv = a?.inner_voice;
  const fqa = a?.five_qa;
  const sfd = a?.strength_full_disclosure;

  const inlineFB = (label: string) => (
    <InlineFeedback
      label={label}
      shareLinkId={shareLink.id}
      talentId={shareLink.talent_id}
      talentName={name}
      onSuccess={loadFeedbacks}
    />
  );

  /* pcmTabLabels removed — quadrant grid */

  // Non-profile-update feedbacks for display
  const displayFeedbacks = feedbacks.filter((f) => f.feedback_type !== 'profile_update');

  /* ====================================================================== */
  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      <div className="max-w-[720px] mx-auto">

        {/* ================================================================
            A. Hero Section
        ================================================================ */}
        <div
          className="px-6 py-12 md:px-10 md:py-16 relative"
          style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1565C0 100%)' }}
        >
          <div className="text-[24px] tracking-[3px] text-white/40 mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            BLUEVOX
          </div>
          <p className="text-[12px] text-white/30 tracking-wide mb-8" style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
            あなたの声が、あなたを描く。
          </p>

          {/* Profile photo + name */}
          <div className="flex items-end gap-5 mb-5">
            {profileData?.profile_photo && (
              <div className="w-20 h-20 rounded-full border-2 border-white/20 overflow-hidden flex-shrink-0">
                <img src={profileData.profile_photo} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <div className="text-[32px] md:text-[40px] font-medium text-white leading-tight tracking-wide" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                {name}
              </div>
            </div>
          </div>

          {a?.core_sentence && (
            <div className="text-[17px] md:text-[18px] text-white/85 leading-relaxed italic mb-5" style={{ fontFamily: "'Noto Serif JP', serif" }}>
              {nl(a.core_sentence)}
            </div>
          )}

          <div className="flex items-center gap-3">
            {a?.five_axes?.talent_type && (
              <span className="inline-block text-[11px] font-semibold tracking-wide text-white/80 px-3 py-1.5 rounded-full border border-white/20 bg-white/10">
                {a.five_axes.talent_type}タイプ
              </span>
            )}
            {/* Edit profile button */}
            <button
              onClick={() => setProfileModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/50 hover:text-white/80 transition px-3 py-1.5 rounded-full border border-white/10 hover:border-white/25"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              プロフィールを編集
            </button>
          </div>
        </div>

        {/* ================================================================
            B. Feedback Input (top of page for immediate visibility)
        ================================================================ */}
        <div className="px-6 py-8 md:px-10" style={{ background: '#F5F0E8' }}>
          <div className="text-center mb-6">
            <h3 className="text-[20px] font-medium leading-relaxed mb-2" style={{ color: '#0A1628', fontFamily: "'Noto Serif JP', serif" }}>
              あなたの声を、もっと聞かせてください
            </h3>
            <p className="text-[14px] text-gray-500 leading-relaxed" style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
              気になったこと、追加で伝えたいこと、なんでも自由に。<br className="hidden sm:block" />
              じんでんが必ず読みます。
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
            <FeedbackForm
              shareLinkId={shareLink.id}
              talentId={shareLink.talent_id}
              talentName={name}
              onSuccess={loadFeedbacks}
            />
          </div>
        </div>

        {/* ================================================================
            C. Jinden Message
        ================================================================ */}
        {forYou?.jinden_comment_for_person && (
          <div className="px-6 py-8 md:px-10" style={{ background: '#F5F0E8' }}>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#1565C0' }}>
              じんでんからあなたへ
            </div>
            <div className="p-6 bg-white/80 rounded-xl" style={{ border: '1px solid #E8E0D0' }}>
              <div className="text-[14px] text-gray-700 leading-[2] italic whitespace-pre-wrap" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                {forYou.jinden_comment_for_person}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            D. Content Sections
        ================================================================ */}
        <div className="px-6 py-10 md:px-10 space-y-12" style={{ background: '#FAFAF8' }}>

          {/* ---- Career Timeline ---- */}
          {a?.career_highlights && a.career_highlights.length > 0 && (
            <section>
              <div className="mb-5">
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#1565C0' }}>Career Timeline</div>
                <h3 className="text-xl font-semibold tracking-wide" style={{ color: '#0A1628', fontFamily: "'Cormorant Garamond', serif" }}>
                  経歴タイムライン
                </h3>
                <div className="mt-2 h-[2px] w-12 rounded-full" style={{ background: '#1565C0' }} />
              </div>
              <div className="border-l-2 pl-5 space-y-4" style={{ borderColor: 'rgba(21,101,192,0.3)' }}>
                {a.career_highlights.map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold tracking-wide" style={{ color: '#1565C0' }}>{item.period}</span>
                      <span className="text-[10px] text-gray-400">&mdash;</span>
                      <span className="text-[11px] font-semibold text-gray-700">{item.role}</span>
                    </div>
                    <div className="text-[12px] text-gray-600 leading-[1.7]">{nl(item.detail)}</div>
                    {item.quote && (
                      <div className="text-[11px] text-gray-400 italic mt-1.5 pl-3 border-l-2 border-gray-200" style={{ fontFamily: "'Noto Serif JP', serif" }}>
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
              {inlineFB('経歴')}
            </section>
          )}

          {/* ---- Strength × Weakness — この人間の使い方 ---- */}
          {(a?.verb_analysis?.self_function || a?.verb_analysis?.strength_verbs?.length || a?.verb_analysis?.weakness_verbs?.length) && (() => {
            const va = a!.verb_analysis;
            return (
              <section>
                <div className="mb-5">
                  <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#1565C0' }}>Strength &amp; Weakness</div>
                  <h3 className="text-xl font-semibold tracking-wide" style={{ color: '#0A1628', fontFamily: "'Cormorant Garamond', serif" }}>
                    強み × 弱み — この人間の使い方
                  </h3>
                  <div className="mt-2 h-[2px] w-12 rounded-full" style={{ background: '#1565C0' }} />
                </div>

                {/* Self function band */}
                {va?.self_function && (
                  <div className="text-center text-white p-4 rounded-lg mb-4" style={{ background: '#0A1628' }}>
                    <div className="text-[9px] tracking-[0.2em] opacity-50 mb-1">SELF FUNCTION</div>
                    <div className="text-base font-semibold" style={{ fontFamily: "'Noto Serif JP', serif" }}>「{va.self_function}」</div>
                    {va.self_function_roots && (
                      <div className="text-[11px] opacity-40 mt-1">原動詞：{va.self_function_roots}</div>
                    )}
                  </div>
                )}

                {/* 2-column: strength / weakness */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Strength verbs (green) */}
                  {va?.strength_verbs && va.strength_verbs.length > 0 && (
                    <div className="p-4 rounded-lg" style={{ borderLeft: '4px solid #2E7D32', background: 'rgba(46,125,50,0.04)' }}>
                      <div className="text-[9px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: '#2E7D32' }}>
                        強み動詞
                      </div>
                      <div className="space-y-3">
                        {va.strength_verbs.map((sv, i) => (
                          <div key={i}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border" style={{ background: '#E8F5E9', borderColor: '#2E7D32', color: '#2E7D32' }}>
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Weakness verbs (red) */}
                  {va?.weakness_verbs && va.weakness_verbs.length > 0 && (
                    <div className="p-4 rounded-lg" style={{ borderLeft: '4px solid #C62828', background: 'rgba(198,40,40,0.04)' }}>
                      <div className="text-[9px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: '#C62828' }}>
                        弱み動詞
                      </div>
                      <div className="space-y-3">
                        {va.weakness_verbs.map((wv, i) => (
                          <div key={i}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border" style={{ background: '#FFEBEE', borderColor: '#C62828', color: '#C62828' }}>
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

                {/* Detected root verbs */}
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
                      <div className="text-xs italic p-2.5 rounded" style={{ color: '#1565C0', background: 'rgba(21,101,192,0.04)' }}>
                        探究テーマ：{va.inquiry_theme}
                      </div>
                    )}
                  </div>
                )}
                {inlineFB('強み×弱み')}
              </section>
            );
          })()}

          {/* ---- Strength Full Disclosure ---- */}
          {sfd && sfd.length > 0 && (
            <section>
              <div className="mb-5">
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#2D8C3C' }}>
                  Strength Full Disclosure
                </div>
                <h3 className="text-xl font-semibold tracking-wide" style={{ color: '#0A1628', fontFamily: "'Cormorant Garamond', serif" }}>
                  あなたの強み — 完全開示
                </h3>
                <div className="mt-2 h-[2px] w-12 rounded-full" style={{ background: '#2D8C3C' }} />
              </div>
              <div className="space-y-6">
                {sfd.map((s, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ borderLeft: '4px solid #2D8C3C' }}>
                    <div className="px-5 py-3.5 border-b border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[15px] font-semibold text-gray-900">{s.verb_name}</span>
                      </div>
                    </div>
                    <div className="px-5 py-4 space-y-4">
                      {s.deep_description && (
                        <div className="text-[13px] text-gray-700 leading-[1.9]">{nl(s.deep_description)}</div>
                      )}
                      {s.person_quote && (
                        <div className="pl-4 border-l-[3px]" style={{ borderColor: 'rgba(21,101,192,0.3)' }}>
                          <div className="text-[13px] text-gray-500 italic leading-[1.7]" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                            「{nl(s.person_quote)}」
                          </div>
                        </div>
                      )}
                      {s.explosive_scenes?.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: '#2D8C3C' }}>
                            爆発的に力を発揮する場面
                          </div>
                          <div className="space-y-3">
                            {s.explosive_scenes.map((sc, si) => (
                              <div key={si} className="p-4 rounded-lg" style={{ background: 'rgba(45,140,60,0.04)' }}>
                                <div className="text-[12px] font-semibold text-gray-800 mb-1.5">{sc.title}</div>
                                <div className="text-[13px] text-gray-600 leading-[1.8]">{nl(sc.story)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {s.transferable_tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {s.transferable_tags.map((tag, ti) => (
                            <span key={ti} className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: '#E8F5E9', color: '#2D8C3C' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {inlineFB('強み')}
            </section>
          )}

          {/* ---- Weakness Full Disclosure ---- */}
          {forYou?.weakness_for_person && forYou.weakness_for_person.length > 0 && (
            <section>
              <div className="mb-5">
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#C83232' }}>
                  Growth &amp; Self-Awareness
                </div>
                <h3 className="text-xl font-semibold tracking-wide" style={{ color: '#0A1628', fontFamily: "'Cormorant Garamond', serif" }}>
                  あなたの影 — 強みの裏側を知る
                </h3>
                <div className="mt-2 h-[2px] w-12 rounded-full" style={{ background: '#C83232' }} />
              </div>
              <div className="space-y-6">
                {forYou.weakness_for_person.map((w, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ borderLeft: '4px solid #C83232' }}>
                    <div className="px-5 py-3.5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-gray-900">{w.description_for_person}</span>
                      </div>
                    </div>
                    <div className="px-5 py-4 space-y-4">
                      {w.struggling_scenes && w.struggling_scenes.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: '#C83232' }}>
                            この影が顔を出す場面
                          </div>
                          <div className="space-y-3">
                            {w.struggling_scenes.map((sc, si) => (
                              <div key={si} className="p-4 rounded-lg" style={{ background: 'rgba(200,50,50,0.03)' }}>
                                <div className="text-[12px] font-semibold text-gray-800 mb-1.5">{sc.title}</div>
                                <div className="text-[13px] text-gray-600 leading-[1.8]">{nl(sc.story)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {w.prescription && (
                        <div className="p-4 rounded-lg" style={{ background: '#FFF8E1' }}>
                          <div className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1.5" style={{ color: '#E65100' }}>影との向き合い方</div>
                          <div className="text-[13px] text-gray-700 leading-[1.8]">{nl(w.prescription)}</div>
                        </div>
                      )}
                      {!w.prescription && w.growth_hint && (
                        <div className="text-[13px] text-gray-600 leading-[1.8] py-2.5 px-4 rounded-lg" style={{ background: '#FFF8E1' }}>
                          <span className="font-medium" style={{ color: '#C83232' }}>成長のヒント：</span>
                          {nl(w.growth_hint)}
                        </div>
                      )}
                      {w.jinden_message && (
                        <div className="p-4 rounded-lg border border-[#E8E0D0]" style={{ background: '#F5F0E8' }}>
                          <div className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1.5" style={{ color: '#1565C0' }}>じんでんからあなたへ</div>
                          <div className="text-[13px] text-gray-700 leading-[1.8] italic" style={{ fontFamily: "'Noto Serif JP', serif" }}>{nl(w.jinden_message)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {inlineFB('弱み')}
            </section>
          )}

          {/* ---- Thriving & Struggling Scenes ---- */}
          {((a?.thriving_scenes?.length) || (a?.struggling_scenes?.length) || forYou?.suitable_verb_jobs?.length) ? (
            <section>
              <div className="mb-5">
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#1565C0' }}>Scenes</div>
                <h3 className="text-xl font-semibold tracking-wide" style={{ color: '#0A1628', fontFamily: "'Cormorant Garamond', serif" }}>
                  あなたが輝く場面、苦しくなる場面
                </h3>
                <div className="mt-2 h-[2px] w-12 rounded-full" style={{ background: '#1565C0' }} />
              </div>

              {a?.thriving_scenes && a.thriving_scenes.length > 0 && (
                <div className="mb-6">
                  <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: '#2D8C3C' }}>
                    水を得た魚になる場面
                  </div>
                  <div className="space-y-4">
                    {a.thriving_scenes.map((sc, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5" style={{ borderLeft: '4px solid #2D8C3C' }}>
                        <div className="text-[14px] font-semibold text-gray-900 mb-2">{sc.title}</div>
                        <div className="text-[13px] text-gray-700 leading-[1.9] mb-3">{nl(sc.story)}</div>
                        {sc.why && <div className="text-[12px] text-gray-500 italic mb-2">{nl(sc.why)}</div>}
                        {sc.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {sc.tags.map((tag, ti) => (
                              <span key={ti} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#E8F5E9', color: '#2D8C3C' }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {a?.struggling_scenes && a.struggling_scenes.length > 0 && (
                <div className="mb-6">
                  <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: '#C83232' }}>
                    息が詰まる場面
                  </div>
                  <div className="space-y-4">
                    {a.struggling_scenes.map((sc, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5" style={{ borderLeft: '4px solid #C83232' }}>
                        <div className="text-[14px] font-semibold text-gray-900 mb-2">{sc.title}</div>
                        <div className="text-[13px] text-gray-700 leading-[1.9] mb-3">{nl(sc.story)}</div>
                        {sc.why && <div className="text-[12px] text-gray-500 italic">{nl(sc.why)}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback: verb job lists */}
              {(!a?.thriving_scenes || a.thriving_scenes.length === 0) && (forYou?.suitable_verb_jobs?.length || forYou?.unsuitable_verb_jobs?.length) && (
                <div className="grid grid-cols-1 gap-5">
                  {forYou?.suitable_verb_jobs && forYou.suitable_verb_jobs.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: '#2D8C3C' }}>向いている仕事</div>
                      <div className="space-y-2.5">
                        {forYou.suitable_verb_jobs.map((job, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-[13px] text-gray-800">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#2D8C3C' }} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {job}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {forYou?.unsuitable_verb_jobs && forYou.unsuitable_verb_jobs.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: '#C83232' }}>向いていない仕事</div>
                      <div className="space-y-2.5">
                        {forYou.unsuitable_verb_jobs.map((job, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-[13px] text-gray-800">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#C83232' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            {job}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {inlineFB('仕事シーン')}
            </section>
          ) : null}

          {/* ---- PCM Personality ---- */}
          {pcm && pcm.types && pcm.types.length > 0 && (
            <section>
              <div className="mb-5">
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#1565C0' }}>Personality Type</div>
                <h3 className="text-xl font-semibold tracking-wide" style={{ color: '#0A1628', fontFamily: "'Cormorant Garamond', serif" }}>
                  あなたのパーソナリティ
                </h3>
                <div className="mt-2 h-[2px] w-12 rounded-full" style={{ background: '#1565C0' }} />
              </div>

              {/* PCM intro explanation */}
              <div className="text-[13px] text-gray-500 leading-[1.7] mb-5 p-3 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                PCM（プロセスコミュニケーションモデル）は、6つの性格タイプの組み合わせであなたの行動パターンと心理的欲求を構造化します。
              </div>

              {/* Ratio bar */}
              {(() => {
                const top3 = pcm.types.slice(0, 3);
                const barColors = ['#1565C0', '#90CAF9', '#E0E0E0'];
                const barTextColors = ['#FFFFFF', '#FFFFFF', '#757575'];
                const totalStr = top3.reduce((s, t) => s + (Number(t.strength) || 0), 0);
                let ratios = totalStr > 0 ? top3.map(t => (Number(t.strength) || 0) / totalStr) : [0.5, 0.3, 0.2];
                ratios = ratios.map(r => Math.max(r, 0.12));
                const rSum = ratios.reduce((a, b) => a + b, 0);
                ratios = ratios.map(r => r / rSum);
                return (
                  <div className="mb-5">
                    <div className="flex h-10 rounded-lg overflow-hidden border border-gray-200">
                      {top3.map((t, i) => (
                        <div key={i} className="flex items-center justify-center gap-1.5 px-2" style={{ width: `${ratios[i] * 100}%`, background: barColors[i] }}>
                          <span className="text-[13px] font-bold truncate" style={{ color: barTextColors[i], fontFamily: "'Noto Sans JP', sans-serif" }}>{t.name}</span>
                          <span className="text-[11px] opacity-70" style={{ color: barTextColors[i], fontFamily: "'Cormorant Garamond', serif" }}>{Math.round(ratios[i] * 100)}%</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex mt-1">
                      {top3.map((_, i) => (
                        <div key={i} className="text-center text-[10px] font-bold" style={{ width: `${ratios[i] * 100}%`, color: barColors[i] === '#E0E0E0' ? '#9E9E9E' : barColors[i], fontFamily: "'Cormorant Garamond', serif" }}>
                          {['1st', '2nd', '3rd'][i]}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 2×2 quadrant grid */}
              {(() => {
                const top3 = pcm.types.slice(0, 3);
                const qColors = ['#1565C0', '#90CAF9', '#BDBDBD'];
                return (
                  <div className="grid grid-cols-2 gap-4">
                    {top3.map((t, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5" style={{ borderTop: `3px solid ${qColors[i]}` }}>
                        <div className="flex items-baseline gap-1.5 mb-2">
                          <span className="text-[16px] font-bold text-gray-900" style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>{t.name}</span>
                          <span className="text-[12px] text-gray-400 italic" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.name_en}</span>
                        </div>
                        {t.behavior && (
                          <div className="text-[13px] text-gray-700 leading-[1.7] mb-2 line-clamp-3">{t.behavior}</div>
                        )}
                        {t.quote && (
                          <div className="text-[12px] text-gray-500 italic leading-[1.6] mb-2 line-clamp-2" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                            「{t.quote}」
                          </div>
                        )}
                        {t.need && (
                          <div className="text-[12px] text-gray-500 truncate mb-1">
                            <span className="font-bold" style={{ color: '#1565C0' }}>求：</span>{t.need}
                          </div>
                        )}
                        {t.distress && (
                          <div className="text-[12px] text-gray-500 truncate mb-2">
                            <span className="font-bold" style={{ color: '#C83232' }}>圧：</span>{t.distress}
                          </div>
                        )}
                        {t.ceo_tip && (
                          <div className="text-[12px] p-2 rounded-lg leading-[1.5] line-clamp-2" style={{ background: '#FEF5E7', color: '#92400E' }}>
                            {t.ceo_tip}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Bottom-right: ON/OFF */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                      {pcm.activation && pcm.activation.length > 0 && (
                        <div className="p-3 rounded-lg flex-1" style={{ background: '#E8F5E9' }}>
                          <div className="text-[10px] font-bold tracking-[0.12em] uppercase mb-2" style={{ color: '#2D8C3C' }}>
                            ON — 力を発揮
                          </div>
                          {pcm.activation.slice(0, 4).map((c, ci) => (
                            <div key={ci} className="flex items-start gap-1.5 text-[12px] text-gray-800 leading-[1.5] mb-1">
                              <span className="font-bold flex-shrink-0" style={{ color: '#2D8C3C' }}>&#10003;</span>
                              <span className="line-clamp-1">{c.replace(/^[✓✔]\s*/, '')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {pcm.deactivation && pcm.deactivation.length > 0 && (
                        <div className="p-3 rounded-lg flex-1" style={{ background: '#FFEBEE' }}>
                          <div className="text-[10px] font-bold tracking-[0.12em] uppercase mb-2" style={{ color: '#C83232' }}>
                            OFF — 消耗する
                          </div>
                          {pcm.deactivation.slice(0, 4).map((c, ci) => (
                            <div key={ci} className="flex items-start gap-1.5 text-[12px] text-gray-800 leading-[1.5] mb-1">
                              <span className="font-bold flex-shrink-0" style={{ color: '#C83232' }}>&#10007;</span>
                              <span className="line-clamp-1">{c.replace(/^[⚠]\s*/, '')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              {inlineFB('PCM')}
            </section>
          )}

          {/* ---- Inner Voice ---- */}
          {iv && (iv.belief?.voice || iv.dream?.voice || iv.pain?.voice || iv.challenge?.voice) && (
            <section>
              <div className="mb-5">
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#1565C0' }}>Inner Voice</div>
                <h3 className="text-xl font-semibold tracking-wide" style={{ color: '#0A1628', fontFamily: "'Cormorant Garamond', serif" }}>
                  あなた自身の声
                </h3>
                <div className="mt-2 h-[2px] w-12 rounded-full" style={{ background: '#1565C0' }} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  ['信念', iv.belief, '#1565C0'],
                  ['夢', iv.dream, '#2D8C3C'],
                  ['不満', iv.pain, '#C83232'],
                  ['挑戦', iv.challenge, '#2196F3'],
                ] as [string, { voice: string; jinden_note: string } | undefined, string][]).map(
                  ([label, v, color]) => {
                    if (!v?.voice) return null;
                    return (
                      <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5" style={{ borderLeft: `4px solid ${color}` }}>
                        <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color }}>{label}</div>
                        <div className="text-[14px] leading-[1.8] italic mb-3" style={{ color: '#0A1628', fontFamily: "'Noto Serif JP', serif" }}>
                          「{nl(v.voice)}」
                        </div>
                        {v.jinden_note && (
                          <div className="text-[12px] text-gray-500 leading-[1.7] pt-3 border-t border-gray-100">
                            {nl(v.jinden_note)}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
              {inlineFB('声')}
            </section>
          )}

          {/* ---- Five Q&A ---- */}
          {fqa && fqa.length > 0 && (
            <section>
              <div className="mb-5">
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#1565C0' }}>Five Q&amp;A</div>
                <h3 className="text-xl font-semibold tracking-wide" style={{ color: '#0A1628', fontFamily: "'Cormorant Garamond', serif" }}>
                  あなたを深掘りする5つの問い
                </h3>
                <div className="mt-2 h-[2px] w-12 rounded-full" style={{ background: '#1565C0' }} />
              </div>
              <div className="space-y-4">
                {fqa.map((qa, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3" style={{ background: '#F0F7FF' }}>
                      <div className="text-[13px] font-semibold" style={{ color: '#1565C0' }}>Q{i + 1}. {qa.question}</div>
                    </div>
                    <div className="px-5 py-4">
                      <div className="text-[13px] text-gray-700 leading-[1.9]">{nl(qa.answer)}</div>
                      {qa.lens && <div className="text-[11px] text-gray-400 mt-3 italic">{qa.lens}</div>}
                    </div>
                  </div>
                ))}
              </div>
              {inlineFB('問い')}
            </section>
          )}

          {/* ================================================================
              E. Past Feedbacks
          ================================================================ */}
          {displayFeedbacks.length > 0 && (
            <section>
              <div className="mb-4">
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#1565C0' }}>
                  Your Feedback
                </div>
                <h3 className="text-lg font-semibold tracking-wide" style={{ color: '#0A1628', fontFamily: "'Cormorant Garamond', serif" }}>
                  あなたが送ったフィードバック
                </h3>
                <div className="mt-2 h-[2px] w-12 rounded-full" style={{ background: '#1565C0' }} />
              </div>
              <div className="space-y-3">
                {displayFeedbacks.map((fb) => (
                  <div key={fb.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <span className="text-[11px] text-gray-400">
                        {new Date(fb.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {fb.section_key && (
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                          {fb.section_key}
                        </span>
                      )}
                      <FeedbackStatusBadge status={fb.status} />
                      {fb.status === 'applied' && (
                        <span className="text-[10px] text-green-600 font-medium">
                          シートに反映されました
                        </span>
                      )}
                    </div>
                    {fb.content && (
                      <div className="text-[13px] text-gray-700 leading-[1.7] line-clamp-2">{nl(fb.content)}</div>
                    )}
                    {fb.file_name && (
                      <div className="flex items-center gap-2 mt-2 text-[12px] text-gray-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        {fb.file_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ---- Footer ---- */}
          <footer className="pt-8 pb-8 text-center">
            <div className="text-xl tracking-wider text-gray-300" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              BLUE<span style={{ color: 'rgba(21,101,192,0.3)' }}>VOX</span>{' '}
              <span className="text-gray-200 text-[14px]">For You</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              本シートはBLUEVOXによる分析結果を{name}さん向けに作成したものです
            </p>
          </footer>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        shareLinkId={shareLink.id}
        talentId={shareLink.talent_id}
        talentName={name}
        currentProfile={profileData}
        onSuccess={loadFeedbacks}
      />
    </div>
  );
}
