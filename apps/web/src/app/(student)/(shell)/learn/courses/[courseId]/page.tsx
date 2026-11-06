import { LessonReader } from '@/features/lessons/lesson-reader';

export default async function Page({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ lesson?: string | string[] }> }) {
  const { courseId } = await params;
  const { lesson } = await searchParams;
  return <LessonReader courseId={courseId} initialLessonId={typeof lesson === 'string' ? lesson : undefined} />;
}
