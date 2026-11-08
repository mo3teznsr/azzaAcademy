import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/domain/enums.dart';
import '../core/l10n/l10n.dart';
import '../core/prefs/app_prefs.dart';
import '../core/widgets/states.dart' show EmptyState;
import '../features/admin/data/back_office_repository.dart' show AdminUser, Coupon;
import '../features/admin/presentation/admin_batches_screen.dart';
import '../features/admin/presentation/admin_courses_screen.dart';
import '../features/admin/presentation/admin_orders_screen.dart';
import '../features/admin/presentation/admin_people_screen.dart';
import '../features/admin/presentation/admin_subscriptions_screen.dart';
import '../features/admin/presentation/bank_accounts_screen.dart';
import '../features/admin/presentation/categories_screen.dart';
import '../features/admin/presentation/coupons_screen.dart';
import '../features/admin/presentation/manage_hub_screen.dart';
import '../features/admin/presentation/reports_screen.dart';
import '../features/admin/presentation/admin_overview_screen.dart';
import '../features/admin/presentation/approvals_screen.dart';
import '../features/admin/presentation/live_monitor_screen.dart';
import '../features/admin/presentation/payout_run_screen.dart';
import '../features/admin/presentation/transfer_verify_screen.dart';
import '../features/announcements/presentation/announcements_screen.dart';
import '../features/chat/domain/chat_models.dart';
import '../features/checkout/domain/checkout_models.dart' show Order;
import '../features/chat/presentation/chat_thread_screen.dart';
import '../features/chat/presentation/messages_inbox_screen.dart';
import '../features/support/presentation/new_ticket_screen.dart';
import '../features/support/presentation/support_inbox_screen.dart';
import '../features/support/presentation/support_screen.dart';
import '../features/support/presentation/ticket_screen.dart';
import '../features/auth/presentation/auth_controller.dart';
import '../features/auth/presentation/language_picker_screen.dart';
import '../features/auth/presentation/onboarding_screen.dart';
import '../features/auth/presentation/sign_in_screen.dart';
import '../features/auth/presentation/splash_screen.dart';
import '../features/auth/presentation/verify_email_screen.dart';
import '../features/catalog/presentation/batch_picker_screen.dart';
import '../features/certificates/presentation/certificate_detail_screen.dart';
import '../features/certificates/presentation/certificate_verify_screen.dart';
import '../features/certificates/presentation/certificates_screen.dart';
import '../features/catalog/presentation/batch_schedule_screen.dart';
import '../features/catalog/presentation/course_detail_screen.dart';
import '../features/catalog/presentation/explore_screen.dart';
import '../features/catalog/presentation/saved_courses_screen.dart';
import '../features/checkout/domain/apple_iap.dart';
import '../features/checkout/presentation/apple_payment_screen.dart';
import '../features/checkout/presentation/bank_transfer_screen.dart';
import '../features/checkout/presentation/checkout_screen.dart';
import '../features/checkout/presentation/enrolled_screen.dart';
import '../features/checkout/presentation/my_orders_screen.dart';
import '../features/checkout/presentation/order_status_screen.dart';
import '../features/home/presentation/student_home_screen.dart';
import '../features/instructors/presentation/instructors_screen.dart';
import '../features/instructors/presentation/teach_screen.dart';
import '../features/learn/presentation/assignments_screen.dart';
import '../features/learn/presentation/library_screen.dart';
import '../features/learn/presentation/course_lessons_screen.dart';
import '../features/learn/presentation/lesson_screen.dart';
import '../features/learn/presentation/my_quizzes_screen.dart';
import '../features/learn/presentation/quiz_result_screen.dart';
import '../features/learn/presentation/quiz_screen.dart';
import '../features/learn/presentation/quiz_take_screen.dart';
import '../features/live/presentation/after_session_screen.dart';
import '../features/live/presentation/attendance_summary_screen.dart';
import '../features/live/presentation/live_room_screen.dart';
import '../features/live/presentation/lobby_screen.dart';
import '../features/me/presentation/edit_profile_screen.dart';
import '../features/me/presentation/language_settings_screen.dart';
import '../features/me/presentation/profile_photo_screen.dart';
import '../features/me/presentation/notifications_screen.dart';
import '../features/me/presentation/profile_screen.dart';
import '../features/me/presentation/schedule_screen.dart';
import '../features/teacher/presentation/assignment_editor_screen.dart';
import '../features/teacher/presentation/batch_quizzes_screen.dart';
import '../features/teacher/presentation/grading_screens.dart';
import '../features/teacher/presentation/quiz_editor_screen.dart';
import '../features/teacher/presentation/course_editor_screen.dart';
import '../features/teacher/presentation/earnings_screen.dart';
import '../features/teacher/presentation/my_courses_screen.dart';
import '../features/teacher/presentation/teacher_recordings_screen.dart';
import '../features/teacher/presentation/new_batch_screen.dart';
import '../features/teacher/presentation/payout_method_screen.dart';
import '../features/teacher/presentation/quiz_results_screen.dart';
import '../features/teacher/presentation/recorded_course_hub_screen.dart';
import '../features/teacher/presentation/reschedule_request_screen.dart';
import '../features/teacher/presentation/roster_screen.dart';
import '../features/teacher/presentation/session_prep_screen.dart';
import '../features/teacher/presentation/teacher_batches_screen.dart';
import '../features/teacher/presentation/teacher_today_screen.dart';
import '../features/teachers/presentation/teacher_profile_screen.dart';
import '../features/subscriptions/domain/subscription_models.dart' show TransferStart;
import '../features/subscriptions/presentation/my_plans_screen.dart';
import '../features/subscriptions/presentation/plan_transfer_screen.dart';
import '../features/subscriptions/presentation/preview_lesson_screen.dart';
import '../features/subscriptions/presentation/subscribe_return_screen.dart';
import 'redirect.dart';
import 'role_shell.dart';
import 'routes.dart';

/// The transfer instructions were opened without their details (a cold link): back to where plans start.
class _MissingTransfer extends StatelessWidget {
  const _MissingTransfer();

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(),
        body: EmptyState(title: context.l10n.errNotFound, action: context.l10n.returnHome, onAction: () => context.go(Routes.studentHome)),
      );
}

final rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

String? _appStoreOnly(BuildContext _, GoRouterState s) => usesAppStorePayments ? Routes.order(s.pathParameters['id']!) : null;

GoRoute _route(String path, Widget Function(GoRouterState s) build, {List<RouteBase> routes = const []}) =>
    GoRoute(path: path, builder: (_, s) => build(s), routes: routes);

StatefulShellBranch _branch(String path, Widget Function(GoRouterState s) build, {List<RouteBase> routes = const []}) =>
    StatefulShellBranch(routes: [_route(path, build, routes: routes)]);

// ── Shared screens ──
// Each is registered once at its shared path (outside the shells) and again under every tab of the shells that open
// it in place (`/student/explore/courses/:id`), so the tab bar stays and back returns within the tab.
// `Routes.inTab` (via the redirect) picks the copy; the shared paths keep working for deep links and notifications.
String _p(GoRouterState s, [String name = 'id']) => s.pathParameters[name]!;
Widget _courseDetail(GoRouterState s) => CourseDetailScreen(courseId: _p(s));
Widget _batchPicker(GoRouterState s) => BatchPickerScreen(courseId: _p(s));
Widget _courseLessons(GoRouterState s) => CourseLessonsScreen(courseId: _p(s));
Widget _lesson(GoRouterState s) => LessonScreen(courseId: _p(s), lessonId: _p(s, 'lessonId'));
Widget _previewLesson(GoRouterState s) => PreviewLessonScreen(lessonId: _p(s));
Widget _batchSchedule(GoRouterState s) => BatchScheduleScreen(batchId: _p(s));
Widget _batchAnnouncements(GoRouterState s) => AnnouncementsScreen(batchId: _p(s));
Widget _roster(GoRouterState s) => RosterScreen(
      batchId: _p(s),
      initialSection: ClassHubSection.parse(s.uri.queryParameters['tab']),
      initialAtRisk: s.uri.queryParameters['filter'] == 'atRisk',
    );
Widget _newAssignment(GoRouterState s) => AssignmentEditorScreen(batchId: _p(s));
Widget _submissions(GoRouterState s) => SubmissionsScreen(batchId: _p(s), assignmentId: _p(s, 'assignmentId'));
Widget _batchQuizzes(GoRouterState s) => BatchQuizzesScreen(batchId: _p(s));
Widget _newQuiz(GoRouterState s) => QuizEditorScreen(batchId: _p(s));
Widget _editQuiz(GoRouterState s) => QuizEditorScreen(batchId: _p(s), quizId: _p(s, 'quizId'));
Widget _quiz(GoRouterState s) => QuizScreen(quizId: _p(s));
Widget _quizAttempt(GoRouterState s) => QuizResultScreen(quizId: _p(s), attemptId: _p(s, 'attemptId'));
Widget _quizResults(GoRouterState s) => QuizResultsScreen(quizId: _p(s));
Widget _teacherProfile(GoRouterState s) => TeacherProfileScreen(teacherId: _p(s));
Widget _sessionPrep(GoRouterState s) => SessionPrepScreen(sessionId: _p(s));
Widget _reschedule(GoRouterState s) => RescheduleRequestScreen(sessionId: _p(s));
Widget _attendance(GoRouterState s) => AttendanceSummaryScreen(sessionId: _p(s));
Widget _assignments(GoRouterState s) => AssignmentsScreen(batchId: s.uri.queryParameters['batchId']);
Widget _chat(GoRouterState s) => ChatThreadScreen(conversationId: _p(s), conversation: s.extra is Conversation ? s.extra as Conversation : null);
Widget _newTicket(GoRouterState s) => NewTicketScreen(orderId: s.uri.queryParameters['orderId'], batchId: s.uri.queryParameters['batchId']);
Widget _ticket(GoRouterState s) => TicketScreen(ticketId: _p(s));
Widget _certificate(GoRouterState s) => CertificateDetailScreen(code: _p(s, 'code'));

List<RouteBase> _messagesRoutes() => [
      _route('messages', (_) => const MessagesInboxScreen(), routes: [_route(':id', _chat)]),
      _route('announcements', (_) => const AnnouncementsScreen()),
      _route('notifications', (_) => const NotificationsScreen()),
    ];

List<RouteBase> _settingsRoutes() => [
      _route('settings/language', (_) => const LanguageSettingsScreen()),
      _route('settings/profile', (_) => const EditProfileScreen()),
    ];

List<RouteBase> _supportRoutes() => [
      _route('support', (_) => const SupportScreen(), routes: [_route('new', _newTicket), _route(':id', _ticket)]),
    ];

/// The class hub and its tools, as teachers and admins open them from a tab.
List<RouteBase> _classHubRoutes() => [
      _route('batches/:id/schedule', _batchSchedule),
      _route('batches/:id/roster', _roster),
      _route('batches/:id/announcements', _batchAnnouncements),
      _route('batches/:id/assignments/new', _newAssignment),
      _route('batches/:id/assignments/:assignmentId', _submissions),
      _route('batches/:id/quizzes', _batchQuizzes, routes: [_route('new', _newQuiz), _route(':quizId/edit', _editQuiz)]),
      _route('quizzes/:id/results', _quizResults),
    ];

/// What a student opens from any tab (built fresh per tab: a route can only have one parent).
/// Taking a quiz stays outside: it covers the tabs.
List<RouteBase> _studentInTab() => [
      _route('courses/:id', _courseDetail, routes: [
        _route('batches', _batchPicker),
        _route('lessons', _courseLessons, routes: [_route(':lessonId', _lesson)]),
      ]),
      _route('lessons/:id/preview', _previewLesson),
      _route('batches/:id/schedule', _batchSchedule),
      _route('batches/:id/announcements', _batchAnnouncements),
      _route('teachers/:id', _teacherProfile),
      _route('instructors', (_) => const InstructorsScreen()),
      _route('teach', (_) => const TeachScreen()),
      _route('quizzes', (_) => const MyQuizzesScreen(), routes: [
        _route(':id', _quiz, routes: [_route('attempts/:attemptId', _quizAttempt)]),
      ]),
      _route('assignments', _assignments),
      ..._messagesRoutes(),
      ..._supportRoutes(),
      _route('me/orders', (_) => const MyOrdersScreen()),
      _route('me/plans', (_) => const MyPlansScreen()),
      _route('me/saved', (_) => const SavedCoursesScreen()),
      _route('me/certificates', (_) => const CertificatesScreen(), routes: [_route(':code', _certificate)]),
      ..._settingsRoutes(),
    ];

List<RouteBase> _teacherInTab() => [
      ..._classHubRoutes(),
      _route('grading', (_) => const GradingQueueScreen()),
      _route('sessions/:id/prep', _sessionPrep),
      _route('sessions/:id/reschedule', _reschedule),
      _route('sessions/:id/attendance', _attendance),
      ..._messagesRoutes(),
      ..._supportRoutes(),
      ..._settingsRoutes(),
    ];

/// Listed before a tab's own children: the admin tabs have their own `support`, `settings` and `:id` routes.
List<RouteBase> _adminInTab() => [..._classHubRoutes(), ..._messagesRoutes(), ..._settingsRoutes()];

List<RouteBase> buildRoutes() => [
      _route(Routes.splash, (_) => const SplashScreen()),
      // `from`: where a guest was before an action asked for an account; sign-in / sign-up send them back.
      _route(Routes.welcome, (s) => LanguagePickerScreen(from: Routes.safeFrom(s.uri.queryParameters['from']))),
      _route(Routes.interests, (s) => OnboardingScreen(next: s.uri.queryParameters['next'], from: Routes.safeFrom(s.uri.queryParameters['from']))),
      _route(Routes.signIn, (s) => SignInScreen(from: Routes.safeFrom(s.uri.queryParameters['from']))),
      _route(Routes.signUp, (s) => SignInScreen(signUp: true, from: Routes.safeFrom(s.uri.queryParameters['from']))),
      _route(Routes.verifyEmail, (s) => VerifyEmailScreen(email: s.uri.queryParameters['email'] ?? '', from: Routes.safeFrom(s.uri.queryParameters['from']))),
      _route('/verify/:code', (s) => CertificateVerifyScreen(code: s.pathParameters['code']!)),

      // ── Student tree ──
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => RoleShell(shell: shell, role: Role.student),
        branches: [
          _branch(Routes.studentHome, (_) => const StudentHomeScreen(), routes: _studentInTab()),
          _branch(Routes.studentExplore, (_) => const ExploreScreen(), routes: _studentInTab()),
          _branch(Routes.studentSchedule, (_) => const ScheduleScreen(role: Role.student), routes: _studentInTab()),
          _branch(Routes.studentLibrary, (_) => const LibraryScreen(), routes: _studentInTab()),
          _branch(Routes.studentMe, (_) => const ProfileScreen(), routes: _studentInTab()),
        ],
      ),

      // ── Teacher tree ──
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => RoleShell(shell: shell, role: Role.teacher),
        branches: [
          _branch(Routes.teacherToday, (_) => const TeacherTodayScreen(), routes: _teacherInTab()),
          _branch(Routes.teacherBatches, (_) => const TeacherBatchesScreen(), routes: [
            ..._teacherInTab(),
            _route('new', (_) => const NewBatchScreen()),
            _route('recordings', (_) => const TeacherRecordingsScreen()),
            _route('courses', (_) => const MyCoursesScreen(), routes: [
              _route('new', (_) => const CourseEditorScreen()),
              _route(':id', (s) => CourseEditorScreen(courseId: s.pathParameters['id'])),
              _route(':id/hub', (s) => RecordedCourseHubScreen(courseId: _p(s)), routes: [
                _route('quizzes/new', (s) => QuizEditorScreen(courseId: _p(s))),
                _route('quizzes/:quizId/edit', (s) => QuizEditorScreen(courseId: _p(s), quizId: _p(s, 'quizId'))),
              ]),
            ]),
          ]),
          _branch(Routes.teacherCalendar, (_) => const ScheduleScreen(role: Role.teacher), routes: _teacherInTab()),
          _branch(Routes.teacherEarnings, (_) => const EarningsScreen(), routes: [
            ..._teacherInTab(),
            _route('payout-method', (_) => const PayoutMethodScreen()),
          ]),
          _branch(Routes.teacherMe, (_) => const ProfileScreen(), routes: _teacherInTab()),
        ],
      ),

      // ── Admin tree (cream ground) ──
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => RoleShell(shell: shell, role: Role.admin),
        branches: [
          // Tabs: Overview · Batches · Approvals · Manage · Me. The live monitor and support inbox sit under
          // the overview ("Live now", the decision queue, the app-bar icon) and in the Manage hub.
          _branch(Routes.adminOverview, (_) => const AdminOverviewScreen(), routes: [
            ..._adminInTab(),
            _route('support', (_) => const SupportInboxScreen()),
            _route('live', (_) => const LiveMonitorScreen()),
          ]),
          _branch(Routes.adminBatches, (_) => const AdminBatchesScreen(), routes: [
            ..._adminInTab(),
            _route('new', (_) => const NewBatchScreen(adminMode: true)),
            _route(':id', (s) => BatchQuickViewScreen(batchId: s.pathParameters['id']!)),
          ]),
          _branch(
              Routes.adminApprovals,
              (s) => ApprovalsScreen(
                    key: ValueKey('approvals-${s.uri.queryParameters['tab']}'),
                    initialTab: ApprovalsScreen.tabIndex(s.uri.queryParameters['tab']),
                  ),
              routes: [
            ..._adminInTab(),
            _route('transfers/:orderId', (s) => TransferVerifyScreen(orderId: s.pathParameters['orderId']!, transfer: s.extra is Order ? s.extra as Order : null)),
            _route('payout-runs/:id', (s) => PayoutRunScreen(runId: s.pathParameters['id']!)),
          ]),
          _branch(Routes.adminManage, (_) => const ManageHubScreen(), routes: [
            ..._adminInTab(),
            _route('support', (_) => const SupportInboxScreen()),
            _route('live', (_) => const LiveMonitorScreen()),
            _route('payments', (s) => AdminOrdersScreen(initialStatus: OrderStatus.values.where((v) => v.wire == s.uri.queryParameters['status']).firstOrNull),
                routes: [
                  _route(':id', (s) => AdminOrderScreen(orderId: s.pathParameters['id']!)),
                ]),
            _route('people', (s) => AdminPeopleScreen(initialRole: Role.values.where((v) => v.wire == s.uri.queryParameters['role']).firstOrNull), routes: [
              _route(':id', (s) => AdminPersonScreen(userId: s.pathParameters['id']!, user: s.extra is AdminUser ? s.extra as AdminUser : null)),
            ]),
            _route('courses', (_) => const AdminCoursesScreen(), routes: [
              _route('new', (_) => const CourseEditorScreen(adminMode: true)),
              _route(':id', (s) => CourseEditorScreen(courseId: s.pathParameters['id'], adminMode: true)),
            ]),
            _route('subscriptions', (_) => const AdminSubscriptionsScreen()),
            _route('coupons', (_) => const CouponsScreen(), routes: [
              _route('new', (_) => const CouponEditorScreen()),
              _route(':id', (s) => CouponEditorLoader(couponId: s.pathParameters['id']!, coupon: s.extra is Coupon ? s.extra as Coupon : null), routes: [
                _route('usage', (s) => CouponUsageScreen(couponId: s.pathParameters['id']!)),
              ]),
            ]),
            _route('categories', (_) => const CategoriesScreen()),
            _route('reports', (_) => const ReportsScreen()),
            _route('bank-accounts', (_) => const BankAccountsScreen()),
            _route('currencies', (_) => const CurrenciesScreen()),
            _route('settings', (_) => const PlatformSettingsScreen()),
          ]),
          _branch(Routes.adminMe, (_) => const ProfileScreen(), routes: _adminInTab()),
        ],
      ),

      // ── Shared routes (outside the shells) ──
      // Full-screen flows live only here; the details also open inside a tab (see `_studentInTab` and friends).
      _route('/courses/:id', _courseDetail, routes: [
        _route('batches', _batchPicker),
        _route('lessons', _courseLessons, routes: [_route(':lessonId', _lesson)]),
      ]),
      _route('/lessons/:id/preview', _previewLesson),
      // A plan just started (Stripe or the App Store): waits for the payment to confirm, then opens the next lesson.
      _route('/learn/recorded/return', (s) => SubscribeReturnScreen(reference: s.uri.queryParameters['ref'] ?? '')),
      _route('/subscriptions/transfer/:paymentId', (s) => s.extra is TransferStart ? PlanTransferScreen(start: s.extra as TransferStart) : const _MissingTransfer()),
      _route('/batches/:id/schedule', _batchSchedule),
      _route('/batches/:id/roster', _roster),
      _route('/batches/:id/assignments/new', _newAssignment),
      _route('/batches/:id/assignments/:assignmentId', _submissions),
      _route(Routes.teacherGrading, (_) => const GradingQueueScreen()),
      _route('/batches/:id/announcements', _batchAnnouncements),
      _route('/batches/:id/quizzes', _batchQuizzes, routes: [
        _route('new', _newQuiz),
        _route(':quizId/edit', _editQuiz),
      ]),
      _route(Routes.myQuizzes, (_) => const MyQuizzesScreen(), routes: [
        _route(':id', _quiz, routes: [
          // Taking a quiz covers the tabs wherever the quiz was opened.
          _route('take', (s) => QuizTakeScreen(quizId: _p(s))),
          _route('attempts/:attemptId', _quizAttempt),
          _route('results', _quizResults),
        ]),
      ]),
      _route('/checkout/:batchId', (s) => CheckoutScreen(batchId: s.pathParameters['batchId']!)),
      // `extra`: Stripe Checkout's page URL right after a card checkout (offered again if the student closed it).
      _route('/orders/:id', (s) => OrderStatusScreen(orderId: s.pathParameters['id']!, checkoutUrl: s.extra is String ? s.extra as String : null),
          routes: [
        // iOS sells seats only through In-App Purchase: the bank-transfer screen is unreachable there.
        GoRoute(path: 'bank-transfer', redirect: _appStoreOnly, builder: (_, s) => BankTransferScreen(orderId: s.pathParameters['id']!)),
        _route('app-store', (s) => ApplePaymentScreen(orderId: s.pathParameters['id']!, autoStart: s.extra == true)),
        _route('enrolled', (s) => EnrolledScreen(orderId: s.pathParameters['id']!)),
      ]),
      _route(Routes.myOrders, (_) => const MyOrdersScreen()),
      _route(Routes.myPlans, (_) => const MyPlansScreen()),
      _route(Routes.savedCourses, (_) => const SavedCoursesScreen()),
      _route(Routes.certificates, (_) => const CertificatesScreen(), routes: [_route(':code', _certificate)]),
      _route(Routes.instructors, (_) => const InstructorsScreen()),
      _route(Routes.teachOnAzza, (_) => const TeachScreen()),
      _route('/teachers/:id', _teacherProfile),
      _route('/sessions/:id/lobby', (s) => LobbyScreen(sessionId: s.pathParameters['id']!)),
      _route('/sessions/:id/live', (s) => LiveRoomScreen(sessionId: s.pathParameters['id']!, options: s.extra as JoinOptions?)),
      _route('/sessions/:id/after', (s) => AfterSessionScreen(sessionId: s.pathParameters['id']!)),
      _route('/sessions/:id/prep', _sessionPrep),
      _route('/sessions/:id/reschedule', _reschedule),
      _route('/sessions/:id/attendance', _attendance),
      _route(Routes.assignments, _assignments),
      _route(Routes.notifications, (_) => const NotificationsScreen()),
      _route(Routes.messages, (_) => const MessagesInboxScreen(), routes: [
        _route(':id', _chat),
      ]),
      _route(Routes.announcements, (_) => const AnnouncementsScreen()),
      _route(Routes.support, (_) => const SupportScreen(), routes: [
        _route('new', _newTicket),
        _route(':id', _ticket),
      ]),
      _route(Routes.languageSettings, (_) => const LanguageSettingsScreen()),
      _route(Routes.editProfile, (_) => const EditProfileScreen()),
      _route(Routes.profilePhoto, (_) => const ProfilePhotoScreen()),
    ];

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(authControllerProvider, (_, _) => refresh.value++);
  ref.listen(onboardingProvider, (_, _) => refresh.value++);

  late final GoRouter router;
  router = GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: Routes.splash,
    refreshListenable: refresh,
    redirect: (context, state) => computeRedirect(
      auth: ref.read(authControllerProvider),
      onboarded: ref.read(onboardingProvider).completed,
      location: state.uri.toString(),
      // The location being left, so a shared detail opens inside the tab the reader is on.
      current: router.routerDelegate.currentConfiguration.uri.toString(),
    ),
    routes: buildRoutes(),
  );
  ref.onDispose(() {
    router.dispose();
    refresh.dispose();
  });
  return router;
});
