import { CourseEditor } from '@/features/admin/course-editor';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseEditor courseId={id} mode="teacher" />;
}
