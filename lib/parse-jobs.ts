import { JobMatch } from './types';

export function parseJobResults(fullText: string): JobMatch[] {
  let jobs: JobMatch[] = [];
  if (!fullText || fullText.length === 0) return jobs;

  // Strategy 1: Standard regex
  try {
    const m1 = fullText.match(/\[[\s\S]*\]/);
    if (m1) {
      jobs = JSON.parse(m1[0]);
      if (Array.isArray(jobs) && jobs.length > 0) return jobs;
    }
  } catch (e: any) { console.warn('[JM Parse] Strategy 1 failed:', e.message); }

  // Strategy 2: indexOf bracket extraction + cleanup
  try {
    const fi = fullText.indexOf('[');
    const li = fullText.lastIndexOf(']');
    if (fi !== -1 && li > fi) {
      let raw = fullText.substring(fi, li + 1);
      raw = raw.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');
      raw = raw.replace(/[\x00-\x1f\x7f]/g, function (c) { return c === '\n' || c === '\r' || c === '\t' ? c : ''; });
      jobs = JSON.parse(raw);
      if (Array.isArray(jobs) && jobs.length > 0) return jobs;
    }
  } catch (e: any) { console.warn('[JM Parse] Strategy 2 failed:', e.message); }

  // Strategy 3: Individual object extraction
  try {
    const objects: JobMatch[] = [];
    let depth = 0;
    let start = -1;
    for (let i = 0; i < fullText.length; i++) {
      if (fullText[i] === '{') { if (depth === 0) start = i; depth++; }
      else if (fullText[i] === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          try {
            const chunk = fullText.substring(start, i + 1);
            const obj = JSON.parse(chunk);
            if (obj.company || obj.title || obj.match_score !== undefined) {
              objects.push(obj);
            }
          } catch { /* skip */ }
          start = -1;
        }
      }
    }
    if (objects.length > 0) return objects;
  } catch (e: any) { console.warn('[JM Parse] Strategy 3 failed:', e.message); }

  return jobs;
}
