import type { TeacherBankDetailsInput } from '@azza/shared';
import { http, items } from './client';
import type { CourseSubscribers, EarningsSummary, Items, TeacherBankDetails, TeacherPayout } from './types';

export const teacherApi = {
  earnings: () => http.get<EarningsSummary>('/api/v1/teacher/earnings'),
  courseSubscribers: (courseId: string) => http.get<CourseSubscribers>(`/api/v1/teacher/courses/${courseId}/subscribers`),
  payouts: () => items(http.get<Items<TeacherPayout>>('/api/v1/teacher/payouts')),
  bankDetails: () => http.get<{ bankDetails: TeacherBankDetails | null }>('/api/v1/teacher/bank-details').then((r) => r.bankDetails),
  saveBankDetails: (input: TeacherBankDetailsInput) => http.put<TeacherBankDetails>('/api/v1/teacher/bank-details', input),
};
