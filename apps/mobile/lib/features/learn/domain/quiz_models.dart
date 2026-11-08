import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';

String _pick(AppLocale l, String en, String? ar) => l == AppLocale.ar && ar != null && ar.trim().isNotEmpty ? ar : en;

double? _numOrNull(Json j, String key) => j[key] == null ? null : dbl(j, key);

/// The student's standing on a quiz (`mine` on list items, `progress` on the student view).
enum QuizStatus {
  open,
  inProgress,
  submitted,
  missed;

  static QuizStatus parse(Object? raw) => switch ('$raw') {
        'IN_PROGRESS' => QuizStatus.inProgress,
        'SUBMITTED' => QuizStatus.submitted,
        'MISSED' => QuizStatus.missed,
        _ => QuizStatus.open,
      };
}

enum QuestionType {
  single,
  multiple,
  trueFalse;

  static QuestionType parse(Object? raw) => switch ('$raw') {
        'MULTIPLE' => QuestionType.multiple,
        'TRUE_FALSE' => QuestionType.trueFalse,
        _ => QuestionType.single,
      };
}

@immutable
class QuizProgress {
  const QuizProgress({
    this.status = QuizStatus.open,
    this.attemptsUsed = 0,
    this.attemptsLeft = 0,
    this.canStart = false,
    this.bestScore,
    this.bestPercent,
    this.maxScore = 0,
  });

  factory QuizProgress.fromJson(Json j) => QuizProgress(
        status: QuizStatus.parse(j['status']),
        attemptsUsed: integer(j, 'attemptsUsed'),
        attemptsLeft: integer(j, 'attemptsLeft'),
        canStart: boolean(j, 'canStart'),
        bestScore: _numOrNull(j, 'bestScore'),
        bestPercent: _numOrNull(j, 'bestPercent'),
        maxScore: dbl(j, 'maxScore'),
      );

  final QuizStatus status;
  final int attemptsUsed;
  final int attemptsLeft;
  final bool canStart;
  final double? bestScore;
  final double? bestPercent;
  final double maxScore;
}

/// `GET /me/quizzes` and `GET /batches/:id/quizzes` item.
@immutable
class QuizSummary {
  const QuizSummary({
    required this.id,
    required this.batchId,
    required this.title,
    this.description = '',
    this.draft = false,
    this.dueAt,
    this.timeLimitMin,
    this.maxAttempts = 1,
    this.questionCount = 0,
    this.totalPoints = 0,
    this.batchCode = '',
    this.courseTitleEn = '',
    this.courseTitleAr,
    this.mine,
    this.attemptCount,
    this.studentsAttempted,
    this.moduleId,
    this.passPercent = 70,
  });

  factory QuizSummary.fromJson(Json j) {
    final batch = obj(j, 'batch');
    final course = obj(batch, 'course');
    final mine = objOrNull(j, 'mine');
    return QuizSummary(
      id: str(j, 'id'),
      batchId: str(j, 'batchId', str(batch, 'id')),
      title: str(j, 'title'),
      description: str(j, 'description'),
      draft: str(j, 'status') == 'DRAFT',
      dueAt: date(j, 'dueAt'),
      timeLimitMin: intOrNull(j, 'timeLimitMin'),
      maxAttempts: integer(j, 'maxAttempts', 1),
      questionCount: integer(j, 'questionCount'),
      totalPoints: dbl(j, 'totalPoints'),
      batchCode: str(batch, 'code'),
      courseTitleEn: str(course, 'titleEn'),
      courseTitleAr: strOrNull(course, 'titleAr'),
      mine: mine == null ? null : QuizProgress.fromJson(mine),
      attemptCount: intOrNull(j, 'attemptCount'),
      studentsAttempted: intOrNull(j, 'studentsAttempted'),
      moduleId: strOrNull(j, 'moduleId'),
      passPercent: integer(j, 'passPercent', 70),
    );
  }

  final String id;
  final String batchId;
  final String title;
  final String description;
  final bool draft;

  /// The course module this quiz practises, when the teacher linked one.
  final String? moduleId;

  /// Percent of the points a learner needs for the quiz to count as passed (70 unless the teacher changed it).
  final int passPercent;
  final DateTime? dueAt;
  final int? timeLimitMin;
  final int maxAttempts;
  final int questionCount;
  final double totalPoints;
  final String batchCode;
  final String courseTitleEn;
  final String? courseTitleAr;

  /// Student only.
  final QuizProgress? mine;

  /// Teacher / admin only.
  final int? attemptCount;
  final int? studentsAttempted;

  String courseTitle(AppLocale l) => _pick(l, courseTitleEn, courseTitleAr);
}

@immutable
class QuizOption {
  const QuizOption({required this.id, required this.textEn, this.textAr});
  factory QuizOption.fromJson(Json j) => QuizOption(id: str(j, 'id'), textEn: str(j, 'textEn'), textAr: strOrNull(j, 'textAr'));
  final String id;
  final String textEn;
  final String? textAr;
  String text(AppLocale l) => _pick(l, textEn, textAr);
}

@immutable
class QuizQuestion {
  const QuizQuestion({required this.id, required this.type, required this.promptEn, this.promptAr, this.points = 1, this.options = const []});

  factory QuizQuestion.fromJson(Json j) => QuizQuestion(
        id: str(j, 'id'),
        type: QuestionType.parse(j['type']),
        promptEn: str(j, 'promptEn'),
        promptAr: strOrNull(j, 'promptAr'),
        points: dbl(j, 'points', 1),
        options: list(j, 'options').map(QuizOption.fromJson).toList(),
      );

  final String id;
  final QuestionType type;
  final String promptEn;
  final String? promptAr;
  final double points;
  final List<QuizOption> options;

  String prompt(AppLocale l) => _pick(l, promptEn, promptAr);
  bool get multiple => type == QuestionType.multiple;
}

/// One question of a graded attempt (only when the quiz reveals answers).
@immutable
class AttemptQuestion {
  const AttemptQuestion({required this.questionId, this.selected = const [], this.correct = false, this.earned = 0, this.points = 0, this.correctOptionIds = const []});

  factory AttemptQuestion.fromJson(Json j) => AttemptQuestion(
        questionId: str(j, 'questionId'),
        selected: strings(j, 'selected'),
        correct: boolean(j, 'correct'),
        earned: dbl(j, 'earned'),
        points: dbl(j, 'points'),
        correctOptionIds: strings(j, 'correctOptionIds'),
      );

  final String questionId;
  final List<String> selected;
  final bool correct;
  final double earned;
  final double points;
  final List<String> correctOptionIds;
}

@immutable
class QuizAttempt {
  const QuizAttempt({
    required this.id,
    required this.number,
    this.startedAt,
    this.submittedAt,
    this.score = 0,
    this.maxScore = 0,
    this.percent = 0,
    this.timedOut = false,
    this.questions,
  });

  factory QuizAttempt.fromJson(Json j) => QuizAttempt(
        id: str(j, 'id'),
        number: integer(j, 'number', 1),
        startedAt: date(j, 'startedAt'),
        submittedAt: date(j, 'submittedAt'),
        score: dbl(j, 'score'),
        maxScore: dbl(j, 'maxScore'),
        percent: dbl(j, 'percent'),
        timedOut: boolean(j, 'timedOut'),
        questions: j['questions'] is List ? list(j, 'questions').map(AttemptQuestion.fromJson).toList() : null,
      );

  final String id;
  final int number;
  final DateTime? startedAt;
  final DateTime? submittedAt;
  final double score;
  final double maxScore;
  final double percent;
  final bool timedOut;

  /// Per-question grading; only sent once answers are revealed.
  final List<AttemptQuestion>? questions;

  AttemptQuestion? question(String id) => questions?.where((q) => q.questionId == id).firstOrNull;
}

@immutable
class OpenAttempt {
  const OpenAttempt({required this.id, required this.number, this.startedAt, this.deadline});
  factory OpenAttempt.fromJson(Json j) =>
      OpenAttempt(id: str(j, 'id'), number: integer(j, 'number', 1), startedAt: date(j, 'startedAt'), deadline: date(j, 'deadline'));
  final String id;
  final int number;
  final DateTime? startedAt;

  /// Server deadline for timed quizzes (null when untimed).
  final DateTime? deadline;
}

@immutable
class Quiz {
  const Quiz({
    required this.id,
    required this.batchId,
    required this.title,
    this.description = '',
    this.dueAt,
    this.timeLimitMin,
    this.maxAttempts = 1,
    this.questionCount = 0,
    this.totalPoints = 0,
    this.questions = const [],
  });

  factory Quiz.fromJson(Json j) => Quiz(
        id: str(j, 'id'),
        batchId: str(j, 'batchId'),
        title: str(j, 'title'),
        description: str(j, 'description'),
        dueAt: date(j, 'dueAt'),
        timeLimitMin: intOrNull(j, 'timeLimitMin'),
        maxAttempts: integer(j, 'maxAttempts', 1),
        questionCount: integer(j, 'questionCount', list(j, 'questions').length),
        totalPoints: dbl(j, 'totalPoints'),
        questions: list(j, 'questions').map(QuizQuestion.fromJson).toList(),
      );

  final String id;
  final String batchId;
  final String title;
  final String description;
  final DateTime? dueAt;
  final int? timeLimitMin;
  final int maxAttempts;
  final int questionCount;
  final double totalPoints;
  final List<QuizQuestion> questions;

  bool get timed => timeLimitMin != null && timeLimitMin! > 0;
}

/// The student view: `GET /quizzes/:id`, `POST /quizzes/:id/start` and `POST /quizzes/:id/attempts`.
@immutable
class QuizView {
  const QuizView({
    required this.quiz,
    this.progress = const QuizProgress(),
    this.reveal = false,
    this.openAttempt,
    this.attempts = const [],
    this.answerKey,
    this.result,
  });

  factory QuizView.fromJson(Json j) {
    final open = objOrNull(j, 'openAttempt');
    final key = objOrNull(j, 'answerKey');
    final result = objOrNull(j, 'result');
    return QuizView(
      quiz: Quiz.fromJson(obj(j, 'quiz')),
      progress: QuizProgress.fromJson(obj(j, 'progress')),
      reveal: boolean(j, 'reveal'),
      openAttempt: open == null ? null : OpenAttempt.fromJson(open),
      attempts: list(j, 'attempts').map(QuizAttempt.fromJson).toList()..sort((a, b) => b.number.compareTo(a.number)),
      answerKey: key == null ? null : {for (final e in key.entries) e.key: e.value is List ? (e.value as List).map((v) => '$v').toList() : <String>[]},
      result: result == null ? null : QuizAttempt.fromJson(result),
    );
  }

  final Quiz quiz;
  final QuizProgress progress;
  final bool reveal;
  final OpenAttempt? openAttempt;

  /// Newest first.
  final List<QuizAttempt> attempts;

  /// questionId → correct option ids (only when [reveal]).
  final Map<String, List<String>>? answerKey;

  /// The attempt just graded (only on the submit response).
  final QuizAttempt? result;

  QuizAttempt? attempt(String id) => result?.id == id ? result : attempts.where((a) => a.id == id).firstOrNull;
}

@immutable
class QuizStudentResult {
  const QuizStudentResult({required this.userId, required this.name, this.email = '', this.image, this.attempts = 0, this.bestScore, this.bestPercent, this.lastSubmittedAt});

  factory QuizStudentResult.fromJson(Json j) {
    final u = obj(j, 'user');
    return QuizStudentResult(
      userId: str(u, 'id'),
      name: str(u, 'name'),
      email: str(u, 'email'),
      image: strOrNull(u, 'image'),
      attempts: integer(j, 'attempts'),
      bestScore: _numOrNull(j, 'bestScore'),
      bestPercent: _numOrNull(j, 'bestPercent'),
      lastSubmittedAt: date(j, 'lastSubmittedAt'),
    );
  }

  final String userId;
  final String name;
  final String email;
  final String? image;
  final int attempts;
  final double? bestScore;
  final double? bestPercent;
  final DateTime? lastSubmittedAt;
}

@immutable
class QuizQuestionStat {
  const QuizQuestionStat({required this.questionId, required this.type, required this.promptEn, this.promptAr, this.points = 0, this.answered = 0, this.correct = 0, this.rate});

  factory QuizQuestionStat.fromJson(Json j) => QuizQuestionStat(
        questionId: str(j, 'questionId'),
        type: QuestionType.parse(j['type']),
        promptEn: str(j, 'promptEn'),
        promptAr: strOrNull(j, 'promptAr'),
        points: dbl(j, 'points'),
        answered: integer(j, 'answered'),
        correct: integer(j, 'correct'),
        rate: _numOrNull(j, 'rate'),
      );

  final String questionId;
  final QuestionType type;
  final String promptEn;
  final String? promptAr;
  final double points;
  final int answered;
  final int correct;

  /// 0..1, null when nobody answered.
  final double? rate;

  String prompt(AppLocale l) => _pick(l, promptEn, promptAr);
}

/// `GET /quizzes/:id/results` (batch teacher / admin).
@immutable
class QuizResults {
  const QuizResults({required this.quiz, this.draft = false, this.students = 0, this.submitted = 0, this.averagePercent, this.rows = const [], this.questions = const []});

  factory QuizResults.fromJson(Json j) {
    final summary = obj(j, 'summary');
    return QuizResults(
      quiz: Quiz.fromJson(obj(j, 'quiz')),
      draft: str(obj(j, 'quiz'), 'status') == 'DRAFT',
      students: integer(summary, 'students'),
      submitted: integer(summary, 'submitted'),
      averagePercent: _numOrNull(summary, 'averagePercent'),
      rows: list(j, 'students').map(QuizStudentResult.fromJson).toList(),
      questions: list(j, 'questions').map(QuizQuestionStat.fromJson).toList(),
    );
  }

  final Quiz quiz;
  final bool draft;
  final int students;
  final int submitted;
  final double? averagePercent;
  final List<QuizStudentResult> rows;
  final List<QuizQuestionStat> questions;
}
