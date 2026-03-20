'use client';

import { useState, useRef, useEffect } from 'react';
import { showToast } from '@/components/ui/Toast';
import type { JobMatch } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExportButtonsProps {
  jobs: JobMatch[];
  talentName: string;
  coreSentence?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreTierLabel(score: number): string {
  if (score >= 85) return '高マッチ';
  if (score >= 60) return '中マッチ';
  return '低マッチ';
}

function scoreTierColor(score: number): string {
  if (score >= 85) return '#2E7D32';
  if (score >= 60) return '#F59E0B';
  return '#9E9E9E';
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ---------------------------------------------------------------------------
// HTML report builder (branded PDF)
// ---------------------------------------------------------------------------

function buildHTMLReport(jobs: JobMatch[], talentName: string, coreSentence?: string): string {
  const now = formatDateTime(new Date());
  const high = jobs.filter(j => (j.match_score ?? 0) >= 85).length;
  const mid = jobs.filter(j => (j.match_score ?? 0) >= 60 && (j.match_score ?? 0) < 85).length;
  const low = jobs.length - high - mid;

  let cards = '';
  jobs.forEach((job, idx) => {
    const score = job.match_score ?? 0;
    const color = scoreTierColor(score);
    const label = scoreTierLabel(score);

    // Page break every 3 cards (starting from 4th card)
    const pageBreak = idx > 0 && idx % 3 === 0 ? 'page-break-before:always;break-before:page;' : '';

    cards += `
    <div style="background:#fff;border:1px solid #E0E0E0;border-radius:10px;margin-bottom:16px;overflow:hidden;border-left:4px solid ${color};${pageBreak}">
      <div style="padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;font-weight:700;color:#9E9E9E;text-transform:uppercase;letter-spacing:.1em">${escHtml(job.company || '')}</div>
            <div style="font-size:16px;font-weight:600;color:#212121;margin-top:2px">${escHtml(job.title || '')}</div>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
              ${job.phase ? `<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:500;background:#E3F2FD;color:#1565C0">${escHtml(job.phase)}</span>` : ''}
              ${job.industry ? `<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:500;background:#F5F5F5;color:#616161">${escHtml(job.industry)}</span>` : ''}
              ${job.growth_market ? '<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:500;background:#E8F5E9;color:#2E7D32">成長市場</span>' : ''}
              ${job.weekly_hours ? `<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:500;background:#F5F5F5;color:#9E9E9E">${escHtml(job.weekly_hours)}</span>` : ''}
            </div>
          </div>
          <div style="text-align:center;flex-shrink:0;margin-left:16px">
            <div style="width:56px;height:56px;border-radius:50%;border:3px solid ${color};display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:500;color:${color}">${score}</div>
            <div style="font-size:9px;font-weight:700;color:${color};margin-top:4px">${label}</div>
          </div>
        </div>
        ${job.description ? `<div style="margin-top:12px;padding:12px 16px;background:#F5F5F5;border-radius:8px;font-size:13px;color:#616161;line-height:1.7">${escHtml(job.description)}</div>` : ''}
        ${job.monthly_fee ? `<div style="margin-top:10px;padding:8px 12px;background:#F0F7FF;border-radius:8px;border-left:3px solid #1565C0;display:flex;align-items:center;gap:8px"><span style="font-size:15px;font-weight:700;color:#1565C0">${escHtml(job.monthly_fee)}</span>${job.fee_basis ? `<span style="font-size:11px;color:#9E9E9E">${escHtml(job.fee_basis)}</span>` : ''}</div>` : ''}
        ${job.growth_signal ? `<div style="font-size:12px;color:#059669;margin-top:8px">${escHtml(job.growth_signal)}</div>` : ''}
        ${(job.fit_reasons && job.fit_reasons.length > 0) ? `<div style="margin-top:10px"><div style="font-size:10px;font-weight:700;color:#2E7D32;margin-bottom:4px">マッチする理由</div>${job.fit_reasons.map(r => `<div style="font-size:11px;color:#616161;margin-bottom:2px">&bull; ${escHtml(r)}</div>`).join('')}</div>` : ''}
        ${(job.risk_reasons && job.risk_reasons.length > 0) ? `<div style="margin-top:8px"><div style="font-size:10px;font-weight:700;color:#C62828;margin-bottom:4px">注意点</div>${job.risk_reasons.map(r => `<div style="font-size:11px;color:#616161;margin-bottom:2px">&bull; ${escHtml(r)}</div>`).join('')}</div>` : ''}
        ${job.jinden_note ? `<div style="margin-top:10px;padding:10px 14px;background:#FFF8E1;border-radius:8px;border-left:3px solid #F59E0B;font-size:12px;color:#92400E"><strong>じんでんメモ:</strong> ${escHtml(job.jinden_note)}</div>` : ''}
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid #F5F5F5;font-size:11px;color:#9E9E9E">
          ${job.source ? escHtml(job.source) : ''}
          ${job.url_direct ? ` | <a href="${escHtml(job.url_direct)}" style="color:#1565C0;text-decoration:underline">案件ページ</a>` : ''}
          ${job.url_search ? ` | <a href="${escHtml(job.url_search)}" style="color:#1565C0;text-decoration:underline">検索で探す</a>` : ''}
          ${job.company_url ? ` | <a href="${escHtml(job.company_url)}" style="color:#1565C0;text-decoration:underline">企業サイト</a>` : ''}
        </div>
      </div>
    </div>`;
  });

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BLUEVOX 案件マッチングレポート — ${escHtml(talentName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Noto Sans JP', 'Helvetica Neue', sans-serif;
    background: #F8FAFD;
    color: #1A1A1A;
    -webkit-font-smoothing: antialiased;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .font-brand { font-family: 'Cormorant Garamond', serif; }
  @media print {
    body { background: #fff; }
    .no-print { display: none !important; }
    @page { margin: 12mm 10mm; size: A4; }
  }
</style>
</head>
<body>
<div style="max-width:900px;margin:0 auto;padding:40px 24px">
  <!-- Header -->
  <div style="text-align:center;margin-bottom:8px">
    <div class="font-brand" style="font-size:32px;font-weight:400;color:#0A1628;letter-spacing:.04em">
      <span style="color:#0A1628">BLUE</span><span style="color:#42A5F5">VOX</span>
    </div>
    <div style="font-size:10px;color:#9E9E9E;letter-spacing:.15em;margin-top:4px">案件マッチングレポート</div>
  </div>

  <!-- Talent info -->
  <div style="text-align:center;margin-bottom:28px">
    <div style="font-size:22px;font-weight:600;color:#0A1628">${escHtml(talentName)} さんへの推薦案件</div>
    ${coreSentence ? `<div style="font-size:14px;color:#64748b;font-style:italic;margin-top:8px;line-height:1.6;font-family:'Noto Sans JP',sans-serif">「${escHtml(coreSentence)}」</div>` : ''}
    <div style="font-size:12px;color:#9E9E9E;margin-top:8px">${now} | ${jobs.length}件 — 高マッチ ${high} / 中マッチ ${mid} / 低マッチ ${low}</div>
  </div>

  <!-- Cards -->
  ${cards}

  <!-- Footer -->
  <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #E0E0E0">
    <div class="font-brand" style="font-size:16px;color:#B0BEC5;letter-spacing:.04em">
      BLUE<span style="color:rgba(21,101,192,0.3)">VOX</span>
    </div>
    <div style="font-size:10px;color:#9E9E9E;letter-spacing:.1em;margin-top:4px">
      BLUEVOX 案件マッチングレポート — ${now}
    </div>
  </div>
</div>
<script>
  setTimeout(function(){ window.print(); }, 600);
<\/script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Rich-text HTML builder for clipboard (Google Docs compatible)
// ---------------------------------------------------------------------------

function buildRichTextHTML(jobs: JobMatch[], talentName: string, coreSentence?: string): string {
  const now = formatDateTime(new Date());

  let html = `<h1 style="font-size:20px;font-weight:700;color:#0A1628">BLUEVOX 案件マッチングレポート</h1>`;
  html += `<h2 style="font-size:18px;font-weight:600;color:#0A1628;margin-top:4px">${escHtml(talentName)} さんへの推薦案件</h2>`;
  if (coreSentence) {
    html += `<p style="font-size:14px;color:#64748b;font-style:italic;margin-top:4px">「${escHtml(coreSentence)}」</p>`;
  }
  html += `<p style="font-size:12px;color:#9E9E9E;margin-top:4px">${now} | ${jobs.length}件</p>`;
  html += `<hr style="border:none;border-top:1px solid #E0E0E0;margin:12px 0">`;

  jobs.forEach((job, idx) => {
    const score = job.match_score ?? 0;
    const label = scoreTierLabel(score);
    const color = scoreTierColor(score);

    html += `<h3 style="font-size:15px;font-weight:600;color:#212121;margin-top:16px">${idx + 1}. ${escHtml(job.company || '')} — ${escHtml(job.title || '')}</h3>`;
    html += `<p style="font-size:13px;margin-top:2px"><strong style="color:${color}">マッチ度: ${score}点 (${label})</strong>`;
    if (job.monthly_fee) html += ` | <strong style="color:#1565C0">${escHtml(job.monthly_fee)}</strong>`;
    if (job.weekly_hours) html += ` | ${escHtml(job.weekly_hours)}`;
    html += `</p>`;

    if (job.phase || job.industry) {
      html += `<p style="font-size:12px;color:#616161;margin-top:2px">`;
      if (job.phase) html += `${escHtml(job.phase)} `;
      if (job.industry) html += `${escHtml(job.industry)} `;
      if (job.growth_market) html += `<span style="color:#2E7D32">成長市場</span>`;
      html += `</p>`;
    }

    if (job.description) {
      html += `<p style="font-size:13px;color:#616161;line-height:1.7;margin-top:8px">${escHtml(job.description)}</p>`;
    }

    if (job.fit_reasons && job.fit_reasons.length > 0) {
      html += `<p style="font-size:12px;font-weight:700;color:#2E7D32;margin-top:8px">マッチする理由:</p><ul style="margin:2px 0 0 16px">`;
      job.fit_reasons.forEach(r => { html += `<li style="font-size:12px;color:#616161">${escHtml(r)}</li>`; });
      html += `</ul>`;
    }

    if (job.risk_reasons && job.risk_reasons.length > 0) {
      html += `<p style="font-size:12px;font-weight:700;color:#C62828;margin-top:6px">注意点:</p><ul style="margin:2px 0 0 16px">`;
      job.risk_reasons.forEach(r => { html += `<li style="font-size:12px;color:#616161">${escHtml(r)}</li>`; });
      html += `</ul>`;
    }

    if (job.jinden_note) {
      html += `<p style="font-size:12px;color:#92400E;margin-top:6px"><strong>じんでんメモ:</strong> ${escHtml(job.jinden_note)}</p>`;
    }

    // Links
    const links: string[] = [];
    if (job.url_direct) links.push(`<a href="${escHtml(job.url_direct)}" style="color:#1565C0">案件ページ</a>`);
    if (job.url_search) links.push(`<a href="${escHtml(job.url_search)}" style="color:#1565C0">検索で探す</a>`);
    if (job.company_url) links.push(`<a href="${escHtml(job.company_url)}" style="color:#1565C0">企業サイト</a>`);
    if (links.length > 0) {
      html += `<p style="font-size:11px;color:#9E9E9E;margin-top:6px">${links.join(' | ')}</p>`;
    }

    html += `<hr style="border:none;border-top:1px solid #F0F0F0;margin:12px 0">`;
  });

  html += `<p style="font-size:10px;color:#9E9E9E;text-align:center;margin-top:16px">Powered by BLUEVOX AI Matching Engine</p>`;
  return html;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExportButtons({ jobs, talentName, coreSentence }: ExportButtonsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modalOpen]);

  // Close on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [modalOpen]);

  // 1) PDF保存 — branded HTML in new tab with auto print
  const handlePDF = () => {
    const html = buildHTMLReport(jobs, talentName, coreSentence);
    const win = window.open('', '_blank');
    if (!win) {
      showToast('ポップアップがブロックされました。ブラウザ設定を確認してください。', 'error');
      return;
    }
    win.document.write(html);
    win.document.close();
    setModalOpen(false);
    showToast('新しいタブで開きました。PDF保存ダイアログが表示されます', 'info');
  };

  // 2) Googleドキュメント用コピー — rich text clipboard
  const handleCopyRich = async () => {
    const richHTML = buildRichTextHTML(jobs, talentName, coreSentence);
    try {
      // Write both HTML and plain text to clipboard
      const blob = new Blob([richHTML], { type: 'text/html' });
      const plainText = buildPlainTextFallback(jobs, talentName, coreSentence);
      const plainBlob = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': plainBlob,
        }),
      ]);
      showToast('リッチテキストをクリップボードにコピーしました。Googleドキュメントに貼り付けてください', 'success');
    } catch {
      // Fallback: plain text copy
      const plainText = buildPlainTextFallback(jobs, talentName, coreSentence);
      try {
        await navigator.clipboard.writeText(plainText);
        showToast('テキストをコピーしました（プレーンテキスト）', 'success');
      } catch {
        // Final fallback: textarea execCommand
        const textarea = document.createElement('textarea');
        textarea.value = plainText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('コピーしました', 'success');
      }
    }
    setModalOpen(false);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 text-gray-700 rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        エクスポート
      </button>

      {/* Modal overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">エクスポート</h3>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    {talentName} さん — {jobs.length}件の案件
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-3">
              {/* PDF */}
              <button
                onClick={handlePDF}
                className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-jinden-blue/40 hover:bg-mist/30 transition text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-jinden-blue" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-gray-900 group-hover:text-jinden-blue transition">PDFで保存</div>
                  <div className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
                    BLUEVOXブランドのレポートを新しいタブで開き、PDF保存ダイアログが自動で表示されます
                  </div>
                </div>
              </button>

              {/* Google Docs copy */}
              <button
                onClick={handleCopyRich}
                className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-jinden-blue/40 hover:bg-mist/30 transition text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#2E7D32]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-gray-900 group-hover:text-[#2E7D32] transition">Googleドキュメント用にコピー</div>
                  <div className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
                    リッチテキスト形式でクリップボードにコピーします。Googleドキュメントに貼り付けてご利用ください
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Plain text fallback (for clipboard fallback)
// ---------------------------------------------------------------------------

function buildPlainTextFallback(jobs: JobMatch[], talentName: string, coreSentence?: string): string {
  const now = formatDateTime(new Date());
  const lines: string[] = [
    'BLUEVOX 案件マッチングレポート',
    `${talentName} さんへの推薦案件`,
  ];
  if (coreSentence) lines.push(`「${coreSentence}」`);
  lines.push(`作成日時: ${now}`, `合計: ${jobs.length}件`, '', '='.repeat(60), '');

  jobs.forEach((job, idx) => {
    const score = job.match_score ?? 0;
    const label = scoreTierLabel(score);
    lines.push(`--- ${idx + 1}. ${job.company || ''} / ${job.title || ''} ---`);
    lines.push(`マッチ度: ${score}点 (${label})`);
    if (job.phase) lines.push(`フェーズ: ${job.phase}`);
    if (job.industry) lines.push(`業界: ${job.industry}`);
    if (job.monthly_fee) lines.push(`報酬: ${job.monthly_fee}`);
    if (job.weekly_hours) lines.push(`稼働: ${job.weekly_hours}`);
    if (job.description) lines.push(`\n業務内容:\n${job.description}`);
    if (job.fit_reasons && job.fit_reasons.length > 0) {
      lines.push('\nマッチする理由:');
      job.fit_reasons.forEach(r => lines.push(`  - ${r}`));
    }
    if (job.risk_reasons && job.risk_reasons.length > 0) {
      lines.push('\n注意点:');
      job.risk_reasons.forEach(r => lines.push(`  - ${r}`));
    }
    if (job.jinden_note) lines.push(`\nじんでんメモ: ${job.jinden_note}`);
    if (job.url_direct) lines.push(`案件URL: ${job.url_direct}`);
    if (job.url_search) lines.push(`検索URL: ${job.url_search}`);
    if (job.company_url) lines.push(`企業サイト: ${job.company_url}`);
    lines.push('');
  });

  lines.push('---', 'Powered by BLUEVOX AI Matching Engine');
  return lines.join('\n');
}
