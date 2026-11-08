import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/admin_queue.dart';
import '../data/back_office_repository.dart';
import 'admin_app_store_card.dart';
import 'admin_cuts_card.dart';
import 'admin_widgets.dart';

/// The "Manage" tab: every back-office area one tap away, grouped by job.
class ManageHubScreen extends ConsumerWidget {
  const ManageHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final queue = ref.watch(adminQueueProvider);
    String? count(int n) => n > 0 ? f.n(n) : null;

    return Scaffold(
      appBar: AppBar(title: Text(l.adminManageTitle)),
      body: ListView(
        key: const Key('manage-hub'),
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 32),
        children: [
          CardGroup(title: l.adminHubPeopleSection, children: [
            HubRow(
              key: const Key('hub-support'),
              icon: Icons.support_agent_rounded,
              title: l.supportInbox,
              subtitle: l.adminHubSupportSub,
              count: count(queue.tickets),
              urgent: queue.tickets > 0,
              onTap: () => context.push(Routes.adminManageSupport),
            ),
            HubRow(key: const Key('hub-people'), icon: Icons.group_outlined, title: l.adminPeopleTitle, subtitle: l.adminHubPeopleSub, onTap: () => context.push(Routes.adminPeople)),
          ]),
          CardGroup(title: l.adminHubMoneySection, children: [
            HubRow(key: const Key('hub-payments'), icon: Icons.receipt_long_outlined, title: l.adminPaymentsTitle, subtitle: l.adminHubPaymentsSub, onTap: () => context.push(Routes.adminPayments)),
            HubRow(
              key: const Key('hub-payouts'),
              icon: Icons.account_balance_wallet_outlined,
              title: l.payoutRuns,
              subtitle: l.adminHubPayoutsSub,
              count: count(queue.payoutRuns),
              onTap: () => context.go(Routes.adminApprovalsTab('payouts')),
            ),
            HubRow(key: const Key('hub-subscriptions'), icon: Icons.autorenew_rounded, title: l.adminSubsTitle, subtitle: l.adminHubSubsSub, onTap: () => context.push(Routes.adminSubscriptions)),
            HubRow(key: const Key('hub-coupons'), icon: Icons.confirmation_number_outlined, title: l.adminCouponsTitle, subtitle: l.adminHubCouponsSub, onTap: () => context.push(Routes.adminCoupons)),
            HubRow(key: const Key('hub-bank-accounts'), icon: Icons.account_balance_outlined, title: l.adminBankAccountsTitle, subtitle: l.adminHubBankSub, onTap: () => context.push(Routes.adminBankAccounts)),
            HubRow(key: const Key('hub-currencies'), icon: Icons.currency_exchange_rounded, title: l.adminCurrenciesTitle, subtitle: l.adminHubCurrenciesSub, onTap: () => context.push(Routes.adminCurrencies)),
          ]),
          CardGroup(title: l.adminHubCatalogSection, children: [
            HubRow(key: const Key('hub-courses'), icon: Icons.auto_stories_outlined, title: l.adminCoursesTitle, subtitle: l.adminHubCoursesSub, onTap: () => context.push(Routes.adminCourses)),
            HubRow(key: const Key('hub-batches'), icon: Icons.view_agenda_outlined, title: l.batchesTitle, subtitle: l.adminHubBatchesSub, onTap: () => context.go(Routes.adminBatches)),
            HubRow(key: const Key('hub-categories'), icon: Icons.category_outlined, title: l.adminCategoriesTitle, subtitle: l.adminHubCategoriesSub, onTap: () => context.push(Routes.adminCategories)),
          ]),
          CardGroup(title: l.adminHubInsightSection, children: [
            HubRow(key: const Key('hub-reports'), icon: Icons.insights_rounded, title: l.adminReportsTitle, subtitle: l.adminHubReportsSub, onTap: () => context.push(Routes.adminReports)),
            HubRow(key: const Key('hub-live'), icon: Icons.sensors_rounded, title: l.navLive, subtitle: l.adminHubLiveSub, onTap: () => context.push(Routes.adminManageLive)),
            HubRow(key: const Key('hub-settings'), icon: Icons.tune_rounded, title: l.adminSettingsTitle, subtitle: l.adminHubSettingsSub, onTap: () => context.push(Routes.adminSettings)),
          ]),
          const SizedBox(height: 16),
          Text(l.adminHubNoSettings, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AzzaPalette.of(context).muted)),
        ],
      ),
    );
  }
}

/// Platform rules and which integrations are configured (read-only: they are set in the server environment).
class PlatformSettingsScreen extends ConsumerWidget {
  const PlatformSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final settings = ref.watch(platformSettingsProvider);
    final p = AzzaPalette.of(context);
    String rule(String key, num v) => switch (key) {
          'TEACHER_SHARE_PERCENT' || 'VAT_PERCENT' => f.percent(v),
          'MIN_PAYOUT_AED' => f.aed((v * 100).round()),
          'EARNING_HOLD_DAYS' => f.n(l.adminDaysValue(v.round())),
          'BANK_TRANSFER_HOLD_HOURS' => f.n(l.adminHoursValue(v.round())),
          _ => f.number(v),
        };
    String ruleLabel(String key) => switch (key) {
          'TEACHER_SHARE_PERCENT' => l.adminRuleTeacherShare,
          'EARNING_HOLD_DAYS' => l.adminRuleEarningHold,
          'MIN_PAYOUT_AED' => l.adminRuleMinPayout,
          'BANK_TRANSFER_HOLD_HOURS' => l.adminRuleTransferHold,
          'VAT_PERCENT' => l.adminRuleVat,
          _ => key,
        };
    return Scaffold(
      appBar: AppBar(title: Text(l.adminSettingsTitle)),
      body: AsyncView<PlatformSettings>(
        value: settings,
        onRetry: () => ref.invalidate(platformSettingsProvider),
        data: (s) => RefreshList(
          onRefresh: () async => ref.invalidate(platformSettingsProvider),
          children: [
            Text(l.adminSettingsBody, style: Theme.of(context).textTheme.bodyMedium),
            const TeacherCutsCard(),
            const AdminAppStoreCard(),
            SectionCard(
              title: l.adminRules,
              child: Column(children: [for (final e in s.rules.entries) KeyValueRow(ruleLabel(e.key), rule(e.key, e.value))]),
            ),
            SectionCard(
              title: l.adminIntegrations,
              child: Column(children: [
                for (final e in s.integrations.entries)
                  KeyValueRow(e.key, e.value ? l.adminConfigured : l.adminNotConfigured, valueColor: e.value ? p.success : p.warning),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}
