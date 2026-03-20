import type { JindenEval } from '@/lib/types';

/**
 * Build the user message sent to Claude for talent analysis.
 * Shared between SessionForm (initial analysis) and re-analysis.
 */
export function buildUserMsg(session: {
  name: string;
  date: string;
  type: string;
  memo: string;
  jindenMemo?: string;
  jindenEval?: JindenEval | null;
  wheelTop3?: string;
  career?: string;
  strongestQuote?: string;
}): string {
  let userMsg =
    '以下の面談メモを分析してください。\n\n' +
    '【参加者名】' + session.name + '\n' +
    '【面談日】' + session.date + '\n' +
    '【面談種別】' + (session.type === '90min' ? '90分セッション' : '40分カジュアル') + '\n';

  if (session.jindenEval) {
    const ke = session.jindenEval;
    userMsg += '\n【じんでんの直接評価（最優先で参照）】\n';
    if (ke.company) userMsg += '・社名：' + ke.company + '\n';
    if (ke.years) userMsg += '・新卒' + ke.years + '年目\n';
    if (ke.pcm1 && ke.pcm1 !== '未判定') {
      userMsg += '・PCM第1：' + ke.pcm1;
      if (ke.pcm2 && ke.pcm2 !== '未判定') userMsg += ' / 第2：' + ke.pcm2;
      if (ke.pcm3 && ke.pcm3 !== '未判定') userMsg += ' / 第3：' + ke.pcm3;
      userMsg += '\n';
    }
    if (ke.mind && ke.mind !== '未評価') userMsg += '・マインド評価：' + ke.mind + '\n';
    if (ke.stance && ke.stance !== '未評価') userMsg += '・スタンス評価：' + ke.stance + '\n';
    if (ke.skill && ke.skill !== '未評価') userMsg += '・スキル評価：' + ke.skill + '\n';
    if (ke.talentType && ke.talentType !== '未判定') userMsg += '・人材タイプ：' + ke.talentType + '\n';
    if (ke.level && ke.level !== '未評価') userMsg += '・レベルデザイン：' + ke.level + '\n';
    if (ke.coreSentence) userMsg += '・存在の一文：' + ke.coreSentence + '\n';
    if (ke.jindenComment) userMsg += '・じんでんコメント：' + ke.jindenComment + '\n';
    if (ke.strengthVerb) userMsg += '・強み動詞：「' + ke.strengthVerb + '」\n';
    if (ke.strengthScene) userMsg += '・強みが活きる場面：' + ke.strengthScene + '\n';
    if (ke.firstTask) userMsg += '・最初に渡すべき仕事：' + ke.firstTask + '\n';
    if (ke.strengthNote) userMsg += '・強みの補足：' + ke.strengthNote + '\n';
    if (ke.weaknessVerb) userMsg += '・弱み動詞：「' + ke.weaknessVerb + '」\n';
    if (ke.weaknessScene) userMsg += '・弱みが出る場面：' + ke.weaknessScene + '\n';
    if (ke.ceoProposal) userMsg += '・社長への活用提案：' + ke.ceoProposal + '\n';
    if (ke.weaknessNote) userMsg += '・弱みの補足：' + ke.weaknessNote + '\n';
    if (ke.activation && ke.activation.length) userMsg += '・発動条件：' + ke.activation.filter(Boolean).join(' / ') + '\n';
    if (ke.deactivation && ke.deactivation.length) userMsg += '・消火条件：' + ke.deactivation.filter(Boolean).join(' / ') + '\n';
    if (ke.voice) {
      if (ke.voice.belief) userMsg += '・信念（本人の声）：' + ke.voice.belief + '\n';
      if (ke.voice.dream) userMsg += '・夢（本人の声）：' + ke.voice.dream + '\n';
      if (ke.voice.pain) userMsg += '・不満（本人の声）：' + ke.voice.pain + '\n';
      if (ke.voice.challenge) userMsg += '・挑戦（本人の声）：' + ke.voice.challenge + '\n';
    }
    if (ke.motivationEssence) userMsg += '・副業動機の本質：' + ke.motivationEssence + '\n';
    if (ke.motivation && ke.motivation !== '未評価') userMsg += '・副業意欲：' + ke.motivation + '\n';
    if (ke.whyNow) userMsg += '・なぜ今か：' + ke.whyNow + '\n';
    if (ke.extra) userMsg += '・その他：' + ke.extra + '\n';

    userMsg +=
      '\n※じんでんの直接評価は1000人以上の面談経験に基づく専門家判断です。AIの分析結果と矛盾する場合は、じんでんの評価を優先してください。じんでんが入力済みの項目（強み弱み動詞、PCM、発動消火条件、本人の声等）は絶対に上書きするな。\n' +
      '※面談メモからJINDEN METHOD動詞辞書を使って原動詞を特定し、強み/弱み動詞を3〜5個マッチングしてverb_analysisフィールドに出力しろ。辞書にない動詞は原動詞の組み合わせで新規定義。\n';
  }

  if (session.wheelTop3) userMsg += '\n【バランスホイールTOP3】' + session.wheelTop3 + '\n';
  if (session.career) userMsg += '\n【経歴ハイライト】\n' + session.career + '\n';
  if (session.strongestQuote) userMsg += '\n【最も印象的な発言】\n「' + session.strongestQuote + '」\n';

  userMsg += '\n【面談メモ】\n' + session.memo;
  if (session.jindenMemo) {
    userMsg += '\n\n【じんでんメモ】\n';
    try {
      const km = JSON.parse(session.jindenMemo);
      if (km.community) userMsg += '・コミュニティ適性：' + km.community + '\n';
      if (km.personality) userMsg += '・人物印象：' + km.personality + '\n';
      if (km.fit) userMsg += '・副業フィット：' + km.fit + '\n';
    } catch {
      userMsg += session.jindenMemo;
    }
  }

  return userMsg;
}
