import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/quiz_models.dart';

/// Quizzes: students take them; teachers read results. Authoring stays on the web.
abstract class QuizzesRepository {
  Future<List<QuizSummary>> myQuizzes();
  Future<List<QuizSummary>> batchQuizzes(String batchId);
  Future<QuizView> quiz(String id);
  Future<QuizView> start(String id);

  /// [answers]: questionId → selected option ids (one id for single / true-false).
  Future<QuizView> submit(String id, Map<String, List<String>> answers);
  Future<QuizResults> results(String id);
}

class DioQuizzesRepository extends DioRepository implements QuizzesRepository {
  DioQuizzesRepository(super.dio);

  @override
  Future<List<QuizSummary>> myQuizzes() async => (await getItems('/api/v1/me/quizzes')).map(QuizSummary.fromJson).toList();

  @override
  Future<List<QuizSummary>> batchQuizzes(String batchId) async =>
      (await getItems('/api/v1/batches/$batchId/quizzes')).map(QuizSummary.fromJson).toList();

  @override
  Future<QuizView> quiz(String id) async => QuizView.fromJson(await getJson('/api/v1/quizzes/$id'));

  @override
  Future<QuizView> start(String id) async => QuizView.fromJson(await postJson('/api/v1/quizzes/$id/start'));

  @override
  Future<QuizView> submit(String id, Map<String, List<String>> answers) async =>
      QuizView.fromJson(await postJson('/api/v1/quizzes/$id/attempts', {'answers': answers}));

  @override
  Future<QuizResults> results(String id) async => QuizResults.fromJson(await getJson('/api/v1/quizzes/$id/results'));
}

final quizzesRepositoryProvider = Provider<QuizzesRepository>((ref) => DioQuizzesRepository(ref.watch(dioProvider)));

final myQuizzesProvider = FutureProvider.autoDispose<List<QuizSummary>>((ref) => ref.watch(quizzesRepositoryProvider).myQuizzes());

final batchQuizzesProvider = FutureProvider.autoDispose.family<List<QuizSummary>, String>(
  (ref, batchId) => ref.watch(quizzesRepositoryProvider).batchQuizzes(batchId),
);

final quizViewProvider = FutureProvider.autoDispose.family<QuizView, String>((ref, id) => ref.watch(quizzesRepositoryProvider).quiz(id));

final quizResultsProvider = FutureProvider.autoDispose.family<QuizResults, String>((ref, id) => ref.watch(quizzesRepositoryProvider).results(id));
