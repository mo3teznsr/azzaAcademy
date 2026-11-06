import 'package:azza/core/utils/share.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/me/domain/me_models.dart';
import 'package:azza/features/teacher/presentation/teacher_recordings_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

class _Recordings extends FakeLearnRepository {
  @override
  Future<List<Recording>> recordings() async => [
        Recording(sessionId: 's1', title: 'Seeing like a designer', number: 1, batchId: 'b7', batchCode: 'B07', url: 'https://cdn/s1.mp4', courseTitle: 'Product Design', recordedAt: DateTime(2026, 11, 3), durationSec: 5400),
        Recording(sessionId: 's2', title: 'Research & interviews', number: 2, batchId: 'b7', batchCode: 'B07', courseTitle: 'Product Design'),
        Recording(sessionId: 's9', title: 'Greetings', number: 1, batchId: 'b2', batchCode: 'B02', url: 'https://cdn/s9.mp4', courseTitle: 'Spoken Arabic'),
      ];
}

void main() {
  testWidgets('teacher recordings: grouped by batch, processing rows wait, ready rows share the file', (tester) async {
    final shared = <Uri>[];
    await pumpScreen(tester, const TeacherRecordingsScreen(), overrides: [
      learnRepositoryProvider.overrideWithValue(_Recordings()),
      shareLinkProvider.overrideWithValue((uri, {subject}) async => shared.add(uri)),
    ]);
    await settle(tester);

    expect(find.text('Your recordings'), findsOneWidget);
    expect(find.text('Product Design · B07'), findsOneWidget);
    expect(find.text('Spoken Arabic · B02'), findsOneWidget);
    expect(find.byKey(const Key('share-recording-s2')), findsNothing); // still processing
    expect(find.byIcon(Icons.hourglass_top_rounded), findsOneWidget);

    await tester.tap(find.byKey(const Key('share-recording-s1')));
    await settle(tester);
    expect(shared, [Uri.parse('https://cdn/s1.mp4')]);
  });

  testWidgets('empty state explains that recording is automatic', (tester) async {
    await pumpScreen(tester, const TeacherRecordingsScreen(), overrides: [learnRepositoryProvider.overrideWithValue(FakeLearnRepository())]);
    await settle(tester);
    expect(find.text('No recordings yet'), findsOneWidget);
    expect(find.textContaining('recorded automatically'), findsOneWidget);
  });

  test('recording alerts open the right list for the reader', () {
    expect(notificationRoute('RECORDING_READY_TEACHER', {'sessionId': 's1'}), '/teacher/batches/recordings');
    expect(notificationRoute('RECORDING_NOT_STARTED', {'sessionId': 's1'}), '/teacher/batches/recordings');
    expect(notificationRoute('RECORDING_READY', {'sessionId': 's1'}), '/student/library');
    expect(notificationRoute('SESSION_LIVE', {'sessionId': 's1'}), '/sessions/s1/lobby');
  });
}
