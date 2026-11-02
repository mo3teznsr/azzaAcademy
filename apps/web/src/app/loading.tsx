export default function Loading() {
  return (
    <div className="grid min-h-[50dvh] place-items-center" role="status" aria-label="Loading">
      <span className="size-3 animate-pulse rounded-full bg-sun" />
    </div>
  );
}
