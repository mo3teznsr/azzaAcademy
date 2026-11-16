import { CourseQuestions } from '@/features/studio/course-questions';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseQuestions courseId={id} />;
}
