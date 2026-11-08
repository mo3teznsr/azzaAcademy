import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../instructors/data/instructors_repository.dart';
import '../../support/data/support_repository.dart';
import '../../teacher/data/proposals_repository.dart';
import 'admin_repository.dart';

/// What is waiting on an admin, counted from the queues the Approvals tabs show.
@immutable
class AdminQueue {
  const AdminQueue({
    this.proposals = 0,
    this.applications = 0,
    this.transfers = 0,
    this.payoutRuns = 0,
    this.reschedules = 0,
    this.tickets = 0,
    this.otherAlerts = 0,
  });

  /// Course and batch proposals waiting for review.
  final int proposals;

  /// Instructor applications waiting for a decision.
  final int applications;

  /// Bank transfers with a receipt to check.
  final int transfers;

  /// Payout runs still to approve (DRAFT) or to mark paid (APPROVED).
  final int payoutRuns;

  /// Teachers' reschedule requests.
  final int reschedules;

  /// Open support tickets.
  final int tickets;

  /// Dashboard alerts handled on the "Needs you" tab (held payouts, unverified banks, expiring holds).
  final int otherAlerts;

  /// "Needs you" tab: reschedule requests plus the other alerts.
  int get needsYouTab => reschedules + otherAlerts;

  /// "To review" tab.
  int get reviewTab => proposals + applications;

  /// The Approvals badge in the bottom bar: every decision that lives on that tab.
  int get approvalsTotal => reschedules + reviewTab + transfers + payoutRuns;
}

/// Combines the existing queue providers; missing or failed ones count as zero.
final adminQueueProvider = Provider.autoDispose<AdminQueue>((ref) {
  final dash = ref.watch(adminDashboardProvider).value;
  final transferList = ref.watch(transfersProvider).value;
  final transferAlert = dash?.alerts.where((a) => a.isTransfer).fold<int>(0, (s, a) => s + a.count);
  return AdminQueue(
    proposals: (ref.watch(pendingCoursesProvider).value?.length ?? 0) + (ref.watch(pendingBatchesProvider).value?.length ?? 0),
    applications: ref.watch(pendingApplicationsProvider).value?.length ?? 0,
    transfers: transferAlert ?? transferList?.length ?? 0,
    payoutRuns: ref.watch(payoutRunsProvider).value?.where((r) => r.status == PayoutRunStatus.draft || r.status == PayoutRunStatus.approved).length ?? 0,
    reschedules: ref.watch(rescheduleRequestsProvider).value?.length ?? 0,
    tickets: ref.watch(openTicketsCountProvider).value ?? 0,
    otherAlerts: dash?.alerts.where((a) => !a.isTransfer).length ?? 0,
  );
});
