'use client';

interface DeepIssue {
  surface: string;
  reframe: string;
  theory_lens: string;
}

interface IssueReframeProps {
  issues: DeepIssue[];
}

export default function IssueReframe({ issues }: IssueReframeProps) {
  if (!issues || issues.length === 0) return null;

  return (
    <div className="space-y-4">
      {issues.map((issue, i) => (
        <div key={i} className="flex items-stretch gap-3">
          {/* Surface */}
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-[9px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-1.5">表面課題</div>
            <div className="text-[13px] text-gray-700">{issue.surface}</div>
          </div>

          {/* Arrow */}
          <div className="flex items-center flex-col justify-center">
            <svg className="w-6 h-6 text-torch" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="text-[8px] text-gray-400 mt-0.5">リフレーム</span>
          </div>

          {/* Reframe */}
          <div className="flex-1 bg-midnight/5 border border-midnight/15 rounded-lg p-3">
            <div className="text-[9px] font-bold tracking-[0.15em] text-midnight/50 uppercase mb-1.5">本質</div>
            <div className="text-[13px] text-midnight font-medium">{issue.reframe}</div>
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-midnight/10 text-midnight">
                🔍 {issue.theory_lens}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
