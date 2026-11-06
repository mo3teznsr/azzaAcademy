import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading">
      <Skeleton className="h-64 rounded-[28px] bg-muted" />
      <Skeleton className="h-48 rounded-xl bg-muted" />
    </div>
  );
}
