import { renderClinicHtml } from '../src/server/prerenderClinic';

export default async function handler(req: any, res: any) {
  try {
    let docId = (req.query.docId as string) || '';

    if (!docId && req.url) {
      const match = req.url.match(/\/clinic\/([^/?#]+)/);
      if (match && match[1]) {
        docId = decodeURIComponent(match[1]);
      }
    }

    const rootDir = process.cwd();
    const result = await renderClinicHtml(rootDir, docId);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (result.status === 200) {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    return res.status(result.status).send(result.html);
  } catch (error) {
    console.error('Vercel clinic prerender function error:', error);
    return res.status(500).send('<!doctype html><html lang="ar" dir="rtl"><head><title>خطأ في الخادم</title></head><body><h1>500 - حدث خطأ غير متوقع</h1></body></html>');
  }
}
