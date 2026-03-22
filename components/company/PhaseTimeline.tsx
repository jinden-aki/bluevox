'use client';

type OrgPhase = 'seed' | 'early' | 'growth' | 'later';

const PHASES: { key: OrgPhase; label: string; sub: string }[] = [
  { key: 'seed', label: 'Seed', sub: '創業期' },
  { key: 'early', label: 'Early', sub: '初期成長' },
  { key: 'growth', label: 'Growth', sub: '急成長' },
  { key: 'later', label: 'Later', sub: '成熟期' },
];

interface PhaseTimelineProps {
  phase: OrgPhase;
  wallAnalysis: string;
  employeeCount: string;
  phaseDetail: string;
}

export default function PhaseTimeline({ phase, wallAnalysis, employeeCount, phaseDetail }: PhaseTimelineProps) {
  const activeIndex = PHASES.findIndex(p => p.key === phase);

  return (
    <div>
      {/* Timeline */}
      <div className="relative flex items-center gap-0 mb-6">
        {/* Line */}
        <div className="absolute top-5 left-6 right-6 h-0.5 bg-gray-200" />
        {/* Active line */}
        {activeIndex >= 0 && (
          <div
            className="absolute top-5 left-6 h-0.5 bg-jinden-blue transition-all"
            style={{ width: `${activeIndex === 0 ? 0 : (activeIndex / (PHASES.length - 1)) * (100 - 12)}%` }}
          />
        )}

        {PHASES.map((p, i) => {
          const isActive = p.key === phase;
          const isPast = i < activeIndex;
          return (
            <div key={p.key} className="flex-1 flex flex-col items-center relative">
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[11px] font-bold z-10 transition-all ${
                  isActive
                    ? 'bg-jinden-blue border-jinden-blue text-white shadow-md shadow-jinden-blue/30'
                    : isPast
                    ? 'bg-jinden-blue/20 border-jinden-blue/40 text-jinden-blue'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {i + 1}
              </div>
              <div className={`mt-1.5 text-[11px] font-semibold ${isActive ? 'text-jinden-blue' : isPast ? 'text-jinden-blue/60' : 'text-gray-400'}`}>
                {p.label}
              </div>
              <div className="text-[9px] text-gray-400">{p.sub}</div>
              {isActive && (
                <div className="absolute -bottom-8 flex flex-col items-center">
                  <div className="w-0.5 h-4 bg-jinden-blue" />
                  <div className="mt-1 text-[10px] font-bold text-jinden-blue bg-blue-50 border border-jinden-blue/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                    📍 現在地
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Details */}
      <div className="mt-10 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-gray-500 w-20">社員数</span>
          <span className="text-[13px] font-medium text-gray-900">{employeeCount}</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-[11px] font-semibold text-gray-500 w-20 flex-shrink-0">フェーズ</span>
          <span className="text-[13px] text-gray-700">{phaseDetail}</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-[11px] font-semibold text-gray-500 w-20 flex-shrink-0">壁の分析</span>
          <span className="text-[13px] text-gray-700">{wallAnalysis}</span>
        </div>
      </div>
    </div>
  );
}
