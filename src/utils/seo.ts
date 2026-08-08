import { DoctorProfile } from '../types';

const SITE_URL = 'https://nine-vert-34.vercel.app';

export interface SeoData {
  title: string;
  description: string;
  canonicalUrl: string;
  robots?: string;
  ogType?: string;
  ogImage?: string;
  jsonLd?: object;
}

export const DEFAULT_HOMEPAGE_SEO: SeoData = {
  title: 'دوري | نظام إدارة العيادات وحجز المواعيد وتتبع أدوار المرضى',
  description: 'منصة دوري هي النظام الذكي لإدارة العيادات الطبية وتنظيم أدوار المرضى والمواعيد المباشرة. يتيح للأطباء إدارة عياداتهم بسهولة وللمرضى حجز وتتبع الدور لحظياً.',
  canonicalUrl: `${SITE_URL}/`,
  robots: 'index, follow',
  ogType: 'website',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'دوري',
    'alternateName': 'Dory',
    'url': `${SITE_URL}/`,
    'applicationCategory': 'HealthApplication',
    'operatingSystem': 'All',
    'inLanguage': 'ar',
    'description': 'نظام ذكي لإدارة العيادات الطبية وتنظيم أدوار المرضى وتتبع الدور والحجز المباشر.'
  }
};

export function updateMetaTag(selector: string, attribute: string, value: string) {
  let element = document.querySelector(selector);
  if (!element) {
    if (selector.startsWith('meta[')) {
      element = document.createElement('meta');
      const propMatch = selector.match(/property=["']([^"']+)["']/);
      const nameMatch = selector.match(/name=["']([^"']+)["']/);
      if (propMatch) element.setAttribute('property', propMatch[1]);
      if (nameMatch) element.setAttribute('name', nameMatch[1]);
      document.head.appendChild(element);
    } else if (selector.startsWith('link[')) {
      element = document.createElement('link');
      const relMatch = selector.match(/rel=["']([^"']+)["']/);
      if (relMatch) element.setAttribute('rel', relMatch[1]);
      document.head.appendChild(element);
    }
  }
  if (element) {
    element.setAttribute(attribute, value);
  }
}

export function updateJsonLd(data?: object) {
  let script = document.querySelector('script[type="application/ld+json"]');
  if (!data) {
    if (script) script.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data, null, 2);
}

export function setPageSeo(data: SeoData) {
  if (typeof document === 'undefined') return;

  // Title
  document.title = data.title;

  // Description
  updateMetaTag('meta[name="description"]', 'content', data.description);

  // Robots
  updateMetaTag('meta[name="robots"]', 'content', data.robots || 'index, follow');

  // Canonical
  updateMetaTag('link[rel="canonical"]', 'href', data.canonicalUrl);

  // Open Graph
  updateMetaTag('meta[property="og:title"]', 'content', data.title);
  updateMetaTag('meta[property="og:description"]', 'content', data.description);
  updateMetaTag('meta[property="og:url"]', 'content', data.canonicalUrl);
  updateMetaTag('meta[property="og:type"]', 'content', data.ogType || 'website');

  // Twitter
  updateMetaTag('meta[name="twitter:title"]', 'content', data.title);
  updateMetaTag('meta[name="twitter:description"]', 'content', data.description);

  if (data.ogImage) {
    updateMetaTag('meta[property="og:image"]', 'content', data.ogImage);
    updateMetaTag('meta[name="twitter:image"]', 'content', data.ogImage);
    updateMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image');
  } else {
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg) ogImg.remove();
    const twImg = document.querySelector('meta[name="twitter:image"]');
    if (twImg) twImg.remove();
    updateMetaTag('meta[name="twitter:card"]', 'content', 'summary');
  }

  // JSON-LD
  updateJsonLd(data.jsonLd);
}

export function getDoctorSeoData(doctor: DoctorProfile): SeoData {
  const docName = doctor.name ? doctor.name.trim() : 'طبيب';
  const clinicName = doctor.clinicName ? doctor.clinicName.trim() : 'عيادة طبية';
  const specialty = doctor.specialty ? doctor.specialty.trim() : '';
  const city = doctor.city ? doctor.city.trim() : '';
  const address = doctor.address ? doctor.address.trim() : '';

  const title = specialty
    ? `${docName} - ${specialty} | ${clinicName} - دوري`
    : `${docName} | ${clinicName} - دوري`;

  const locationPart = [address, city].filter(Boolean).join('، ');
  const descParts = [
    `احجز دورك وتتبع المواعيد أونلاين في ${clinicName} للدكتور ${docName}`,
    specialty ? `تخصص ${specialty}` : '',
    locationPart ? `العنوان: ${locationPart}` : '',
    'عبر منصة دوري لإدارة العيادات والمواعيد المباشرة.'
  ].filter(Boolean);

  const description = doctor.description && doctor.description.trim().length > 10
    ? `${doctor.description.trim().slice(0, 110)}.. ${descParts[0]}.`
    : descParts.join(' - ');

  const canonicalUrl = `${SITE_URL}/clinic/${doctor.uid}`;
  const photo = doctor.photoUrl || (doctor.clinicPhotos && doctor.clinicPhotos[0]) || undefined;
  const isActive = doctor.isActive !== false;

  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    'name': docName,
    'alternateName': clinicName,
    'description': description,
    'url': canonicalUrl,
    'medicalSpecialty': specialty || 'Medical Clinic'
  };

  if (photo) {
    jsonLd['image'] = photo;
  }

  if (locationPart) {
    jsonLd['address'] = {
      '@type': 'PostalAddress',
      'streetAddress': address || locationPart,
      'addressLocality': city || 'مصر',
      'addressCountry': 'EG'
    };
  }

  if (doctor.phone) {
    jsonLd['telephone'] = doctor.phone;
  }

  if (doctor.ratingAverage && doctor.ratingCount && doctor.ratingCount > 0) {
    jsonLd['aggregateRating'] = {
      '@type': 'AggregateRating',
      'ratingValue': doctor.ratingAverage,
      'reviewCount': doctor.ratingCount
    };
  }

  return {
    title,
    description,
    canonicalUrl,
    robots: isActive ? 'index, follow' : 'noindex, nofollow',
    ogType: 'profile',
    ogImage: photo,
    jsonLd
  };
}
