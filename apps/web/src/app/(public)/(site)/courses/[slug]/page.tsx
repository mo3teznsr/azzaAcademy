import { Suspense } from 'react';
import { CourseDetail } from '@/features/course/course-detail';

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense>
      <CourseDetail slug={slug} />
    </Suspense>
  );
}
