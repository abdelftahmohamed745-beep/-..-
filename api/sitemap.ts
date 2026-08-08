import { generateSitemapXml } from '../src/server/generateSitemap';

export default async function handler(req: any, res: any) {
  try {
    const xml = await generateSitemapXml();

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800');

    return res.status(200).send(xml);
  } catch (error) {
    console.error('Error in sitemap serverless handler:', error);
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://nine-vert-34.vercel.app/</loc>\n  </url>\n</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(200).send(fallbackXml);
  }
}
