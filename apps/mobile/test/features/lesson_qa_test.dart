import 'package:azza/features/learn/data/lesson_qa_repository.dart';
import 'package:azza/features/learn/domain/lesson_qa_models.dart';
import 'package:azza/features/learn/domain/lesson_models.dart';
import 'package:azza/features/learn/presentation/lesson_qa_section.dart';
import 'package:azza/features/me/domain/me_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/harness.dart';

class _FakeQa implements LessonQaRepository {
  _FakeQa(this.page);
  LessonQuestions page;
  final asked = <String>[];
  final deleted = <String>[];
  final accepted = <String, bool>{};

  @override
  Future<LessonQuestions> questions(String lessonId, {int pageSize = 50}) async => page;
  @override
  Future<void> ask(String lessonId, String body) async => asked.add(body);
  @override
  Future<void> deleteQuestion(String questionId) async => deleted.add(questionId);
  @override
  Future<void> setAccepted(String answerId, bool value) async => accepted[answerId] = value;
}

final _at = DateTime.utc(2026, 11, 20, 10);
const _lina = QaAuthor(id: 'lina', name: 'Lina Haddad');
const _sam = QaAuthor(id: 'sam', name: 'Sam');

LessonQuestions _thread({bool canAsk = true, int left = 7}) => LessonQuestions(
      canAsk: canAsk,
      questionsLeftToday: left,
      total: 2,
      items: [
        LessonQuestion(id: 'q2', body: 'Which export size?', createdAt: _at, author: _sam, mine: true, canDelete: true),
        LessonQuestion(
          id: 'q1',
          body: 'Which font is this?',
          createdAt: _at,
          author: _sam,
          mine: true,
          answers: [LessonAnswer(id: 'a1', questionId: 'q1', body: 'It is Cairo.', createdAt: _at, author: _lina, instructor: true)],
        ),
      ],
    );

Future<void> _pump(WidgetTester tester, _FakeQa repo) => pumpScreen(
      tester,
      Scaffold(body: ListView(children: const [LessonQaSection(lessonId: 'l1')])),
      overrides: [lessonQaRepositoryProvider.overrideWithValue(repo)],
    );

void main() {
  testWidgets('shows the thread with the Instructor badge and lets a learner ask', (tester) async {
    final repo = _FakeQa(_thread());
    await _pump(tester, repo);
    await settle(tester);

    expect(find.text('Questions'), findsOneWidget);
    expect(find.text('Which font is this?'), findsOneWidget);
    expect(find.text('It is Cairo.'), findsOneWidget);
    expect(find.text('INSTRUCTOR'), findsOneWidget); // chips are set in caps
    expect(find.text('Waiting for the teacher’s answer'), findsOneWidget);
    expect(find.text('7 questions left today'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('qa-ask-field')), 'How do I add a stroke?');
    await tester.pump();
    await tester.tap(find.byKey(const Key('qa-ask')));
    await settle(tester);
    expect(repo.asked, ['How do I add a stroke?']);
  });

  testWidgets('the asker marks an answer as helpful and deletes an unanswered question', (tester) async {
    final repo = _FakeQa(_thread());
    await _pump(tester, repo);
    await settle(tester);

    await tester.tap(find.byKey(const Key('qa-accept-a1')));
    await settle(tester);
    expect(repo.accepted, {'a1': true});

    expect(find.byKey(const Key('qa-delete-q1')), findsNothing); // answered
    await tester.tap(find.byKey(const Key('qa-delete-q2')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('confirm-ok')));
    await settle(tester);
    expect(repo.deleted, ['q2']);
  });

  testWidgets('at the daily limit the field is off; staff see a pointer to the web studio', (tester) async {
    await _pump(tester, _FakeQa(_thread(left: 0)));
    await settle(tester);
    expect(find.text('You’ve reached today’s limit. You can ask again tomorrow.'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.byKey(const Key('qa-ask'))).onPressed, isNull);
  });

  testWidgets('course authors read the thread but do not get the ask form', (tester) async {
    await _pump(tester, _FakeQa(const LessonQuestions(canAnswer: true)));
    await settle(tester);
    expect(find.byKey(const Key('qa-ask-field')), findsNothing);
    expect(find.text('Answer and moderate questions from the studio on the web.'), findsOneWidget);
    expect(find.text('No questions on this lesson yet.'), findsOneWidget);
  });

  test('a recorded course is flagged from the lessons payload', () {
    final c = CourseLessons.fromJson({'course': {'id': 'rc', 'slug': 's', 'titleEn': 'T', 'type': 'RECORDED'}, 'modules': []});
    expect(c.isRecorded, isTrue);
    expect(CourseLessons.fromJson({'course': {'id': 'c', 'slug': 's', 'titleEn': 'T', 'type': 'LIVE'}, 'modules': []}).isRecorded, isFalse);
  });

  test('an answer notification opens its lesson', () {
    expect(notificationRoute('LESSON_ANSWER', {'courseId': 'rc', 'lessonId': 'l1'}), '/courses/rc/lessons/l1');
  });
}
