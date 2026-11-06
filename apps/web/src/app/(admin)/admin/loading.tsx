import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading">
      <Skeleton className="h-20 rounded-xl bg-muted" />
      <Skeleton className="h-64 rounded-xl bg-muted" />
    </div>
  );
}
