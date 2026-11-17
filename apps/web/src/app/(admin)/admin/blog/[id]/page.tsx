import { BlogEditor } from '@/features/admin/blog-editor';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BlogEditor postId={id} />;
}
