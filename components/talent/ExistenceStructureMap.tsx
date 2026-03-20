'use client';

import type { AnalysisResult } from '@/lib/types';

interface ExistenceStructureMapProps {
  analysis: AnalysisResult;
  talentType?: string;
}

/* ---------- text width estimation ---------- */

function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    width += /[\u3000-\u9FFF\uF900-\uFAFF]/.test(char)
      ? fontSize
      : fontSize * 0.6;
  }
  return width;
}

function truncateToFit(text: string, fontSize: number, maxWidth: number): string {
  if (estimateTextWidth(text, fontSize) <= maxWidth) return text;
  let result = '';
  let w = 0;
  for (const char of text) {
    const cw = /[\u3000-\u9FFF\uF900-\uFAFF]/.test(char)
      ? fontSize
      : fontSize * 0.6;
    if (w + cw + fontSize * 1.2 > maxWidth) {
      return result + '...';
    }
    result += char;
    w += cw;
  }
  return result;
}

/* ---------- text splitting for multi-line ---------- */

function splitText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const mid = Math.floor(text.length / 2);
  const breakPoints = ['、', '。', 'の', 'を', 'が', 'に', 'は', 'で', 'と', ' '];
  let bestBreak = mid;
  for (const bp of breakPoints) {
    const idx = text.lastIndexOf(bp, mid + 5);
    if (idx > mid - 10 && idx < mid + 10) {
      bestBreak = idx + 1;
      break;
    }
  }
  return [text.slice(0, bestBreak), text.slice(bestBreak)];
}

/* ---------- colors ---------- */

const COLORS = {
  purple: '#6B46C1',
  purpleLight: '#F3E8FF',
  grey: '#64748B',
  greyLight: '#F1F5F9',
  blue: '#1565C0',
  blueLight: '#E3F2FD',
  red: '#C83232',
  redLight: '#FEF2F2',
  orange: '#E65100',
  orangeLight: '#FFF3E0',
  teal: '#0D9488',
  tealLight: '#F0FDFA',
  line: '#CBD5E1',
  text: '#1a1a1a',
  textLight: '#64748b',
  white: '#FFFFFF',
};

/* ---------- SVG box component ---------- */

interface BoxConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  rx?: number;
}

function SvgBox({ x, y, w, h, fill, stroke, rx = 8 }: BoxConfig & { children?: React.ReactNode }) {
  return (
    <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth={1.5} />
  );
}

/* ---------- main component ---------- */

export default function ExistenceStructureMap({ analysis, talentType: _talentType }: ExistenceStructureMapProps) {
  const a = analysis;
  const pcm = a.pcm;
  const sfd = a.strength_full_disclosure;
  const wfp = a.for_you_extras?.weakness_for_person;
  const va = a.verb_analysis;
  const iv = a.inner_voice;

  // Extract data
  const beliefText = iv?.belief?.voice
    ? iv.belief.voice.replace(/\n/g, ' ').slice(0, 40)
    : a.core_sentence?.slice(0, 40) || '';

  const pcmTypes = (pcm?.types || []).slice(0, 3);
  const pcmLabel = pcmTypes.map((t, i) =>
    `${t.name}(${i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'})`
  ).join(' × ');

  const strengths = (sfd || []).slice(0, 3);
  const weaknesses = (wfp || []).slice(0, 3);

  // Get root combination for each strength
  const getRootVerbs = (verbId: string) => {
    const sv = va?.strength_verbs?.find(v => v.id === verbId);
    return sv?.root_combination || '';
  };

  // Get prescription/growth hint for each weakness
  const getCoping = (w: typeof weaknesses[0]) => {
    if (w.prescription) return w.prescription.replace(/^処方箋[：:]\s*/, '');
    if (w.growth_hint) return w.growth_hint;
    return '';
  };

  // Get shadow name from weakness verb
  const getShadowName = (w: typeof weaknesses[0]) => {
    // Try to get the verb name from verb_analysis
    if (w.verb_id && va?.weakness_verbs) {
      const wv = va.weakness_verbs.find(v => v.id === w.verb_id);
      if (wv?.name) return wv.name;
    }
    // Fallback to first part of description
    if (w.description_for_person) {
      return w.description_for_person.slice(0, 20);
    }
    return '';
  };

  const visionText = iv?.dream?.voice
    ? iv.dream.voice.replace(/\n/g, ' ').slice(0, 50)
    : a.balance_wheel?.why_now?.replace(/\n/g, ' ').slice(0, 50) || '';

  if (strengths.length === 0 && pcmTypes.length === 0) return null;

  // Layout constants
  const W = 700;
  const padX = 16;
  const colCount = Math.max(strengths.length, 1);
  const colGap = 16;

  // Calculate column widths based on content - wider for shadow/coping to fit text
  const colContentWidth = Math.min(200, (W - padX * 2 - colGap * (colCount - 1)) / colCount);
  const totalColsWidth = colContentWidth * colCount + colGap * (colCount - 1);
  const colStartX = (W - totalColsWidth) / 2;

  // Pre-compute shadow text lines and coping text lines for dynamic height
  const shadowTexts = weaknesses.map(w => {
    const name = getShadowName(w);
    return splitText(name, Math.floor(colContentWidth / 12));
  });
  const copingTexts = weaknesses.map(w => {
    const text = getCoping(w);
    return splitText(text, Math.floor(colContentWidth / 10));
  });

  // Y positions
  let curY = 16;

  // Row 1: Value source
  const beliefFontSize = 12;
  const beliefBoxW = Math.min(W - padX * 2, Math.max(280, estimateTextWidth(beliefText, beliefFontSize) + 48));
  const beliefBoxH = 44;
  const beliefBoxX = (W - beliefBoxW) / 2;
  const beliefBoxY = curY;
  curY += beliefBoxH + 20;

  // Row 2: PCM box
  const pcmFontSize = 11;
  const pcmBoxW = Math.min(W - padX * 2, Math.max(320, estimateTextWidth(pcmLabel, pcmFontSize) + 48));
  const pcmBoxH = 40;
  const pcmBoxX = (W - pcmBoxW) / 2;
  const pcmBoxY = curY;
  curY += pcmBoxH + 24;

  // Row 3: Strengths
  const strengthBoxH = 56;
  const strengthRowY = curY;
  curY += strengthBoxH + 16;

  // Arrow label row
  const arrowLabelY = curY;
  curY += 16;

  // Row 4: Shadows - dynamic height based on text
  const shadowLabelH = 16; // "影" label
  const shadowTextLineH = 14;
  const shadowPadding = 12;
  const maxShadowLines = Math.max(...shadowTexts.map(t => t.length), 1);
  const shadowBoxH = shadowLabelH + maxShadowLines * shadowTextLineH + shadowPadding * 2;
  const shadowRowY = curY;
  curY += shadowBoxH + 16;

  // Row 5: Coping - dynamic height based on text
  const copingLabelH = 16;
  const copingTextLineH = 13;
  const copingPadding = 10;
  const maxCopingLines = Math.max(...copingTexts.map(t => t.length), 1);
  const copingBoxH = copingLabelH + maxCopingLines * copingTextLineH + copingPadding * 2;
  const copingRowY = curY;
  curY += copingBoxH + 24;

  // Row 6: Vision
  const visionFontSize = 12;
  const visionBoxW = Math.min(W - padX * 2, Math.max(280, estimateTextWidth(visionText, visionFontSize) + 48));
  const visionBoxH = 44;
  const visionBoxX = (W - visionBoxW) / 2;
  const visionBoxY = curY;
  curY += visionBoxH + 16;

  const totalH = curY;

  const getColCenter = (i: number) => colStartX + i * (colContentWidth + colGap) + colContentWidth / 2;

  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" style={{ maxHeight: totalH }}>
      <defs>
        <marker id="esm-arrow" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
          <path d="M0,0 L6,2.5 L0,5" fill={COLORS.line} />
        </marker>
      </defs>

      {/* ---- Row 1: Value Source ---- */}
      <SvgBox
        x={beliefBoxX} y={beliefBoxY} w={beliefBoxW} h={beliefBoxH}
        fill={COLORS.purpleLight} stroke={COLORS.purple}
      />
      <text
        x={W / 2} y={beliefBoxY + 14}
        textAnchor="middle" fontSize="9" fontWeight="700" fill={COLORS.purple}
        fontFamily="'Noto Sans JP', sans-serif" letterSpacing="0.1em"
      >
        価値観の源泉
      </text>
      <text
        x={W / 2} y={beliefBoxY + 30}
        textAnchor="middle" fontSize={beliefFontSize} fill={COLORS.text}
        fontFamily="'Noto Serif JP', serif"
      >
        {truncateToFit(beliefText, beliefFontSize, beliefBoxW - 32)}
      </text>

      {/* Line: belief → pcm */}
      <line
        x1={W / 2} y1={beliefBoxY + beliefBoxH}
        x2={W / 2} y2={pcmBoxY}
        stroke={COLORS.line} strokeWidth={1.5}
      />

      {/* ---- Row 2: PCM ---- */}
      <SvgBox
        x={pcmBoxX} y={pcmBoxY} w={pcmBoxW} h={pcmBoxH}
        fill={COLORS.greyLight} stroke={COLORS.grey} rx={6}
      />
      <text
        x={W / 2} y={pcmBoxY + 14}
        textAnchor="middle" fontSize="9" fontWeight="700" fill={COLORS.grey}
        fontFamily="'Noto Sans JP', sans-serif" letterSpacing="0.08em"
      >
        PCM気質
      </text>
      <text
        x={W / 2} y={pcmBoxY + 28}
        textAnchor="middle" fontSize={pcmFontSize} fill={COLORS.text}
        fontFamily="'Noto Sans JP', sans-serif" fontWeight="500"
      >
        {truncateToFit(pcmLabel, pcmFontSize, pcmBoxW - 32)}
      </text>

      {/* Lines: pcm → strengths */}
      {strengths.map((_, i) => {
        const cx = getColCenter(i);
        return (
          <line
            key={`pcm-str-${i}`}
            x1={W / 2} y1={pcmBoxY + pcmBoxH}
            x2={cx} y2={strengthRowY}
            stroke={COLORS.line} strokeWidth={1}
          />
        );
      })}

      {/* ---- Row 3: Strengths ---- */}
      {strengths.map((s, i) => {
        const x = colStartX + i * (colContentWidth + colGap);
        const cx = getColCenter(i);
        const verbName = s.verb_name || '';
        const rootVerbs = getRootVerbs(s.verb_id);
        return (
          <g key={`str-${i}`}>
            <SvgBox
              x={x} y={strengthRowY} w={colContentWidth} h={strengthBoxH}
              fill={COLORS.blueLight} stroke={COLORS.blue}
            />
            <text
              x={cx} y={strengthRowY + 14}
              textAnchor="middle" fontSize="9" fontWeight="700" fill={COLORS.blue}
              fontFamily="'Noto Sans JP', sans-serif" letterSpacing="0.05em"
            >
              強み
            </text>
            <text
              x={cx} y={strengthRowY + 30}
              textAnchor="middle" fontSize="13" fontWeight="600" fill={COLORS.text}
              fontFamily="'Noto Sans JP', sans-serif"
            >
              {truncateToFit(verbName, 13, colContentWidth - 24)}
            </text>
            {rootVerbs && (
              <text
                x={cx} y={strengthRowY + 46}
                textAnchor="middle" fontSize="9" fill={COLORS.textLight}
                fontFamily="'Noto Sans JP', sans-serif"
              >
                {truncateToFit(rootVerbs, 9, colContentWidth - 24)}
              </text>
            )}
          </g>
        );
      })}

      {/* Arrow labels: "影を生む" */}
      {strengths.map((_, i) => {
        const cx = getColCenter(i);
        return (
          <g key={`arrow-${i}`}>
            <line
              x1={cx} y1={strengthRowY + strengthBoxH}
              x2={cx} y2={shadowRowY}
              stroke={COLORS.line} strokeWidth={1} markerEnd="url(#esm-arrow)"
            />
            <text
              x={cx + 8} y={arrowLabelY + 4}
              textAnchor="start" fontSize="8" fill={COLORS.textLight}
              fontFamily="'Noto Sans JP', sans-serif" fontStyle="italic"
            >
              影を生む
            </text>
          </g>
        );
      })}

      {/* ---- Row 4: Shadows (dynamic height, multi-line text) ---- */}
      {weaknesses.map((w, i) => {
        const x = colStartX + i * (colContentWidth + colGap);
        const cx = getColCenter(i);
        const lines = shadowTexts[i] || [getShadowName(w)];
        return (
          <g key={`shadow-${i}`}>
            <SvgBox
              x={x} y={shadowRowY} w={colContentWidth} h={shadowBoxH}
              fill={COLORS.redLight} stroke={COLORS.red}
            />
            <text
              x={cx} y={shadowRowY + shadowPadding + 10}
              textAnchor="middle" fontSize="9" fontWeight="700" fill={COLORS.red}
              fontFamily="'Noto Sans JP', sans-serif" letterSpacing="0.05em"
            >
              影
            </text>
            {lines.map((line, li) => (
              <text
                key={li}
                x={cx} y={shadowRowY + shadowPadding + shadowLabelH + 10 + li * shadowTextLineH}
                textAnchor="middle" fontSize="11" fontWeight="600" fill={COLORS.text}
                fontFamily="'Noto Sans JP', sans-serif"
              >
                {truncateToFit(line, 11, colContentWidth - 16)}
              </text>
            ))}
          </g>
        );
      })}

      {/* Lines: shadow → coping */}
      {weaknesses.map((_, i) => {
        const cx = getColCenter(i);
        return (
          <line
            key={`sh-cop-${i}`}
            x1={cx} y1={shadowRowY + shadowBoxH}
            x2={cx} y2={copingRowY}
            stroke={COLORS.line} strokeWidth={1}
          />
        );
      })}

      {/* ---- Row 5: Coping (dynamic height, multi-line text) ---- */}
      {weaknesses.map((w, i) => {
        const x = colStartX + i * (colContentWidth + colGap);
        const cx = getColCenter(i);
        const lines = copingTexts[i] || [getCoping(w)];
        return (
          <g key={`coping-${i}`}>
            <SvgBox
              x={x} y={copingRowY} w={colContentWidth} h={copingBoxH}
              fill={COLORS.orangeLight} stroke={COLORS.orange}
            />
            <text
              x={cx} y={copingRowY + copingPadding + 10}
              textAnchor="middle" fontSize="9" fontWeight="700" fill={COLORS.orange}
              fontFamily="'Noto Sans JP', sans-serif" letterSpacing="0.05em"
            >
              向き合い方
            </text>
            {lines.map((line, li) => (
              <text
                key={li}
                x={cx} y={copingRowY + copingPadding + copingLabelH + 8 + li * copingTextLineH}
                textAnchor="middle" fontSize="10" fill={COLORS.text}
                fontFamily="'Noto Sans JP', sans-serif"
              >
                {truncateToFit(line, 10, colContentWidth - 12)}
              </text>
            ))}
          </g>
        );
      })}

      {/* Lines: coping → vision (merge) */}
      {weaknesses.map((_, i) => {
        const cx = getColCenter(i);
        return (
          <line
            key={`cop-vis-${i}`}
            x1={cx} y1={copingRowY + copingBoxH}
            x2={W / 2} y2={visionBoxY}
            stroke={COLORS.line} strokeWidth={1}
          />
        );
      })}

      {/* ---- Row 6: Vision ---- */}
      <SvgBox
        x={visionBoxX} y={visionBoxY} w={visionBoxW} h={visionBoxH}
        fill={COLORS.tealLight} stroke={COLORS.teal}
      />
      <text
        x={W / 2} y={visionBoxY + 14}
        textAnchor="middle" fontSize="9" fontWeight="700" fill={COLORS.teal}
        fontFamily="'Noto Sans JP', sans-serif" letterSpacing="0.1em"
      >
        ビジョン — 行き先
      </text>
      <text
        x={W / 2} y={visionBoxY + 30}
        textAnchor="middle" fontSize={visionFontSize} fill={COLORS.text}
        fontFamily="'Noto Serif JP', serif" fontStyle="italic"
      >
        {truncateToFit(visionText, visionFontSize, visionBoxW - 32)}
      </text>
    </svg>
  );
}
