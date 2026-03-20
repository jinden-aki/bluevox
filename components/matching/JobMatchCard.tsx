'use client';

import type { JobMatch } from '@/lib/types';

// ---------------------------------------------------------------------------
// Score badge helpers
// ---------------------------------------------------------------------------

function scoreTier(score: number): 'high' | 'mid' | 'low' {
  if (score >= 85) return 'high';
  if (score >= 60) return 'mid';
  return 'low';
}

const tierStyles: Record<string, { ring: string; badge: string; label: string }> = {
  high: { ring: 'border-[#2E7D32] text-[#2E7D32] bg-[#E8F5E9]', badge: 'bg-[#E8F5E9] text-[#2E7D32]', label: '高マッチ' },
  mid:  { ring: 'border-[#F59E0B] text-[#F59E0B] bg-[#FFFDE7]', badge: 'bg-[#FFFDE7] text-[#F59E0B]', label: '中マッチ' },
  low:  { ring: 'border-[#9E9E9E] text-[#9E9E9E] bg-gray-100',  badge: 'bg-gray-100 text-gray-500',     label: '低マッチ' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface JobMatchCardProps {
  job: JobMatch;
  index: number;
  onApply: (job: JobMatch, index: number) => void;
}

export default function JobMatchCard({ job, index, onApply }: JobMatchCardProps) {
  const score = job.match_score ?? 0;
  const tier = scoreTier(score);
  const styles = tierStyles[tier];

  return (
    <div className={`bg-white border rounded-[10px] shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
      tier === 'high' ? 'border-[#2E7D32]/40' : tier === 'mid' ? 'border-[#F59E0B]/40' : 'border-gray-200'
    }`}>
      {/* ── Top row: Company + Score ── */}
      <div className="flex items-start gap-4 p-5 pb-0">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">
            {job.company || '企業名なし'}
          </div>
          <div className="text-base font-semibold text-gray-900 mt-0.5 leading-snug">
            {job.title || '案件タイトルなし'}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {job.phase && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-mist text-jinden-blue">
                {job.phase}
              </span>
            )}
            {job.industry && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                {job.industry}
              </span>
            )}
            {job.growth_market && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#E8F5E9] text-[#2E7D32]">
                成長市場
              </span>
            )}
            {job.employee_count && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                {job.employee_count}
              </span>
            )}
            {job.weekly_hours && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                {job.weekly_hours}
              </span>
            )}
          </div>
        </div>

        {/* Score ring */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className={`w-14 h-14 rounded-full border-[3px] flex items-center justify-center font-brand text-2xl font-medium ${styles.ring}`}>
            {score}
          </div>
          <span className={`text-[9px] font-bold mt-1 px-2 py-0.5 rounded-full ${styles.badge}`}>
            {styles.label}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-5 pb-5">
        {/* Description */}
        {job.description && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-[13px] text-gray-700 leading-relaxed">
            {job.description}
          </div>
        )}

        {/* Requirements */}
        {job.requirements && (
          <div className="mt-2 text-[12px] text-gray-500">
            <strong className="text-gray-600">求められるスキル:</strong> {job.requirements}
          </div>
        )}

        {/* Verb match tags */}
        {job.verb_match && job.verb_match.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {job.verb_match.map((v, i) => (
              <span key={i} className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-mist text-jinden-blue">
                {v}
              </span>
            ))}
          </div>
        )}

        {/* Growth signal */}
        {job.growth_signal && (
          <div className="mt-2 text-[12px] text-[#059669] flex items-center gap-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            {job.growth_signal}
          </div>
        )}

        {/* Monthly fee bar */}
        {job.monthly_fee && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-[#F0F7FF] rounded-lg border-l-[3px] border-jinden-blue">
            <div className="text-[15px] font-bold text-jinden-blue">{job.monthly_fee}</div>
            {job.fee_basis && (
              <div className="text-[11px] text-gray-500">{job.fee_basis}</div>
            )}
          </div>
        )}

        {/* Fit / Risk reasons */}
        {((job.fit_reasons && job.fit_reasons.length > 0) || (job.risk_reasons && job.risk_reasons.length > 0)) && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Fit reasons */}
            <div className="p-3 bg-[#E8F5E9]/50 rounded-lg">
              <h5 className="text-[10px] font-bold text-[#2E7D32] tracking-wide mb-1.5">
                マッチする理由
              </h5>
              {(job.fit_reasons || []).map((r, i) => (
                <div key={i} className="text-[11px] text-gray-700 leading-relaxed flex items-start gap-1 mb-1">
                  <span className="text-[#2E7D32] flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                  {r}
                </div>
              ))}
            </div>

            {/* Risk reasons */}
            <div className="p-3 bg-[#FFEBEE]/30 rounded-lg">
              <h5 className="text-[10px] font-bold text-[#C62828] tracking-wide mb-1.5">
                注意点
              </h5>
              {(job.risk_reasons && job.risk_reasons.length > 0) ? (
                job.risk_reasons.map((r, i) => (
                  <div key={i} className="text-[11px] text-gray-700 leading-relaxed flex items-start gap-1 mb-1">
                    <span className="text-[#F59E0B] flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 2l10 18H2L12 2z" /></svg>
                    </span>
                    {r}
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-gray-400">特になし</div>
              )}
              {job.deactivation_check && (
                <div className="text-[11px] text-[#DC2626] font-medium mt-1">
                  消火条件: {job.deactivation_check}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Jinden note */}
        {job.jinden_note && (
          <div className="mt-3 px-3.5 py-2.5 bg-[#FFF8E1] rounded-lg border-l-[3px] border-[#F59E0B] text-[12px] text-[#92400E]">
            <strong>じんでんメモ:</strong> {job.jinden_note}
          </div>
        )}

        {/* ── Footer: Links + Actions ── */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 flex-wrap gap-2">
          <div className="text-[11px] text-gray-400 font-medium">
            {job.source || ''}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(job.url_direct) && (
              <a
                href={job.url_direct}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-jinden-blue text-white rounded-md text-[11px] font-medium hover:bg-vox transition"
              >
                案件ページ
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            )}
            {job.url_search && (
              <a
                href={job.url_search}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-700 rounded-md text-[11px] font-medium hover:bg-gray-50 transition"
              >
                検索で探す
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            )}
            {job.company_url && (
              <a
                href={job.company_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-700 rounded-md text-[11px] font-medium hover:bg-gray-50 transition"
              >
                企業サイト
              </a>
            )}
            <button
              onClick={() => onApply(job, index)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-jinden-blue text-white rounded-md text-[11px] font-medium hover:bg-vox transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              応募文を作成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
