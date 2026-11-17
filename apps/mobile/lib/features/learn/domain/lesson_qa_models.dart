import 'package:flutter/foundation.dart';

import '../../../core/utils/json.dart';

/// Who wrote a question or answer (no email: these threads are shared with everyone on the course).
@immutable
class QaAuthor {
  const QaAuthor({required this.id, required this.name, this.image});
  factory QaAuthor.fromJson(Json j) => QaAuthor(id: str(j, 'id'), name: str(j, 'name'), image: strOrNull(j, 'image'));
  final String id;
  final String name;
  final String? image;
}

/// An answer by the course author or an admin (`instructor`), possibly marked as the one that helped.
@immutable
class LessonAnswer {
  const LessonAnswer({
    required this.id,
    required this.questionId,
    required this.body,
    required this.createdAt,
    required this.author,
    this.hidden = false,
    this.accepted = false,
    this.instructor = false,
  });

  factory LessonAnswer.fromJson(Json j) => LessonAnswer(
        id: str(j, 'id'),
        questionId: str(j, 'questionId'),
        body: str(j, 'body'),
        createdAt: dateOr(j, 'createdAt', DateTime.fromMillisecondsSinceEpoch(0)),
        author: QaAuthor.fromJson(obj(j, 'author')),
        hidden: boolean(j, 'hidden'),
        accepted: boolean(j, 'accepted'),
        instructor: boolean(j, 'instructor'),
      );

  final String id;
  final String questionId;
  final String body;
  final DateTime createdAt;
  final QaAuthor author;
  final bool hidden;
  final bool accepted;
  final bool instructor;
}

/// A learner's question under a lesson, with its answers oldest first.
@immutable
class LessonQuestion {
  const LessonQuestion({
    required this.id,
    required this.body,
    required this.createdAt,
    required this.author,
    this.hidden = false,
    this.mine = false,
    this.canDelete = false,
    this.answers = const [],
  });

  factory LessonQuestion.fromJson(Json j) => LessonQuestion(
        id: str(j, 'id'),
        body: str(j, 'body'),
        createdAt: dateOr(j, 'createdAt', DateTime.fromMillisecondsSinceEpoch(0)),
        author: QaAuthor.fromJson(obj(j, 'author')),
        hidden: boolean(j, 'hidden'),
        mine: boolean(j, 'mine'),
        canDelete: boolean(j, 'canDelete'),
        answers: list(j, 'answers').map(LessonAnswer.fromJson).toList(),
      );

  final String id;
  final String body;
  final DateTime createdAt;
  final QaAuthor author;
  final bool hidden;
  final bool mine;
  final bool canDelete;
  final List<LessonAnswer> answers;
}

/// `GET /lessons/:id/questions` — newest first, with what the reader may do.
@immutable
class LessonQuestions {
  const LessonQuestions({this.items = const [], this.total = 0, this.canAsk = false, this.canAnswer = false, this.questionsLeftToday = 0});

  factory LessonQuestions.fromJson(Json j) => LessonQuestions(
        items: list(j, 'items').map(LessonQuestion.fromJson).toList(),
        total: integer(j, 'total'),
        canAsk: boolean(j, 'canAsk'),
        canAnswer: boolean(j, 'canAnswer'),
        questionsLeftToday: integer(j, 'questionsLeftToday'),
      );

  final List<LessonQuestion> items;
  final int total;
  final bool canAsk;

  /// The course author or an admin (they answer and moderate on the web).
  final bool canAnswer;
  final int questionsLeftToday;
}

/// Longest question the API accepts (`LESSON_QUESTION_MAX` in @azza/shared).
const lessonQuestionMax = 2000;
