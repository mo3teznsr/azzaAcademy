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
  static String adminBatch(String id) => '/admin/batches/$id';
  static String adminTransfer(String orderId) => '/admin/approvals/transfers/$orderId';
  static String adminPayoutRun(String id) => '/admin/approvals/payout-runs/$id';

  // shared
  static String course(String idOrSlug) => '/courses/$idOrSlug';
  static String batchPicker(String courseId) => '/courses/$courseId/batches';
  static String batchSchedule(String batchId) => '/batches/$batchId/schedule';
  static String roster(String batchId) => '/batches/$batchId/roster';
  static String checkout(String batchId) => '/checkout/$batchId';
  static String order(String id) => '/orders/$id';
  static String cardPayment(String orderId) => '/orders/$orderId/card';
  static String bankTransfer(String orderId) => '/orders/$orderId/bank-transfer';
  static String enrolled(String orderId) => '/orders/$orderId/enrolled';
  static const myOrders = '/me/orders';
  static String lobby(String sessionId) => '/sessions/$sessionId/lobby';
  static String liveRoom(String sessionId) => '/sessions/$sessionId/live';
  static String afterSession(String sessionId) => '/sessions/$sessionId/after';
  static String sessionPrep(String sessionId) => '/sessions/$sessionId/prep';
  static String reschedule(String sessionId) => '/sessions/$sessionId/reschedule';
  static String attendance(String sessionId) => '/sessions/$sessionId/attendance';
  static const assignments = '/assignments';
  static const notifications = '/notifications';
  static const languageSettings = '/settings/language';

  static const publicPaths = {welcome, interests, signIn, signUp};

  static String homeFor(Role role) => switch (role) {
        Role.student => studentHome,
        Role.teacher => teacherToday,
        Role.admin => adminOverview,
      };

  static bool belongsTo(String location, Role role) => location == role.home || location.startsWith('${role.home}/');
}
