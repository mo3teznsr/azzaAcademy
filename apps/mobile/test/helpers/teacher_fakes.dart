import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/learn/data/file_uploads.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/learn/data/quizzes_repository.dart';
import 'package:azza/features/learn/domain/quiz_models.dart';
import 'package:azza/features/live/domain/live_models.dart';
import 'package:azza/features/teacher/data/studio_repository.dart';
import 'package:azza/features/teacher/data/teacher_repository.dart';
import 'package:azza/features/teacher/domain/studio_models.dart';

import 'fakes.dart';

/// Records every teacher-studio write; [subs] answers `submissions(assignmentId)`.
class FakeTeacherStudioRepository implements TeacherStudioRepository {
  FakeTeacherStudioRepository({this.subs = const {}, this.quizzes = const {}});
  Map<String, List<Submission>> subs;
  Map<String, StaffQuiz> quizzes;

  final List<(String, AssignmentDraft)> createdAssignments = [];
  final List<({String id, int score, String? feedback})> grades = [];
  final List<(String, MaterialDraft)> materials = [];
  final List<PickedFile> uploads = [];
  final List<(String, QuizDraft)> createdQuizzes = [];
  final List<(String, QuizDraft, bool)> updatedQuizzes = [];
  final List<String> published = [];
  final List<String> unpublished = [];
  final List<String> deleted = [];
  final List<(String, AssignmentDraft)> updatedAssignments = [];
  final List<String> deletedAssignments = [];
  final List<(String, PickedFile)> materialFiles = [];

  final List<(String, QuizDraft)> createdCourseQuizzes = [];
  final List<(String, String?)> previewSet = [];

  /// When set, `deleteAssignment` / `updateAssignment` throw it (e.g. a 409 or 422 AppException).
  Object? deleteError;
  Object? updateError;

  StaffQuiz _quiz(String id, String batchId, QuizDraft d, {bool published = false}) => StaffQuiz(
        id: id,
        batchId: batchId,
        title: d.title,
        description: d.description,
        moduleId: d.moduleId,
        dueAt: d.dueAt,
        timeLimitMin: d.timeLimitMin,
        maxAttempts: d.maxAttempts ?? 1,
        published: published,
        questions: d.questions,
      );

  @override
  Future<Assignment> createAssignment(String batchId, AssignmentDraft draft) async {
    createdAssignments.add((batchId, draft));
    return Assignment(id: 'a-new', title: draft.title, dueAt: draft.dueAt, maxScore: draft.maxScore);
  }

  @override
  Future<Assignment> updateAssignment(String assignmentId, AssignmentDraft draft) async {
    if (updateError != null) throw updateError!;
    updatedAssignments.add((assignmentId, draft));
    return Assignment(id: assignmentId, title: draft.title, dueAt: draft.dueAt, maxScore: draft.maxScore, sessionId: draft.sessionId);
  }

  @override
  Future<void> deleteAssignment(String assignmentId) async {
    if (deleteError != null) throw deleteError!;
    deletedAssignments.add(assignmentId);
  }

  @override
  Future<AttachedFile> uploadMaterialFile(String batchId, PickedFile file, {void Function(double progress)? onProgress}) async {
    materialFiles.add((batchId, file));
    onProgress?.call(1);
    return AttachedFile(url: 'http://files.test/materials/abc.${fileExtension(file.name)}', name: file.name, size: file.size, type: 'application/pdf');
  }

  @override
  Future<List<Submission>> submissions(String assignmentId) async => subs[assignmentId] ?? const [];

  @override
  Future<Submission> grade(String submissionId, {required int score, String? feedback}) async {
    grades.add((id: submissionId, score: score, feedback: feedback));
    return Submission(id: submissionId, assignmentId: '', studentName: '', submittedAt: DateTime.now(), score: score, feedback: feedback);
  }

  @override
  Future<CourseMaterial> addMaterial(String batchId, MaterialDraft draft) async {
    materials.add((batchId, draft));
    return CourseMaterial(id: 'm-new', title: draft.title, url: draft.url, kind: draft.kind.wire);
  }

  @override
  Future<String> uploadVideo(PickedFile file) async {
    uploads.add(file);
    return 'https://cdn.example.com/course-videos/${file.name}';
  }

  @override
  Future<StaffQuiz> quiz(String id) async => quizzes[id]!;

  @override
  Future<StaffQuiz> createQuiz(String batchId, QuizDraft draft) async {
    createdQuizzes.add((batchId, draft));
    return _quiz('q-new', batchId, draft);
  }

  @override
  Future<StaffQuiz> updateQuiz(String batchId, String quizId, QuizDraft draft, {bool withQuestions = true}) async {
    updatedQuizzes.add((quizId, draft, withQuestions));
    return _quiz(quizId, batchId, draft);
  }

  @override
  Future<void> deleteQuiz(String batchId, String quizId) async => deleted.add(quizId);

  @override
  Future<StaffQuiz> publishQuiz(String batchId, String quizId) async {
    published.add(quizId);
    final last = createdQuizzes.isEmpty ? null : createdQuizzes.last.$2;
    return _quiz(quizId, batchId, last ?? const QuizDraft(title: 'Quiz'), published: true);
  }

  @override
  Future<StaffQuiz> unpublishQuiz(String batchId, String quizId) async {
    unpublished.add(quizId);
    return _quiz(quizId, batchId, const QuizDraft(title: 'Quiz'));
  }

  @override
  Future<StaffQuiz> createCourseQuiz(String courseId, QuizDraft draft) async {
    createdCourseQuizzes.add((courseId, draft));
    return StaffQuiz(id: 'cq-new', batchId: '', title: draft.title, passPercent: draft.passPercent, questions: draft.questions);
  }

  @override
  Future<StaffQuiz> updateCourseQuiz(String courseId, String quizId, QuizDraft draft, {bool withQuestions = true}) async =>
      StaffQuiz(id: quizId, batchId: '', title: draft.title, passPercent: draft.passPercent, questions: draft.questions);

  @override
  Future<void> deleteCourseQuiz(String courseId, String quizId) async {}

  @override
  Future<StaffQuiz> publishCourseQuiz(String courseId, String quizId) async => StaffQuiz(id: quizId, batchId: '', title: 'q', published: true);

  @override
  Future<StaffQuiz> unpublishCourseQuiz(String courseId, String quizId) async => StaffQuiz(id: quizId, batchId: '', title: 'q');

  @override
  Future<void> setPreviewLesson(String courseId, String? lessonId) async => previewSet.add((courseId, lessonId));
}

class FakeTeacherRepository implements TeacherRepository {
  FakeTeacherRepository({this.rosters = const {}, this.summary = const EarningsSummary(), this.bank, this.requests = const [], this.subscribers = const {}});
  Map<String, CourseSubscribers> subscribers;
  Map<String, List<RosterStudent>> rosters;
  EarningsSummary summary;
  TeacherBankDetails? bank;
  List<RescheduleRequest> requests;

  @override
  Future<List<RosterStudent>> roster(String batchId) async => rosters[batchId] ?? const [];
  @override
  Future<EarningsSummary> earnings() async => summary;
  @override
  Future<CourseSubscribers> courseSubscribers(String courseId) async => subscribers[courseId] ?? const CourseSubscribers();
  @override
  Future<List<PayoutEntry>> payouts() async => const [];
  @override
  Future<TeacherBankDetails?> bankDetails() async => bank;
  @override
  Future<TeacherBankDetails> saveBankDetails(TeacherBankDetails details) async => details;
  @override
  Future<List<RescheduleRequest>> rescheduleRequests() async => requests;
}

/// Learn data per class.
class FakeClassLearnRepository extends FakeLearnRepository {
  FakeClassLearnRepository({this.assignmentMap = const {}, this.materialMap = const {}, this.recordingList = const []});
  Map<String, List<Assignment>> assignmentMap;
  Map<String, List<CourseMaterial>> materialMap;
  List<Recording> recordingList;

  @override
  Future<List<Assignment>> assignments(String batchId) async => assignmentMap[batchId] ?? const [];
  @override
  Future<List<CourseMaterial>> materials(String batchId) async => materialMap[batchId] ?? const [];
  @override
  Future<List<Recording>> recordings() async => recordingList;
}

class FakeBatchQuizzes implements QuizzesRepository {
  FakeBatchQuizzes([this.list = const [], this.courseList = const []]);
  List<QuizSummary> list;
  List<QuizSummary> courseList;

  @override
  Future<List<QuizSummary>> courseQuizzes(String courseId) async => courseList;

  @override
  Future<List<QuizSummary>> batchQuizzes(String batchId) async => list;
  @override
  Future<List<QuizSummary>> myQuizzes() async => const [];
  @override
  Future<QuizView> quiz(String id) => throw UnimplementedError();
  @override
  Future<QuizResults> results(String id) => throw UnimplementedError();
  @override
  Future<QuizView> start(String id) => throw UnimplementedError();
  @override
  Future<QuizView> submit(String id, Map<String, List<String>> answers) => throw UnimplementedError();
}

class FakeMaterialPicker implements MaterialFilePicker {
  FakeMaterialPicker([this.file]);
  PickedFile? file;
  @override
  Future<PickedFile?> pickVideo() async => file;
}

class FakeDocumentPicker implements DocumentPicker {
  FakeDocumentPicker([this.files = const []]);
  List<PickedFile> files;
  final List<List<String>> asked = [];
  @override
  Future<List<PickedFile>> pick(List<String> extensions) async {
    asked.add(extensions);
    return files;
  }
}
