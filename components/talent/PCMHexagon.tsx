'use client';

interface PCMType {
  rank: number;
  name: string;
  name_en: string;
  strength: number;
  behavior?: string;
  need?: string;
  distress?: string;
  quote?: string;
  ceo_tip?: string;
  activation_examples?: string[];
}

interface PCMHexagonProps {
  types: PCMType[];
  activation?: string[];
  deactivation?: string[];
  /** If true, render compact bar only (no cards, no ON/OFF). */
  compact?: boolean;
}

/* ---------- helper ---------- */

/* ---------- Ratio Bar ---------- */

function RatioBar({ types }: { types: PCMType[] }) {
  const top3 = types.slice(0, 3);
  const colors = ['#1565C0', '#90CAF9', '#E0E0E0'];
  const textColors = ['#FFFFFF', '#FFFFFF', '#757575'];

  // Calculate proportions from strength or use defaults
  let ratios: number[];
  const totalStrength = top3.reduce((sum, t) => sum + (Number(t.strength) || 0), 0);
  if (totalStrength > 0) {
    ratios = top3.map(t => (Number(t.strength) || 0) / totalStrength);
  } else {
    ratios = [0.5, 0.3, 0.2];
  }

  // Ensure minimum width for readability
  ratios = ratios.map(r => Math.max(r, 0.12));
  const ratioSum = ratios.reduce((a, b) => a + b, 0);
  ratios = ratios.map(r => r / ratioSum);

  const rankLabels = ['1st', '2nd', '3rd'];

  return (
    <div>
      {/* Bar */}
      <div style={{ display: 'flex', height: 40, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
        {top3.map((t, i) => (
          <div
            key={i}
            style={{
              width: `${ratios[i] * 100}%`,
              background: colors[i],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '0 8px',
              minWidth: 0,
            }}
          >
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: textColors[i],
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: "'Noto Sans JP', sans-serif",
            }}>
              {t.name}
            </span>
            <span style={{
              fontSize: 11,
              color: textColors[i],
              opacity: 0.7,
              whiteSpace: 'nowrap',
              fontFamily: "'Cormorant Garamond', serif",
            }}>
              {Math.round(ratios[i] * 100)}%
            </span>
          </div>
        ))}
      </div>
      {/* Labels below bar */}
      <div style={{ display: 'flex', marginTop: 4 }}>
        {top3.map((_, i) => (
          <div
            key={i}
            style={{
              width: `${ratios[i] * 100}%`,
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: colors[i] === '#E0E0E0' ? '#9E9E9E' : colors[i],
              fontFamily: "'Cormorant Garamond', serif",
            }}
          >
            {rankLabels[i]}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- main component ---------- */

export default function PCMHexagon({ types, activation, deactivation, compact }: PCMHexagonProps) {
  if (!types || types.length === 0) return null;

  const top3 = types.slice(0, 3);
  const rankColors = ['#1565C0', '#90CAF9', '#BDBDBD'];

  // Compact mode: bar only
  if (compact) {
    return <RatioBar types={types} />;
  }

  return (
    <div>
      {/* A. PCM intro explanation */}
      <div style={{
        fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 16,
        padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0',
      }}>
        PCM（プロセスコミュニケーションモデル）は、6つの性格タイプの組み合わせであなたの行動パターンと心理的欲求を構造化します。
      </div>

      {/* B. 3-type ratio bar */}
      <RatioBar types={types} />

      {/* C. 2×2 quadrant grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        {/* Top-left: 1st type, Top-right: 2nd type, Bottom-left: 3rd type */}
        {top3.map((t, i) => (
          <div
            key={i}
            style={{
              padding: 20,
              borderRadius: 12,
              border: '0.5px solid #E2E8F0',
              background: '#FFFFFF',
              borderTop: `3px solid ${rankColors[i]}`,
            }}
          >
            {/* Type name + en (1 line) */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', fontFamily: "'Noto Sans JP', sans-serif" }}>
                {t.name}
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
                {t.name_en}
              </span>
            </div>

            {/* Behavior (3 lines max) */}
            {t.behavior && (
              <div style={{
                fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 10,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
              }}>
                {t.behavior}
              </div>
            )}

            {/* Quote (2 lines max) */}
            {t.quote && (
              <div style={{
                fontSize: 12, color: '#64748b', fontStyle: 'italic', lineHeight: 1.6,
                fontFamily: "'Noto Serif JP', serif", marginBottom: 10,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
              }}>
                「{t.quote}」
              </div>
            )}

            {/* Need / Distress (1 line each) */}
            {t.need && (
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ fontWeight: 700, color: '#1565C0' }}>求：</span>{t.need}
              </div>
            )}
            {t.distress && (
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ fontWeight: 700, color: '#C83232' }}>圧：</span>{t.distress}
              </div>
            )}

            {/* Advice (2 lines max, orange chip) */}
            {t.ceo_tip && (
              <div style={{
                fontSize: 12, background: '#FEF5E7', padding: '6px 10px', borderRadius: 8,
                color: '#92400E', lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
              }}>
                {t.ceo_tip}
              </div>
            )}
          </div>
        ))}

        {/* Bottom-right: Activation / Deactivation */}
        <div style={{
          padding: 20,
          borderRadius: 12,
          border: '0.5px solid #E2E8F0',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {/* Activation (ON) */}
          {activation && activation.length > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#E8F5E9', flex: 1 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#2D8C3C',
                textTransform: 'uppercase' as const, marginBottom: 8,
              }}>
                ON — 力を発揮
              </div>
              {activation.slice(0, 4).map((c, ci) => (
                <div key={ci} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                  fontSize: 12, color: '#1a1a1a', lineHeight: 1.5, marginBottom: 4,
                }}>
                  <span style={{ color: '#2D8C3C', fontWeight: 700, flexShrink: 0 }}>&#10003;</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const }}>
                    {c.replace(/^[✓✔]\s*/, '')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Deactivation (OFF) */}
          {deactivation && deactivation.length > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FFEBEE', flex: 1 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#C83232',
                textTransform: 'uppercase' as const, marginBottom: 8,
              }}>
                OFF — 消耗する
              </div>
              {deactivation.slice(0, 4).map((c, ci) => (
                <div key={ci} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                  fontSize: 12, color: '#1a1a1a', lineHeight: 1.5, marginBottom: 4,
                }}>
                  <span style={{ color: '#C83232', fontWeight: 700, flexShrink: 0 }}>&#10007;</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const }}>
                    {c.replace(/^[⚠]\s*/, '')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
