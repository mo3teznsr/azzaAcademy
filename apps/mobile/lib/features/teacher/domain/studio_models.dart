import 'package:flutter/foundation.dart';

import '../../../core/utils/json.dart';
import '../../learn/data/file_uploads.dart';
import '../../learn/domain/quiz_models.dart';

/// One student's hand-in (`GET /assignments/:id/submissions` item):
/// `{ id, assignmentId, userId, url, text, submittedAt, score, feedback, gradedAt, user{ id, name, email, image } }`.
@immutable
class Submission {
  const Submission({
    required this.id,
    required this.assignmentId,
    required this.studentName,
    required this.submittedAt,
    this.studentEmail = '',
    this.studentImage,
    this.url,
    this.text,
    this.score,
    this.feedback,
    this.gradedAt,
    this.files = const [],
  });

  factory Submission.fromJson(Json j) {
    final u = obj(j, 'user');
    return Submission(
      id: str(j, 'id'),
      assignmentId: str(j, 'assignmentId'),
      studentName: str(u, 'name'),
      studentEmail: str(u, 'email'),
      studentImage: strOrNull(u, 'image'),
      submittedAt: dateOr(j, 'submittedAt', DateTime.now()),
      url: strOrNull(j, 'url'),
      text: strOrNull(j, 'text'),
      score: intOrNull(j, 'score'),
      feedback: strOrNull(j, 'feedback'),
      gradedAt: date(j, 'gradedAt'),
      files: list(j, 'files').map(AttachedFile.fromJson).toList(),
    );
  }

  final String id;
  final String assignmentId;
  final String studentName;
  final String studentEmail;
  final String? studentImage;
  final DateTime submittedAt;
  final String? url;
  final String? text;
  final int? score;
  final String? feedback;
  final DateTime? gradedAt;

  /// Uploaded files (`{ url, name, size, type }`), at most 5.
  final List<AttachedFile> files;

  bool get graded => score != null;

  /// Handed in after the due time (the API computes the same rule on submit).
  bool lateFor(DateTime dueAt) => submittedAt.isAfter(dueAt);
}

/// `assignmentInput` without `batchId`; also the body of `PATCH /assignments/:id` via [toPatchJson].
@immutable
class AssignmentDraft {
  const AssignmentDraft({required this.title, required this.dueAt, this.description = '', this.maxScore = 100, this.sessionId});
  final String title;
  final String description;
  final DateTime dueAt;
  final int maxScore;
  final String? sessionId;

  Map<String, dynamic> toJson() => {
        'title': title,
        'description': description,
        'dueAt': dueAt.toUtc().toIso8601String(),
        'maxScore': maxScore,
        'sessionId': ?sessionId,
      };

  /// `updateAssignmentInput`: every field, with `sessionId: null` detaching the session.
  Map<String, dynamic> toPatchJson() => {...toJson(), 'sessionId': sessionId};
}

enum MaterialKind {
  slides('SLIDES'),
  file('FILE'),
  link('LINK'),
  video('VIDEO');

  const MaterialKind(this.wire);
  final String wire;

  static MaterialKind parse(Object? raw) => values.firstWhere((k) => k.wire == '$raw', orElse: () => MaterialKind.file);
}

/// `materialInput` without `batchId`: a titled URL.
@immutable
class MaterialDraft {
  const MaterialDraft({required this.title, required this.url, required this.kind, this.sessionId});
  final String title;
  final String url;
  final MaterialKind kind;
  final String? sessionId;

  Map<String, dynamic> toJson() => {'title': title, 'url': url, 'kind': kind.wire, 'sessionId': ?sessionId};
}

// ───────────────────────── Quiz authoring ─────────────────────────

extension QuestionTypeWire on QuestionType {
  String get wire => switch (this) {
        QuestionType.single => 'SINGLE',
        QuestionType.multiple => 'MULTIPLE',
        QuestionType.trueFalse => 'TRUE_FALSE',
      };
}

@immutable
class QuizOptionDraft {
  const QuizOptionDraft({this.id, this.textEn = '', this.textAr, this.correct = false});
  factory QuizOptionDraft.fromJson(Json j) =>
      QuizOptionDraft(id: strOrNull(j, 'id'), textEn: str(j, 'textEn'), textAr: strOrNull(j, 'textAr'), correct: boolean(j, 'correct'));

  final String? id;
  final String textEn;
  final String? textAr;
  final bool correct;

  QuizOptionDraft copyWith({String? textEn, bool? correct}) =>
      QuizOptionDraft(id: id, textEn: textEn ?? this.textEn, textAr: textAr, correct: correct ?? this.correct);

  Map<String, dynamic> toJson() => {
        'id': ?id,
        'textEn': textEn.trim(),
        if (textAr != null && textAr!.trim().isNotEmpty) 'textAr': textAr!.trim(),
        'correct': correct,
      };
}

@immutable
class QuizQuestionDraft {
  const QuizQuestionDraft({this.id, this.type = QuestionType.single, this.promptEn = '', this.promptAr, this.points = 1, this.options = const []});

  factory QuizQuestionDraft.fromJson(Json j) => QuizQuestionDraft(
        id: strOrNull(j, 'id'),
        type: QuestionType.parse(j['type']),
        promptEn: str(j, 'promptEn'),
        promptAr: strOrNull(j, 'promptAr'),
        points: integer(j, 'points', 1),
        options: list(j, 'options').map(QuizOptionDraft.fromJson).toList(),
      );

  final String? id;
  final QuestionType type;
  final String promptEn;
  final String? promptAr;
  final int points;
  final List<QuizOptionDraft> options;

  int get correctCount => options.where((o) => o.correct).length;

  /// Mirrors the API's `quizQuestionInput` rules so the editor can say what's wrong before saving.
  bool get valid {
    if (promptEn.trim().isEmpty || points < 1 || points > 100) return false;
    if (options.length < 2 || options.length > 8 || options.any((o) => o.textEn.trim().isEmpty)) return false;
    if (type == QuestionType.trueFalse && options.length != 2) return false;
    return type == QuestionType.multiple ? correctCount >= 1 : correctCount == 1;
  }

  QuizQuestionDraft copyWith({QuestionType? type, String? promptEn, int? points, List<QuizOptionDraft>? options}) => QuizQuestionDraft(
        id: id,
        type: type ?? this.type,
        promptEn: promptEn ?? this.promptEn,
        promptAr: promptAr,
        points: points ?? this.points,
        options: options ?? this.options,
      );

  Map<String, dynamic> toJson() => {
        'id': ?id,
        'type': type.wire,
        'promptEn': promptEn.trim(),
        if (promptAr != null && promptAr!.trim().isNotEmpty) 'promptAr': promptAr!.trim(),
        'points': points,
        'options': [for (final o in options) o.toJson()],
      };
}

/// `quizInput` (create) / `updateQuizInput` (edit).
@immutable
class QuizDraft {
  const QuizDraft({
    required this.title,
    this.description = '',
    this.moduleId,
    this.dueAt,
    this.timeLimitMin,
    this.maxAttempts,
    this.passPercent = 70,
    this.questions = const [],
  });

  final String title;
  final String description;
  final String? moduleId;
  final DateTime? dueAt;
  final int? timeLimitMin;
  /// Null for a recorded course's quizzes: they have unlimited attempts, so the field is left out of the request.
  final int? maxAttempts;

  /// Percent of the points needed to pass (a recorded course's certificate needs every quiz passed).
  final int passPercent;
  final List<QuizQuestionDraft> questions;

  /// [withQuestions] false once students have started: the API refuses question changes then.
  Map<String, dynamic> toJson({bool withQuestions = true}) => {
        'title': title.trim(),
        'description': description,
        'moduleId': moduleId,
        'dueAt': dueAt?.toUtc().toIso8601String(),
        'timeLimitMin': timeLimitMin,
        'maxAttempts': ?maxAttempts,
        'passPercent': passPercent,
        if (withQuestions) 'questions': [for (final q in questions) q.toJson()],
      };
}

/// The teacher's full view of a quiz (`GET /quizzes/:id` as teacher/admin), answers included.
@immutable
class StaffQuiz {
  const StaffQuiz({
    required this.id,
    required this.batchId,
    required this.title,
    this.description = '',
    this.moduleId,
    this.dueAt,
    this.timeLimitMin,
    this.maxAttempts = 1,
    this.passPercent = 70,
    this.published = false,
    this.hasAttempts = false,
    this.questions = const [],
  });

  factory StaffQuiz.fromJson(Json j) => StaffQuiz(
        id: str(j, 'id'),
        batchId: str(j, 'batchId'),
        title: str(j, 'title'),
        description: str(j, 'description'),
        moduleId: strOrNull(j, 'moduleId'),
        dueAt: date(j, 'dueAt'),
        timeLimitMin: intOrNull(j, 'timeLimitMin'),
        maxAttempts: integer(j, 'maxAttempts', 1),
        passPercent: integer(j, 'passPercent', 70),
        published: str(j, 'status') == 'PUBLISHED',
        hasAttempts: boolean(j, 'hasAttempts'),
        questions: list(j, 'questions').map(QuizQuestionDraft.fromJson).toList(),
      );

  final String id;
  final String batchId;
  final String title;
  final String description;
  final String? moduleId;
  final DateTime? dueAt;
  final int? timeLimitMin;
  final int maxAttempts;
  final int passPercent;
  final bool published;
  final bool hasAttempts;
  final List<QuizQuestionDraft> questions;
}
