import { Suspense } from 'react';
import { CoursePreview } from '@/features/course/course-preview';

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense>
      <CoursePreview slug={slug} />
    </Suspense>
  );
}
