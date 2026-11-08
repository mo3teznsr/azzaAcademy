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
  /// A recorded course's hub: subscribers, earnings, quizzes and the preview lesson.
  static String teacherCourseHub(String id) => '/teacher/batches/courses/$id/hub';
  static String teacherCourseQuizNew(String courseId) => '/teacher/batches/courses/$courseId/hub/quizzes/new';
  static String teacherCourseQuizEdit(String courseId, String quizId) => '/teacher/batches/courses/$courseId/hub/quizzes/$quizId/edit';
  static const teacherCalendar = '/teacher/calendar';
  static const teacherEarnings = '/teacher/earnings';
  static const teacherPayoutMethod = '/teacher/earnings/payout-method';
  static const teacherMe = '/teacher/me';

  // admin tree
  static const adminOverview = '/admin/overview';
  /// Live monitor (a screen under the overview; the "Live now" section opens it).
  static const adminLive = '/admin/overview/live';
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
  /// Approvals on a given tab: `alerts`, `review`, `transfers` or `payouts`.
  static String adminApprovalsTab(String tab) => '/admin/approvals?tab=$tab';
  static const adminNewBatch = '/admin/batches/new';

  // admin "Manage" tab (back office)
  static const adminManage = '/admin/manage';
  static const adminManageSupport = '/admin/manage/support';
  static const adminManageLive = '/admin/manage/live';
  static const adminPayments = '/admin/manage/payments';
  static String adminOrder(String id) => '/admin/manage/payments/$id';
  static const adminPeople = '/admin/manage/people';
  static String adminPerson(String id) => '/admin/manage/people/$id';
  static const adminCourses = '/admin/manage/courses';
  static const adminNewCourse = '/admin/manage/courses/new';
  static String adminCourse(String id) => '/admin/manage/courses/$id';
  static const adminSubscriptions = '/admin/manage/subscriptions';
  static const adminCoupons = '/admin/manage/coupons';
  static const adminNewCoupon = '/admin/manage/coupons/new';
  static String adminCoupon(String id) => '/admin/manage/coupons/$id';
  static String adminCouponUsage(String id) => '/admin/manage/coupons/$id/usage';
  static const adminCategories = '/admin/manage/categories';
  static const adminReports = '/admin/manage/reports';
  static const adminBankAccounts = '/admin/manage/bank-accounts';
  static const adminCurrencies = '/admin/manage/currencies';
  static const adminSettings = '/admin/manage/settings';

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
  /// "Your plans": every plan on a recorded course (Me).
  static const myPlans = '/me/plans';
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
  /// A recorded course's free lesson (readable without an account).
  static String previewLesson(String lessonId) => '/lessons/$lessonId/preview';

  /// Where a just-started plan waits for its payment to confirm (the web uses the same path for Stripe's success URL).
  static String recordedReturn(String reference) => Uri(path: '/learn/recorded/return', queryParameters: {'ref': reference}).toString();

  /// Bank-transfer instructions for a plan; the [TransferStart] rides along as `extra`.
  static String planTransfer(String paymentId) => '/subscriptions/transfer/$paymentId';
  static const myQuizzes = '/quizzes';
  static String quiz(String id) => '/quizzes/$id';
  static String quizTake(String id) => '/quizzes/$id/take';
  static String quizAttempt(String id, String attemptId) => '/quizzes/$id/attempts/$attemptId';
  static String quizResults(String id) => '/quizzes/$id/results';
  static String batchQuizzes(String batchId) => '/batches/$batchId/quizzes';
  // teacher class hub (shared paths so admins can reach them too)
  static String classHub(String batchId, {String? tab, bool atRisk = false}) {
    final q = {'tab': ?tab, if (atRisk) 'filter': 'atRisk'};
    return Uri(path: roster(batchId), queryParameters: q.isEmpty ? null : q).toString();
  }
  static String teacherNewAssignment(String batchId) => '/batches/$batchId/assignments/new';
  static String teacherAssignment(String batchId, String assignmentId) => '/batches/$batchId/assignments/$assignmentId';
  static String teacherNewQuiz(String batchId) => '/batches/$batchId/quizzes/new';
  static String teacherEditQuiz(String batchId, String quizId) => '/batches/$batchId/quizzes/$quizId/edit';
  static const teacherGrading = '/grading';
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

  /// Public certificate check (`<web>/verify/<code>` opens here too).
  static String verifyCertificate(String code) => '/verify/${Uri.encodeComponent(code)}';

  /// [path] with `?from=<location>` so sign-in (or onboarding) can send the visitor back; null [from] → bare path.
  static String withFrom(String path, String? from) =>
      from == null || from.isEmpty ? path : Uri(path: path, queryParameters: {'from': from}).toString();

  static String signInFrom(String? from) => withFrom(signIn, from);
  static String signUpFrom(String? from) => withFrom(signUp, from);

  /// A `from` worth returning to: an in-app path, never an external URL, never an auth step.
  static String? safeFrom(String? from) {
    if (from == null || !from.startsWith('/') || from.startsWith('//')) return null;
    final path = Uri.tryParse(from)?.path;
    if (path == null || path == splash || path == '/' || publicPaths.contains(path) || path == profilePhoto || path == verifyEmail) return null;
    return from;
  }

  static final _guestPatterns = [
    RegExp(r'^/courses/[^/]+$'),
    RegExp(r'^/batches/[^/]+/schedule$'),
    RegExp(r'^/teachers/[^/]+$'),
    RegExp(r'^/lessons/[^/]+/preview$'),
    RegExp(r'^/verify/[^/]+$'),
  ];

  /// What a signed-out visitor may open: the student shell (Explore, plus tabs that show a sign-in prompt),
  /// course pages, class schedules, teacher profiles, the instructors directory, "Teach on Azza" and certificate checks.
  /// Everything else (checkout, saving, reviews, messages, learning) asks for an account first.
  /// A detail opened inside a student tab (`/student/explore/courses/ux`) is judged by its shared path (`/courses/ux`).
  static bool isGuestPath(String path) {
    if (belongsTo(path, Role.student)) {
      final inner = tabSplit(path, Role.student)?.$2;
      return inner == null || inner.isEmpty || isGuestPath(inner);
    }
    return path == instructors || path == teachOnAzza || _guestPatterns.any((r) => r.hasMatch(path));
  }

  /// The tab roots of each role's shell, in tab order.
  static List<String> tabsFor(Role role) => switch (role) {
        Role.student => const [studentHome, studentExplore, studentSchedule, studentLibrary, studentMe],
        Role.teacher => const [teacherToday, teacherBatches, teacherCalendar, teacherEarnings, teacherMe],
        Role.admin => const [adminOverview, adminBatches, adminApprovals, adminManage, adminMe],
      };

  /// `/student/explore/courses/ux` → (`/student/explore`, `/courses/ux`); a tab root gives an empty rest.
  /// Null when [path] isn't inside one of [role]'s tabs.
  static (String, String)? tabSplit(String path, Role role) {
    for (final tab in tabsFor(role)) {
      if (path == tab) return (tab, '');
      if (path.startsWith('$tab/')) return (tab, path.substring(tab.length));
    }
    return null;
  }

  /// Shared detail paths that open inside a tab, so the tab bar stays and back returns within the tab.
  /// Each entry is the shared path's pattern and the tab it opens in when there's no current tab (a cold link).
  /// The same screens are registered under every tab of the role's shell (see `app_router.dart`).
  /// Full-screen flows stay outside the shells on purpose: auth, checkout and orders, the lobby and live room,
  /// taking a quiz, the after-session wrap-up, and the plan return and transfer screens ("Your plans" itself opens in Me).
  static final Map<Role, List<(RegExp, String)>> _inTab = {
    Role.student: [
      (RegExp(r'^/courses/[^/]+(/batches)?$'), studentExplore),
      (RegExp(r'^/courses/[^/]+/lessons(/[^/]+)?$'), studentHome),
      (RegExp(r'^/lessons/[^/]+/preview$'), studentExplore),
      (RegExp(r'^/batches/[^/]+/(schedule|announcements)$'), studentHome),
      (RegExp(r'^/teachers/[^/]+$'), studentExplore),
      (RegExp(r'^/instructors$'), studentExplore),
      (RegExp(r'^/teach$'), studentMe),
      (RegExp(r'^/quizzes(/[^/]+(/attempts/[^/]+)?)?$'), studentHome),
      (RegExp(r'^/assignments$'), studentHome),
      (RegExp(r'^/messages(/[^/]+)?$'), studentHome),
      (RegExp(r'^/(announcements|notifications)$'), studentHome),
      (RegExp(r'^/support(/[^/]+)?$'), studentMe),
      (RegExp(r'^/me/(orders|saved|plans|certificates(/[^/]+)?)$'), studentMe),
      (RegExp(r'^/settings/(language|profile)$'), studentMe),
    ],
    Role.teacher: [
      (RegExp(r'^/batches/[^/]+/(schedule|roster|announcements|assignments/[^/]+|quizzes(/new|/[^/]+/edit)?)$'), teacherBatches),
      (RegExp(r'^/quizzes/[^/]+/results$'), teacherBatches),
      (RegExp(r'^/grading$'), teacherToday),
      (RegExp(r'^/sessions/[^/]+/(prep|reschedule|attendance)$'), teacherToday),
      (RegExp(r'^/messages(/[^/]+)?$'), teacherToday),
      (RegExp(r'^/(announcements|notifications)$'), teacherToday),
      (RegExp(r'^/support(/[^/]+)?$'), teacherMe),
      (RegExp(r'^/settings/(language|profile)$'), teacherMe),
    ],
    Role.admin: [
      // No support thread here: the admin tabs already have their own support inbox at `…/support`.
      (RegExp(r'^/batches/[^/]+/(schedule|roster|announcements|assignments/[^/]+|quizzes(/new|/[^/]+/edit)?)$'), adminBatches),
      (RegExp(r'^/quizzes/[^/]+/results$'), adminBatches),
      (RegExp(r'^/messages(/[^/]+)?$'), adminOverview),
      (RegExp(r'^/(announcements|notifications)$'), adminOverview),
      (RegExp(r'^/settings/(language|profile)$'), adminMe),
    ],
  };

  /// Where a shared detail [path] opens for [role]: under the tab the reader is on ([current], the location
  /// being left), or its default tab on a cold link or straight after an auth step. Null keeps [path] as it is:
  /// not a detail this role opens in a tab, already inside a tab, or opened from a full-screen flow (which it then
  /// covers too, so back returns to that flow).
  static String? inTab(String path, Role role, String? current) {
    if (Role.values.any((r) => belongsTo(path, r))) return null;
    final entry = _inTab[role]!.where((e) => e.$1.hasMatch(path)).firstOrNull;
    if (entry == null) return null;
    final from = current == null ? '' : (Uri.tryParse(current)?.path ?? '');
    final tab = tabSplit(from, role)?.$1;
    if (tab != null) return '$tab$path';
    final entryStep = from.isEmpty || from == '/' || from == splash || from == profilePhoto || from == verifyEmail || publicPaths.contains(from);
    return entryStep ? '${entry.$2}$path' : null;
  }

  static String homeFor(Role role) => switch (role) {
        Role.student => studentHome,
        Role.teacher => teacherToday,
        Role.admin => adminOverview,
      };

  static bool belongsTo(String location, Role role) => location == role.home || location.startsWith('${role.home}/');
}
