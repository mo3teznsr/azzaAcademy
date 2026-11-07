import { SupportHome } from '@/features/comms/support';

const one = (v: string | string[] | undefined) => (typeof v === 'string' && v ? v : undefined);

export default async function Page({ searchParams }: { searchParams: Promise<{ new?: string | string[]; order?: string | string[]; batch?: string | string[] }> }) {
  const sp = await searchParams;
  return <SupportHome openNew={one(sp.new) === '1'} orderId={one(sp.order)} batchId={one(sp.batch)} />;
}
