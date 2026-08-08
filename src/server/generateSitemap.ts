import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { DoctorProfile } from '../types';

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function generateSitemapXml(): Promise<string> {
  const baseUrl = 'https://nine-vert-34.vercel.app';
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${baseUrl}/` }
  ];

  try {
    const querySnap = await getDocs(collection(db, 'doctors'));
    querySnap.forEach((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DoctorProfile;
        const docId = docSnap.id || data.uid;

        // Include only active clinics
        if (docId && data.isActive !== false) {
          let lastmod: string | undefined = undefined;
          const rawDate = (data as any).updatedAt || data.createdAt;
          if (rawDate) {
            try {
              const parsed = new Date(rawDate);
              if (!isNaN(parsed.getTime())) {
                lastmod = parsed.toISOString();
              }
            } catch (e) {
              // Ignore invalid dates
            }
          }

          urls.push({
            loc: `${baseUrl}/clinic/${encodeURIComponent(docId)}`,
            lastmod
          });
        }
      }
    });
  } catch (err) {
    console.error('Error fetching doctors for sitemap:', err);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const item of urls) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(item.loc)}</loc>\n`;
    if (item.lastmod) {
      xml += `    <lastmod>${escapeXml(item.lastmod)}</lastmod>\n`;
    }
    xml += `  </url>\n`;
  }
  xml += `</urlset>`;

  return xml;
}
