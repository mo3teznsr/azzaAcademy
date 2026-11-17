/**
 * Pure: may this admin approve the payout run? With more than one admin on the platform, the approver must be someone
 * who neither created the run nor adjusted it (two people touch every payout). A platform with a single admin can still
 * pay its teachers; the audit log shows the run was approved without a second person.
 */
export function approvalBlocked(activeAdmins: number, involvedAdminIds: Iterable<string>, approverId: string): boolean {
  if (activeAdmins <= 1) return false;
  for (const id of involvedAdminIds) if (id === approverId) return true;
  return false;
}
