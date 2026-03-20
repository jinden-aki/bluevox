import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bluevox/1.0)' },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();

    const getMetaContent = (property: string): string | null => {
      const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      if (match) return match[1];
      // Try reversed order
      const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
      const match2 = html.match(regex2);
      return match2 ? match2[1] : null;
    };

    const title = getMetaContent('og:title') || getMetaContent('twitter:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
    const image = getMetaContent('og:image') || getMetaContent('twitter:image') || '';

    return NextResponse.json({ title, image });
  } catch {
    return NextResponse.json({ title: '', image: '' });
  }
}
