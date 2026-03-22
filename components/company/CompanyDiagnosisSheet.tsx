'use client';

import type { Company, CompanyAnalysis } from '@/lib/types';
import OrgHealthRadar from './OrgHealthRadar';
import PhaseTimeline from './PhaseTimeline';
import IssueReframe from './IssueReframe';

const URGENCY_CONFIG = {
  high: { label: '緊急度 高', className: 'bg-red-100 text-red-700' },
  mid: { label: '緊急度 中', className: 'bg-yellow-100 text-yellow-700' },
  low: { label: '緊急度 低', className: 'bg-green-100 text-green-700' },
};

const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', className: 'bg-green-100 text-green-700' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-jinden-blue' },
  hard: { label: 'Hard', className: 'bg-orange-100 text-orange-700' },
  very_hard: { label: 'Very Hard', className: 'bg-red-100 text-red-700' },
};

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="font-brand text-[11px] font-normal text-midnight/40 tracking-[0.2em]">SEC {num}</span>
      <h3 className="text-[15px] font-semibold text-midnight">{title}</h3>
    </div>
  );
}

function Chip({ label, color = 'blue' }: { label: string; color?: 'blue' | 'red' | 'green' }) {
  const cls = {
    blue: 'bg-blue-50 text-jinden-blue border border-jinden-blue/20',
    red: 'bg-red-50 text-red-700 border border-red-200',
    green: 'bg-green-50 text-green-700 border border-green-200',
  }[color];
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

interface CompanyDiagnosisSheetProps {
  company: Company;
}

export default function CompanyDiagnosisSheet({ company }: CompanyDiagnosisSheetProps) {
  const a: CompanyAnalysis | null = company.analysis;
  const wr = company.web_research;

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Cover */}
      <div className="bg-midnight text-white rounded-[14px] p-8 md:p-10 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #1565C0 0%, transparent 60%)' }} />
        <div className="relative z-10">
          <div className="text-[10px] font-bold tracking-[0.3em] text-white/40 uppercase mb-3">COMPANY DIAGNOSIS</div>
          <h1 className="font-brand text-3xl md:text-4xl font-normal text-white leading-tight mb-4">
            {company.company_name}
          </h1>
          {a?.core_sentence && (
            <p className="text-[15px] text-white/80 leading-relaxed max-w-[600px]">{a.core_sentence}</p>
          )}

          {/* Basic Info Cards */}
          {wr && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {[
                { label: '業界', value: wr.industry },
                { label: '設立', value: wr.founding_year || '不明' },
                { label: '社員数', value: wr.employee_count || '不明' },
                { label: 'ステージ', value: wr.funding_stage || '不明' },
              ].map((item, i) => (
                <div key={i} className="bg-white/10 rounded-lg p-3">
                  <div className="text-[9px] font-bold tracking-[0.15em] text-white/40 uppercase mb-1">{item.label}</div>
                  <div className="text-[13px] font-medium text-white">{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* じんでんコメント */}
          {a?.jinden_comment && (
            <div className="mt-5 border-t border-white/10 pt-5">
              <div className="text-[9px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">JINDEN COMMENT</div>
              <p className="text-[14px] text-white/90 leading-relaxed font-serif">{a.jinden_comment}</p>
            </div>
          )}
        </div>
      </div>

      {!a && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-[10px] p-6 text-center text-sm text-yellow-700">
          分析がまだ完了していません。
        </div>
      )}

      {a && (
        <div className="space-y-6">
          {/* SEC 02: キーパーソンマップ */}
          {a.key_person_analysis && a.key_person_analysis.length > 0 && (
            <div className="bg-white border border-gray-300 rounded-[10px] p-6">
              <SectionHeader num="02" title="キーパーソンマップ" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {a.key_person_analysis.map((kp, i) => {
                  const original = company.key_persons.find(p => p.name === kp.person_name);
                  return (
                    <div key={i} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="text-[14px] font-semibold text-gray-900">{kp.person_name}</div>
                          <div className="text-[11px] text-gray-500">{kp.role}</div>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {original?.is_decision_maker && (
                            <span className="text-[10px] bg-midnight/10 text-midnight px-1.5 py-0.5 rounded font-semibold">🔑 意思決定者</span>
                          )}
                          {original?.is_interviewed && (
                            <span className="text-[10px] bg-jinden-blue/10 text-jinden-blue px-1.5 py-0.5 rounded font-semibold">🎤 対話済み</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2.5 text-[12px]">
                        <div>
                          <span className="font-semibold text-gray-600">PCM分析: </span>
                          <span className="text-gray-700">{kp.pcm_analysis}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">コミュニケーション: </span>
                          <span className="text-gray-700">{kp.communication_style}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">意思決定影響: </span>
                          <span className="text-gray-700">{kp.decision_influence}</span>
                        </div>
                        {kp.compatible_types.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {kp.compatible_types.map((t, j) => <Chip key={j} label={`✓ ${t}`} color="green" />)}
                          </div>
                        )}
                        {kp.incompatible_types.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {kp.incompatible_types.map((t, j) => <Chip key={j} label={`✕ ${t}`} color="red" />)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {a.relationship_map && (
                <div className="mt-4 bg-gray-50 rounded-lg p-3 text-[12px] text-gray-700">
                  <span className="font-semibold text-gray-600">関係性マップ: </span>{a.relationship_map}
                </div>
              )}
            </div>
          )}

          {/* SEC 03: 組織フェーズ × 課題マップ */}
          {a.org_phase && (
            <div className="bg-white border border-gray-300 rounded-[10px] p-6">
              <SectionHeader num="03" title="組織フェーズ × 課題マップ" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="text-[11px] font-bold text-gray-500 mb-3 tracking-[0.1em]">PHASE TIMELINE</div>
                  <PhaseTimeline
                    phase={a.org_phase.phase}
                    wallAnalysis={a.org_phase.wall_analysis}
                    employeeCount={a.org_phase.employee_count}
                    phaseDetail={a.org_phase.phase_detail}
                  />
                </div>
                {a.org_health_radar && a.org_health_radar.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 mb-3 tracking-[0.1em]">組織健全度レーダー</div>
                    <OrgHealthRadar axes={a.org_health_radar} size={220} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEC 04: 採用ポジション要件定義 */}
          {a.positions && a.positions.length > 0 && (
            <div className="bg-white border border-gray-300 rounded-[10px] p-6">
              <SectionHeader num="04" title="採用ポジション要件定義" />
              <div className="space-y-4">
                {a.positions.map((pos, i) => {
                  const urg = URGENCY_CONFIG[pos.urgency] || URGENCY_CONFIG.mid;
                  return (
                    <div key={i} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="text-[15px] font-semibold text-gray-900">{pos.title}</div>
                          <div className="text-[11px] text-gray-500">{pos.department}</div>
                        </div>
                        <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${urg.className}`}>
                          {urg.label}
                        </span>
                      </div>
                      <div className="bg-midnight/5 rounded-lg px-4 py-3 mb-3">
                        <div className="text-[10px] font-bold text-midnight/50 mb-1 tracking-[0.1em]">動詞スペック</div>
                        <div className="text-[13px] font-medium text-midnight">{pos.verb_spec}</div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[12px] mb-3">
                        <div><span className="text-gray-500">予算: </span><span className="font-medium">{pos.budget_range}</span></div>
                        <div><span className="text-gray-500">稼働: </span><span className="font-medium">{pos.hours_per_week}</span></div>
                        <div><span className="text-gray-500">リモート: </span><span className="font-medium">{pos.remote}</span></div>
                      </div>
                      <div className="text-[12px] text-gray-600 mb-2"><span className="font-semibold">なぜ今: </span>{pos.why_now}</div>
                      {pos.required_verbs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {pos.required_verbs.map((v, j) => <Chip key={j} label={v} color="blue" />)}
                        </div>
                      )}
                      {pos.ng_verbs.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {pos.ng_verbs.map((v, j) => <Chip key={j} label={`NG: ${v}`} color="red" />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SEC 05: 本質的課題の深掘り */}
          {a.deep_issues && a.deep_issues.length > 0 && (
            <div className="bg-white border border-gray-300 rounded-[10px] p-6">
              <SectionHeader num="05" title="本質的課題の深掘り" />
              {a.surface_issues && a.surface_issues.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-gray-500 mb-2 tracking-[0.1em]">表面的な課題</div>
                  <div className="flex flex-wrap gap-2">
                    {a.surface_issues.map((issue, i) => (
                      <span key={i} className="text-[12px] text-gray-600 bg-gray-100 px-3 py-1 rounded-full">{issue}</span>
                    ))}
                  </div>
                </div>
              )}
              <IssueReframe issues={a.deep_issues} />
            </div>
          )}

          {/* SEC 06: AI活用提案 */}
          {a.ai_proposals && a.ai_proposals.length > 0 && (
            <div className="bg-white border border-gray-300 rounded-[10px] p-6">
              <SectionHeader num="06" title="AI活用提案" />
              <div className="space-y-3">
                {a.ai_proposals.map((prop, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="text-[11px] font-bold text-gray-500 mb-1">課題</div>
                    <div className="text-[13px] text-gray-700 mb-2">{prop.issue}</div>
                    <div className="text-[11px] font-bold text-jinden-blue mb-1">提案</div>
                    <div className="text-[13px] text-gray-900 font-medium mb-2">{prop.proposal}</div>
                    <div className="text-[11px] text-gray-500">{prop.impact}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEC 07: 推薦人材像 */}
          {a.ideal_profile && (
            <div className="bg-white border border-gray-300 rounded-[10px] p-6">
              <SectionHeader num="07" title="推薦人材像（動詞スペック）" />
              <div className="bg-midnight/5 rounded-xl p-5 mb-4">
                <div className="text-[10px] font-bold text-midnight/40 tracking-[0.2em] mb-2 uppercase">Ideal Profile</div>
                <p className="text-[16px] font-semibold text-midnight leading-relaxed">{a.ideal_profile.verb_description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {a.ideal_profile.must_have_conditions.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-green-700 mb-2">✅ 必須条件</div>
                    <ul className="space-y-1">
                      {a.ideal_profile.must_have_conditions.map((c, i) => (
                        <li key={i} className="text-[12px] text-gray-700 flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5">•</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {a.ideal_profile.must_avoid_conditions.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-red-700 mb-2">❌ NG条件</div>
                    <ul className="space-y-1">
                      {a.ideal_profile.must_avoid_conditions.map((c, i) => (
                        <li key={i} className="text-[12px] text-gray-700 flex items-start gap-1.5">
                          <span className="text-red-500 mt-0.5">•</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {a.ideal_profile.pcm_compatibility && (
                <div className="bg-gray-50 rounded-lg p-3 text-[12px] text-gray-700">
                  <span className="font-semibold text-gray-600">PCM相性分析: </span>{a.ideal_profile.pcm_compatibility}
                </div>
              )}
            </div>
          )}

          {/* SEC 08: じんでんの総合所見 */}
          {a.jinden_assessment && (
            <div className="bg-white border border-gray-300 rounded-[10px] p-6">
              <SectionHeader num="08" title="じんでんの総合所見" />
              <div className="flex items-center gap-3 mb-4">
                {(() => {
                  const diff = DIFFICULTY_CONFIG[a.jinden_assessment.difficulty] || DIFFICULTY_CONFIG.normal;
                  return (
                    <span className={`inline-flex items-center text-[12px] font-bold px-3 py-1.5 rounded-full ${diff.className}`}>
                      難易度: {diff.label}
                    </span>
                  );
                })()}
                <span className="text-[12px] text-gray-600">{a.jinden_assessment.difficulty_reason}</span>
              </div>
              {a.jinden_assessment.risk_factors.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-gray-500 mb-2">⚠️ リスク要因</div>
                  <ul className="space-y-1">
                    {a.jinden_assessment.risk_factors.map((r, i) => (
                      <li key={i} className="text-[12px] text-gray-700 flex items-start gap-1.5">
                        <span className="text-orange-400 mt-0.5">•</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {a.jinden_assessment.opportunity && (
                <div className="mb-4 bg-green-50 border border-green-100 rounded-lg p-3">
                  <div className="text-[11px] font-bold text-green-700 mb-1">💡 案件の魅力</div>
                  <div className="text-[13px] text-green-800">{a.jinden_assessment.opportunity}</div>
                </div>
              )}
              {a.jinden_assessment.final_note && (
                <div className="bg-midnight/5 rounded-lg p-4">
                  <div className="text-[10px] font-bold text-midnight/40 tracking-[0.2em] uppercase mb-2">Final Note</div>
                  <p className="text-[14px] text-midnight leading-relaxed font-serif">{a.jinden_assessment.final_note}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
