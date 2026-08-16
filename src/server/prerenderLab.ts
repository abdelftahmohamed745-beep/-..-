import fs from 'fs';
import path from 'path';
import { LabProfile } from '../types';
import { getLabSeoData } from '../utils/seo';

function getFirebaseConfig() {
  return {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'prefab-groove-502023-t4',
    firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-f8a934fa-e4dd-4561-8d66-6ad00154589f',
    apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCcS-iNhEkZ80ryW6AGS854ERxXBklYSyE'
  };
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map((item: any) => parseFirestoreValue(item));
  }
  if ('mapValue' in val) {
    return parseFirestoreFields(val.mapValue.fields || {});
  }
  return null;
}

function parseFirestoreFields(fields: Record<string, any>): LabProfile {
  const labObj: Record<string, any> = {};
  if (!fields) return labObj as LabProfile;
  for (const [key, val] of Object.entries(fields)) {
    labObj[key] = parseFirestoreValue(val);
  }
  return labObj as LabProfile;
}

export async function fetchLabProfileServer(labId: string): Promise<LabProfile | null> {
  if (!labId || typeof labId !== 'string') return null;

  const sanitizedLabId = labId.trim();
  if (!sanitizedLabId || sanitizedLabId.includes('/') || sanitizedLabId.includes('\\')) {
    return null;
  }

  try {
    const fbConfig = getFirebaseConfig();
    const projectId = fbConfig.projectId;
    const databaseId = fbConfig.firestoreDatabaseId || '(default)';
    const apiKey = fbConfig.apiKey;

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/laboratories/${encodeURIComponent(sanitizedLabId)}?key=${apiKey}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.fields) {
        const lab = parseFirestoreFields(data.fields);
        lab.uid = lab.uid || sanitizedLabId;
        return lab;
      }
    }
  } catch (err) {
    console.warn('Error fetching lab via REST API in server prerender:', err);
  }

  return null;
}

export function generate404LabHtml(rootDir: string, labId: string): string {
  let baseTemplate = '';
  const distHtmlPath = path.join(rootDir, 'dist', 'index.html');
  const srcHtmlPath = path.join(rootDir, 'index.html');

  if (fs.existsSync(distHtmlPath)) {
    baseTemplate = fs.readFileSync(distHtmlPath, 'utf-8');
  } else if (fs.existsSync(srcHtmlPath)) {
    baseTemplate = fs.readFileSync(srcHtmlPath, 'utf-8');
  } else {
    baseTemplate = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>المعمل غير موجود</title></head><body><div id="root"></div></body></html>`;
  }

  const notFoundTitle = 'المعمل غير موجود | دوري';
  const notFoundDesc = 'عفواً، لم نتمكن من العثور على معمل التحاليل المطلوب في منصة دوري.';
  const canonicalUrl = `https://dory-system.vercel.app/lab/${encodeURIComponent(labId)}`;

  let html = baseTemplate;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(notFoundTitle)}</title>`);

  const metaTags = `
    <meta name="description" content="${escapeHtml(notFoundDesc)}" />
    <meta name="robots" content="noindex, nofollow" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  `;

  if (html.includes('</head>')) {
    html = html.replace('</head>', `${metaTags}\n</head>`);
  }

  const notFoundBody = `
    <div id="root">
      <div style="max-width:600px;margin:80px auto;padding:32px;text-align:center;font-family:sans-serif;direction:rtl;">
        <h1 style="font-size:26px;color:#0f172a;font-weight:bold;margin-bottom:12px;">404 - المعمل غير موجود</h1>
        <p style="color:#64748b;font-size:15px;margin-bottom:24px;">عفواً، لم نتمكن من العثور على معمل التحاليل المطلوب في منصة دوري.</p>
        <a href="/" style="display:inline-block;background-color:#122c4a;color:#ffffff;padding:10px 22px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;">العودة للصفحة الرئيسية</a>
      </div>
    </div>
  `;

  html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, notFoundBody);
  return html;
}

export function generateLabPrerenderHtml(rootDir: string, lab: LabProfile): string {
  let baseTemplate = '';
  const distHtmlPath = path.join(rootDir, 'dist', 'index.html');
  const srcHtmlPath = path.join(rootDir, 'index.html');

  if (fs.existsSync(distHtmlPath)) {
    baseTemplate = fs.readFileSync(distHtmlPath, 'utf-8');
  } else if (fs.existsSync(srcHtmlPath)) {
    baseTemplate = fs.readFileSync(srcHtmlPath, 'utf-8');
  } else {
    baseTemplate = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>دوري</title></head><body><div id="root"></div></body></html>`;
  }

  const seo = getLabSeoData(lab);
  const labName = lab.name ? lab.name.trim() : 'معمل تحاليل';
  const address = lab.address ? lab.address.trim() : '';
  const phone = lab.phone ? lab.phone.trim() : '';
  const hours = lab.workHours ? `من ${lab.workHours.open} إلى ${lab.workHours.close}` : '';

  let html = baseTemplate;

  // Replace Title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);

  // Remove existing default tags to avoid duplicates
  html = html.replace(/<meta name="description"[\s\S]*?>/gi, '');
  html = html.replace(/<meta name="robots"[\s\S]*?>/gi, '');
  html = html.replace(/<link rel="canonical"[\s\S]*?>/gi, '');
  html = html.replace(/<meta property="og:[\s\S]*?>/gi, '');
  html = html.replace(/<meta name="twitter:[\s\S]*?>/gi, '');
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');

  const imageTag = seo.ogImage
    ? `<meta property="og:image" content="${escapeHtml(seo.ogImage)}" />
       <meta name="twitter:image" content="${escapeHtml(seo.ogImage)}" />
       <meta name="twitter:card" content="summary_large_image" />`
    : `<meta name="twitter:card" content="summary" />`;

  const metaHeader = `
    <meta name="description" content="${escapeHtml(seo.description)}" />
    <meta name="robots" content="${escapeHtml(seo.robots || 'index, follow')}" />
    <link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />

    <meta property="og:type" content="business.business" />
    <meta property="og:site_name" content="دوري — Dory" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}" />
    <meta property="og:locale" content="ar_SA" />
    ${imageTag}

    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />

    <script type="application/ld+json">
    ${JSON.stringify(seo.jsonLd, null, 2)}
    </script>
  `;

  if (html.includes('</head>')) {
    html = html.replace('</head>', `${metaHeader}\n</head>`);
  }

  const visibleBody = `
    <div id="root">
      <div style="max-width:800px;margin:0 auto;padding:24px;direction:rtl;text-align:right;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <header style="margin-bottom:24px;border-bottom:1px solid #e2e8f0;padding-bottom:16px;">
          <a href="/" style="color:#0284c7;text-decoration:none;font-weight:bold;font-size:14px;">← العودة لمنصة دوري</a>
          <h1 style="font-size:28px;font-weight:bold;color:#0f172a;margin-top:12px;margin-bottom:4px;">${escapeHtml(labName)}</h1>
          <p style="font-size:18px;color:#0284c7;font-weight:bold;margin:0;">معمل تحاليل طبية معتمد</p>
        </header>
        <main>
          ${address ? `<p style="font-size:15px;color:#334155;margin-bottom:8px;"><strong>العنوان:</strong> ${escapeHtml(address)}</p>` : ''}
          ${phone ? `<p style="font-size:15px;color:#334155;margin-bottom:8px;"><strong>الهاتف:</strong> ${escapeHtml(phone)}</p>` : ''}
          ${hours ? `<p style="font-size:15px;color:#334155;margin-bottom:8px;"><strong>مواعيد العمل:</strong> ${escapeHtml(hours)}</p>` : ''}
          <div style="margin-top:24px;padding:20px;background-color:#f0f9ff;border-radius:12px;border:1px solid #bae6fd;text-align:center;">
            <h2 style="font-size:18px;color:#0369a1;font-weight:bold;margin-top:0;margin-bottom:8px;">استعراض باقات وفحوصات المعمل</h2>
            <p style="font-size:14px;color:#0284c7;margin-bottom:16px;">تصفح أسعار التحاليل وشروط الفحوصات واطلب سحب العينة واستلم نتيجتك الموثقة بـ QR عبر دوري.</p>
            <a href="/lab/${escapeHtml(lab.uid)}" style="display:inline-block;background-color:#122c4a;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">استعراض دليل التحاليل</a>
          </div>
        </main>
      </div>
    </div>
  `;

  html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, visibleBody);
  return html;
}

export async function renderLabHtml(rootDir: string, labId: string): Promise<{ status: number; html: string }> {
  const lab = await fetchLabProfileServer(labId);
  if (!lab) {
    return {
      status: 404,
      html: generate404LabHtml(rootDir, labId)
    };
  }

  return {
    status: 200,
    html: generateLabPrerenderHtml(rootDir, lab)
  };
}
