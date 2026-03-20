import { callClaude } from './claude';

const FILE_EXTRACT_PROMPT = `以下のファイルから、じんでん（神田明典）の思想・価値観・行動パターンに関連するテキストを抽出してください。
セッションの文字起こし、メモ、発言録など、じんでんの人格データとして使える部分をそのまま抽出してください。
不要なヘッダーやフッター、書式情報は除去し、意味のあるテキストのみを返してください。
抽出したテキストをそのまま返してください（JSON不要、プレーンテキストで）。`;

export interface ExtractedFile {
  name: string;
  type: string;
  size: number;
  text: string;
  status: 'pending' | 'extracting' | 'done' | 'error';
  error?: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function extractTextFromFile(
  file: File,
  apiKey: string
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // Plain text files
  if (['txt', 'md', 'csv', 'tsv'].includes(ext)) {
    return await file.text();
  }

  // For PDF, Word, and images: use Claude's vision/document capabilities
  const buffer = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);

  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    // Image: use Claude vision
    const mimeType = file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: FILE_EXTRACT_PROMPT },
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          ],
        }],
      }),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const result = await response.json();
    return result.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || '';
  }

  if (ext === 'pdf') {
    // PDF: use Claude document support
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: FILE_EXTRACT_PROMPT },
          ],
        }],
      }),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const result = await response.json();
    return result.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || '';
  }

  if (['doc', 'docx'].includes(ext)) {
    // Word: extract via Claude with base64
    const result = await callClaude({
      task: 'analysis',
      systemPrompt: FILE_EXTRACT_PROMPT,
      userContent: `ファイル名: ${file.name}\nファイルサイズ: ${file.size}バイト\n\n[このファイルはWord形式です。テキスト内容を読み取ってください]\n\nBase64データ（先頭2000文字）:\n${base64.substring(0, 2000)}`,
      apiKey,
      maxTokens: 4096,
    });
    return result.text;
  }

  throw new Error(`未対応のファイル形式: .${ext}`);
}

export const ACCEPTED_FILE_TYPES = '.txt,.md,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp';
export const ACCEPTED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
