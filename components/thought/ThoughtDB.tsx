'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { callClaude, parseJSON } from '@/lib/claude';
import { showToast } from '@/components/ui/Toast';
import { extractTextFromFile, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE, type ExtractedFile } from '@/lib/twin-file-extract';
import { SELF_ANALYSIS_PROMPT } from '@/lib/prompts/self-analysis';

const DIMENSIONS = [
  { key: 'beliefs', label: '信念', labelShort: '信念' },
  { key: 'judgments', label: '判断基準', labelShort: '判断基準' },
  { key: 'phrases', label: '口癖', labelShort: '口癖' },
  { key: 'questions', label: '問い', labelShort: '問い' },
  { key: 'tone', label: 'トーン', labelShort: 'トーン' },
  { key: 'metaphors', label: '比喩', labelShort: '比喩' },
  { key: 'taboos', label: '禁句', labelShort: '禁句' },
  { key: 'self_patterns', label: '自己パターン', labelShort: '自己パターン' },
] as const;

const THOUGHT_ANALYSIS_PROMPT = `あなたは「じんでん（神田明典）」の思想・人格を構造的に解析するAIです。
以下のテキストは、じんでんが誰かと対話した際の文字起こし、またはじんでんの発言メモです。

このテキストから、じんでんの思想・人格を以下の8次元で抽出してください。
既存のデータと重複する内容は出力せず、新しく発見された要素のみを抽出してください。

## 8次元の定義
①信念(beliefs) ②判断基準(judgments) ③口癖(phrases) ④問い(questions)
⑤トーン(tone) ⑥比喩(metaphors) ⑦禁句(taboos) ⑧自己パターン認識(self_patterns)

## 出力形式
以下のJSONで出力せよ。各次元は配列で、新規発見した項目のみ含める。
{
  "beliefs": [{"text": "内容", "evidence": "根拠引用", "context": "文脈"}],
  "judgments": [{"text": "内容", "evidence": "根拠引用", "context": "文脈"}],
  "phrases": [{"text": "口癖", "evidence": "使われた場面"}],
  "questions": [{"text": "問いの型", "evidence": "実際の問い", "context": "使う場面"}],
  "tone": [{"text": "特徴", "evidence": "具体例"}],
  "metaphors": [{"text": "表現", "evidence": "文脈", "meaning": "意味"}],
  "taboos": [{"text": "やらないこと", "evidence": "根拠", "reason": "理由"}],
  "self_patterns": [{"text": "パターン", "trigger": "発動条件", "countermeasure": "対処法"}]
}
JSONのみ出力せよ。`;

interface ThoughtItem {
  text: string;
  evidence?: string;
  context?: string;
  meaning?: string;
  reason?: string;
  trigger?: string;
  countermeasure?: string;
  added?: string;
}

interface EnrichedThoughtItem extends ThoughtItem {
  dbId: string;
  source?: string;
  sourceTalentName?: string;
  confidence?: number;
  autoExtracted?: boolean;
}

type ThoughtDB = Record<string, EnrichedThoughtItem[]>;

export default function ThoughtDBComponent() {
  const [db, setDb] = useState<ThoughtDB>({});
  const [currentDim, setCurrentDim] = useState('beliefs');
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputText, setInputText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(true);

  // File upload
  const [uploadedFiles, setUploadedFiles] = useState<ExtractedFile[]>([]);
  const [extractingFiles, setExtractingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Self-sheet
  const [generatingSelf, setGeneratingSelf] = useState(false);
  const [selfSheet, setSelfSheet] = useState<any>(null);
  const [showSelfSheet, setShowSelfSheet] = useState(false);

  // Form fields
  const [addText, setAddText] = useState('');
  const [addEvidence, setAddEvidence] = useState('');
  const [addContext, setAddContext] = useState('');
  const [addMeaning, setAddMeaning] = useState('');
  const [addReason, setAddReason] = useState('');
  const [addTrigger, setAddTrigger] = useState('');
  const [addCountermeasure, setAddCountermeasure] = useState('');

  const loadDB = useCallback(async () => {
    const { data } = await supabase
      .from('jinden_thoughts')
      .select('*')
      .order('sort_order', { ascending: true });

    if (data && data.length > 0) {
      const grouped: ThoughtDB = {};
      DIMENSIONS.forEach(d => { grouped[d.key] = []; });
      data.forEach((item: any) => {
        const dim = item.dimension;
        if (grouped[dim]) {
          try {
            const parsed = JSON.parse(item.content);
            grouped[dim].push({
              ...parsed,
              dbId: item.id,
              source: item.source || 'manual',
              sourceTalentName: item.source_talent_name || undefined,
              confidence: item.confidence ?? 1.0,
              autoExtracted: item.auto_extracted ?? false,
            });
          } catch {
            // skip malformed
          }
        }
      });
      setDb(grouped);
    } else {
      await initializeDefaultData();
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDB();
  }, [loadDB]);

  // Pick up text injected from SparkDetailSheet ("思想DBに送る")
  useEffect(() => {
    const injected = localStorage.getItem('twin_inject_text');
    if (injected) {
      setInputText(injected);
      setShowAddForm(true);
      localStorage.removeItem('twin_inject_text');
    }
  }, []);

  const initializeDefaultData = async () => {
    try {
      const { JINDEN_INITIAL_THOUGHTS } = await import('@/lib/thought-data');
      if (!JINDEN_INITIAL_THOUGHTS) return;

      const inserts: any[] = [];
      let sortOrder = 0;
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '';

      Object.entries(JINDEN_INITIAL_THOUGHTS).forEach(([dimension, items]) => {
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            inserts.push({
              user_id: userId,
              dimension,
              content: JSON.stringify(item),
              sort_order: sortOrder++,
            });
          });
        }
      });

      if (inserts.length > 0) {
        await supabase.from('jinden_thoughts').insert(inserts);
        const grouped: ThoughtDB = {};
        DIMENSIONS.forEach(d => { grouped[d.key] = []; });
        Object.entries(JINDEN_INITIAL_THOUGHTS).forEach(([dimension, items]) => {
          if (Array.isArray(items)) {
            grouped[dimension] = items.map((item: any, idx: number) => ({
              ...item,
              dbId: `init-${dimension}-${idx}`,
              source: 'manual',
              confidence: 1.0,
              autoExtracted: false,
            }));
          }
        });
        setDb(grouped);
      }
    } catch (e) {
      console.error('Failed to init thought data:', e);
    }
  };

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const getStats = (): { manual: number; auto: number; total: number; lastAutoTalent: string | null } => {
    let manual = 0;
    let auto = 0;
    let lastAutoTalent: string | null = null;

    Object.values(db).forEach(items => {
      items.forEach(item => {
        if (item.autoExtracted) {
          auto++;
          if (item.sourceTalentName) lastAutoTalent = item.sourceTalentName;
        } else {
          manual++;
        }
      });
    });

    return { manual, auto, total: manual + auto, lastAutoTalent };
  };

  // ---------------------------------------------------------------------------
  // File Upload
  // ---------------------------------------------------------------------------

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast('ログインが必要です', 'error'); return; }

    const { data: settings } = await supabase
      .from('app_settings')
      .select('api_key_encrypted')
      .eq('user_id', user.id)
      .single();

    if (!settings?.api_key_encrypted) {
      showToast('API Keyが設定されていません', 'error');
      return;
    }

    const newFiles: ExtractedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > MAX_FILE_SIZE) {
        showToast(`${f.name}: ファイルサイズが大きすぎます（20MB以下）`, 'error');
        continue;
      }
      newFiles.push({ name: f.name, type: f.type, size: f.size, text: '', status: 'pending' });
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setExtractingFiles(true);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > MAX_FILE_SIZE) continue;

      setUploadedFiles(prev => prev.map(uf =>
        uf.name === f.name && uf.status === 'pending' ? { ...uf, status: 'extracting' } : uf
      ));

      try {
        const text = await extractTextFromFile(f, settings.api_key_encrypted);
        setUploadedFiles(prev => prev.map(uf =>
          uf.name === f.name && uf.status === 'extracting' ? { ...uf, text, status: 'done' } : uf
        ));
      } catch (err: any) {
        setUploadedFiles(prev => prev.map(uf =>
          uf.name === f.name && uf.status === 'extracting' ? { ...uf, status: 'error', error: err.message } : uf
        ));
      }
    }

    setExtractingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (name: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== name));
  };

  // ---------------------------------------------------------------------------
  // Self-Sheet Generation
  // ---------------------------------------------------------------------------

  const handleGenerateSelfSheet = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast('ログインが必要です', 'error'); return; }

    const { data: settings } = await supabase
      .from('app_settings')
      .select('api_key_encrypted')
      .eq('user_id', user.id)
      .single();

    if (!settings?.api_key_encrypted) {
      showToast('API Keyが設定されていません', 'error');
      return;
    }

    // Build full twin data from DB
    let twinData = '';
    DIMENSIONS.forEach(dim => {
      const items = db[dim.key] || [];
      if (items.length > 0) {
        twinData += `## ${dim.label}\n`;
        items.forEach((item: EnrichedThoughtItem) => {
          twinData += `- ${item.text}`;
          if (item.evidence) twinData += ` [根拠: ${item.evidence}]`;
          if (item.context) twinData += ` [文脈: ${item.context}]`;
          if (item.trigger) twinData += ` [発動条件: ${item.trigger}]`;
          if (item.countermeasure) twinData += ` [対処: ${item.countermeasure}]`;
          twinData += '\n';
        });
        twinData += '\n';
      }
    });

    if (!twinData.trim()) {
      showToast('デジタルツインDBにデータがありません', 'error');
      return;
    }

    setGeneratingSelf(true);
    try {
      const result = await callClaude({
        task: 'analysis',
        systemPrompt: SELF_ANALYSIS_PROMPT,
        userContent: twinData,
        apiKey: settings.api_key_encrypted,
        maxTokens: 4096,
      });

      const parsed = parseJSON(result.text);
      if (parsed) {
        parsed.updated_at = new Date().toISOString();
        setSelfSheet(parsed);
        setShowSelfSheet(true);
        showToast('自己分析シートを生成しました', 'success');
      } else {
        showToast('生成結果の解析に失敗しました', 'error');
      }
    } catch (err: any) {
      showToast('生成エラー: ' + err.message, 'error');
    } finally {
      setGeneratingSelf(false);
    }
  };

  // ---------------------------------------------------------------------------
  // AI Analysis
  // ---------------------------------------------------------------------------

  const handleAnalyze = async () => {
    const fileTexts = uploadedFiles.filter(f => f.status === 'done' && f.text).map(f => f.text);
    const combinedInput = [inputText.trim(), ...fileTexts].filter(Boolean).join('\n\n---\n\n');

    if (!combinedInput) {
      showToast('テキストを入力するかファイルをアップロードしてください', 'error');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('ログインが必要です', 'error');
      return;
    }

    const { data: settings } = await supabase
      .from('app_settings')
      .select('api_key_encrypted')
      .eq('user_id', user.id)
      .single();

    if (!settings?.api_key_encrypted) {
      showToast('API Keyが設定されていません', 'error');
      return;
    }

    setAnalyzing(true);
    try {
      const fileTexts = uploadedFiles.filter(f => f.status === 'done' && f.text).map(f => f.text);
      const analysisInput = [inputText.trim(), ...fileTexts].filter(Boolean).join('\n\n---\n\n');

      const result = await callClaude({
        task: 'analysis',
        systemPrompt: THOUGHT_ANALYSIS_PROMPT,
        userContent: analysisInput,
        apiKey: settings.api_key_encrypted,
        maxTokens: 4096,
      });

      const parsed = parseJSON(result.text);
      if (!parsed) {
        showToast('AI応答の解析に失敗しました', 'error');
        return;
      }

      let added = 0;
      const today = new Date().toISOString().slice(0, 10);

      for (const dim of DIMENSIONS) {
        const newItems = parsed[dim.key];
        if (Array.isArray(newItems) && newItems.length > 0) {
          const currentCount = (db[dim.key] || []).length;
          const inserts = newItems.map((item: any, idx: number) => ({
            user_id: user.id,
            dimension: dim.key,
            content: JSON.stringify({ ...item, added: today }),
            sort_order: currentCount + idx,
          }));
          await supabase.from('jinden_thoughts').insert(inserts);
          added += newItems.length;
        }
      }

      showToast(`${added}件の新規項目を追加しました`, 'success');
      setInputText('');
      setUploadedFiles([]);
      loadDB();
    } catch (err: any) {
      showToast('分析エラー: ' + err.message, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Manual Add
  // ---------------------------------------------------------------------------

  const handleAddManual = async () => {
    if (!addText.trim()) {
      showToast('テキストを入力してください', 'error');
      return;
    }

    const item: ThoughtItem = {
      text: addText.trim(),
      evidence: addEvidence.trim(),
      added: new Date().toISOString().slice(0, 10),
    };

    if (currentDim === 'self_patterns') {
      item.trigger = addTrigger;
      item.countermeasure = addCountermeasure;
    } else if (['beliefs', 'judgments', 'questions'].includes(currentDim)) {
      item.context = addContext;
    } else if (currentDim === 'metaphors') {
      item.meaning = addMeaning;
    } else if (currentDim === 'taboos') {
      item.reason = addReason;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const currentCount = (db[currentDim] || []).length;

    await supabase.from('jinden_thoughts').insert({
      user_id: user?.id || '',
      dimension: currentDim,
      content: JSON.stringify(item),
      sort_order: currentCount,
    });

    showToast('追加しました', 'success');
    setShowAddForm(false);
    resetForm();
    loadDB();
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDeleteItem = async (dim: string, idx: number) => {
    const item = (db[dim] || [])[idx];
    if (!item?.dbId || item.dbId.startsWith('init-')) {
      // Fallback for items without proper dbId
      const { data } = await supabase
        .from('jinden_thoughts')
        .select('id')
        .eq('dimension', dim)
        .order('sort_order', { ascending: true });

      if (data && data[idx]) {
        if (!confirm('この項目を削除しますか？')) return;
        await supabase.from('jinden_thoughts').delete().eq('id', data[idx].id);
        showToast('削除しました', 'success');
        loadDB();
      }
      return;
    }

    if (!confirm('この項目を削除しますか？')) return;
    await supabase.from('jinden_thoughts').delete().eq('id', item.dbId);
    showToast('削除しました', 'success');
    loadDB();
  };

  // ---------------------------------------------------------------------------
  // Approve / Reject auto-extracted items
  // ---------------------------------------------------------------------------

  const handleApprove = async (item: EnrichedThoughtItem) => {
    if (!item.dbId || item.dbId.startsWith('init-')) return;
    await supabase
      .from('jinden_thoughts')
      .update({ confidence: 1.0, auto_extracted: false })
      .eq('id', item.dbId);
    showToast('承認しました', 'success');
    loadDB();
  };

  const handleReject = async (item: EnrichedThoughtItem) => {
    if (!item.dbId || item.dbId.startsWith('init-')) return;
    await supabase.from('jinden_thoughts').delete().eq('id', item.dbId);
    showToast('却下しました', 'success');
    loadDB();
  };

  // ---------------------------------------------------------------------------
  // Generate Prompt
  // ---------------------------------------------------------------------------

  const handleGeneratePrompt = () => {
    let prompt = 'あなたは「じんでん（神田明典）」として対話してください。以下がじんでんの思想・人格データです。\n\n';

    DIMENSIONS.forEach(dim => {
      const items = db[dim.key] || [];
      if (items.length > 0) {
        prompt += `## ${dim.label}\n`;
        items.forEach((item: EnrichedThoughtItem) => {
          prompt += `- ${item.text}`;
          if (item.evidence) prompt += ` [根拠: ${item.evidence}]`;
          if (item.context) prompt += ` [文脈: ${item.context}]`;
          if (item.trigger) prompt += ` [発動条件: ${item.trigger}]`;
          if (item.countermeasure) prompt += ` [対処: ${item.countermeasure}]`;
          prompt += '\n';
        });
        prompt += '\n';
      }
    });

    setGeneratedPrompt(prompt);
    setShowPrompt(true);
    showToast('プロンプトを生成しました', 'success');
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  const handleExport = () => {
    const exportData: Record<string, any[]> = {};

    DIMENSIONS.forEach(dim => {
      const items = db[dim.key] || [];
      exportData[dim.key] = items.map(item => ({
        text: item.text,
        evidence: item.evidence || undefined,
        context: item.context || undefined,
        meaning: item.meaning || undefined,
        reason: item.reason || undefined,
        trigger: item.trigger || undefined,
        countermeasure: item.countermeasure || undefined,
        source: item.source || 'manual',
        source_talent_name: item.sourceTalentName || undefined,
        confidence: item.confidence ?? 1.0,
        auto_extracted: item.autoExtracted ?? false,
      }));
    });

    const stats = getStats();
    const output = {
      export_date: new Date().toISOString(),
      stats: {
        manual: stats.manual,
        auto: stats.auto,
        total: stats.total,
      },
      dimensions: exportData,
    };

    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jinden-twin-db-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('エクスポートしました', 'success');
  };

  const resetForm = () => {
    setAddText('');
    setAddEvidence('');
    setAddContext('');
    setAddMeaning('');
    setAddReason('');
    setAddTrigger('');
    setAddCountermeasure('');
  };

  if (loading) {
    return <div className="text-center py-20"><div className="spinner-dark w-8 h-8 border-2 mx-auto" style={{ borderColor: '#E0E0E0', borderTopColor: '#1565C0', borderRadius: '50%', animation: 'spin .6s linear infinite' }}></div></div>;
  }

  const stats = getStats();
  const currentItems = db[currentDim] || [];
  const manualItems = currentItems.filter(i => !i.autoExtracted);
  const autoItems = currentItems.filter(i => i.autoExtracted);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-brand text-2xl text-midnight tracking-wide">JINDEN DIGITAL TWIN</h2>
        <p className="text-xs text-gray-500 mt-1">神田明典のデジタルツインを育てる</p>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border border-gray-300 rounded-[10px] p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <div className="text-sm">
              <span className="text-gray-500">デジタルツインDB：</span>
              <span className="font-semibold text-gray-900">手動 {stats.manual}項目</span>
              {stats.auto > 0 && (
                <>
                  <span className="text-gray-400 mx-1">+</span>
                  <span className="font-semibold text-blue-600">自動学習 {stats.auto}項目</span>
                </>
              )}
              <span className="text-gray-400 mx-1">=</span>
              <span className="font-bold text-jinden-blue">合計 {stats.total}項目</span>
            </div>
            {stats.lastAutoTalent && (
              <div className="text-[11px] text-gray-400">
                最終学習：{stats.lastAutoTalent}セッションから抽出
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateSelfSheet}
              disabled={generatingSelf || stats.total === 0}
              className="px-3 py-1.5 text-[11px] font-medium text-white bg-torch rounded-lg hover:bg-torch-light transition flex items-center gap-1.5 disabled:opacity-40 min-h-[32px]"
            >
              {generatingSelf ? (
                <div className="spinner w-3 h-3 border-2" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              {generatingSelf ? '生成中...' : '自分のシートを更新'}
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-[11px] font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5 min-h-[32px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              エクスポート
            </button>
          </div>
        </div>
      </div>

      {/* Self Sheet Result */}
      {showSelfSheet && selfSheet && (
        <div className="bg-gradient-to-br from-midnight to-vox text-white rounded-[10px] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-brand text-lg tracking-wide">JINDEN PERSONAL BLUEPRINT</h3>
            <button onClick={() => setShowSelfSheet(false)} className="text-white/60 hover:text-white text-lg">&times;</button>
          </div>
          {selfSheet.core_sentence && (
            <div className="bg-white/10 rounded-lg p-4 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1">CORE SENTENCE</div>
              <div className="text-[15px] font-medium">{selfSheet.core_sentence}</div>
            </div>
          )}
          {selfSheet.talent_type && (
            <div className="text-sm mb-3"><span className="text-white/60">タレントタイプ：</span>{selfSheet.talent_type}</div>
          )}
          {selfSheet.strength_verbs?.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-white/60 mb-2">STRENGTH VERBS</div>
              <div className="space-y-2">
                {selfSheet.strength_verbs.map((v: any, i: number) => (
                  <div key={i} className="bg-white/10 rounded-lg p-3">
                    <div className="text-sm font-medium">{v.verb}</div>
                    <div className="text-xs text-white/70 mt-0.5">{v.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selfSheet.weakness_verbs?.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-white/60 mb-2">WEAKNESS VERBS</div>
              <div className="space-y-2">
                {selfSheet.weakness_verbs.map((v: any, i: number) => (
                  <div key={i} className="bg-white/10 rounded-lg p-3">
                    <div className="text-sm font-medium">{v.verb}</div>
                    <div className="text-xs text-white/70 mt-0.5">{v.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selfSheet.blind_spots?.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-white/60 mb-2">BLIND SPOTS</div>
              <div className="space-y-2">
                {selfSheet.blind_spots.map((b: any, i: number) => (
                  <div key={i} className="bg-white/10 rounded-lg p-3">
                    <div className="text-sm font-medium">{b.pattern}</div>
                    {b.trigger && <div className="text-xs text-white/70 mt-0.5">発動条件: {b.trigger}</div>}
                    {b.countermeasure && <div className="text-xs text-white/70">対処: {b.countermeasure}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {selfSheet.meta_insight && (
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1">META INSIGHT</div>
              <div className="text-[13px] leading-relaxed">{selfSheet.meta_insight}</div>
            </div>
          )}
          <div className="mt-4 text-[10px] text-white/40">
            生成日時: {selfSheet.updated_at ? new Date(selfSheet.updated_at).toLocaleString('ja-JP') : '-'}
          </div>
        </div>
      )}

      {/* Dimension Stats */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {DIMENSIONS.map(dim => {
          const items = db[dim.key] || [];
          const autoCount = items.filter(i => i.autoExtracted).length;
          return (
            <div key={dim.key} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs">
              {dim.label}: <strong>{items.length}件</strong>
              {autoCount > 0 && (
                <span className="ml-1 text-blue-500 text-[10px]">(自動{autoCount})</span>
              )}
            </div>
          );
        })}
      </div>

      {/* INPUT Section */}
      <div className="mb-6">
        <div className="text-[9px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-3">INPUT - テキスト解析 &amp; ファイルアップロード</div>
        <div className="bg-white border border-gray-300 rounded-[10px] p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Text input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">テキスト入力</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] min-h-[200px] leading-relaxed focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10 transition resize-y"
                placeholder="セッションの文字起こしデータ、会話メモ、じんでんの発言をペーストしてください"
              />
            </div>

            {/* Right: File upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">ファイルアップロード</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition min-h-[120px] flex flex-col items-center justify-center ${
                  dragOver ? 'border-jinden-blue bg-mist' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <div className="text-xs text-gray-500">ドラッグ&amp;ドロップ または クリック</div>
                <div className="text-[10px] text-gray-400 mt-1">PDF / Word / TXT / 画像（20MB以下）</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadedFiles.map((f, i) => (
                    <div key={`${f.name}-${i}`} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium text-gray-700">{f.name}</div>
                        <div className="text-[10px] text-gray-400">
                          {f.status === 'extracting' && 'テキスト抽出中...'}
                          {f.status === 'done' && `${f.text.length}文字 抽出済み`}
                          {f.status === 'error' && <span className="text-red-500">エラー: {f.error}</span>}
                          {f.status === 'pending' && '待機中...'}
                        </div>
                      </div>
                      {f.status === 'extracting' && (
                        <div className="spinner w-4 h-4 border-2 flex-shrink-0" style={{ borderColor: '#E0E0E0', borderTopColor: '#1565C0', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
                      )}
                      {f.status === 'done' && (
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0 transition"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || extractingFiles}
            className="mt-4 w-full py-3 bg-jinden-blue text-white rounded-lg text-sm font-medium hover:bg-vox transition disabled:opacity-40 flex items-center justify-center gap-2 min-h-[44px]"
          >
            {analyzing && <div className="spinner w-4 h-4 border-2" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />}
            {analyzing ? 'AI解析中...' : 'AI解析（テキスト + ファイル）'}
          </button>
        </div>
      </div>

      {/* PROCESS Section */}
      <div className="mb-6">
        <div className="text-[9px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-3">PROCESS - 思想の構造化表示</div>

        {/* Dimension tabs */}
        <div className="flex gap-0 border-b-2 border-gray-300 mb-6 overflow-x-auto">
          {DIMENSIONS.map(dim => {
            const autoCount = (db[dim.key] || []).filter(i => i.autoExtracted).length;
            return (
              <button
                key={dim.key}
                onClick={() => { setCurrentDim(dim.key); setShowAddForm(false); }}
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] transition relative ${
                  currentDim === dim.key
                    ? 'text-jinden-blue border-jinden-blue'
                    : 'text-gray-500 border-transparent hover:text-jinden-blue'
                }`}
              >
                {dim.labelShort}
                {autoCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] rounded-full flex items-center justify-center">
                    {autoCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Add button */}
        <button
          onClick={() => { setShowAddForm(!showAddForm); resetForm(); }}
          className="mb-4 px-4 py-2 bg-mist text-jinden-blue rounded-lg text-[13px] font-medium hover:bg-wash transition"
        >
          + 手動で追加
        </button>

        {/* Add form */}
        {showAddForm && (
          <div className="bg-white border border-gray-300 rounded-lg p-5 mb-4">
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-2">テキスト</label>
              <input value={addText} onChange={e => setAddText(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10" placeholder="内容を入力" />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-2">エビデンス / 根拠</label>
              <input value={addEvidence} onChange={e => setAddEvidence(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10" placeholder="根拠となる発言や出典" />
            </div>
            {currentDim === 'self_patterns' && (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">発動条件</label>
                  <input value={addTrigger} onChange={e => setAddTrigger(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10" placeholder="どういう時にこのパターンが出るか" />
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">対処法</label>
                  <input value={addCountermeasure} onChange={e => setAddCountermeasure(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10" placeholder="どう対処するか" />
                </div>
              </>
            )}
            {['beliefs', 'judgments', 'questions'].includes(currentDim) && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2">コンテキスト</label>
                <input value={addContext} onChange={e => setAddContext(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10" placeholder="どういう文脈で" />
              </div>
            )}
            {currentDim === 'metaphors' && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2">意味</label>
                <input value={addMeaning} onChange={e => setAddMeaning(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10" placeholder="何を意味しているか" />
              </div>
            )}
            {currentDim === 'taboos' && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2">理由</label>
                <input value={addReason} onChange={e => setAddReason(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10" placeholder="なぜやらないか" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleAddManual} className="px-4 py-2 bg-jinden-blue text-white rounded-lg text-[13px] font-medium hover:bg-vox transition">保存</button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-[13px] font-medium transition">キャンセル</button>
            </div>
          </div>
        )}

        {/* Items - Manual first, then Auto */}
        {currentItems.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <h3 className="text-base font-medium text-gray-700 mb-2">まだデータがありません</h3>
            <p className="text-[13px]">AI解析または手動追加でデータを蓄積してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Manual items */}
            {manualItems.map((item, idx) => {
              const globalIdx = currentItems.indexOf(item);
              return (
                <div key={item.dbId || `m-${idx}`} className={`bg-white border rounded-lg p-4 ${currentDim === 'self_patterns' ? 'border-torch/30 bg-orange-50/30' : 'border-gray-300'}`}>
                  <div className="text-[13px] font-medium text-gray-900 mb-1">{item.text}</div>
                  {item.evidence && <div className="text-[11px] text-gray-500 mb-0.5">根拠: {item.evidence}</div>}
                  {item.context && <div className="text-[11px] text-gray-500 mb-0.5">文脈: {item.context}</div>}
                  {item.meaning && <div className="text-[11px] text-gray-500 mb-0.5">意味: {item.meaning}</div>}
                  {item.reason && <div className="text-[11px] text-gray-500 mb-0.5">理由: {item.reason}</div>}
                  {item.trigger && <div className="text-[11px] text-gray-500 mb-0.5">発動条件: {item.trigger}</div>}
                  {item.countermeasure && <div className="text-[11px] text-gray-500 mb-0.5">対処法: {item.countermeasure}</div>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400">{item.added || ''}</span>
                    <button
                      onClick={() => handleDeleteItem(currentDim, globalIdx)}
                      className="text-gray-400 hover:text-red-600 text-lg leading-none transition"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Auto-extracted items */}
            {autoItems.length > 0 && (
              <>
                {manualItems.length > 0 && (
                  <div className="pt-2 pb-1">
                    <div className="text-[10px] font-bold tracking-[0.15em] text-blue-500 uppercase flex items-center gap-2">
                      <div className="h-px flex-1 bg-blue-200"></div>
                      AUTO LEARNED ({autoItems.length})
                      <div className="h-px flex-1 bg-blue-200"></div>
                    </div>
                  </div>
                )}
                {autoItems.map((item, idx) => {
                  const globalIdx = currentItems.indexOf(item);
                  return (
                    <div key={item.dbId || `a-${idx}`} className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 relative">
                      {/* Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          <span>&#x1F916;</span> 自動学習
                        </span>
                        {item.sourceTalentName && (
                          <span className="text-[10px] text-gray-500">
                            from: {item.sourceTalentName}
                          </span>
                        )}
                        {/* Confidence bar */}
                        <div className="flex items-center gap-1 ml-auto">
                          <span className="text-[9px] text-gray-400">確信度</span>
                          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(item.confidence ?? 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-gray-500">{Math.round((item.confidence ?? 0) * 100)}%</span>
                        </div>
                      </div>

                      <div className="text-[13px] font-medium text-gray-900 mb-1">{item.text}</div>
                      {item.evidence && <div className="text-[11px] text-gray-500 mb-0.5">根拠: {item.evidence}</div>}

                      {/* Approve / Reject */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleApprove(item)}
                          className="px-3 py-1.5 text-[11px] font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => handleReject(item)}
                          className="px-3 py-1.5 text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                        >
                          却下
                        </button>
                        <button
                          onClick={() => handleDeleteItem(currentDim, globalIdx)}
                          className="ml-auto text-gray-400 hover:text-red-600 text-lg leading-none transition"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* OUTPUT Section */}
      <div>
        <div className="text-[9px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-3">OUTPUT - AI再現プロンプト生成</div>
        <div className="flex gap-3">
          <button
            onClick={handleGeneratePrompt}
            className="px-6 py-3 bg-torch text-white rounded-lg text-sm font-medium hover:bg-torch-light transition"
          >
            AIプロンプト生成
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
          >
            JSONエクスポート
          </button>
        </div>

        {showPrompt && generatedPrompt && (
          <div className="mt-4">
            <button
              onClick={() => { navigator.clipboard.writeText(generatedPrompt); showToast('クリップボードにコピーしました', 'success'); }}
              className="mb-3 px-4 py-2 bg-mist text-jinden-blue rounded-lg text-[13px] font-medium hover:bg-wash transition"
            >
              クリップボードにコピー
            </button>
            <pre className="bg-midnight text-wash p-5 rounded-lg text-xs leading-relaxed overflow-auto max-h-[500px] whitespace-pre-wrap">
              {generatedPrompt}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
