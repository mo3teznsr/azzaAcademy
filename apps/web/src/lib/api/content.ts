import { http } from './client';
import type { Submission } from './types';

export const contentApi = {
  grade: (submissionId: string, input: { score: number; feedback?: string }) =>
    http.post<Submission>(`/api/v1/submissions/${submissionId}/grade`, input),
};
