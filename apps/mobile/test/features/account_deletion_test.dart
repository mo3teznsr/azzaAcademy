import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/auth/presentation/auth_controller.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/me/presentation/edit_profile_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

void main() {
  testWidgets('delete account needs the typed confirmation, then deletes and signs out', (tester) async {
    final me = FakeMeRepository();
    await pumpScreen(tester, const EditProfileScreen(), overrides: [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(student)),
      meRepositoryProvider.overrideWithValue(me),
    ]);
    await settle(tester, 12);

    final deleteRow = find.byKey(const Key('delete-account'));
    await tester.scrollUntilVisible(deleteRow, 200, scrollable: find.byType(Scrollable).first);
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -300));
    await settle(tester);
    expect(find.byKey(const Key('danger-zone')), findsOneWidget);
    await tester.tap(deleteRow);
    await settle(tester);

    final confirm = find.byKey(const Key('delete-confirm'));
    expect(tester.widget<TextButton>(confirm).onPressed, isNull);
    await tester.enterText(find.byKey(const Key('delete-confirm-field')), 'DELETE');
    await settle(tester);
    expect(tester.widget<TextButton>(confirm).onPressed, isNotNull);

    await tester.tap(confirm);
    await settle(tester);
    expect(me.deleteCalls, 1);
    final container = ProviderScope.containerOf(tester.element(find.byType(EditProfileScreen)));
    expect(container.read(authControllerProvider).value, isNull);
  });

  testWidgets('teachers are told to contact support instead of deleting', (tester) async {
    final me = FakeMeRepository();
    await pumpScreen(tester, const EditProfileScreen(), overrides: [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
      meRepositoryProvider.overrideWithValue(me),
    ]);
    await settle(tester, 12);
    final deleteRow = find.byKey(const Key('delete-account'));
    await tester.scrollUntilVisible(deleteRow, 200, scrollable: find.byType(Scrollable).first);
    await tester.tap(deleteRow);
    await settle(tester);
    expect(find.byKey(const Key('delete-confirm')), findsNothing);
    expect(me.deleteCalls, 0);
  });
}
