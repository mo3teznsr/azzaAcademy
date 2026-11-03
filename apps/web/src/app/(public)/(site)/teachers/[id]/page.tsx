import type { Metadata } from 'next';
import { API_URL } from '@/lib/api/client';
import type { TeacherProfile as Profile } from '@/lib/api/types';
import { TeacherProfile } from '@/features/teachers/teacher-profile';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_URL}/api/v1/teachers/${encodeURIComponent(id)}`, { next: { revalidate: 300 } });
    if (!res.ok) return {};
    const p = (await res.json()) as Profile;
    return { title: p.name, description: p.headline ?? undefined };
  } catch {
    return {};
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeacherProfile id={id} />;
}
