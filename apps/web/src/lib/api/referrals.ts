import type { AdminReferralRow, MyReferrals, ReferralProgramInput, ReferralProgramSettings, ReferralStatus } from '@azza/shared';
import { http } from './client';

export type { AdminReferralRow, MyReferrals, ReferralProgramSettings, ReferralStatus };

export interface AdminReferralPage {
  items: AdminReferralRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: Record<ReferralStatus, number>;
}

export const referralsApi = {
  mine: () => http.get<MyReferrals>('/api/v1/referrals/me'),
  adminList: (params: { page: number; status?: ReferralStatus }) => http.get<AdminReferralPage>('/api/v1/admin/referrals', { page: params.page, pageSize: 20, status: params.status }),
  program: () => http.get<ReferralProgramSettings>('/api/v1/admin/referral-program'),
  saveProgram: (input: ReferralProgramInput) => http.put<ReferralProgramSettings>('/api/v1/admin/referral-program', input),
};
