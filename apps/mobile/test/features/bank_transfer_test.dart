import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/theme/app_theme.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/checkout/presentation/bank_transfer_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

void main() {
  Order order({OrderStatus status = OrderStatus.awaitingReceipt, DateTime? expiresAt, String? rejection}) => Order(
        id: 'o1',
        reference: 'AZ-B07-48213',
        status: status,
        method: PaymentMethod.bankTransfer,
        totalFils: 88000,
        expiresAt: expiresAt ?? DateTime.now().add(const Duration(hours: 47, minutes: 58)),
        rejectionReason: rejection,
      );

  const banks = [
    BankAccount(id: 'enbd', bankName: 'Emirates NBD', accountName: 'Azza Learning FZ-LLC', iban: 'AE070331234567890123456', swift: 'EBILAEAD'),
    BankAccount(id: 'adcb', bankName: 'ADCB', accountName: 'Azza Learning FZ-LLC', iban: 'AE•• •••• •••• 9911', swift: 'ADCBAEAA'),
  ];

  Future<FakeCheckoutRepository> pump(WidgetTester tester, {required Order current, PickedFile? file}) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final repo = FakeCheckoutRepository(current: current, banks: banks);
    final router = GoRouter(initialLocation: '/orders/o1/bank-transfer', routes: [
      GoRoute(path: '/orders/:id', builder: (_, s) => Scaffold(body: Text('status:${s.pathParameters['id']}')), routes: [
        GoRoute(path: 'bank-transfer', builder: (_, s) => BankTransferScreen(orderId: s.pathParameters['id']!)),
      ]),
      GoRoute(path: '/checkout/:id', builder: (_, _) => const Scaffold(body: Text('checkout'))),
    ]);
    await tester.pumpWidget(ProviderScope(
      retry: (_, _) => null,
      overrides: [
        sharedPreferencesProvider.overrideWithValue(await testPrefs()),
        checkoutRepositoryProvider.overrideWithValue(repo),
        receiptPickerProvider.overrideWithValue(FakeReceiptPicker(file)),
      ],
      child: MaterialApp.router(
        routerConfig: router,
        theme: AzzaTheme.build(ThemeVariant.studentInk),
        locale: const Locale('en'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: localizationDelegates,
      ),
    ));
    await settle(tester);
    return repo;
  }

  testWidgets('shows exact AED amount, reference, 48h hold and receiving banks', (tester) async {
    await pump(tester, current: order());

    expect(find.text('Bank transfer'), findsOneWidget);
    expect(find.text('AED 880.00'), findsOneWidget);
    expect(find.byKey(const Key('transfer-reference')), findsOneWidget);
    expect(find.text('AZ-B07-48213'), findsOneWidget);
    expect(find.textContaining('SEAT HELD 47:5'), findsOneWidget);
    expect(find.text('Emirates NBD'), findsOneWidget);
    expect(find.text('ADCB'), findsOneWidget);
    expect(find.textContaining('AE•• •••• •••• 3456'), findsOneWidget);
    // Full IBAN is copyable only for an unmasked account.
    expect(find.text('Copy full IBAN of Emirates NBD'), findsOneWidget);

    final sent = tester.widget<FilledButton>(find.byKey(const Key('sent-transfer')));
    expect(sent.onPressed, isNull, reason: 'cannot submit before a receipt is chosen');
  });

  testWidgets('choosing a receipt then "I\'ve sent the transfer" uploads it and opens the status', (tester) async {
    const file = PickedFile(name: 'receipt-enbd.pdf', size: 240000, path: '/tmp/receipt-enbd.pdf');
    final repo = await pump(tester, current: order(), file: file);

    await tester.scrollUntilVisible(find.byKey(const Key('choose-receipt')), 200);
    await tester.tap(find.byKey(const Key('choose-receipt')));
    await settle(tester);
    expect(find.text('receipt-enbd.pdf'), findsOneWidget);

    await tester.tap(find.byKey(const Key('sent-transfer')));
    await settle(tester);

    expect(repo.submitted.single.$1, 'o1');
    expect(repo.submitted.single.$2.name, 'receipt-enbd.pdf');
    expect(find.text('status:o1'), findsOneWidget);
  });

  testWidgets('rejects receipts larger than 10 MB', (tester) async {
    const big = PickedFile(name: 'scan.png', size: 11 * 1024 * 1024, path: '/tmp/scan.png');
    final repo = await pump(tester, current: order(), file: big);

    await tester.scrollUntilVisible(find.byKey(const Key('choose-receipt')), 200);
    await tester.tap(find.byKey(const Key('choose-receipt')));
    await settle(tester);

    expect(find.text('File is larger than 10 MB.'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.byKey(const Key('sent-transfer'))).onPressed, isNull);
    expect(repo.submitted, isEmpty);
  });

  testWidgets('expired hold shows the released-seat state', (tester) async {
    await pump(tester, current: order(status: OrderStatus.expired, expiresAt: DateTime.now().subtract(const Duration(minutes: 1))));
    expect(find.text('The 48 h hold expired and the seat was released.'), findsOneWidget);
  });

  testWidgets('rejected transfer shows the finance reason for re-upload', (tester) async {
    await pump(tester, current: order(status: OrderStatus.amountMismatch, rejection: 'Received AED 850.00 (AED 30 short).'));
    await tester.scrollUntilVisible(find.text('Received AED 850.00 (AED 30 short).'), 200);
    expect(find.text('Received AED 850.00 (AED 30 short).'), findsOneWidget);
  });
}
