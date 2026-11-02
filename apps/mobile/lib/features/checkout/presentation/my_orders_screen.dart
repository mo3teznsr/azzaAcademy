import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/checkout_repository.dart';
import '../domain/checkout_models.dart';

class MyOrdersScreen extends ConsumerWidget {
  const MyOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final orders = ref.watch(myOrdersProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.myOrders)),
      body: AsyncView<List<Order>>(
        value: orders,
        onRetry: () => ref.invalidate(myOrdersProvider),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(title: l.noOrders),
        data: (list) => RefreshList(
          onRefresh: () async => ref.invalidate(myOrdersProvider),
          children: [
            for (final o in list) ...[
              RaisedCard(
                onTap: () => context.push(Routes.order(o.id)),
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      MonoLabel(o.reference),
                      Text(o.batch?.course?.title(locale) ?? o.batch?.code ?? '', style: Theme.of(context).textTheme.titleSmall),
                      Text(f.aed(o.totalFils), style: Theme.of(context).textTheme.bodySmall),
                    ]),
                  ),
                  StatusChip.order(context, o.status),
                ]),
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }
}
