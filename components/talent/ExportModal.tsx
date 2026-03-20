'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { AnalysisResult, ProfileData } from '@/lib/types';
import { showToast } from '@/components/ui/Toast';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  analysis: AnalysisResult;
  name: string;
  profileData?: ProfileData | null;
}

/* ---------- helpers ---------- */

function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

/* ---------- build styled PDF HTML ---------- */

function buildPdfHtml(a: AnalysisResult, name: string, profileData?: ProfileData | null): string {
  const forYou = a.for_you_extras;
  const pcm = a.pcm;
  const iv = a.inner_voice;
  const fqa = a.five_qa;
  const sfd = a.strength_full_disclosure;

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${esc(name)} - BLUEVOX For You</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Noto+Serif+JP:wght@400;600&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Serif JP','Noto Sans JP',sans-serif;color:#1A1A1A;background:#FAFAF8;line-height:1.8;font-size:13px}
h1,h2,h3{font-family:'Cormorant Garamond',serif;font-weight:600}
.hero{background:linear-gradient(135deg,#0A1628,#1565C0);color:#fff;padding:48px;page-break-after:avoid}
.hero h1{font-size:36px;font-weight:300;letter-spacing:0.05em;margin-bottom:16px}
.hero .core{font-family:'Noto Serif JP',serif;font-size:17px;opacity:0.9;line-height:1.8}
.badge{display:inline-block;font-size:11px;font-weight:600;padding:4px 12px;border:1px solid rgba(255,255,255,0.2);border-radius:20px;background:rgba(255,255,255,0.1);margin-bottom:16px}
.section{padding:32px 48px;page-break-inside:avoid}
.section-title{font-size:18px;color:#0A1628;margin-bottom:4px}
.section-subtitle{font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1565C0;margin-bottom:4px}
.section-line{width:40px;height:2px;border-radius:2px;margin:8px 0 20px}
.card{background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:20px;margin-bottom:12px}
.card-green{border-left:4px solid #2D8C3C}
.card-red{border-left:4px solid #C83232}
.pill{display:inline-block;font-size:11px;font-weight:700;padding:2px 10px;border-radius:12px}
.pill-green{background:#E8F5E9;color:#2D8C3C}
.pill-red{background:#FFEBEE;color:#C83232}
.letter{background:#F5F0E8;padding:32px 48px}
.letter-card{background:rgba(255,255,255,0.8);border:1px solid #E8E0D0;border-radius:8px;padding:24px;font-style:italic}
.cols{display:flex;gap:20px}
.cols>div{flex:1}
.profile{background:#F5F0E8;padding:24px 48px}
.profile-card{background:rgba(255,255,255,0.8);border:1px solid #E8E0D0;border-radius:8px;padding:20px;display:flex;gap:20px;align-items:flex-start}
.profile-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 24px}
.profile-label{font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:0.05em}
.profile-val{font-size:12px;color:#1A1A1A}
.scene{padding:12px 16px;border-radius:6px;margin-bottom:8px}
.scene-green{background:rgba(45,140,60,0.04);border-left:3px solid #2D8C3C}
.scene-red{background:rgba(200,50,50,0.03);border-left:3px solid #C83232}
.footer{text-align:center;padding:32px;color:#9CA3AF;font-size:10px}
.footer .brand{font-family:'Cormorant Garamond',serif;font-size:18px;letter-spacing:0.1em;color:#D1D5DB}
.page-break{page-break-after:always;break-after:page}
@media print{
  body{background:#fff}
  .hero,.profile,.letter{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .section{padding:24px 32px}
  .letter,.profile{padding:24px 32px}
  .page-break{page-break-after:always}
  @page{margin:12mm;size:A4}
}
</style></head><body>`;

  // Hero
  html += `<div class="hero"><div style="font-size:10px;font-weight:700;letter-spacing:0.3em;opacity:0.4;text-transform:uppercase;margin-bottom:16px">BLUEVOX — For You</div>`;
  html += `<h1>${esc(name)}</h1>`;
  if (a.five_axes?.talent_type) {
    html += `<span class="badge">${esc(a.five_axes.talent_type)}タイプ</span>`;
  }
  if (a.core_sentence) {
    html += `<div class="core">「${esc(a.core_sentence)}」</div>`;
  }
  html += `</div>`;

  // Profile Card
  if (profileData) {
    const fields: [string, string | undefined][] = [
      ['年齢', profileData.age], ['出身', profileData.birthplace], ['居住', profileData.residence],
      ['部署', profileData.department], ['役職', profileData.position], ['学歴', profileData.education],
      ['副業可能時間', profileData.side_job_hours], ['リモート', profileData.side_job_remote], ['開始時期', profileData.side_job_start],
      ['趣味', profileData.hobbies], ['MBTI', profileData.mbti],
    ];
    const activeFields = fields.filter(([, v]) => v);
    if (activeFields.length > 0) {
      html += `<div class="profile"><div class="profile-card"><div class="profile-grid">`;
      activeFields.forEach(([label, val]) => {
        html += `<div><div class="profile-label">${label}</div><div class="profile-val">${esc(val)}</div></div>`;
      });
      html += `</div></div></div>`;
    }
  }

  // Letter
  if (forYou?.jinden_comment_for_person) {
    html += `<div class="letter"><div style="font-size:10px;font-weight:700;letter-spacing:0.2em;color:#1565C0;text-transform:uppercase;margin-bottom:12px">じんでんからあなたへ</div>`;
    html += `<div class="letter-card">${esc(forYou.jinden_comment_for_person)}</div></div>`;
  }

  // Page 1 break
  html += `<div class="page-break"></div>`;

  // Strength Full Disclosure
  if (sfd?.length) {
    html += `<div class="section"><div class="section-subtitle">Strength Full Disclosure</div><div class="section-title">あなたの強み — 完全開示</div><div class="section-line" style="background:#2D8C3C"></div>`;
    sfd.forEach(s => {
      html += `<div class="card card-green">`;
      html += `<strong style="font-size:15px">${esc(s.verb_name)}</strong>`;
      if (s.deep_description) html += `<div style="margin-top:12px;color:#374151">${esc(s.deep_description)}</div>`;
      if (s.person_quote) html += `<div style="margin-top:8px;padding-left:12px;border-left:3px solid #D1D5DB;font-style:italic;color:#6B7280">「${esc(s.person_quote)}」</div>`;
      if (s.explosive_scenes?.length) {
        html += `<div style="margin-top:12px"><div style="font-size:10px;font-weight:700;color:#2D8C3C;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px">爆発的に力を発揮する場面</div>`;
        s.explosive_scenes.forEach(sc => {
          html += `<div class="scene scene-green"><strong style="font-size:12px">${esc(sc.title)}</strong><div style="color:#4B5563">${esc(sc.story)}</div></div>`;
        });
        html += `</div>`;
      }
      if (s.transferable_tags?.length) {
        html += `<div style="margin-top:8px">`;
        s.transferable_tags.forEach(tag => { html += `<span class="pill pill-green" style="margin-right:4px">${esc(tag)}</span>`; });
        html += `</div>`;
      }
      if (s.five_perspective_note) html += `<div style="margin-top:8px;background:#F0F7FF;padding:8px 12px;border-radius:6px;font-size:12px;color:#4B5563">${esc(s.five_perspective_note)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  } else if (forYou?.strength_detail_for_person?.length) {
    // Fallback: old strengths
    html += `<div class="section"><div class="section-subtitle">Your Strengths</div><div class="section-title">あなたの強み</div><div class="section-line" style="background:#2D8C3C"></div>`;
    forYou.strength_detail_for_person.forEach(s => {
      html += `<div class="card card-green">`;
      html += `<strong>${esc(s.definition_for_person)}</strong>`;
      if (s.related_episodes) html += `<div style="margin-top:8px;color:#4B5563">${esc(s.related_episodes)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  // Page 2 break (before weakness)
  html += `<div class="page-break"></div>`;

  // Weakness Full Disclosure
  if (forYou?.weakness_for_person?.length) {
    html += `<div class="section"><div class="section-subtitle">Growth &amp; Self-Awareness</div><div class="section-title">あなたの影 — 強みの裏側を知る</div><div class="section-line" style="background:#C83232"></div>`;
    forYou.weakness_for_person.forEach(w => {
      html += `<div class="card card-red">`;
      html += `<strong>${esc(w.description_for_person)}</strong>`;
      if (w.struggling_scenes?.length) {
        html += `<div style="margin-top:12px"><div style="font-size:10px;font-weight:700;color:#C83232;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px">この影が顔を出す場面</div>`;
        w.struggling_scenes.forEach(sc => {
          html += `<div class="scene scene-red"><strong style="font-size:12px">${esc(sc.title)}</strong><div style="color:#4B5563">${esc(sc.story)}</div></div>`;
        });
        html += `</div>`;
      }
      if (w.prescription) html += `<div style="margin-top:8px;background:#FFF8E1;padding:8px 12px;border-radius:6px"><span style="font-weight:600;color:#E65100">影との向き合い方：</span>${esc(w.prescription)}</div>`;
      else if (w.growth_hint) html += `<div style="margin-top:8px;background:#FFF8E1;padding:8px 12px;border-radius:6px"><span style="font-weight:600;color:#C83232">成長のヒント：</span>${esc(w.growth_hint)}</div>`;
      if (w.jinden_message) html += `<div style="margin-top:8px;background:#F5F0E8;padding:8px 12px;border:1px solid #E8E0D0;border-radius:6px;font-style:italic">${esc(w.jinden_message)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  // Thriving & Struggling Scenes
  if (a.thriving_scenes?.length || a.struggling_scenes?.length) {
    html += `<div class="section"><div class="section-subtitle">Scenes</div><div class="section-title">あなたが輝く場面、苦しくなる場面</div><div class="section-line" style="background:#1565C0"></div>`;
    if (a.thriving_scenes?.length) {
      html += `<div style="font-size:10px;font-weight:700;color:#2D8C3C;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:12px">水を得た魚になる場面</div>`;
      a.thriving_scenes.forEach(sc => {
        html += `<div class="card card-green"><strong>${esc(sc.title)}</strong><div style="margin-top:8px;color:#374151">${esc(sc.story)}</div>`;
        if (sc.why) html += `<div style="margin-top:6px;font-size:12px;color:#6B7280;font-style:italic">${esc(sc.why)}</div>`;
        if (sc.tags?.length) {
          html += `<div style="margin-top:6px">`;
          sc.tags.forEach(tag => { html += `<span class="pill pill-green" style="margin-right:4px">${esc(tag)}</span>`; });
          html += `</div>`;
        }
        html += `</div>`;
      });
    }
    if (a.struggling_scenes?.length) {
      html += `<div style="font-size:10px;font-weight:700;color:#C83232;letter-spacing:0.12em;text-transform:uppercase;margin:16px 0 12px">息が詰まる場面</div>`;
      a.struggling_scenes.forEach(sc => {
        html += `<div class="card card-red"><strong>${esc(sc.title)}</strong><div style="margin-top:8px;color:#374151">${esc(sc.story)}</div>`;
        if (sc.why) html += `<div style="margin-top:6px;font-size:12px;color:#6B7280;font-style:italic">${esc(sc.why)}</div>`;
        html += `</div>`;
      });
    }
    html += `</div>`;
  } else if (forYou?.suitable_verb_jobs?.length || forYou?.unsuitable_verb_jobs?.length) {
    // Fallback: old job fit
    html += `<div class="section"><div class="section-subtitle">Job Fit</div><div class="section-title">あなたに向いている仕事</div><div class="section-line" style="background:#1565C0"></div>`;
    html += `<div class="cols">`;
    html += `<div class="card"><div style="font-size:10px;font-weight:700;color:#2D8C3C;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:12px">向いている仕事</div>`;
    (forYou?.suitable_verb_jobs || []).forEach(j => { html += `<div style="margin-bottom:6px">✓ ${esc(j)}</div>`; });
    html += `</div>`;
    html += `<div class="card"><div style="font-size:10px;font-weight:700;color:#C83232;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:12px">向いていない仕事</div>`;
    (forYou?.unsuitable_verb_jobs || []).forEach(j => { html += `<div style="margin-bottom:6px">⚠ ${esc(j)}</div>`; });
    html += `</div></div></div>`;
  }

  // Page 3 break (before inner voice/PCM)
  html += `<div class="page-break"></div>`;

  // PCM
  if (pcm?.types?.length) {
    html += `<div class="section"><div class="section-subtitle">Personality Type</div><div class="section-title">あなたのパーソナリティ</div><div class="section-line" style="background:#1565C0"></div>`;
    pcm.types.slice(0, 3).forEach((t, i) => {
      html += `<div class="card"><strong style="font-family:'Cormorant Garamond',serif;font-size:16px">${i + 1}位: ${esc(t.name)}</strong>`;
      if (t.name_en) html += ` <span style="color:#9CA3AF">(${esc(t.name_en)})</span>`;
      if (t.behavior) html += `<div style="margin-top:8px"><span style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:0.1em;text-transform:uppercase">行動パターン</span><div>${esc(t.behavior)}</div></div>`;
      if (t.need) html += `<div style="margin-top:8px;background:#F0F7FF;padding:8px 12px;border-radius:6px"><span style="font-size:10px;font-weight:700;color:#1565C0">心が求めるもの：</span>${esc(t.need)}</div>`;
      if (t.distress) html += `<div style="margin-top:8px;background:#FFF5F5;padding:8px 12px;border-radius:6px"><span style="font-size:10px;font-weight:700;color:#C83232">ストレス時の反応：</span>${esc(t.distress)}</div>`;
      if (t.ceo_tip) html += `<div style="margin-top:8px;background:#FAFAF8;padding:8px 12px;border:1px solid #E8E0D0;border-radius:6px"><span style="font-size:10px;font-weight:700;color:#1565C0">アドバイス：</span>${esc(t.ceo_tip)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  // Inner Voice
  if (iv && (iv.belief?.voice || iv.dream?.voice || iv.pain?.voice || iv.challenge?.voice)) {
    html += `<div class="section"><div class="section-subtitle">Inner Voice</div><div class="section-title">あなた自身の声</div><div class="section-line" style="background:#1565C0"></div>`;
    const items: [string, { voice: string; jinden_note: string } | undefined, string][] = [
      ['信念', iv.belief, '#1565C0'], ['夢', iv.dream, '#2D8C3C'], ['不満', iv.pain, '#C83232'], ['挑戦', iv.challenge, '#2196F3'],
    ];
    html += `<div class="cols" style="flex-wrap:wrap">`;
    items.forEach(([label, v, color]) => {
      if (!v?.voice) return;
      html += `<div class="card" style="border-left:4px solid ${color};flex:1;min-width:45%"><div style="font-size:10px;font-weight:700;color:${color};letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px">${label}</div>`;
      html += `<div style="font-style:italic;font-family:'Noto Serif JP',serif">「${esc(v.voice)}」</div>`;
      if (v.jinden_note) html += `<div style="font-size:12px;color:#9CA3AF;margin-top:8px;padding-top:8px;border-top:1px solid #F3F4F6">${esc(v.jinden_note)}</div>`;
      html += `</div>`;
    });
    html += `</div></div>`;
  }

  // Five Q&A
  if (fqa?.length) {
    html += `<div class="section"><div class="section-subtitle">Five Q&amp;A</div><div class="section-title">あなたを深掘りする5つの問い</div><div class="section-line" style="background:#1565C0"></div>`;
    fqa.forEach((qa, i) => {
      html += `<div class="card"><div style="font-weight:600;color:#1565C0;margin-bottom:8px">Q${i + 1}. ${esc(qa.question)}</div>`;
      html += `<div>${esc(qa.answer)}</div>`;
      if (qa.lens) html += `<div style="font-size:11px;color:#9CA3AF;margin-top:8px;font-style:italic">${esc(qa.lens)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  // Footer
  html += `<div class="footer"><div class="brand">BLUEVOX For You</div><div style="margin-top:4px">本シートはBLUEVOXによる分析結果を${esc(name)}さん向けに作成したものです</div></div>`;
  html += `</body></html>`;
  return html;
}

/* ---------- build rich HTML for clipboard ---------- */

function buildClipboardHtml(a: AnalysisResult, name: string): string {
  const forYou = a.for_you_extras;
  const pcm = a.pcm;
  const iv = a.inner_voice;
  const fqa = a.five_qa;
  const sfd = a.strength_full_disclosure;

  let h = `<h1>${esc(name)} — BLUEVOX For You</h1>`;
  if (a.five_axes?.talent_type) h += `<p><strong>${esc(a.five_axes.talent_type)}タイプ</strong></p>`;
  if (a.core_sentence) h += `<blockquote>「${esc(a.core_sentence)}」</blockquote>`;

  if (forYou?.jinden_comment_for_person) {
    h += `<h2>じんでんからあなたへ</h2><p><em>${esc(forYou.jinden_comment_for_person)}</em></p>`;
  }

  // Strength Full Disclosure
  if (sfd?.length) {
    h += `<h2>あなたの強み — 完全開示</h2>`;
    sfd.forEach(s => {
      h += `<h3>${esc(s.verb_name)}</h3>`;
      if (s.deep_description) h += `<p>${esc(s.deep_description)}</p>`;
      if (s.person_quote) h += `<blockquote>「${esc(s.person_quote)}」</blockquote>`;
      if (s.explosive_scenes?.length) {
        h += `<p><strong>爆発的に力を発揮する場面：</strong></p><ul>`;
        s.explosive_scenes.forEach(sc => { h += `<li><strong>${esc(sc.title)}</strong>: ${esc(sc.story)}</li>`; });
        h += `</ul>`;
      }
      if (s.five_perspective_note) h += `<p>${esc(s.five_perspective_note)}</p>`;
    });
  } else if (forYou?.strength_detail_for_person?.length) {
    h += `<h2>あなたの強み</h2>`;
    forYou.strength_detail_for_person.forEach(s => {
      h += `<h3>${esc(s.definition_for_person)}</h3>`;
      if (s.related_episodes) h += `<p>${esc(s.related_episodes)}</p>`;
    });
  }

  // Weakness Full Disclosure
  if (forYou?.weakness_for_person?.length) {
    h += `<h2>あなたの影 — 強みの裏側を知る</h2>`;
    forYou.weakness_for_person.forEach(w => {
      h += `<h3>${esc(w.description_for_person)}</h3>`;
      if (w.struggling_scenes?.length) {
        h += `<p><strong>この影が顔を出す場面：</strong></p><ul>`;
        w.struggling_scenes.forEach(sc => { h += `<li><strong>${esc(sc.title)}</strong>: ${esc(sc.story)}</li>`; });
        h += `</ul>`;
      }
      if (w.prescription) h += `<p><strong>影との向き合い方：</strong>${esc(w.prescription)}</p>`;
      else if (w.growth_hint) h += `<p>成長のヒント：${esc(w.growth_hint)}</p>`;
      if (w.jinden_message) h += `<p><em>${esc(w.jinden_message)}</em></p>`;
    });
  }

  // Thriving & Struggling Scenes
  if (a.thriving_scenes?.length || a.struggling_scenes?.length) {
    h += `<h2>あなたが輝く場面、苦しくなる場面</h2>`;
    if (a.thriving_scenes?.length) {
      h += `<h3>水を得た魚になる場面</h3>`;
      a.thriving_scenes.forEach(sc => {
        h += `<p><strong>${esc(sc.title)}</strong></p><p>${esc(sc.story)}</p>`;
        if (sc.why) h += `<p><em>${esc(sc.why)}</em></p>`;
      });
    }
    if (a.struggling_scenes?.length) {
      h += `<h3>息が詰まる場面</h3>`;
      a.struggling_scenes.forEach(sc => {
        h += `<p><strong>${esc(sc.title)}</strong></p><p>${esc(sc.story)}</p>`;
        if (sc.why) h += `<p><em>${esc(sc.why)}</em></p>`;
      });
    }
  } else if (forYou?.suitable_verb_jobs?.length || forYou?.unsuitable_verb_jobs?.length) {
    h += `<h2>あなたに向いている仕事</h2>`;
    if (forYou?.suitable_verb_jobs?.length) {
      h += `<h3>向いている仕事</h3><ul>`;
      forYou.suitable_verb_jobs.forEach(j => { h += `<li>${esc(j)}</li>`; });
      h += `</ul>`;
    }
    if (forYou?.unsuitable_verb_jobs?.length) {
      h += `<h3>向いていない仕事</h3><ul>`;
      forYou.unsuitable_verb_jobs.forEach(j => { h += `<li>${esc(j)}</li>`; });
      h += `</ul>`;
    }
  }

  if (pcm?.types?.length) {
    h += `<h2>あなたのパーソナリティ</h2>`;
    pcm.types.slice(0, 3).forEach((t, i) => {
      h += `<h3>${i + 1}位: ${esc(t.name)}${t.name_en ? ` (${esc(t.name_en)})` : ''}</h3>`;
      if (t.behavior) h += `<p>${esc(t.behavior)}</p>`;
      if (t.need) h += `<p><strong>心が求めるもの：</strong>${esc(t.need)}</p>`;
      if (t.distress) h += `<p><strong>ストレス時の反応：</strong>${esc(t.distress)}</p>`;
      if (t.ceo_tip) h += `<p><strong>アドバイス：</strong>${esc(t.ceo_tip)}</p>`;
    });
  }

  if (iv && (iv.belief?.voice || iv.dream?.voice || iv.pain?.voice || iv.challenge?.voice)) {
    h += `<h2>あなた自身の声</h2>`;
    const items: [string, { voice: string; jinden_note: string } | undefined][] = [
      ['信念', iv.belief], ['夢', iv.dream], ['不満', iv.pain], ['挑戦', iv.challenge],
    ];
    items.forEach(([label, v]) => {
      if (!v?.voice) return;
      h += `<h3>${label}</h3><blockquote>「${esc(v.voice)}」</blockquote>`;
      if (v.jinden_note) h += `<p>${esc(v.jinden_note)}</p>`;
    });
  }

  if (fqa?.length) {
    h += `<h2>5つの問い</h2>`;
    fqa.forEach((qa, i) => {
      h += `<h3>Q${i + 1}. ${esc(qa.question)}</h3><p>${esc(qa.answer)}</p>`;
      if (qa.lens) h += `<p><em>${esc(qa.lens)}</em></p>`;
    });
  }

  return h;
}

/* ====================================================================== */

export default function ExportModal({ open, onClose, analysis, name, profileData }: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  const handlePdf = () => {
    const html = buildPdfHtml(analysis, name, profileData);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('ポップアップがブロックされています', 'error');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
    showToast('PDF出力ウィンドウを開きました', 'success');
  };

  const handleCopy = async () => {
    try {
      const html = buildClipboardHtml(analysis, name);
      const plainText = html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        }),
      ]);
      setCopied(true);
      showToast('コピーしました', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('コピーに失敗しました', 'error');
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="エクスポート" maxWidth="440px">
      <div className="space-y-4">
        <p className="text-[13px] text-gray-500 mb-2">
          For Youシートをエクスポートできます。
        </p>

        {/* PDF */}
        <button
          onClick={handlePdf}
          className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-[10px] hover:border-jinden-blue hover:shadow-sm transition text-left"
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#FFEBEE' }}
          >
            <svg className="w-5 h-5" style={{ color: '#C83232' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-gray-900">PDFで保存</div>
            <div className="text-[12px] text-gray-500 mt-0.5">
              印刷用のPDFとして出力します
            </div>
          </div>
        </button>

        {/* Google Docs copy */}
        <button
          onClick={handleCopy}
          className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-[10px] hover:border-jinden-blue hover:shadow-sm transition text-left"
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#E8F5E9' }}
          >
            <svg className="w-5 h-5" style={{ color: '#2D8C3C' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-gray-900">
              {copied ? 'コピーしました ✓' : 'Googleドキュメント用にコピー'}
            </div>
            <div className="text-[12px] text-gray-500 mt-0.5">
              リッチテキストをクリップボードにコピーします
            </div>
          </div>
        </button>
      </div>
    </Modal>
  );
}
