import type { Metadata } from 'next';
import { API_URL, mediaUrl } from '@/lib/api/client';
import type { TeacherProfile as Profile } from '@/lib/api/types';
import { SITE_URL, jsonLd } from '@/lib/site';
import { TeacherProfile } from '@/features/teachers/teacher-profile';

async function loadTeacher(id: string): Promise<Profile | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/teachers/${encodeURIComponent(id)}`, { next: { revalidate: 300 } });
    return res.ok ? ((await res.json()) as Profile) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await loadTeacher(id);
  if (!p) return {};
  const image = mediaUrl(p.image);
  const url = `${SITE_URL}/teachers/${encodeURIComponent(p.id)}`;
  const description = p.headline ?? p.bio?.slice(0, 200) ?? undefined;
  return {
    title: p.name,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'profile', url, title: p.name, description, ...(image && { images: [{ url: image, alt: p.name }] }) },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await loadTeacher(id);
  const image = p && mediaUrl(p.image);
  return (
    <>
      {p && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: p.name,
              url: `${SITE_URL}/teachers/${encodeURIComponent(p.id)}`,
              ...(p.headline && { jobTitle: p.headline }),
              ...(image && { image }),
              worksFor: { '@type': 'Organization', name: 'Azza', url: SITE_URL },
            }),
          }}
        />
      )}
      <TeacherProfile id={id} />
    </>
  );
}
