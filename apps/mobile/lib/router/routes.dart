import '../core/domain/enums.dart';

/// Every path in the app. Role trees live under `/student`, `/teacher`, `/admin`;
/// everything else is a shared route reachable from any role.
abstract final class Routes {
  // public
  static const splash = '/splash';
  static const welcome = '/welcome';
  static const interests = '/welcome/interests';
  static const signIn = '/sign-in';
  static const signUp = '/sign-up';
  static const verifyEmail = '/verify-email';

  // student tree
  static const studentHome = '/student/home';
  static const studentExplore = '/student/explore';
  static const studentSchedule = '/student/schedule';
  static const studentLibrary = '/student/library';
  static const studentMe = '/student/me';

  // teacher tree
  static const teacherToday = '/teacher/today';
  static const teacherBatches = '/teacher/batches';
  static const teacherNewBatch = '/teacher/batches/new';
  static const teacherCourses = '/teacher/batches/courses';
  static const teacherRecordings = '/teacher/batches/recordings';
  static const teacherNewCourse = '/teacher/batches/courses/new';
  static String teacherCourse(String id) => '/teacher/batches/courses/$id';
  static const teacherCalendar = '/teacher/calendar';
  static const teacherEarnings = '/teacher/earnings';
  static const teacherPayoutMethod = '/teacher/earnings/payout-method';
  static const teacherMe = '/teacher/me';

  // admin tree
  static const adminOverview = '/admin/overview';
  static const adminLive = '/admin/live';
  static const adminBatches = '/admin/batches';
  static const adminApprovals = '/admin/approvals';
  static const adminMe = '/admin/me';
  /// Approvals on the "To review" tab (proposals and instructor applications).
  static const adminReview = '/admin/approvals?tab=review';
  static String adminBatch(String id) => '/admin/batches/$id';
  static String adminTransfer(String orderId) => '/admin/approvals/transfers/$orderId';
  static String adminPayoutRun(String id) => '/admin/approvals/payout-runs/$id';
  /// Support inbox (reached from the overview's app bar; the tabs are full).
  static const adminSupport = '/admin/overview/support';

  // shared
  static String course(String idOrSlug) => '/courses/$idOrSlug';
  static String batchPicker(String courseId) => '/courses/$courseId/batches';
  static String batchSchedule(String batchId) => '/batches/$batchId/schedule';
  static String roster(String batchId) => '/batches/$batchId/roster';
  static String checkout(String batchId) => '/checkout/$batchId';
  static String order(String id) => '/orders/$id';
  static String bankTransfer(String orderId) => '/orders/$orderId/bank-transfer';
  static String applePayment(String orderId) => '/orders/$orderId/app-store';
  static String enrolled(String orderId) => '/orders/$orderId/enrolled';
  static const myOrders = '/me/orders';
  static const savedCourses = '/me/saved';
  static const certificates = '/me/certificates';
  static String certificate(String code) => '/me/certificates/${Uri.encodeComponent(code)}';
  static String teacher(String id) => '/teachers/$id';
  static const instructors = '/instructors';
  static const teachOnAzza = '/teach';
  static String lobby(String sessionId) => '/sessions/$sessionId/lobby';
  static String liveRoom(String sessionId) => '/sessions/$sessionId/live';
  static String afterSession(String sessionId) => '/sessions/$sessionId/after';
  static String sessionPrep(String sessionId) => '/sessions/$sessionId/prep';
  static String reschedule(String sessionId) => '/sessions/$sessionId/reschedule';
  static String attendance(String sessionId) => '/sessions/$sessionId/attendance';
  static const assignments = '/assignments';
  static String courseLessons(String courseId) => '/courses/$courseId/lessons';
  static String lesson(String courseId, String lessonId) => '/courses/$courseId/lessons/$lessonId';
  static const myQuizzes = '/quizzes';
  static String quiz(String id) => '/quizzes/$id';
  static String quizTake(String id) => '/quizzes/$id/take';
  static String quizAttempt(String id, String attemptId) => '/quizzes/$id/attempts/$attemptId';
  static String quizResults(String id) => '/quizzes/$id/results';
  static String batchQuizzes(String batchId) => '/batches/$batchId/quizzes';
  static const notifications = '/notifications';

  // communications
  static const messages = '/messages';
  static String chat(String conversationId) => '/messages/$conversationId';
  static const announcements = '/announcements';
  static String batchAnnouncements(String batchId) => '/batches/$batchId/announcements';
  static const support = '/support';
  static String newTicket({String? orderId, String? batchId}) {
    final q = {'orderId': ?orderId, 'batchId': ?batchId};
    return Uri(path: '/support/new', queryParameters: q.isEmpty ? null : q).toString();
  }
  static String ticket(String id) => '/support/$id';
  static const languageSettings = '/settings/language';
  static const editProfile = '/settings/profile';
  static const profilePhoto = '/profile-photo';

  static const publicPaths = {welcome, interests, signIn, signUp};

  static String homeFor(Role role) => switch (role) {
        Role.student => studentHome,
        Role.teacher => teacherToday,
        Role.admin => adminOverview,
      };

  static bool belongsTo(String location, Role role) => location == role.home || location.startsWith('${role.home}/');
}
