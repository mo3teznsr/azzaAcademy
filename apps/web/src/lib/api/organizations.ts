import type { OrganizationInput, OrganizationMemberInput, OrganizationRole, SeatAssignInput } from '@azza/shared';
import { API_URL, http } from './client';
import type { TaxDocumentSummary } from './tax-documents';

export interface Organization {
  id: string;
  name: string;
  legalName: string;
  trn: string | null;
  address: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  billingEmail: string;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  role: OrganizationRole;
  user: { id: string; name: string; email: string };
}

export interface SeatPack {
  id: string;
  reference: string;
  kind: 'LIVE' | 'RECORDED';
  batchId: string | null;
  courseId: string | null;
  title: string;
  seats: number;
  used: number;
  unused: number;
  unitPriceFils: number;
  subtotalFils: number;
  discountFils: number;
  vatFils: number;
  totalFils: number;
  refundedFils: number;
  status: 'INVOICED' | 'PAID' | 'CANCELLED';
  paymentReference: string | null;
  paidAt: string | null;
  invoicedAt: string;
  accessEndsAt: string | null;
  note: string | null;
}

export interface SeatAssignment {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  status: 'ACTIVE' | 'REVOKED';
  assignedAt: string;
  revokedAt: string | null;
}

export interface SeatPackDetail extends SeatPack {
  assignments: SeatAssignment[];
  history: { id: string; action: string; actorName: string | null; createdAt: string; data: Record<string, unknown> }[];
}

export interface OrgReportRow {
  learnerId: string;
  name: string;
  email: string;
  kind: 'LIVE' | 'RECORDED';
  packReference: string;
  title: string;
  code: string | null;
  done: number;
  total: number;
  progressRate: number;
  attendanceRate: number | null;
  finished: boolean;
  completed: boolean;
  certificateCode: string | null;
}

export interface OrgReport {
  organization: Organization;
  summary: { learners: number; attendanceRate: number; completionRate: number; certificates: number };
  packs: SeatPack[];
  rows: OrgReportRow[];
}

export interface OrganizationDetail {
  organization: Organization;
  members: OrganizationMember[];
  packs: SeatPack[];
}

export interface NewSeatPack {
  batchId?: string;
  courseId?: string;
  seats: number;
  unitPriceFils: number;
  discountFils: number;
  paid: boolean;
  paymentReference?: string;
  accessEndsAt?: string;
  note?: string;
}

const e = encodeURIComponent;

/** Platform admins: organizations, seat packs and seats. */
export const organizationsAdminApi = {
  list: (q?: string) =>
    http.get<{ items: (Organization & { members: number; packs: number })[]; total: number }>('/api/v1/admin/organizations', { q, pageSize: 100 }),
  get: (id: string) => http.get<OrganizationDetail>(`/api/v1/admin/organizations/${e(id)}`),
  create: (input: OrganizationInput) => http.post<Organization>('/api/v1/admin/organizations', input),
  update: (id: string, input: OrganizationInput) => http.patch<Organization>(`/api/v1/admin/organizations/${e(id)}`, input),
  addMember: (id: string, input: OrganizationMemberInput) => http.post<OrganizationMember>(`/api/v1/admin/organizations/${e(id)}/members`, input),
  removeMember: (id: string, userId: string) => http.del(`/api/v1/admin/organizations/${e(id)}/members/${e(userId)}`),
  createPack: (id: string, input: NewSeatPack) => http.post<SeatPack>(`/api/v1/admin/organizations/${e(id)}/seat-packs`, input),
  pack: (packId: string) => http.get<SeatPackDetail>(`/api/v1/admin/seat-packs/${e(packId)}`),
  markPaid: (packId: string, paymentReference: string) => http.post<SeatPack>(`/api/v1/admin/seat-packs/${e(packId)}/mark-paid`, { paymentReference }),
  cancelPack: (packId: string) => http.post<SeatPack>(`/api/v1/admin/seat-packs/${e(packId)}/cancel`),
  assign: (packId: string, input: SeatAssignInput) => http.post<SeatAssignment>(`/api/v1/admin/seat-packs/${e(packId)}/assignments`, input),
  revoke: (assignmentId: string) => http.post<SeatAssignment>(`/api/v1/admin/seat-assignments/${e(assignmentId)}/revoke`),
  report: (id: string) => http.get<OrgReport>(`/api/v1/admin/organizations/${e(id)}/report`),
  reportCsvUrl: (id: string) => `${API_URL}/api/v1/admin/organizations/${e(id)}/report?format=csv`,
};

/** An organization's managers: their packs, seats and report. */
export const organizationApi = {
  mine: () => http.get<{ items: Organization[] }>('/api/v1/org/mine').then((r) => r.items),
  get: (orgId: string) => http.get<OrganizationDetail>(`/api/v1/org/${e(orgId)}`),
  pack: (orgId: string, packId: string) => http.get<SeatPackDetail>(`/api/v1/org/${e(orgId)}/seat-packs/${e(packId)}`),
  assign: (orgId: string, packId: string, input: SeatAssignInput) => http.post<SeatAssignment>(`/api/v1/org/${e(orgId)}/seat-packs/${e(packId)}/assignments`, input),
  revoke: (orgId: string, assignmentId: string) => http.post<SeatAssignment>(`/api/v1/org/${e(orgId)}/seat-assignments/${e(assignmentId)}/revoke`),
  report: (orgId: string) => http.get<OrgReport>(`/api/v1/org/${e(orgId)}/report`),
  reportCsvUrl: (orgId: string) => `${API_URL}/api/v1/org/${e(orgId)}/report?format=csv`,
  taxDocuments: (orgId: string) => http.get<{ items: TaxDocumentSummary[] }>(`/api/v1/org/${e(orgId)}/tax-documents`).then((r) => r.items),
};
