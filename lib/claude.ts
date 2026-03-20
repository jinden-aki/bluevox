const MODEL_MAP = {
  analysis: 'claude-sonnet-4-20250514',
  jobMatching: 'claude-sonnet-4-20250514',
  applyMessage: 'claude-haiku-4-5-20251001',
  thought: 'claude-haiku-4-5-20251001',
  writer: 'claude-haiku-4-5-20251001',
  taskChat: 'claude-haiku-4-5-20251001',
  generalChat: 'claude-haiku-4-5-20251001',
  taskDump: 'claude-haiku-4-5-20251001',
  inboxDump: 'claude-haiku-4-5-20251001',
  taskFocus: 'claude-haiku-4-5-20251001',
} as const;

type TaskType = keyof typeof MODEL_MAP;

interface ClaudeRequestOptions {
  task: TaskType;
  systemPrompt: string;
  userContent: string;
  apiKey: string;
  tools?: any[];
  maxTokens?: number;
  temperature?: number;
}

const TOKEN_DEFAULTS: Partial<Record<TaskType, number>> = {
  analysis: 16000,
};

export async function callClaude(options: ClaudeRequestOptions) {
  const { task, systemPrompt, userContent, apiKey, tools, maxTokens, temperature } = options;
  const resolvedMaxTokens = maxTokens ?? TOKEN_DEFAULTS[task] ?? 8192;
  const model = MODEL_MAP[task];

  const body: any = {
    model,
    max_tokens: resolvedMaxTokens,
    ...(temperature !== undefined && { temperature }),
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: userContent }
      ]
    }]
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'anthropic-beta': 'prompt-caching-2024-07-31'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API Error ${response.status}: ${errorText}`);
  }

  const result = await response.json();

  if (result.type === 'error') {
    throw new Error(`Claude API Error: ${result.error?.message || 'Unknown error'}`);
  }

  const textContent = result.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n');

  return {
    text: textContent,
    content: result.content,
    usage: result.usage,
    model: result.model
  };
}

interface ClaudeChatOptions {
  task: TaskType;
  systemPrompt: string;
  messages: { role: string; content: string }[];
  apiKey: string;
  maxTokens?: number;
}

export async function callClaudeChat(options: ClaudeChatOptions) {
  const { task, systemPrompt, messages, apiKey, maxTokens = 2048 } = options;
  const model = MODEL_MAP[task];

  const body: any = {
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'anthropic-beta': 'prompt-caching-2024-07-31'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API Error ${response.status}: ${errorText}`);
  }

  const result = await response.json();

  if (result.type === 'error') {
    throw new Error(`Claude API Error: ${result.error?.message || 'Unknown error'}`);
  }

  const textContent = result.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n');

  return { text: textContent, usage: result.usage };
}

/**
 * Sanitize text before JSON.parse: remove control characters that break parsing.
 */
function sanitizeForJSON(raw: string): string {
  // Remove chars 0x00-0x1F except \n \r \t (which are valid in JSON strings when escaped)
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/**
 * Robust JSON parser that handles:
 * - Clean JSON output
 * - ```json ... ``` code blocks
 * - Leading/trailing explanation text
 * - Truncated JSON (auto-closes brackets)
 * - Control characters in strings
 */
export function parseJSON(text: string): any | null {
  if (!text) return null;

  const clean = sanitizeForJSON(text);

  // 1. Try direct parse
  try { return JSON.parse(clean); } catch {}

  // 2. Try code-block extraction
  const codeBlock = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) {
    try { return JSON.parse(sanitizeForJSON(codeBlock[1])); } catch {}
  }

  // 3. Extract first { to last } (greedy — captures the whole JSON object)
  const outerMatch = clean.match(/\{[\s\S]*\}/);
  if (outerMatch) {
    const candidate = outerMatch[0];
    try { return JSON.parse(candidate); } catch {}

    // 4. Try auto-closing truncated JSON
    let openCurly = 0, openSquare = 0, inStr = false, esc = false;
    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate.charAt(i);
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') openCurly++;
      else if (ch === '}') openCurly--;
      else if (ch === '[') openSquare++;
      else if (ch === ']') openSquare--;
    }

    if (openCurly > 0 || openSquare > 0) {
      // Truncated — find last valid position and close brackets
      let repaired = candidate;
      // Remove trailing incomplete key/value (e.g. `"key": "val` or `"key":`)
      repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, '');
      // Also try removing trailing comma
      repaired = repaired.replace(/,\s*$/, '');
      let suffix = '';
      for (let s = 0; s < openSquare; s++) suffix += ']';
      for (let c = 0; c < openCurly; c++) suffix += '}';
      try { return JSON.parse(repaired + suffix); } catch {}
      // Last resort: just close it
      try { return JSON.parse(candidate + suffix); } catch {}
    }
  }

  // 5. Fallback: find first { and try progressively
  const firstBrace = clean.indexOf('{');
  if (firstBrace >= 0) {
    const fromBrace = clean.substring(firstBrace);
    const lastBrace = fromBrace.lastIndexOf('}');
    if (lastBrace > 0) {
      try { return JSON.parse(fromBrace.substring(0, lastBrace + 1)); } catch {}
    }
  }

  return null;
}

/**
 * Parse analysis JSON with detailed error for debugging.
 * Throws with first 500 chars of response on failure.
 */
export function parseAnalysisJSON(text: string): any {
  const result = parseJSON(text);
  if (result) return result;
  const preview = (text || '').substring(0, 500);
  throw new Error(
    'AI応答のJSON解析に失敗しました。出力が途中で切れている可能性があります。\n' +
    '応答の先頭:\n' + preview
  );
}
