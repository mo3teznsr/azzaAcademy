import type { AdminCreateUserInput, BankAccountInput, CouponInput, ReviewTransferInput, Role, UpdateCouponInput } from '@azza/shared';
import { API_URL, http, items, request } from './client';
import { uploadCourseMediaAsAdmin, type CourseMediaKind } from './courses';
import type {
  AdminDashboard,
  AdminReport,
  AdminUser,
  BankAccount,
  Coupon,
  CouponUsage,
  FxRates,
  Items,
  LiveRooms,
  Order,
  Paged,
  PayoutRun,
  PayoutRunDetail,
  PlatformSettings,
} from './types';

export type { CourseMediaKind };

export const adminApi = {
  /** Course cover photo (JPG/PNG/WEBP ≤ 8 MB) or intro video (MP4/MOV/WEBM ≤ 200 MB) → the stored file URL. */
  uploadCourseMedia: uploadCourseMediaAsAdmin,
  dashboard: () => http.get<AdminDashboard>('/api/v1/admin/dashboard'),
  /** Inclusive `YYYY-MM-DD` days in Asia/Dubai; defaults to the last 30 days. */
  reports: (p: { from?: string; to?: string } = {}) => http.get<AdminReport>('/api/v1/admin/reports', { ...p }),
  settings: () => http.get<PlatformSettings>('/api/v1/admin/settings'),
  liveRooms: () => http.get<LiveRooms>('/api/v1/admin/live-rooms'),

  users: (p: { role?: Role; q?: string; page?: number; pageSize?: number } = {}) => http.get<Paged<AdminUser>>('/api/v1/admin/users', { ...p }),
  createUser: (input: AdminCreateUserInput) => http.post<AdminUser>('/api/v1/admin/users', input),
  updateUser: (id: string, input: { name?: string; role?: Role; banned?: boolean }) => http.patch<AdminUser>(`/api/v1/admin/users/${id}`, input),

  /** Bank-transfer review queue (default VERIFYING + AMOUNT_MISMATCH). */
  transfers: (p: { status?: string; q?: string; page?: number; pageSize?: number } = {}) =>
    http.get<Paged<Order>>('/api/v1/admin/transfers', { ...p }),
  orders: (p: { status?: string; method?: string; q?: string; page?: number; pageSize?: number } = {}) =>
    http.get<Paged<Order>>('/api/v1/admin/orders', { ...p }),
  reviewTransfer: (id: string, input: ReviewTransferInput) => http.post<Order>(`/api/v1/admin/orders/${id}/review`, input),
  refund: (id: string, input: { amountAed: number; reason: string }) =>
    http.post<{ order: Order; refundFils: number; manual: boolean }>(`/api/v1/admin/orders/${id}/refund`, input),

  bankAccounts: () => items(http.get<Items<BankAccount>>('/api/v1/admin/bank-accounts')),
  createBankAccount: (input: BankAccountInput) => http.post<BankAccount>('/api/v1/admin/bank-accounts', input),
  updateBankAccount: (id: string, input: Partial<BankAccountInput>) => http.patch<BankAccount>(`/api/v1/admin/bank-accounts/${id}`, input),

  setFxRate: (input: { currency: 'SAR' | 'QAR' | 'USD'; ratePerAed: number }) => http.put<FxRates>('/api/v1/admin/fx-rates', input),

  coupons: () => items(http.get<Items<Coupon>>('/api/v1/admin/coupons')),
  createCoupon: (input: CouponInput) => http.post<Coupon>('/api/v1/admin/coupons', input),
  updateCoupon: (id: string, input: UpdateCouponInput) => http.patch<Coupon>(`/api/v1/admin/coupons/${id}`, input),
  couponUsage: (id: string) => http.get<CouponUsage>(`/api/v1/admin/coupons/${id}/usage`),

  payoutRuns: (p: { page?: number; pageSize?: number } = {}) => http.get<Paged<PayoutRun>>('/api/v1/admin/payout-runs', { ...p }),
  payoutRun: (id: string) => http.get<PayoutRunDetail>(`/api/v1/admin/payout-runs/${id}`),
  createPayoutRun: (input: { periodStart: string; periodEnd: string }) => http.post<PayoutRunDetail>('/api/v1/admin/payout-runs', input),
  approveRun: (id: string) => http.post<PayoutRunDetail>(`/api/v1/admin/payout-runs/${id}/approve`),
  markRunPaid: (id: string, input: { transferReference: string }) => http.post<PayoutRunDetail>(`/api/v1/admin/payout-runs/${id}/mark-paid`, input),
  exportRunUrl: (id: string) => `${API_URL}/api/v1/admin/payout-runs/${id}/export`,
  exportRun: (id: string) => request<Response>(`/api/v1/admin/payout-runs/${id}/export`, { method: 'POST', raw: true, body: {} }),
  addAdjustment: (input: { payoutId: string; amountAed: number; reason: string }) => http.post<PayoutRunDetail>('/api/v1/admin/payouts/adjustments', input),
  verifyTeacherBank: (teacherId: string) => http.post<unknown>(`/api/v1/admin/teachers/${teacherId}/bank-details/verify`),
};
