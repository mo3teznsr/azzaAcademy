import { StatementReview } from '@/features/admin/statement-review';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StatementReview importId={id} />;
}
