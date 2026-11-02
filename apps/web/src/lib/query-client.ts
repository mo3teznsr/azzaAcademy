import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => {
          if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) return count < 1;
          return false;
        },
      },
    },
  });
}
